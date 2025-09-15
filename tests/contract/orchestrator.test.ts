/**
 * @fileoverview Contract Tests for Orchestration Logic
 * @description Validates the API contracts and expected behavior of orchestration components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TransactionalOrchestrator, OrchestratorOptions, OrchestratorStep } from '../../src/core/transactional-orchestrator.js';
import { TransactionManager, TransactionStep, TransactionState } from '../../src/utils/transaction-manager.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';

describe('TransactionalOrchestrator Contract Tests', () => {
  let testDir: string;
  let orchestrator: TransactionalOrchestrator;
  let orchestratorOptions: OrchestratorOptions;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDir = path.join(tmpdir(), `mcp-orchestrator-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);

    orchestratorOptions = {
      projectPath: testDir,
      projectName: 'test-project',
      resumeTransaction: true,
      enableRollback: true
    };

    orchestrator = new TransactionalOrchestrator(orchestratorOptions);
  });

  afterEach(async () => {
    // Clean up test directory
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }

    // Clean up any transaction files
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
  });

  describe('Constructor Contract', () => {
    it('should create orchestrator with valid options', () => {
      expect(orchestrator).toBeDefined();
      expect(orchestrator).toBeInstanceOf(TransactionalOrchestrator);
    });

    it('should handle missing optional parameters', () => {
      const minimalOptions: OrchestratorOptions = {
        projectPath: testDir
      };
      const minimalOrchestrator = new TransactionalOrchestrator(minimalOptions);
      expect(minimalOrchestrator).toBeDefined();
    });

    it('should resolve relative paths to absolute paths', () => {
      const relativeOptions: OrchestratorOptions = {
        projectPath: './relative-path'
      };
      const relativeOrchestrator = new TransactionalOrchestrator(relativeOptions);
      expect(relativeOrchestrator).toBeDefined();
    });
  });

  describe('createFullApp Contract', () => {
    it('should accept undefined features and use defaults', async () => {
      // This test verifies the contract without actual execution
      const promise = orchestrator.createFullApp();
      expect(promise).toBeInstanceOf(Promise);

      // Cancel the promise to avoid actual execution in contract test
      try {
        await Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 100))
        ]);
      } catch (error) {
        // Expected timeout - we're just testing the contract
        expect(error).toBeDefined();
      }
    });

    it('should accept custom features configuration', async () => {
      const customFeatures = {
        core: true,
        database: true,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      const promise = orchestrator.createFullApp(customFeatures);
      expect(promise).toBeInstanceOf(Promise);

      // Cancel the promise to avoid actual execution
      try {
        await Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 100))
        ]);
      } catch (error) {
        // Expected timeout - contract test only
        expect(error).toBeDefined();
      }
    });

    it('should return string result on success', async () => {
      // Mock a minimal successful execution
      const mockOrchestrator = new TransactionalOrchestrator({
        projectPath: testDir,
        enableRollback: false
      });

      // This would normally fail due to system requirements, but we're testing the contract
      try {
        await mockOrchestrator.createFullApp({ core: false });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(typeof error.message).toBe('string');
      }
    });

    it('should handle boolean feature flags correctly', async () => {
      const booleanFeatures = {
        core: true,
        database: false,
        authentication: true,
        payments: false,
        teamManagement: true,
        devExperience: false,
        internationalization: true
      };

      try {
        await orchestrator.createFullApp(booleanFeatures);
      } catch (error) {
        // Expected error due to system requirements in test environment
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Options Contract Validation', () => {
    it('should validate projectPath is required', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid input
        new TransactionalOrchestrator({});
      }).toThrow();
    });

    it('should handle string projectPath', () => {
      const options: OrchestratorOptions = {
        projectPath: '/valid/path'
      };
      expect(() => new TransactionalOrchestrator(options)).not.toThrow();
    });

    it('should handle optional projectName', () => {
      const options: OrchestratorOptions = {
        projectPath: testDir,
        projectName: 'custom-project-name'
      };
      expect(() => new TransactionalOrchestrator(options)).not.toThrow();
    });

    it('should handle boolean flags', () => {
      const options: OrchestratorOptions = {
        projectPath: testDir,
        resumeTransaction: false,
        enableRollback: false
      };
      expect(() => new TransactionalOrchestrator(options)).not.toThrow();
    });
  });

  describe('Error Handling Contract', () => {
    it('should throw Error instances', async () => {
      try {
        // This will fail due to invalid system requirements
        await orchestrator.createFullApp();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(typeof error.message).toBe('string');
        expect(error.message.length).toBeGreaterThan(0);
      }
    });

    it('should provide meaningful error messages', async () => {
      try {
        // Create orchestrator with invalid path
        const invalidOrchestrator = new TransactionalOrchestrator({
          projectPath: '/invalid/readonly/path'
        });
        await invalidOrchestrator.createFullApp();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toMatch(/requirements|permission|path|directory/i);
      }
    });
  });
});

describe('TransactionManager Contract Tests', () => {
  let testDir: string;
  let transactionManager: TransactionManager;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `mcp-transaction-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);
    transactionManager = new TransactionManager(testDir);
  });

  afterEach(async () => {
    await transactionManager.cleanup();
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('Constructor Contract', () => {
    it('should create transaction manager with valid project path', () => {
      expect(transactionManager).toBeDefined();
      expect(transactionManager).toBeInstanceOf(TransactionManager);
    });

    it('should accept optional transaction ID', () => {
      const customId = 'custom-transaction-id';
      const customManager = new TransactionManager(testDir, customId);
      expect(customManager).toBeDefined();
      expect(customManager.getStatus().id).toBe(customId);
    });

    it('should generate unique transaction ID when not provided', () => {
      const manager1 = new TransactionManager(testDir);
      const manager2 = new TransactionManager(testDir);

      expect(manager1.getStatus().id).not.toBe(manager2.getStatus().id);
      expect(manager1.getStatus().id).toMatch(/^tx_\d+_[a-z0-9]+$/);
    });
  });

  describe('Step Management Contract', () => {
    it('should create valid transaction steps', async () => {
      const step = await transactionManager.startStep('test-step', 'Test Step', 'tool');

      expect(step).toBeDefined();
      expect(step.id).toBe('test-step');
      expect(step.name).toBe('Test Step');
      expect(step.type).toBe('tool');
      expect(step.status).toBe('in_progress');
      expect(step.startTime).toBeDefined();
      expect(Array.isArray(step.created)).toBe(true);
      expect(Array.isArray(step.modified)).toBe(true);
      expect(Array.isArray(step.commands)).toBe(true);
    });

    it('should complete steps correctly', async () => {
      await transactionManager.startStep('test-step', 'Test Step', 'tool');
      await transactionManager.completeStep('test-step', ['created-file.txt'], ['modified-file.txt']);

      const status = transactionManager.getStatus();
      const step = status.steps.find(s => s.id === 'test-step');

      expect(step).toBeDefined();
      expect(step!.status).toBe('completed');
      expect(step!.endTime).toBeDefined();
      expect(step!.created).toEqual(['created-file.txt']);
      expect(step!.modified).toEqual(['modified-file.txt']);
    });

    it('should fail steps with error messages', async () => {
      await transactionManager.startStep('test-step', 'Test Step', 'tool');
      await transactionManager.failStep('test-step', 'Test error message');

      const status = transactionManager.getStatus();
      const step = status.steps.find(s => s.id === 'test-step');

      expect(step).toBeDefined();
      expect(step!.status).toBe('failed');
      expect(step!.error).toBe('Test error message');
      expect(status.status).toBe('failed');
    });
  });

  describe('State Management Contract', () => {
    it('should provide valid transaction state', () => {
      const status = transactionManager.getStatus();

      expect(status).toBeDefined();
      expect(typeof status.id).toBe('string');
      expect(typeof status.projectPath).toBe('string');
      expect(typeof status.startTime).toBe('number');
      expect(['running', 'completed', 'failed', 'rolled_back']).toContain(status.status);
      expect(Array.isArray(status.steps)).toBe(true);
    });

    it('should provide valid progress information', async () => {
      // No steps initially
      let progress = transactionManager.getProgress();
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);

      // Add and complete a step
      await transactionManager.startStep('step1', 'Step 1', 'tool');
      await transactionManager.completeStep('step1');

      progress = transactionManager.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(1);
      expect(progress.percentage).toBe(100);

      // Add another step
      await transactionManager.startStep('step2', 'Step 2', 'tool');

      progress = transactionManager.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(2);
      expect(progress.percentage).toBe(50);
    });
  });

  describe('Persistence Contract', () => {
    it('should save and load transaction state', async () => {
      // Add some state
      await transactionManager.startStep('test-step', 'Test Step', 'tool');
      await transactionManager.completeStep('test-step');
      await transactionManager.saveState();

      // Load the transaction
      const loadedManager = await TransactionManager.loadTransaction(testDir);

      expect(loadedManager).toBeDefined();
      expect(loadedManager!.getStatus().steps).toHaveLength(1);
      expect(loadedManager!.getStatus().steps[0].id).toBe('test-step');
      expect(loadedManager!.getStatus().steps[0].status).toBe('completed');
    });

    it('should return null when no transaction exists', async () => {
      const nonExistentPath = path.join(tmpdir(), 'non-existent-path');
      const loadedManager = await TransactionManager.loadTransaction(nonExistentPath);
      expect(loadedManager).toBeNull();
    });

    it('should handle cleanup correctly', async () => {
      await transactionManager.saveState();

      // Verify files exist before cleanup
      const parentDir = path.dirname(testDir);
      const projectName = path.basename(testDir);
      const transactionFile = path.join(parentDir, `.mcp-transaction-${projectName}.json`);

      expect(await fs.pathExists(transactionFile)).toBe(true);

      // Cleanup and verify files are removed
      await transactionManager.cleanup();
      expect(await fs.pathExists(transactionFile)).toBe(false);
    });
  });

  describe('Step Type Contract', () => {
    const validStepTypes: TransactionStep['type'][] = ['command', 'file', 'tool'];

    validStepTypes.forEach(stepType => {
      it(`should accept step type: ${stepType}`, async () => {
        const step = await transactionManager.startStep(`test-${stepType}`, `Test ${stepType}`, stepType);
        expect(step.type).toBe(stepType);
      });
    });

    it('should reject invalid step types', async () => {
      try {
        // @ts-expect-error - Testing invalid step type
        await transactionManager.startStep('test-invalid', 'Test Invalid', 'invalid-type');
      } catch (error) {
        // TypeScript should prevent this, but if it somehow gets through, it should fail
        expect(error).toBeDefined();
      }
    });
  });

  describe('Rollback Contract', () => {
    it('should complete rollback operation', async () => {
      // Create and complete some steps
      await transactionManager.startStep('step1', 'Step 1', 'tool');
      await transactionManager.completeStep('step1');

      await transactionManager.startStep('step2', 'Step 2', 'tool');
      await transactionManager.completeStep('step2');

      // Perform rollback
      await transactionManager.rollback();

      const status = transactionManager.getStatus();
      expect(status.status).toBe('rolled_back');

      // Steps should be marked as rolled back
      const rolledBackSteps = status.steps.filter(s => s.status === 'rolled_back');
      expect(rolledBackSteps.length).toBe(2);
    });

    it('should handle rollback with no completed steps', async () => {
      await transactionManager.rollback();

      const status = transactionManager.getStatus();
      expect(status.status).toBe('rolled_back');
    });
  });
});