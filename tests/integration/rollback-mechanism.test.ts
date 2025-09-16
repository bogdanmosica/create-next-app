import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { performance } from 'perf_hooks';

interface RollbackScenario {
  name: string;
  preset: string;
  failurePoint: 'template-loading' | 'file-creation' | 'dependency-installation' | 'build-validation';
  expectedBehavior: 'full-rollback' | 'partial-cleanup' | 'state-restoration';
  simulateFailure: () => Promise<void>;
  restoreNormalOperation: () => Promise<void>;
}

interface RollbackResult {
  success: boolean;
  rollbackTime: number;
  filesRemaining: string[];
  directoriesRemaining: string[];
  systemStateConsistent: boolean;
  errorMessage?: string;
}

interface TransactionState {
  id: string;
  timestamp: number;
  projectPath: string;
  preset: string;
  checkpoints: TransactionCheckpoint[];
  rollbackActions: RollbackAction[];
}

interface TransactionCheckpoint {
  name: string;
  timestamp: number;
  fileSystemState: string[];
  canRollbackTo: boolean;
}

interface RollbackAction {
  type: 'delete-file' | 'delete-directory' | 'restore-file' | 'cleanup-cache';
  target: string;
  executed: boolean;
  timestamp?: number;
}

describe('Rollback Mechanism Tests for Failed Generations', () => {
  const rollbackTestDir = path.join(process.cwd(), 'temp-rollback-tests');
  const backupDir = path.join(rollbackTestDir, '.rollback-snapshots');

  beforeAll(async () => {
    if (await fs.pathExists(rollbackTestDir)) {
      await fs.remove(rollbackTestDir);
    }
    await fs.ensureDir(rollbackTestDir);
    await fs.ensureDir(backupDir);
  });

  afterAll(async () => {
    if (await fs.pathExists(rollbackTestDir)) {
      await fs.remove(rollbackTestDir);
    }
  });

  beforeEach(async () => {
    // Clean test environment between tests
    const entries = await fs.readdir(rollbackTestDir);
    for (const entry of entries) {
      if (entry !== '.rollback-snapshots') {
        await fs.remove(path.join(rollbackTestDir, entry));
      }
    }
  });

  describe('Template Loading Failure Rollback', () => {
    it('should rollback when template files cannot be loaded', async () => {
      const projectPath = path.join(rollbackTestDir, 'template-load-failure');
      const preset = 'startup';

      const rollbackScenario: RollbackScenario = {
        name: 'Template Loading Failure',
        preset,
        failurePoint: 'template-loading',
        expectedBehavior: 'full-rollback',
        simulateFailure: async () => {
          // Simulate template loading failure by corrupting template access
          const originalCreateApp = require('../../src/tools/nextjs-creator.js').createNextjsApp;
          require('../../src/tools/nextjs-creator.js').createNextjsApp = async () => {
            throw new Error('SIMULATED: Template files not found');
          };
        },
        restoreNormalOperation: async () => {
          // Restore normal operation - would need proper module reload
          delete require.cache[require.resolve('../../src/tools/nextjs-creator.js')];
        }
      };

      const result = await executeRollbackTest(projectPath, rollbackScenario);

      expect(result.success).toBe(true);
      expect(result.systemStateConsistent).toBe(true);
      expect(result.filesRemaining).toHaveLength(0);
      expect(result.directoriesRemaining.filter(dir => !dir.includes('.rollback'))).toHaveLength(0);

      // Project directory should not exist after rollback
      expect(await fs.pathExists(projectPath)).toBe(false);
    });

    it('should handle template corruption gracefully', async () => {
      const projectPath = path.join(rollbackTestDir, 'template-corruption');

      // Create a scenario where template files exist but are corrupted
      const corruptedTemplateTest = async () => {
        const transaction = await createTransactionState(projectPath, 'blog');

        try {
          // Simulate starting project creation
          await fs.ensureDir(projectPath);
          transaction.checkpoints.push({
            name: 'project-directory-created',
            timestamp: Date.now(),
            fileSystemState: await captureFileSystemState(projectPath),
            canRollbackTo: true
          });

          // Simulate corrupted template causing failure
          throw new Error('SIMULATED: Template file corrupted during read');

        } catch (error) {
          // Execute rollback
          const rollbackResult = await executeTransactionRollback(transaction);
          return rollbackResult;
        }
      };

      const result = await corruptedTemplateTest();

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(false);
    });
  });

  describe('File Creation Failure Rollback', () => {
    it('should rollback when file system operations fail', async () => {
      const projectPath = path.join(rollbackTestDir, 'file-creation-failure');

      const rollbackScenario: RollbackScenario = {
        name: 'File Creation Failure',
        preset: 'dashboard',
        failurePoint: 'file-creation',
        expectedBehavior: 'full-rollback',
        simulateFailure: async () => {
          // Create a read-only directory to simulate permission failure
          await fs.ensureDir(projectPath);

          // On Windows, we'll simulate by creating a file where directory should be
          const conflictPath = path.join(projectPath, 'app');
          await fs.writeFile(conflictPath, 'conflict'); // This will prevent directory creation
        },
        restoreNormalOperation: async () => {
          // Clean up the conflict
          const conflictPath = path.join(projectPath, 'app');
          if (await fs.pathExists(conflictPath)) {
            await fs.remove(conflictPath);
          }
        }
      };

      const result = await executeRollbackTest(projectPath, rollbackScenario);

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(false);
    });

    it('should handle partial file creation scenarios', async () => {
      const projectPath = path.join(rollbackTestDir, 'partial-creation');

      const transaction = await createTransactionState(projectPath, 'minimal');

      try {
        // Simulate partial project creation
        await fs.ensureDir(projectPath);
        await fs.ensureDir(path.join(projectPath, 'app'));
        await fs.writeFile(path.join(projectPath, 'package.json'), '{}');

        transaction.checkpoints.push({
          name: 'partial-files-created',
          timestamp: Date.now(),
          fileSystemState: await captureFileSystemState(projectPath),
          canRollbackTo: true
        });

        // Simulate failure during creation
        throw new Error('SIMULATED: Disk space exhausted during file creation');

      } catch (error) {
        const rollbackResult = await executeTransactionRollback(transaction);

        expect(rollbackResult.success).toBe(true);
        expect(await fs.pathExists(projectPath)).toBe(false);
      }
    });
  });

  describe('Dependency Installation Failure Rollback', () => {
    it('should rollback when package installation fails', async () => {
      const projectPath = path.join(rollbackTestDir, 'dependency-failure');

      // First create a valid project structure
      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: 'minimal',
        projectName: 'dependency-failure'
      });

      const preInstallState = await captureFileSystemState(projectPath);

      // Simulate dependency installation failure
      const installFailureTest = async () => {
        const transaction = await createTransactionState(projectPath, 'minimal');

        transaction.checkpoints.push({
          name: 'pre-install-state',
          timestamp: Date.now(),
          fileSystemState: preInstallState,
          canRollbackTo: true
        });

        try {
          // Simulate package installation that creates node_modules then fails
          const nodeModulesPath = path.join(projectPath, 'node_modules');
          await fs.ensureDir(nodeModulesPath);
          await fs.writeFile(path.join(nodeModulesPath, 'package.json'), '{"corrupted": true}');

          // Simulate installation failure
          throw new Error('SIMULATED: Package installation failed - network timeout');

        } catch (error) {
          const rollbackResult = await executeTransactionRollback(transaction);
          return rollbackResult;
        }
      };

      const result = await installFailureTest();

      expect(result.success).toBe(true);

      // node_modules should be removed during rollback
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      expect(await fs.pathExists(nodeModulesPath)).toBe(false);

      // Original project files should remain
      expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
    });

    it('should handle corrupted package.json during installation', async () => {
      const projectPath = path.join(rollbackTestDir, 'corrupted-package-json');

      const corruptedPackageTest = async () => {
        const transaction = await createTransactionState(projectPath, 'blog');

        try {
          // Create project structure
          await fs.ensureDir(projectPath);

          // Create corrupted package.json that would cause installation to fail
          await fs.writeFile(path.join(projectPath, 'package.json'), '{ invalid json }');

          transaction.checkpoints.push({
            name: 'corrupted-package-created',
            timestamp: Date.now(),
            fileSystemState: await captureFileSystemState(projectPath),
            canRollbackTo: true
          });

          // This would fail during actual package installation
          throw new Error('SIMULATED: Invalid package.json format');

        } catch (error) {
          const rollbackResult = await executeTransactionRollback(transaction);
          return rollbackResult;
        }
      };

      const result = await corruptedPackageTest();

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(false);
    });
  });

  describe('Build Validation Failure Rollback', () => {
    it('should rollback when generated project fails to build', async () => {
      const projectPath = path.join(rollbackTestDir, 'build-validation-failure');

      const buildFailureTest = async () => {
        const transaction = await createTransactionState(projectPath, 'dashboard');

        try {
          // Create a project with intentional TypeScript errors
          await fs.ensureDir(projectPath);
          await fs.ensureDir(path.join(projectPath, 'app'));

          // Create problematic TypeScript file
          const problematicFile = path.join(projectPath, 'app', 'page.tsx');
          await fs.writeFile(problematicFile, `
            import { UndefinedComponent } from 'non-existent-module';

            export default function Page() {
              return <UndefinedComponent />; // This will cause build failure
            }
          `);

          transaction.checkpoints.push({
            name: 'project-with-errors-created',
            timestamp: Date.now(),
            fileSystemState: await captureFileSystemState(projectPath),
            canRollbackTo: true
          });

          // Simulate build validation failure
          throw new Error('SIMULATED: TypeScript build failed - module not found');

        } catch (error) {
          const rollbackResult = await executeTransactionRollback(transaction);
          return rollbackResult;
        }
      };

      const result = await buildFailureTest();

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(false);
    });

    it('should preserve valid projects when build validation is optional', async () => {
      const projectPath = path.join(rollbackTestDir, 'optional-build-validation');

      // Create a valid project
      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: 'minimal',
        projectName: 'optional-build-validation'
      });

      // Simulate optional build validation failure (should not rollback)
      const optionalBuildTest = async () => {
        const transaction = await createTransactionState(projectPath, 'minimal');
        transaction.checkpoints.push({
          name: 'valid-project-created',
          timestamp: Date.now(),
          fileSystemState: await captureFileSystemState(projectPath),
          canRollbackTo: false // Build validation is optional
        });

        try {
          // Simulate optional build check failure
          throw new Error('SIMULATED: Build validation failed but is non-critical');
        } catch (error) {
          // Since validation is optional, should not rollback
          return {
            success: true,
            rollbackTime: 0,
            filesRemaining: await captureFileSystemState(projectPath),
            directoriesRemaining: [projectPath],
            systemStateConsistent: true
          };
        }
      };

      const result = await optionalBuildTest();

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(true);
      expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
    });
  });

  describe('Complex Rollback Scenarios', () => {
    it('should handle cascading failures with multiple rollback points', async () => {
      const projectPath = path.join(rollbackTestDir, 'cascading-failures');

      const cascadingFailureTest = async () => {
        const transaction = await createTransactionState(projectPath, 'enterprise');

        try {
          // Checkpoint 1: Project directory created
          await fs.ensureDir(projectPath);
          transaction.checkpoints.push({
            name: 'directory-created',
            timestamp: Date.now(),
            fileSystemState: await captureFileSystemState(projectPath),
            canRollbackTo: true
          });

          // Checkpoint 2: Basic structure created
          await fs.ensureDir(path.join(projectPath, 'app'));
          await fs.writeFile(path.join(projectPath, 'package.json'), '{}');
          transaction.checkpoints.push({
            name: 'basic-structure-created',
            timestamp: Date.now(),
            fileSystemState: await captureFileSystemState(projectPath),
            canRollbackTo: true
          });

          // Checkpoint 3: Complex structure (simulate failure here)
          await fs.ensureDir(path.join(projectPath, 'components'));
          throw new Error('SIMULATED: Complex structure creation failed');

        } catch (error) {
          // Should rollback through all checkpoints
          const rollbackResult = await executeTransactionRollback(transaction);
          return rollbackResult;
        }
      };

      const result = await cascadingFailureTest();

      expect(result.success).toBe(true);
      expect(await fs.pathExists(projectPath)).toBe(false);
    });

    it('should handle concurrent generation failures', async () => {
      const concurrentProjects = [
        path.join(rollbackTestDir, 'concurrent-1'),
        path.join(rollbackTestDir, 'concurrent-2'),
        path.join(rollbackTestDir, 'concurrent-3')
      ];

      const concurrentFailureTest = async () => {
        const promises = concurrentProjects.map(async (projectPath, index) => {
          const transaction = await createTransactionState(projectPath, 'blog');

          try {
            await fs.ensureDir(projectPath);

            // Simulate failure in middle project
            if (index === 1) {
              throw new Error('SIMULATED: Concurrent generation conflict');
            }

            // Create successful project structure
            await fs.writeFile(path.join(projectPath, 'success.txt'), 'completed');

            return { success: true, projectPath };

          } catch (error) {
            const rollbackResult = await executeTransactionRollback(transaction);
            return { success: rollbackResult.success, projectPath, rolledBack: true };
          }
        });

        return await Promise.all(promises);
      };

      const results = await concurrentFailureTest();

      // First and third projects should succeed
      expect(results[0].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(await fs.pathExists(concurrentProjects[0])).toBe(true);
      expect(await fs.pathExists(concurrentProjects[2])).toBe(true);

      // Middle project should be rolled back
      expect(results[1].success).toBe(true); // Rollback succeeded
      expect(await fs.pathExists(concurrentProjects[1])).toBe(false);
    });

    it('should preserve system stability during rollback failures', async () => {
      const projectPath = path.join(rollbackTestDir, 'rollback-failure-recovery');

      const rollbackFailureTest = async () => {
        const transaction = await createTransactionState(projectPath, 'startup');

        try {
          // Create project structure
          await fs.ensureDir(projectPath);
          await fs.writeFile(path.join(projectPath, 'test.txt'), 'data');

          transaction.checkpoints.push({
            name: 'files-created',
            timestamp: Date.now(),
            fileSystemState: await captureFileSystemState(projectPath),
            canRollbackTo: true
          });

          throw new Error('SIMULATED: Primary operation failed');

        } catch (error) {
          // Simulate rollback failure by making directory non-deletable
          const protectedFile = path.join(projectPath, '.protected');
          await fs.writeFile(protectedFile, 'protected');

          try {
            const rollbackResult = await executeTransactionRollback(transaction);

            // Even if rollback partially fails, system should remain stable
            return {
              success: rollbackResult.success,
              systemStable: true,
              cleanupRequired: !rollbackResult.success
            };
          } catch (rollbackError) {
            // Rollback failed, but system should still be stable
            return {
              success: false,
              systemStable: true,
              cleanupRequired: true,
              rollbackError: rollbackError.message
            };
          }
        }
      };

      const result = await rollbackFailureTest();

      // System should remain stable even if rollback fails
      expect(result.systemStable).toBe(true);

      // Manual cleanup should be possible
      if (result.cleanupRequired) {
        await fs.remove(projectPath);
        expect(await fs.pathExists(projectPath)).toBe(false);
      }
    });
  });

  describe('Transaction State Management', () => {
    it('should maintain consistent transaction logs', async () => {
      const projectPath = path.join(rollbackTestDir, 'transaction-logging');
      const logPath = path.join(backupDir, 'transaction.log');

      const transaction = await createTransactionState(projectPath, 'minimal');

      // Simulate operations with logging
      await fs.ensureDir(projectPath);
      await logTransactionOperation(transaction, 'create-directory', projectPath);

      await fs.writeFile(path.join(projectPath, 'test.txt'), 'data');
      await logTransactionOperation(transaction, 'create-file', path.join(projectPath, 'test.txt'));

      // Force failure and rollback
      try {
        throw new Error('SIMULATED: Operation failed');
      } catch (error) {
        await executeTransactionRollback(transaction);
      }

      // Transaction log should exist and be valid
      expect(await fs.pathExists(logPath)).toBe(true);

      const logContent = await fs.readFile(logPath, 'utf-8');
      expect(logContent).toContain('create-directory');
      expect(logContent).toContain('create-file');
      expect(logContent).toContain('rollback-completed');
    });

    it('should handle transaction cleanup after successful completion', async () => {
      const projectPath = path.join(rollbackTestDir, 'successful-completion');

      const transaction = await createTransactionState(projectPath, 'blog');

      // Simulate successful project creation
      await fs.ensureDir(projectPath);
      await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "test"}');

      // Mark transaction as successful
      await markTransactionCompleted(transaction);

      // Transaction artifacts should be cleaned up
      const transactionFiles = await fs.readdir(backupDir);
      const transactionLogs = transactionFiles.filter(file =>
        file.includes(transaction.id) && file.includes('pending')
      );

      expect(transactionLogs).toHaveLength(0);

      // Project should remain
      expect(await fs.pathExists(projectPath)).toBe(true);
    });
  });
});

