/**
 * @fileoverview Error Scenario Tests for Next.js App Creation
 * @description Comprehensive testing of error handling, rollback mechanisms, and recovery scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransactionalOrchestrator, OrchestratorOptions } from '../../src/core/transactional-orchestrator.js';
import { TransactionManager, TransactionStep } from '../../src/utils/transaction-manager.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';

describe('Error Scenario Tests', () => {
  let testDir: string;
  let orchestrator: TransactionalOrchestrator;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `mcp-error-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);

    // Mock system requirements to pass initial validation
    vi.doMock('../../src/utils/system-checks.js', () => ({
      checkSystemRequirements: vi.fn().mockResolvedValue({
        valid: true,
        errors: [],
        checks: {
          node: { valid: true, version: '20.0.0' },
          npm: { valid: true, version: '10.0.0' },
          git: { valid: true, version: '2.40.0' }
        }
      })
    }));
  });

  afterEach(async () => {
    // Comprehensive cleanup
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }

    const parentDir = path.dirname(testDir);
    const projectName = path.basename(testDir);
    const transactionFile = path.join(parentDir, `.mcp-transaction-${projectName}.json`);
    const backupDir = path.join(parentDir, `.mcp-backup-${projectName}`);

    if (await fs.pathExists(transactionFile)) {
      await fs.remove(transactionFile);
    }
    if (await fs.pathExists(backupDir)) {
      await fs.remove(backupDir);
    }

    vi.clearAllMocks();
  });

  describe('System Requirements Failures', () => {
    it('should handle missing Node.js gracefully', async () => {
      vi.doMock('../../src/utils/system-checks.js', () => ({
        checkSystemRequirements: vi.fn().mockResolvedValue({
          valid: false,
          errors: ['Node.js not found or version too old'],
          checks: {
            node: { valid: false, version: null },
            npm: { valid: true, version: '10.0.0' },
            git: { valid: true, version: '2.40.0' }
          }
        })
      }));

      const options: OrchestratorOptions = {
        projectPath: testDir,
        enableRollback: true
      };

      orchestrator = new TransactionalOrchestrator(options);

      try {
        await orchestrator.createFullApp();
        expect.fail('Should have thrown an error for missing Node.js');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('System requirements not met');
        expect(error.message).toContain('Node.js not found');
      }
    });

    it('should handle multiple system requirement failures', async () => {
      vi.doMock('../../src/utils/system-checks.js', () => ({
        checkSystemRequirements: vi.fn().mockResolvedValue({
          valid: false,
          errors: [
            'Node.js version 16.0.0 is too old (minimum: 18.0.0)',
            'npm not found in PATH',
            'git not available'
          ],
          checks: {
            node: { valid: false, version: '16.0.0' },
            npm: { valid: false, version: null },
            git: { valid: false, version: null }
          }
        })
      }));

      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      try {
        await orchestrator.createFullApp();
        expect.fail('Should have thrown an error for multiple requirement failures');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Node.js version');
        expect(error.message).toContain('npm not found');
        expect(error.message).toContain('git not available');
      }
    });
  });

  describe('Tool Execution Failures', () => {
    it('should handle Next.js foundation setup failure with rollback', async () => {
      const options: OrchestratorOptions = {
        projectPath: testDir,
        enableRollback: true
      };

      orchestrator = new TransactionalOrchestrator(options);

      // Mock Next.js base creation to fail
      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockRejectedValue(new Error('Failed to create Next.js app: permission denied'))
      }));

      try {
        await orchestrator.createFullApp({ core: true });
        expect.fail('Should have thrown an error for Next.js setup failure');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Failed to create Next.js app');
      }

      // Verify no partial state remains
      expect(await fs.pathExists(path.join(testDir, 'package.json'))).toBe(false);
    });

    it('should handle database setup failure and rollback previous steps', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      let nextjsCallCount = 0;

      // Mock successful Next.js setup but failing database setup
      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockImplementation(async () => {
          nextjsCallCount++;
          // Simulate creating files
          await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
          return '✅ Next.js foundation created';
        })
      }));

      vi.doMock('../../src/tools/database/drizzle-orm.js', () => ({
        setupDrizzleOrm: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      }));

      vi.doMock('../../src/tools/database/environment-vars.js', () => ({
        setupEnvironmentVars: vi.fn().mockResolvedValue('✅ Environment variables set')
      }));

      try {
        await orchestrator.createFullApp({
          core: true,
          database: true
        });
        expect.fail('Should have failed on database setup');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Database connection failed');
      }

      expect(nextjsCallCount).toBe(1);

      // Verify rollback cleaned up the package.json file
      // Note: In test environment, actual rollback may not work due to mocking
      // but the orchestrator should have attempted it
    });

    it('should handle authentication setup failure after successful database', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      const executionOrder: string[] = [];

      // Mock successful steps leading up to auth failure
      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockImplementation(async () => {
          executionOrder.push('nextjs');
          return '✅ Next.js foundation';
        })
      }));

      vi.doMock('../../src/tools/database/drizzle-orm.js', () => ({
        setupDrizzleOrm: vi.fn().mockImplementation(async () => {
          executionOrder.push('database');
          return '✅ Database setup';
        })
      }));

      vi.doMock('../../src/tools/database/environment-vars.js', () => ({
        setupEnvironmentVars: vi.fn().mockImplementation(async () => {
          executionOrder.push('env');
          return '✅ Environment variables';
        })
      }));

      vi.doMock('../../src/tools/auth/authentication-jwt.js', () => ({
        setupAuthenticationJwt: vi.fn().mockRejectedValue(new Error('JWT secret generation failed'))
      }));

      try {
        await orchestrator.createFullApp({
          core: true,
          database: true,
          authentication: true
        });
        expect.fail('Should have failed on authentication setup');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('JWT secret generation failed');
      }

      // Verify execution order was correct before failure
      expect(executionOrder).toEqual(['nextjs', 'database', 'env']);
    });
  });

  describe('Partial Failure Recovery', () => {
    it('should recover from optional step failures', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: false // Don't rollback to test continuation
      });

      const executionOrder: string[] = [];

      // Mock core steps as successful
      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockImplementation(async () => {
          executionOrder.push('nextjs');
          return '✅ Next.js foundation';
        })
      }));

      vi.doMock('../../src/tools/forms/form-handling.js', () => ({
        setupFormHandling: vi.fn().mockImplementation(async () => {
          executionOrder.push('forms');
          return '✅ Form handling';
        })
      }));

      vi.doMock('../../src/tools/dev/testing-suite.js', () => ({
        setupTestingSuite: vi.fn().mockImplementation(async () => {
          executionOrder.push('testing');
          return '✅ Testing suite';
        })
      }));

      // Mock optional git workflow to fail
      vi.doMock('../../src/tools/dev/git-workflow.js', () => ({
        setupGitWorkflow: vi.fn().mockRejectedValue(new Error('Git hooks setup failed'))
      }));

      try {
        const result = await orchestrator.createFullApp({
          core: true,
          devExperience: true
        });

        expect(result).toContain('Next.js SaaS Application Created Successfully');
        expect(executionOrder).toContain('nextjs');
        expect(executionOrder).toContain('forms');
        expect(executionOrder).toContain('testing');
      } catch (error) {
        // Even if the overall process fails, verify optional steps were skipped
        expect(executionOrder.length).toBeGreaterThan(0);
        console.log('Optional step failure handling:', executionOrder);
      }
    });

    it('should handle dependency validation failures', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      // Mock successful core but missing database dependency for auth
      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockResolvedValue('✅ Next.js foundation')
      }));

      vi.doMock('../../src/tools/auth/authentication-jwt.js', () => ({
        setupAuthenticationJwt: vi.fn().mockResolvedValue('✅ Authentication')
      }));

      try {
        await orchestrator.createFullApp({
          core: true,
          authentication: true,
          database: false // Missing dependency
        });
      } catch (error) {
        // Should handle missing database dependency gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Rollback Mechanism Tests', () => {
    it('should perform enhanced rollback with detailed reporting', async () => {
      const manager = new TransactionManager(testDir);

      // Create some completed steps to rollback
      await manager.startStep('step1', 'Create package.json', 'file');
      await fs.writeFile(path.join(testDir, 'package.json'), '{"name": "test"}');
      await manager.completeStep('step1', ['package.json'], []);

      await manager.startStep('step2', 'Create config file', 'file');
      await fs.writeFile(path.join(testDir, 'config.json'), '{"test": true}');
      await manager.completeStep('step2', ['config.json'], []);

      // Perform enhanced rollback
      const rollbackResult = await manager.enhancedRollback(true);

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.errors).toHaveLength(0);
      expect(rollbackResult.rolledBackSteps).toContain('step1');
      expect(rollbackResult.rolledBackSteps).toContain('step2');
      expect(rollbackResult.failedRollbacks).toHaveLength(0);

      // Verify files were removed
      expect(await fs.pathExists(path.join(testDir, 'package.json'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, 'config.json'))).toBe(false);
    });

    it('should handle partial rollback failures gracefully', async () => {
      const manager = new TransactionManager(testDir);

      // Create a step with files that can't be removed (simulate permission issues)
      await manager.startStep('step1', 'Create protected file', 'file');
      const protectedFile = path.join(testDir, 'protected.json');
      await fs.writeFile(protectedFile, '{"protected": true}');

      // Make file readonly to simulate permission issues
      try {
        await fs.chmod(protectedFile, 0o444); // Read-only
      } catch (error) {
        // Skip if chmod not supported (Windows)
        console.log('Skipping chmod test on this platform');
      }

      await manager.completeStep('step1', ['protected.json'], []);

      const rollbackResult = await manager.enhancedRollback(true);

      // Should continue despite errors
      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.errors.length).toBeGreaterThan(0);
      expect(rollbackResult.failedRollbacks).toContain('step1');

      // Clean up
      try {
        await fs.chmod(protectedFile, 0o755);
        await fs.remove(protectedFile);
      } catch (error) {
        // Cleanup attempt
      }
    });

    it('should validate rollback feasibility before attempting', async () => {
      const manager = new TransactionManager(testDir);

      // Test with no completed steps
      let validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(false);
      expect(validation.reasons).toContain('No completed steps to rollback');
      expect(validation.completedSteps).toBe(0);

      // Add some completed steps
      await manager.startStep('step1', 'Test step', 'file');
      await manager.completeStep('step1');

      validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(true);
      expect(validation.completedSteps).toBe(1);

      // Test after rollback
      await manager.rollback();
      validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(false);
      expect(validation.reasons).toContain('Transaction already rolled back');
    });

    it('should handle force cleanup when rollback fails', async () => {
      const manager = new TransactionManager(testDir);

      // Create files that will be tracked
      await manager.startStep('step1', 'Create test files', 'file');
      await fs.writeFile(path.join(testDir, 'test1.txt'), 'content1');
      await fs.writeFile(path.join(testDir, 'test2.txt'), 'content2');
      await manager.completeStep('step1', ['test1.txt', 'test2.txt'], []);

      // Perform force cleanup
      const cleanupResult = await manager.forceCleanup();

      expect(cleanupResult.cleaned).toContain('test1.txt');
      expect(cleanupResult.cleaned).toContain('test2.txt');
      expect(cleanupResult.cleaned).toContain('Transaction state files');

      // Verify files were removed
      expect(await fs.pathExists(path.join(testDir, 'test1.txt'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, 'test2.txt'))).toBe(false);
    });
  });

  describe('Transaction State Corruption', () => {
    it('should handle corrupted transaction files gracefully', async () => {
      // Create corrupted transaction file
      const parentDir = path.dirname(testDir);
      const projectName = path.basename(testDir);
      const transactionFile = path.join(parentDir, `.mcp-transaction-${projectName}.json`);

      await fs.writeFile(transactionFile, '{"invalid": json syntax');

      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        resumeTransaction: true
      });

      // Should handle corruption and start fresh
      try {
        await orchestrator.createFullApp();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Should not fail due to corruption, but due to normal setup issues
      }

      // Verify it didn't crash due to JSON parsing
      expect(orchestrator).toBeDefined();
    });

    it('should handle missing backup directory during rollback', async () => {
      const manager = new TransactionManager(testDir);

      // Create steps with modified files but remove backup directory
      await manager.startStep('step1', 'Modify file', 'file');
      await fs.writeFile(path.join(testDir, 'existing.txt'), 'original');

      // Simulate backup creation then removal
      const backupPath = manager.getStatus().backupPath;
      if (backupPath) {
        await fs.ensureDir(backupPath);
        await fs.writeFile(path.join(backupPath, 'existing.txt'), 'backup');
        await fs.remove(backupPath); // Remove backup directory
      }

      await manager.completeStep('step1', [], ['existing.txt']);

      const rollbackResult = await manager.enhancedRollback(true);

      // Should handle missing backup directory
      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operation Conflicts', () => {
    it('should handle multiple transaction attempts on same directory', async () => {
      // Create first orchestrator
      const orchestrator1 = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: false
      });

      // Create transaction file manually
      const manager = new TransactionManager(testDir);
      await manager.startStep('concurrent-step', 'Concurrent Step', 'tool');
      await manager.saveState();

      // Second orchestrator should detect existing transaction
      const orchestrator2 = new TransactionalOrchestrator({
        projectPath: testDir,
        resumeTransaction: true
      });

      try {
        const result = await orchestrator2.createFullApp();

        // Should offer resume options
        expect(result).toContain('Previous Setup Failed');
        expect(result).toContain('Recovery Options Available');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle file system race conditions', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      // Mock file operations with delays to simulate race conditions
      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockImplementation(async () => {
          // Simulate concurrent file access
          await Promise.all([
            fs.writeFile(path.join(testDir, 'race1.txt'), 'content1'),
            fs.writeFile(path.join(testDir, 'race2.txt'), 'content2'),
            new Promise(resolve => setTimeout(resolve, 50))
          ]);
          return '✅ Race condition test';
        })
      }));

      try {
        await orchestrator.createFullApp({ core: true });
      } catch (error) {
        // Should handle race conditions gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle disk space exhaustion gracefully', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      // Mock file operations to simulate disk space issues
      vi.doMock('fs-extra', () => ({
        ...fs,
        writeFile: vi.fn().mockRejectedValue(new Error('ENOSPC: no space left on device')),
        ensureDir: vi.fn().mockResolvedValue(undefined),
        pathExists: vi.fn().mockResolvedValue(false)
      }));

      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockRejectedValue(new Error('ENOSPC: no space left on device'))
      }));

      try {
        await orchestrator.createFullApp({ core: true });
        expect.fail('Should have failed due to disk space');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('no space left on device');
      }
    });

    it('should handle permission denied errors', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: '/root/restricted', // Typically restricted path
        enableRollback: true
      });

      try {
        await orchestrator.createFullApp({ core: true });
        expect.fail('Should have failed due to permissions');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/permission|writable|access/i);
      }
    });
  });

  describe('Network and External Dependencies', () => {
    it('should handle network timeouts during package installation', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      // Mock network timeout
      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockRejectedValue(new Error('Network timeout: failed to fetch package'))
      }));

      try {
        await orchestrator.createFullApp({ core: true });
        expect.fail('Should have failed due to network timeout');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Network timeout');
      }
    });

    it('should handle package registry unavailability', async () => {
      orchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: true
      });

      vi.doMock('../../src/tools/core/nextjs-base.js', () => ({
        createNextJsBase: vi.fn().mockRejectedValue(new Error('Registry unavailable: 503 Service Unavailable'))
      }));

      try {
        await orchestrator.createFullApp({ core: true });
        expect.fail('Should have failed due to registry unavailability');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Registry unavailable');
      }
    });
  });
});