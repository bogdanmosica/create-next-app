/**
 * @fileoverview Rollback Mechanism Tests
 * @description Focused tests for transaction rollback and cleanup validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TransactionManager, TransactionStep } from '../../src/utils/transaction-manager.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';

describe('Rollback Mechanism Tests', () => {
  let testDir: string;
  let manager: TransactionManager;

  beforeEach(async () => {
    testDir = path.join(tmpdir(), `mcp-rollback-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.ensureDir(testDir);
    manager = new TransactionManager(testDir);
  });

  afterEach(async () => {
    await manager.cleanup();
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('File Creation Rollback', () => {
    it('should rollback created files correctly', async () => {
      // Create test files through transaction
      await manager.startStep('create-files', 'Create test files', 'file');

      const files = ['test1.txt', 'test2.json', 'config/settings.yml'];
      for (const file of files) {
        const fullPath = path.join(testDir, file);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, `Content of ${file}`);
      }

      await manager.completeStep('create-files', files, []);

      // Verify files exist
      for (const file of files) {
        expect(await fs.pathExists(path.join(testDir, file))).toBe(true);
      }

      // Perform rollback
      const rollbackResult = await manager.enhancedRollback();

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.rolledBackSteps).toContain('create-files');

      // Verify files were removed
      for (const file of files) {
        expect(await fs.pathExists(path.join(testDir, file))).toBe(false);
      }
    });

    it('should rollback directory structures correctly', async () => {
      await manager.startStep('create-dirs', 'Create directory structure', 'file');

      const dirs = [
        'src/components',
        'src/utils',
        'tests/unit',
        'tests/integration',
        'config/environments'
      ];

      for (const dir of dirs) {
        const fullPath = path.join(testDir, dir);
        await fs.ensureDir(fullPath);
        await fs.writeFile(path.join(fullPath, '.gitkeep'), '');
      }

      const createdItems = [
        ...dirs.map(dir => `${dir}/.gitkeep`),
        'src',
        'tests',
        'config'
      ];

      await manager.completeStep('create-dirs', createdItems, []);

      // Verify structure exists
      for (const dir of dirs) {
        expect(await fs.pathExists(path.join(testDir, dir))).toBe(true);
      }

      // Rollback
      await manager.rollback();

      // Verify directories were removed
      for (const dir of dirs) {
        expect(await fs.pathExists(path.join(testDir, dir))).toBe(false);
      }
    });

    it('should handle rollback of nested file structures', async () => {
      await manager.startStep('nested-structure', 'Create nested structure', 'file');

      // Create deeply nested structure
      const nestedPath = path.join(testDir, 'deep/nested/folder/structure');
      await fs.ensureDir(nestedPath);

      const files = [
        'deep/file1.txt',
        'deep/nested/file2.txt',
        'deep/nested/folder/file3.txt',
        'deep/nested/folder/structure/file4.txt'
      ];

      for (const file of files) {
        await fs.writeFile(path.join(testDir, file), `Content: ${file}`);
      }

      await manager.completeStep('nested-structure', [...files, 'deep'], []);

      // Verify structure exists
      expect(await fs.pathExists(nestedPath)).toBe(true);
      for (const file of files) {
        expect(await fs.pathExists(path.join(testDir, file))).toBe(true);
      }

      // Rollback
      await manager.rollback();

      // Verify everything was cleaned up
      expect(await fs.pathExists(path.join(testDir, 'deep'))).toBe(false);
    });
  });

  describe('File Modification Rollback', () => {
    it('should restore modified files from backup', async () => {
      // Create original file
      const testFile = path.join(testDir, 'modified.txt');
      const originalContent = 'Original content\nLine 2\nLine 3';
      await fs.writeFile(testFile, originalContent);

      // Start transaction and modify file
      await manager.startStep('modify-file', 'Modify existing file', 'file');

      // Create backup and modify
      const relativePath = 'modified.txt';
      const backupPath = manager.getStatus().backupPath;
      if (backupPath) {
        await fs.ensureDir(backupPath);
        await fs.copy(testFile, path.join(backupPath, relativePath));
      }

      const modifiedContent = 'Modified content\nNew line\nAnother line';
      await fs.writeFile(testFile, modifiedContent);

      await manager.completeStep('modify-file', [], [relativePath]);

      // Verify file was modified
      const currentContent = await fs.readFile(testFile, 'utf-8');
      expect(currentContent).toBe(modifiedContent);

      // Rollback
      const rollbackResult = await manager.enhancedRollback();

      expect(rollbackResult.success).toBe(true);

      // Verify file was restored to original content
      const restoredContent = await fs.readFile(testFile, 'utf-8');
      expect(restoredContent).toBe(originalContent);
    });

    it('should handle multiple file modifications in single step', async () => {
      // Create original files
      const files = {
        'config.json': '{"original": true}',
        'package.json': '{"name": "original"}',
        'src/index.ts': 'console.log("original");'
      };

      for (const [file, content] of Object.entries(files)) {
        const fullPath = path.join(testDir, file);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, content);
      }

      // Start transaction
      await manager.startStep('bulk-modify', 'Modify multiple files', 'file');

      // Create backups and modify all files
      const backupPath = manager.getStatus().backupPath;
      if (backupPath) {
        await fs.ensureDir(backupPath);
        for (const file of Object.keys(files)) {
          await fs.copy(path.join(testDir, file), path.join(backupPath, file));
        }
      }

      const modifications = {
        'config.json': '{"modified": true}',
        'package.json': '{"name": "modified"}',
        'src/index.ts': 'console.log("modified");'
      };

      for (const [file, content] of Object.entries(modifications)) {
        await fs.writeFile(path.join(testDir, file), content);
      }

      await manager.completeStep('bulk-modify', [], Object.keys(files));

      // Verify all files were modified
      for (const [file, expectedContent] of Object.entries(modifications)) {
        const actualContent = await fs.readFile(path.join(testDir, file), 'utf-8');
        expect(actualContent).toBe(expectedContent);
      }

      // Rollback
      await manager.rollback();

      // Verify all files were restored
      for (const [file, expectedContent] of Object.entries(files)) {
        const actualContent = await fs.readFile(path.join(testDir, file), 'utf-8');
        expect(actualContent).toBe(expectedContent);
      }
    });

    it('should handle rollback when backup files are missing', async () => {
      const testFile = path.join(testDir, 'no-backup.txt');
      await fs.writeFile(testFile, 'Original content');

      await manager.startStep('no-backup-modify', 'Modify without proper backup', 'file');

      // Modify file but simulate missing backup
      await fs.writeFile(testFile, 'Modified without backup');
      await manager.completeStep('no-backup-modify', [], ['no-backup.txt']);

      // Remove backup directory to simulate missing backup
      const backupPath = manager.getStatus().backupPath;
      if (backupPath && await fs.pathExists(backupPath)) {
        await fs.remove(backupPath);
      }

      // Attempt rollback
      const rollbackResult = await manager.enhancedRollback();

      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.errors.length).toBeGreaterThan(0);
      expect(rollbackResult.errors[0]).toContain('no-backup.txt');
    });
  });

  describe('Complex Rollback Scenarios', () => {
    it('should rollback multiple steps in correct reverse order', async () => {
      const steps = [
        { id: 'step1', files: ['file1.txt'] },
        { id: 'step2', files: ['file2.txt'] },
        { id: 'step3', files: ['file3.txt'] }
      ];

      // Execute steps in order
      for (const step of steps) {
        await manager.startStep(step.id, `Execute ${step.id}`, 'file');

        for (const file of step.files) {
          await fs.writeFile(path.join(testDir, file), `Content from ${step.id}`);
        }

        await manager.completeStep(step.id, step.files, []);

        // Verify file exists after each step
        for (const file of step.files) {
          expect(await fs.pathExists(path.join(testDir, file))).toBe(true);
        }
      }

      // Rollback all steps
      const rollbackResult = await manager.enhancedRollback();

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.rolledBackSteps).toEqual(['step3', 'step2', 'step1']); // Reverse order

      // Verify all files removed
      for (const step of steps) {
        for (const file of step.files) {
          expect(await fs.pathExists(path.join(testDir, file))).toBe(false);
        }
      }
    });

    it('should handle mixed create and modify operations in rollback', async () => {
      // Create original file
      const existingFile = path.join(testDir, 'existing.txt');
      await fs.writeFile(existingFile, 'Existing content');

      // Step 1: Create new files
      await manager.startStep('create-step', 'Create new files', 'file');
      await fs.writeFile(path.join(testDir, 'new1.txt'), 'New file 1');
      await fs.writeFile(path.join(testDir, 'new2.txt'), 'New file 2');
      await manager.completeStep('create-step', ['new1.txt', 'new2.txt'], []);

      // Step 2: Modify existing file
      await manager.startStep('modify-step', 'Modify existing file', 'file');

      // Create backup
      const backupPath = manager.getStatus().backupPath;
      if (backupPath) {
        await fs.ensureDir(backupPath);
        await fs.copy(existingFile, path.join(backupPath, 'existing.txt'));
      }

      await fs.writeFile(existingFile, 'Modified existing content');
      await manager.completeStep('modify-step', [], ['existing.txt']);

      // Step 3: Create more files
      await manager.startStep('create-more', 'Create more files', 'file');
      await fs.writeFile(path.join(testDir, 'new3.txt'), 'New file 3');
      await manager.completeStep('create-more', ['new3.txt'], []);

      // Verify all changes
      expect(await fs.pathExists(path.join(testDir, 'new1.txt'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'new2.txt'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, 'new3.txt'))).toBe(true);

      const modifiedContent = await fs.readFile(existingFile, 'utf-8');
      expect(modifiedContent).toBe('Modified existing content');

      // Rollback everything
      await manager.rollback();

      // Verify rollback results
      expect(await fs.pathExists(path.join(testDir, 'new1.txt'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, 'new2.txt'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, 'new3.txt'))).toBe(false);

      // Verify existing file was restored
      const restoredContent = await fs.readFile(existingFile, 'utf-8');
      expect(restoredContent).toBe('Existing content');
    });

    it('should continue rollback when individual steps fail', async () => {
      // Create steps with one that will fail rollback
      await manager.startStep('step1', 'Successful step', 'file');
      await fs.writeFile(path.join(testDir, 'good.txt'), 'Content');
      await manager.completeStep('step1', ['good.txt'], []);

      await manager.startStep('step2', 'Problematic step', 'file');
      const problemFile = path.join(testDir, 'problem.txt');
      await fs.writeFile(problemFile, 'Problem content');

      // Make file read-only to cause rollback failure (platform dependent)
      try {
        await fs.chmod(problemFile, 0o444);
      } catch (error) {
        // Skip if chmod not supported
      }

      await manager.completeStep('step2', ['problem.txt'], []);

      await manager.startStep('step3', 'Another successful step', 'file');
      await fs.writeFile(path.join(testDir, 'good2.txt'), 'Content 2');
      await manager.completeStep('step3', ['good2.txt'], []);

      // Attempt rollback
      const rollbackResult = await manager.enhancedRollback(true); // Continue on error

      // Should have rolled back what it could
      expect(rollbackResult.rolledBackSteps).toContain('step1');
      expect(rollbackResult.rolledBackSteps).toContain('step3');

      // Should report the failure
      if (rollbackResult.failedRollbacks.length > 0) {
        expect(rollbackResult.failedRollbacks).toContain('step2');
        expect(rollbackResult.errors.length).toBeGreaterThan(0);
      }

      // Verify successful rollbacks worked
      expect(await fs.pathExists(path.join(testDir, 'good.txt'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, 'good2.txt'))).toBe(false);

      // Clean up
      try {
        await fs.chmod(problemFile, 0o755);
        await fs.remove(problemFile);
      } catch (error) {
        // Best effort cleanup
      }
    });
  });

  describe('Rollback Validation', () => {
    it('should validate rollback is possible before attempting', async () => {
      // Empty transaction
      let validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(false);
      expect(validation.reasons).toContain('No completed steps to rollback');

      // Add completed step
      await manager.startStep('test-step', 'Test step', 'file');
      await manager.completeStep('test-step');

      validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(true);
      expect(validation.completedSteps).toBe(1);

      // After rollback
      await manager.rollback();
      validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(false);
      expect(validation.reasons).toContain('Transaction already rolled back');
    });

    it('should detect missing backup directory for modified files', async () => {
      // Create step with modified files
      await manager.startStep('modify-step', 'Modify files', 'file');
      await manager.completeStep('modify-step', [], ['modified.txt']);

      // Remove backup directory
      const backupPath = manager.getStatus().backupPath;
      if (backupPath) {
        await fs.remove(backupPath);
      }

      const validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(false);
      expect(validation.reasons).toContain('Backup directory missing - cannot restore modified files');
    });

    it('should provide detailed rollback information', async () => {
      // Create multiple types of operations
      await manager.startStep('create-step', 'Create files', 'file');
      await fs.writeFile(path.join(testDir, 'created.txt'), 'content');
      await manager.completeStep('create-step', ['created.txt'], []);

      await manager.startStep('modify-step', 'Modify files', 'file');
      await fs.writeFile(path.join(testDir, 'existing.txt'), 'original');

      // Create backup
      const backupPath = manager.getStatus().backupPath;
      if (backupPath) {
        await fs.ensureDir(backupPath);
        await fs.copy(path.join(testDir, 'existing.txt'), path.join(backupPath, 'existing.txt'));
      }

      await fs.writeFile(path.join(testDir, 'existing.txt'), 'modified');
      await manager.completeStep('modify-step', [], ['existing.txt']);

      const validation = await manager.validateRollbackPossible();
      expect(validation.canRollback).toBe(true);
      expect(validation.completedSteps).toBe(2);
      expect(validation.reasons).toHaveLength(0);
    });
  });

  describe('Force Cleanup', () => {
    it('should force cleanup all created files', async () => {
      // Create multiple steps with files
      const steps = [
        { id: 'step1', files: ['force1.txt', 'force2.txt'] },
        { id: 'step2', files: ['dir/force3.txt'] },
        { id: 'step3', files: ['deep/nested/force4.txt'] }
      ];

      for (const step of steps) {
        await manager.startStep(step.id, `Force cleanup test ${step.id}`, 'file');

        for (const file of step.files) {
          const fullPath = path.join(testDir, file);
          await fs.ensureDir(path.dirname(fullPath));
          await fs.writeFile(fullPath, `Content from ${step.id}`);
        }

        await manager.completeStep(step.id, step.files, []);
      }

      // Verify all files exist
      for (const step of steps) {
        for (const file of step.files) {
          expect(await fs.pathExists(path.join(testDir, file))).toBe(true);
        }
      }

      // Force cleanup
      const cleanupResult = await manager.forceCleanup();

      expect(cleanupResult.cleaned.length).toBeGreaterThan(0);
      expect(cleanupResult.cleaned).toContain('force1.txt');
      expect(cleanupResult.cleaned).toContain('force2.txt');
      expect(cleanupResult.cleaned).toContain('dir/force3.txt');
      expect(cleanupResult.cleaned).toContain('deep/nested/force4.txt');

      // Verify files were removed
      for (const step of steps) {
        for (const file of step.files) {
          expect(await fs.pathExists(path.join(testDir, file))).toBe(false);
        }
      }
    });

    it('should handle force cleanup with permission errors', async () => {
      await manager.startStep('protected-step', 'Protected files', 'file');

      const protectedFile = path.join(testDir, 'protected.txt');
      await fs.writeFile(protectedFile, 'protected content');

      // Make file read-only (platform dependent)
      try {
        await fs.chmod(protectedFile, 0o444);
      } catch (error) {
        // Skip on platforms that don't support chmod
      }

      await manager.completeStep('protected-step', ['protected.txt'], []);

      const cleanupResult = await manager.forceCleanup();

      // Should attempt cleanup and report results
      if (cleanupResult.errors.length > 0) {
        expect(cleanupResult.errors[0]).toContain('protected.txt');
      } else {
        expect(cleanupResult.cleaned).toContain('protected.txt');
      }

      // Clean up
      try {
        await fs.chmod(protectedFile, 0o755);
        await fs.remove(protectedFile);
      } catch (error) {
        // Best effort
      }
    });

    it('should clean up transaction state files', async () => {
      await manager.startStep('cleanup-test', 'Test cleanup', 'file');
      await manager.completeStep('cleanup-test');
      await manager.saveState();

      // Verify transaction file exists
      const parentDir = path.dirname(testDir);
      const projectName = path.basename(testDir);
      const transactionFile = path.join(parentDir, `.mcp-transaction-${projectName}.json`);
      expect(await fs.pathExists(transactionFile)).toBe(true);

      const cleanupResult = await manager.forceCleanup();

      expect(cleanupResult.cleaned).toContain('Transaction state files');
      expect(await fs.pathExists(transactionFile)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rollback with no backup path set', async () => {
      // Create manager with invalid state
      const invalidManager = new TransactionManager(testDir);

      // Manually corrupt the state to have no backup path
      const state = invalidManager.getStatus();
      state.backupPath = undefined;

      await invalidManager.startStep('no-backup', 'No backup path', 'file');
      await invalidManager.completeStep('no-backup', [], ['some-file.txt']);

      try {
        await invalidManager.rollback();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle empty step arrays during rollback', async () => {
      // Complete without any files
      await manager.startStep('empty-step', 'Empty step', 'tool');
      await manager.completeStep('empty-step', [], []);

      const rollbackResult = await manager.enhancedRollback();

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.rolledBackSteps).toContain('empty-step');
      expect(rollbackResult.errors).toHaveLength(0);
    });

    it('should handle rollback of non-existent files gracefully', async () => {
      await manager.startStep('phantom-files', 'Files that disappear', 'file');

      // Record files that don't actually exist
      await manager.completeStep('phantom-files', ['phantom1.txt', 'phantom2.txt'], []);

      // Files don't exist but rollback should still succeed
      const rollbackResult = await manager.enhancedRollback();

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.rolledBackSteps).toContain('phantom-files');
    });
  });
});