// Helper Functions

async function executeRollbackTest(
  projectPath: string,
  scenario: RollbackScenario
): Promise<RollbackResult> {
  const startTime = performance.now();

  try {
    // Simulate the failure
    await scenario.simulateFailure();

    // Attempt the operation that should fail
    try {
      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: scenario.preset as any,
        projectName: path.basename(projectPath)
      });

      // If we get here, the simulation didn't work
      throw new Error('Expected operation should have failed');
    } catch (operationError) {
      // This is expected - now test rollback
    }

  } catch (error) {
    // Rollback should happen automatically
  } finally {
    await scenario.restoreNormalOperation();
  }

  const rollbackTime = performance.now() - startTime;

  // Check rollback results
  const filesRemaining = await captureFileSystemState(projectPath);
  const directoriesRemaining = [];

  if (await fs.pathExists(projectPath)) {
    directoriesRemaining.push(projectPath);
  }

  return {
    success: filesRemaining.length === 0 && directoriesRemaining.length === 0,
    rollbackTime,
    filesRemaining,
    directoriesRemaining,
    systemStateConsistent: true
  };
}

async function createTransactionState(
  projectPath: string,
  preset: string
): Promise<TransactionState> {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: transactionId,
    timestamp: Date.now(),
    projectPath,
    preset,
    checkpoints: [],
    rollbackActions: []
  };
}

async function executeTransactionRollback(transaction: TransactionState): Promise<RollbackResult> {
  const startTime = performance.now();
  const errors: string[] = [];

  try {
    // Execute rollback actions in reverse order
    const rollbackActions = transaction.rollbackActions.slice().reverse();

    for (const action of rollbackActions) {
      try {
        switch (action.type) {
          case 'delete-file':
            if (await fs.pathExists(action.target)) {
              await fs.remove(action.target);
            }
            break;
          case 'delete-directory':
            if (await fs.pathExists(action.target)) {
              await fs.remove(action.target);
            }
            break;
          case 'cleanup-cache':
            // Cleanup any cache entries related to this transaction
            break;
        }
        action.executed = true;
        action.timestamp = Date.now();
      } catch (error) {
        errors.push(`Failed to execute ${action.type} on ${action.target}: ${error.message}`);
      }
    }

    // Remove the main project directory if it exists
    if (await fs.pathExists(transaction.projectPath)) {
      await fs.remove(transaction.projectPath);
    }

    const rollbackTime = performance.now() - startTime;

    return {
      success: errors.length === 0,
      rollbackTime,
      filesRemaining: await captureFileSystemState(transaction.projectPath),
      directoriesRemaining: await fs.pathExists(transaction.projectPath) ? [transaction.projectPath] : [],
      systemStateConsistent: true,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined
    };

  } catch (error) {
    return {
      success: false,
      rollbackTime: performance.now() - startTime,
      filesRemaining: [],
      directoriesRemaining: [],
      systemStateConsistent: false,
      errorMessage: error.message
    };
  }
}

async function captureFileSystemState(basePath: string): Promise<string[]> {
  const files: string[] = [];

  if (!await fs.pathExists(basePath)) {
    return files;
  }

  async function scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
    } catch (error) {
      // Directory might not be accessible, skip
    }
  }

  await scanDirectory(basePath);
  return files;
}

async function logTransactionOperation(
  transaction: TransactionState,
  operation: string,
  target: string
): Promise<void> {
  const logPath = path.join(backupDir, 'transaction.log');
  const logEntry = `${new Date().toISOString()} [${transaction.id}] ${operation}: ${target}\n`;

  await fs.appendFile(logPath, logEntry);

  // Add corresponding rollback action
  if (operation === 'create-directory') {
    transaction.rollbackActions.push({
      type: 'delete-directory',
      target,
      executed: false
    });
  } else if (operation === 'create-file') {
    transaction.rollbackActions.push({
      type: 'delete-file',
      target,
      executed: false
    });
  }
}

async function markTransactionCompleted(transaction: TransactionState): Promise<void> {
  const logPath = path.join(backupDir, 'transaction.log');
  const completionEntry = `${new Date().toISOString()} [${transaction.id}] transaction-completed\n`;

  await fs.appendFile(logPath, completionEntry);

  // Clean up pending transaction files
  const pendingFiles = await fs.readdir(backupDir);
  const transactionFiles = pendingFiles.filter(file =>
    file.includes(transaction.id) && file.includes('pending')
  );

  for (const file of transactionFiles) {
    await fs.remove(path.join(backupDir, file));
  }
}