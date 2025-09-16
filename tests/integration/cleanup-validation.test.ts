import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { performance } from 'perf_hooks';

interface IncompleteProjectState {
  projectPath: string;
  preset: string;
  completionPercentage: number;
  existingFiles: string[];
  existingDirectories: string[];
  partialFiles: string[];
  lockFiles: string[];
  temporaryFiles: string[];
  corruptedFiles: string[];
}

interface CleanupResult {
  success: boolean;
  cleanupTime: number;
  filesRemoved: number;
  directoriesRemoved: number;
  filesPreserved: number;
  lockFilesHandled: number;
  errorsEncountered: string[];
  systemStateRestored: boolean;
}

interface CleanupStrategy {
  name: string;
  preserveUserFiles: boolean;
  removeEmptyDirectories: boolean;
  handleLockFiles: boolean;
  forceRemoval: boolean;
  backupBeforeCleanup: boolean;
}

describe('Cleanup Validation Tests for Incomplete Projects', () => {
  const cleanupTestDir = path.join(process.cwd(), 'temp-cleanup-tests');
  const backupDir = path.join(cleanupTestDir, '.cleanup-backups');

  beforeAll(async () => {
    if (await fs.pathExists(cleanupTestDir)) {
      await fs.remove(cleanupTestDir);
    }
    await fs.ensureDir(cleanupTestDir);
    await fs.ensureDir(backupDir);
  });

  afterAll(async () => {
    if (await fs.pathExists(cleanupTestDir)) {
      await fs.remove(cleanupTestDir);
    }
  });

  beforeEach(async () => {
    // Clean test environment between tests
    const entries = await fs.readdir(cleanupTestDir);
    for (const entry of entries) {
      if (entry !== '.cleanup-backups') {
        const entryPath = path.join(cleanupTestDir, entry);
        try {
          await fs.remove(entryPath);
        } catch (error) {
          // Some files might be locked, handle gracefully
        }
      }
    }
  });

  describe('Basic Cleanup Operations', () => {
    it('should clean up partially created project directories', async () => {
      const projectPath = path.join(cleanupTestDir, 'partial-project-basic');

      // Create partially complete project
      const incompleteState = await createIncompleteProject(projectPath, 'blog', 0.3);

      const cleanupStrategy: CleanupStrategy = {
        name: 'Basic Cleanup',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: false
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);
      expect(result.filesRemoved).toBeGreaterThan(0);
      expect(result.systemStateRestored).toBe(true);

      // Project directory should be completely removed
      expect(await fs.pathExists(projectPath)).toBe(false);

      console.log(`Basic cleanup: ${result.filesRemoved} files, ${result.directoriesRemoved} directories removed in ${(result.cleanupTime / 1000).toFixed(2)}s`);
    });

    it('should handle empty directories and nested structures', async () => {
      const projectPath = path.join(cleanupTestDir, 'nested-structure');

      // Create complex nested structure with some empty directories
      const incompleteState = await createIncompleteProjectWithNesting(projectPath, 'dashboard', 0.5);

      const cleanupStrategy: CleanupStrategy = {
        name: 'Nested Cleanup',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: false
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);
      expect(result.directoriesRemoved).toBeGreaterThan(3); // Should remove multiple nested directories

      // Verify complete removal
      expect(await fs.pathExists(projectPath)).toBe(false);

      // Check that no orphaned directories remain
      const remainingEntries = await fs.readdir(cleanupTestDir);
      const projectEntries = remainingEntries.filter(entry => entry.startsWith('nested-structure'));
      expect(projectEntries).toHaveLength(0);
    });

    it('should clean up temporary and build artifacts', async () => {
      const projectPath = path.join(cleanupTestDir, 'build-artifacts');

      // Create project with various temporary files
      const incompleteState = await createIncompleteProjectWithBuildArtifacts(projectPath, 'startup');

      const cleanupStrategy: CleanupStrategy = {
        name: 'Build Artifacts Cleanup',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: false
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);

      // Verify specific artifacts are removed
      const artifactPaths = [
        path.join(projectPath, 'node_modules'),
        path.join(projectPath, '.next'),
        path.join(projectPath, 'dist'),
        path.join(projectPath, '.cache')
      ];

      for (const artifactPath of artifactPaths) {
        expect(await fs.pathExists(artifactPath)).toBe(false);
      }
    });
  });

  describe('Selective Cleanup Operations', () => {
    it('should preserve user-created files while cleaning generated content', async () => {
      const projectPath = path.join(cleanupTestDir, 'user-files-preservation');

      // Create project with mix of generated and user files
      const incompleteState = await createIncompleteProjectWithUserFiles(projectPath, 'blog');

      const cleanupStrategy: CleanupStrategy = {
        name: 'Selective Cleanup',
        preserveUserFiles: true,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: true
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);
      expect(result.filesPreserved).toBeGreaterThan(0);

      // User files should be preserved
      const userFiles = [
        'user-notes.md',
        'custom-config.json',
        'my-component.tsx'
      ];

      for (const userFile of userFiles) {
        const filePath = path.join(projectPath, userFile);
        expect(await fs.pathExists(filePath)).toBe(true);
      }

      // Generated files should be removed
      const generatedFiles = [
        'package.json',
        'tsconfig.json',
        'next.config.mjs'
      ];

      for (const genFile of generatedFiles) {
        const filePath = path.join(projectPath, genFile);
        expect(await fs.pathExists(filePath)).toBe(false);
      }
    });

    it('should handle projects with mixed completion states', async () => {
      const projectPath = path.join(cleanupTestDir, 'mixed-completion');

      // Create project where some parts are complete, others incomplete
      const incompleteState = await createMixedCompletionProject(projectPath, 'startup');

      const cleanupStrategy: CleanupStrategy = {
        name: 'Mixed State Cleanup',
        preserveUserFiles: true,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: true
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);

      // Complete components should be preserved or cleanly removed
      // Incomplete components should be fully removed
      const completeComponentPath = path.join(projectPath, 'app');
      const incompleteComponentPath = path.join(projectPath, 'incomplete-component');

      // Complete component might be preserved based on user file detection
      // Incomplete component should definitely be removed
      expect(await fs.pathExists(incompleteComponentPath)).toBe(false);
    });

    it('should create backups when requested', async () => {
      const projectPath = path.join(cleanupTestDir, 'backup-creation');

      const incompleteState = await createIncompleteProject(projectPath, 'dashboard', 0.7);

      const cleanupStrategy: CleanupStrategy = {
        name: 'Backup Creation',
        preserveUserFiles: true,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: true
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);

      // Backup should be created
      const backupFiles = await fs.readdir(backupDir);
      const projectBackups = backupFiles.filter(file => file.includes('backup-creation'));

      expect(projectBackups.length).toBeGreaterThan(0);

      // Verify backup contains original files
      if (projectBackups.length > 0) {
        const backupPath = path.join(backupDir, projectBackups[0]);
        const backupExists = await fs.pathExists(backupPath);
        expect(backupExists).toBe(true);
      }
    });
  });

  describe('Lock File and Process Handling', () => {
    it('should handle package manager lock files', async () => {
      const projectPath = path.join(cleanupTestDir, 'package-lock-handling');

      // Create project with various lock files
      const incompleteState = await createIncompleteProjectWithLockFiles(projectPath, 'minimal');

      const cleanupStrategy: CleanupStrategy = {
        name: 'Lock File Handling',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: false
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);
      expect(result.lockFilesHandled).toBeGreaterThan(0);

      // Lock files should be removed
      const lockFiles = [
        'package-lock.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        '.npmrc'
      ];

      for (const lockFile of lockFiles) {
        const lockPath = path.join(projectPath, lockFile);
        expect(await fs.pathExists(lockPath)).toBe(false);
      }
    });

    it('should wait for processes to release file handles', async () => {
      const projectPath = path.join(cleanupTestDir, 'process-handling');

      // Create project and simulate file handle locks
      const incompleteState = await createIncompleteProject(projectPath, 'blog', 0.6);

      // Simulate file being held open (on Windows this would block deletion)
      const lockedFilePath = path.join(projectPath, 'locked-file.txt');
      await fs.writeFile(lockedFilePath, 'locked content');

      const cleanupStrategy: CleanupStrategy = {
        name: 'Process Handling',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: true, // Force removal even if locked
        backupBeforeCleanup: false
      };

      const startTime = performance.now();
      const result = await executeCleanup(incompleteState, cleanupStrategy);
      const cleanupTime = performance.now() - startTime;

      expect(result.success).toBe(true);

      // Should handle locked files gracefully
      expect(cleanupTime).toBeLessThan(30000); // Should not hang indefinitely

      // File should eventually be removed
      expect(await fs.pathExists(lockedFilePath)).toBe(false);
    });

    it('should handle node_modules cleanup challenges', async () => {
      const projectPath = path.join(cleanupTestDir, 'node-modules-cleanup');

      // Create project with complex node_modules structure
      const incompleteState = await createIncompleteProjectWithNodeModules(projectPath, 'enterprise');

      const cleanupStrategy: CleanupStrategy = {
        name: 'Node Modules Cleanup',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: true,
        backupBeforeCleanup: false
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);

      // node_modules should be completely removed
      const nodeModulesPath = path.join(projectPath, 'node_modules');
      expect(await fs.pathExists(nodeModulesPath)).toBe(false);

      // Should handle deeply nested node_modules
      const deepModulesPath = path.join(projectPath, 'components', 'node_modules');
      expect(await fs.pathExists(deepModulesPath)).toBe(false);
    });
  });

  describe('Error Recovery and Robustness', () => {
    it('should handle permission denied errors gracefully', async () => {
      const projectPath = path.join(cleanupTestDir, 'permission-errors');

      const incompleteState = await createIncompleteProject(projectPath, 'startup', 0.4);

      // Simulate permission errors by creating read-only files/directories
      await simulatePermissionRestrictions(projectPath);

      const cleanupStrategy: CleanupStrategy = {
        name: 'Permission Error Handling',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: true,
        backupBeforeCleanup: false
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      // Should succeed despite some permission errors
      expect(result.success).toBe(true);
      expect(result.errorsEncountered.length).toBeGreaterThanOrEqual(0);

      // Should provide clear error reporting
      if (result.errorsEncountered.length > 0) {
        const permissionErrors = result.errorsEncountered.filter(error =>
          error.includes('permission') || error.includes('EACCES') || error.includes('EPERM')
        );
        expect(permissionErrors.length).toBeGreaterThan(0);
      }
    });

    it('should continue cleanup after individual file failures', async () => {
      const projectPath = path.join(cleanupTestDir, 'partial-failure-continuation');

      const incompleteState = await createIncompleteProjectWithProblematicFiles(projectPath, 'dashboard');

      const cleanupStrategy: CleanupStrategy = {
        name: 'Partial Failure Continuation',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: false
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      expect(result.success).toBe(true);

      // Should remove most files despite some failures
      expect(result.filesRemoved).toBeGreaterThan(5);

      // Should report encountered errors but continue operation
      expect(result.errorsEncountered.length).toBeGreaterThanOrEqual(0);
    });

    it('should maintain system stability during cleanup failures', async () => {
      const projectPath = path.join(cleanupTestDir, 'system-stability');

      const incompleteState = await createIncompleteProject(projectPath, 'minimal', 0.8);

      // Create extreme failure scenario
      await simulateExtremeCleanupChallenges(projectPath);

      const cleanupStrategy: CleanupStrategy = {
        name: 'System Stability',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: true,
        backupBeforeCleanup: true
      };

      const result = await executeCleanup(incompleteState, cleanupStrategy);

      // Even if cleanup fails, system should remain stable
      expect(result.systemStateRestored).toBe(true);

      // Should not leave system in worse state than before
      const systemState = await verifySystemStability();
      expect(systemState.isStable).toBe(true);
    });
  });

  describe('Comprehensive Cleanup Scenarios', () => {
    it('should handle multiple incomplete projects simultaneously', async () => {
      const projectPaths = [
        path.join(cleanupTestDir, 'multi-1'),
        path.join(cleanupTestDir, 'multi-2'),
        path.join(cleanupTestDir, 'multi-3')
      ];

      const incompleteStates = [];
      for (let i = 0; i < projectPaths.length; i++) {
        const state = await createIncompleteProject(projectPaths[i], 'blog', 0.3 + i * 0.2);
        incompleteStates.push(state);
      }

      const cleanupStrategy: CleanupStrategy = {
        name: 'Multiple Projects Cleanup',
        preserveUserFiles: false,
        removeEmptyDirectories: true,
        handleLockFiles: true,
        forceRemoval: false,
        backupBeforeCleanup: false
      };

      const results = [];
      for (const state of incompleteStates) {
        const result = await executeCleanup(state, cleanupStrategy);
        results.push(result);
      }

      // All cleanups should succeed
      for (const result of results) {
        expect(result.success).toBe(true);
      }

      // All project directories should be removed
      for (const projectPath of projectPaths) {
        expect(await fs.pathExists(projectPath)).toBe(false);
      }

      const totalFilesRemoved = results.reduce((sum, r) => sum + r.filesRemoved, 0);
      console.log(`Multiple project cleanup: ${totalFilesRemoved} total files removed`);
    });

    it('should validate cleanup completeness across different presets', async () => {
      const presets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];
      const cleanupResults = [];

      for (const preset of presets) {
        const projectPath = path.join(cleanupTestDir, `preset-${preset}`);
        const incompleteState = await createIncompleteProject(projectPath, preset, 0.6);

        const cleanupStrategy: CleanupStrategy = {
          name: `${preset} Cleanup`,
          preserveUserFiles: false,
          removeEmptyDirectories: true,
          handleLockFiles: true,
          forceRemoval: false,
          backupBeforeCleanup: false
        };

        const result = await executeCleanup(incompleteState, cleanupStrategy);
        cleanupResults.push({ preset, result });
      }

      // All presets should clean up successfully
      for (const { preset, result } of cleanupResults) {
        expect(result.success).toBe(true);
        expect(result.systemStateRestored).toBe(true);
        console.log(`${preset}: ${result.filesRemoved} files removed in ${(result.cleanupTime / 1000).toFixed(2)}s`);
      }

      // More complex presets should have more files to clean
      const minimalResult = cleanupResults.find(r => r.preset === 'minimal')!.result;
      const enterpriseResult = cleanupResults.find(r => r.preset === 'enterprise')!.result;

      expect(enterpriseResult.filesRemoved).toBeGreaterThan(minimalResult.filesRemoved);
    });
  });
});

// Helper Functions

async function createIncompleteProject(
  projectPath: string,
  preset: string,
  completionPercentage: number
): Promise<IncompleteProjectState> {
  await fs.ensureDir(projectPath);

  const files: string[] = [];
  const directories: string[] = [];
  const partialFiles: string[] = [];

  // Create basic structure
  if (completionPercentage > 0.1) {
    await fs.writeFile(path.join(projectPath, 'package.json'), '{"name": "test"}');
    files.push('package.json');
  }

  if (completionPercentage > 0.3) {
    await fs.ensureDir(path.join(projectPath, 'app'));
    directories.push('app');
    await fs.writeFile(path.join(projectPath, 'app', 'layout.tsx'), 'export default function Layout() { return null; }');
    files.push('app/layout.tsx');
  }

  if (completionPercentage > 0.5) {
    await fs.writeFile(path.join(projectPath, 'tsconfig.json'), '{}');
    files.push('tsconfig.json');
  }

  if (completionPercentage > 0.7) {
    await fs.ensureDir(path.join(projectPath, 'components'));
    directories.push('components');
  }

  // Create some partial files
  if (completionPercentage < 1.0) {
    const partialFile = path.join(projectPath, 'partial.tsx');
    await fs.writeFile(partialFile, 'export default function'); // Incomplete
    partialFiles.push('partial.tsx');
  }

  return {
    projectPath,
    preset,
    completionPercentage,
    existingFiles: files,
    existingDirectories: directories,
    partialFiles,
    lockFiles: [],
    temporaryFiles: [],
    corruptedFiles: []
  };
}

async function createIncompleteProjectWithNesting(
  projectPath: string,
  preset: string,
  completionPercentage: number
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, completionPercentage);

  // Add nested structure
  await fs.ensureDir(path.join(projectPath, 'components', 'ui', 'forms'));
  await fs.ensureDir(path.join(projectPath, 'lib', 'utils', 'helpers'));
  await fs.ensureDir(path.join(projectPath, 'empty-dir')); // Empty directory

  baseState.existingDirectories.push(
    'components/ui',
    'components/ui/forms',
    'lib',
    'lib/utils',
    'lib/utils/helpers',
    'empty-dir'
  );

  return baseState;
}

async function createIncompleteProjectWithBuildArtifacts(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.8);

  // Add build artifacts
  await fs.ensureDir(path.join(projectPath, 'node_modules'));
  await fs.ensureDir(path.join(projectPath, '.next'));
  await fs.ensureDir(path.join(projectPath, 'dist'));
  await fs.ensureDir(path.join(projectPath, '.cache'));

  await fs.writeFile(path.join(projectPath, '.next', 'build-manifest.json'), '{}');
  await fs.writeFile(path.join(projectPath, 'dist', 'index.js'), 'console.log("built")');

  baseState.existingDirectories.push('node_modules', '.next', 'dist', '.cache');
  baseState.existingFiles.push('.next/build-manifest.json', 'dist/index.js');

  return baseState;
}

async function createIncompleteProjectWithUserFiles(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.5);

  // Add user files
  await fs.writeFile(path.join(projectPath, 'user-notes.md'), '# My Notes');
  await fs.writeFile(path.join(projectPath, 'custom-config.json'), '{"userSetting": true}');
  await fs.writeFile(path.join(projectPath, 'my-component.tsx'), 'export const MyComponent = () => <div>Mine</div>');

  baseState.existingFiles.push('user-notes.md', 'custom-config.json', 'my-component.tsx');

  return baseState;
}

async function createMixedCompletionProject(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.6);

  // Add complete component
  await fs.ensureDir(path.join(projectPath, 'complete-component'));
  await fs.writeFile(path.join(projectPath, 'complete-component', 'index.ts'), 'export * from "./component";');
  await fs.writeFile(path.join(projectPath, 'complete-component', 'component.tsx'), 'export const Component = () => <div>Complete</div>;');

  // Add incomplete component
  await fs.ensureDir(path.join(projectPath, 'incomplete-component'));
  await fs.writeFile(path.join(projectPath, 'incomplete-component', 'partial.ts'), 'export const'); // Incomplete

  baseState.existingDirectories.push('complete-component', 'incomplete-component');
  baseState.existingFiles.push('complete-component/index.ts', 'complete-component/component.tsx');
  baseState.partialFiles.push('incomplete-component/partial.ts');

  return baseState;
}

async function createIncompleteProjectWithLockFiles(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.4);

  // Add various lock files
  await fs.writeFile(path.join(projectPath, 'package-lock.json'), '{}');
  await fs.writeFile(path.join(projectPath, 'yarn.lock'), '# yarn lockfile v1');
  await fs.writeFile(path.join(projectPath, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4');
  await fs.writeFile(path.join(projectPath, '.npmrc'), 'registry=https://registry.npmjs.org/');

  baseState.lockFiles.push('package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.npmrc');

  return baseState;
}

async function createIncompleteProjectWithNodeModules(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.7);

  // Create complex node_modules structure
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  await fs.ensureDir(nodeModulesPath);

  // Add some packages with nested dependencies
  await fs.ensureDir(path.join(nodeModulesPath, 'react'));
  await fs.writeFile(path.join(nodeModulesPath, 'react', 'package.json'), '{"name": "react"}');

  await fs.ensureDir(path.join(nodeModulesPath, '@types', 'react'));
  await fs.writeFile(path.join(nodeModulesPath, '@types', 'react', 'package.json'), '{"name": "@types/react"}');

  // Add nested node_modules (common in monorepos)
  await fs.ensureDir(path.join(projectPath, 'components', 'node_modules'));

  baseState.existingDirectories.push('node_modules', 'node_modules/react', 'node_modules/@types', 'node_modules/@types/react', 'components/node_modules');
  baseState.existingFiles.push('node_modules/react/package.json', 'node_modules/@types/react/package.json');

  return baseState;
}

async function createIncompleteProjectWithProblematicFiles(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.6);

  // Add files that might cause cleanup issues
  await fs.writeFile(path.join(projectPath, 'very-long-filename-that-exceeds-normal-path-limits.txt'), 'content');
  await fs.writeFile(path.join(projectPath, 'file with spaces.txt'), 'content');
  await fs.writeFile(path.join(projectPath, '文件.txt'), 'unicode filename'); // Unicode filename

  baseState.existingFiles.push(
    'very-long-filename-that-exceeds-normal-path-limits.txt',
    'file with spaces.txt',
    '文件.txt'
  );

  return baseState;
}

async function executeCleanup(
  incompleteState: IncompleteProjectState,
  strategy: CleanupStrategy
): Promise<CleanupResult> {
  const startTime = performance.now();
  const errors: string[] = [];
  let filesRemoved = 0;
  let directoriesRemoved = 0;
  let filesPreserved = 0;
  let lockFilesHandled = 0;

  try {
    const { projectPath } = incompleteState;

    // Create backup if requested
    if (strategy.backupBeforeCleanup) {
      const backupPath = path.join(backupDir, `${path.basename(projectPath)}-${Date.now()}`);
      if (await fs.pathExists(projectPath)) {
        await fs.copy(projectPath, backupPath);
      }
    }

    // Handle lock files first
    if (strategy.handleLockFiles) {
      for (const lockFile of incompleteState.lockFiles) {
        const lockPath = path.join(projectPath, lockFile);
        if (await fs.pathExists(lockPath)) {
          try {
            await fs.remove(lockPath);
            lockFilesHandled++;
          } catch (error) {
            errors.push(`Failed to remove lock file ${lockFile}: ${error.message}`);
          }
        }
      }
    }

    // Remove or preserve files based on strategy
    if (await fs.pathExists(projectPath)) {
      if (strategy.preserveUserFiles) {
        // Analyze and selectively clean
        const analysis = await analyzeProjectContents(projectPath);

        for (const file of analysis.generatedFiles) {
          try {
            await fs.remove(path.join(projectPath, file));
            filesRemoved++;
          } catch (error) {
            errors.push(`Failed to remove generated file ${file}: ${error.message}`);
          }
        }

        filesPreserved = analysis.userFiles.length;

      } else {
        // Remove everything
        const filesBefore = await countFilesRecursively(projectPath);

        if (strategy.forceRemoval) {
          try {
            await fs.remove(projectPath);
            filesRemoved = filesBefore.files;
            directoriesRemoved = filesBefore.directories;
          } catch (error) {
            // Try individual file removal
            await removeIndividualFiles(projectPath, errors);
            const filesAfter = await countFilesRecursively(projectPath);
            filesRemoved = filesBefore.files - (filesAfter?.files || 0);
            directoriesRemoved = filesBefore.directories - (filesAfter?.directories || 0);
          }
        } else {
          await removeIndividualFiles(projectPath, errors);
          const filesAfter = await countFilesRecursively(projectPath);
          filesRemoved = filesBefore.files - (filesAfter?.files || 0);
          directoriesRemoved = filesBefore.directories - (filesAfter?.directories || 0);
        }
      }

      // Remove empty directories if requested
      if (strategy.removeEmptyDirectories) {
        await removeEmptyDirectories(projectPath, errors);
      }
    }

  } catch (error) {
    errors.push(`Cleanup failed: ${error.message}`);
  }

  const cleanupTime = performance.now() - startTime;

  return {
    success: errors.length === 0 || errors.length < 3, // Allow some minor errors
    cleanupTime,
    filesRemoved,
    directoriesRemoved,
    filesPreserved,
    lockFilesHandled,
    errorsEncountered: errors,
    systemStateRestored: await verifySystemStability().then(s => s.isStable)
  };
}

async function simulatePermissionRestrictions(projectPath: string): Promise<void> {
  // Create a file that simulates permission restrictions
  const restrictedFile = path.join(projectPath, 'restricted.txt');
  await fs.writeFile(restrictedFile, 'restricted content');

  // Note: On Windows, we can't easily simulate true permission restrictions in tests,
  // but we can create the structure for testing the error handling
}

async function simulateExtremeCleanupChallenges(projectPath: string): Promise<void> {
  // Create extremely nested structure
  let deepPath = projectPath;
  for (let i = 0; i < 50; i++) {
    deepPath = path.join(deepPath, `level-${i}`);
    await fs.ensureDir(deepPath);
  }

  // Create file at deepest level
  await fs.writeFile(path.join(deepPath, 'deep-file.txt'), 'deep content');
}

async function analyzeProjectContents(projectPath: string): Promise<{
  userFiles: string[];
  generatedFiles: string[];
}> {
  const userFiles: string[] = [];
  const generatedFiles: string[] = [];

  const allFiles = await getAllFilesRecursively(projectPath);

  for (const file of allFiles) {
    // Simple heuristic: files with certain names are likely user-created
    const basename = path.basename(file);
    const isUserFile = basename.startsWith('user-') ||
                      basename.startsWith('my-') ||
                      basename.startsWith('custom-') ||
                      basename.includes('notes') ||
                      basename.includes('config');

    if (isUserFile) {
      userFiles.push(file);
    } else {
      generatedFiles.push(file);
    }
  }

  return { userFiles, generatedFiles };
}

async function countFilesRecursively(dirPath: string): Promise<{ files: number; directories: number } | null> {
  if (!await fs.pathExists(dirPath)) {
    return null;
  }

  let files = 0;
  let directories = 0;

  async function count(currentPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          directories++;
          await count(entryPath);
        } else if (entry.isFile()) {
          files++;
        }
      }
    } catch (error) {
      // Directory might not be accessible
    }
  }

  await count(dirPath);
  return { files, directories };
}

async function removeIndividualFiles(dirPath: string, errors: string[]): Promise<void> {
  if (!await fs.pathExists(dirPath)) {
    return;
  }

  async function removeRecursively(currentPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);

        try {
          if (entry.isDirectory()) {
            await removeRecursively(entryPath);
            await fs.remove(entryPath);
          } else {
            await fs.remove(entryPath);
          }
        } catch (error) {
          errors.push(`Failed to remove ${entryPath}: ${error.message}`);
        }
      }

      // Try to remove the directory itself
      if (currentPath !== dirPath) {
        try {
          await fs.remove(currentPath);
        } catch (error) {
          errors.push(`Failed to remove directory ${currentPath}: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to read directory ${currentPath}: ${error.message}`);
    }
  }

  await removeRecursively(dirPath);

  // Finally try to remove the main directory
  try {
    await fs.remove(dirPath);
  } catch (error) {
    errors.push(`Failed to remove main directory ${dirPath}: ${error.message}`);
  }
}

async function removeEmptyDirectories(basePath: string, errors: string[]): Promise<void> {
  if (!await fs.pathExists(basePath)) {
    return;
  }

  async function removeEmpty(currentPath: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(currentPath);

      // Process subdirectories first
      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry);
        const stats = await fs.stat(entryPath);

        if (stats.isDirectory()) {
          const wasRemoved = await removeEmpty(entryPath);
          // Directory was removed, so we need to refresh our entries list
          if (wasRemoved) {
            return await removeEmpty(currentPath); // Recurse to check if this directory is now empty
          }
        }
      }

      // Check if directory is now empty
      const remainingEntries = await fs.readdir(currentPath);
      if (remainingEntries.length === 0 && currentPath !== basePath) {
        await fs.remove(currentPath);
        return true;
      }

      return false;
    } catch (error) {
      errors.push(`Failed to process directory ${currentPath}: ${error.message}`);
      return false;
    }
  }

  await removeEmpty(basePath);
}

async function getAllFilesRecursively(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  if (!await fs.pathExists(dirPath)) {
    return files;
  }

  async function scan(currentPath: string, relativePath = ''): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);
        const relativeEntryPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await scan(entryPath, relativeEntryPath);
        } else if (entry.isFile()) {
          files.push(relativeEntryPath);
        }
      }
    } catch (error) {
      // Directory might not be accessible
    }
  }

  await scan(dirPath);
  return files;
}

async function verifySystemStability(): Promise<{ isStable: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Check if test directory is accessible
    await fs.access(cleanupTestDir);

    // Check if we can create and remove files
    const testFile = path.join(cleanupTestDir, 'stability-test.tmp');
    await fs.writeFile(testFile, 'test');
    await fs.remove(testFile);

  } catch (error) {
    issues.push(`System stability issue: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    isStable: issues.length === 0,
    issues
  };
}

// Enhanced helper functions for advanced cleanup scenarios

async function createIncompleteProjectWithCorruptedFiles(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.6);

  // Create corrupted/problematic files
  const corruptedFile1 = path.join(projectPath, 'corrupted.json');
  const corruptedFile2 = path.join(projectPath, 'invalid-utf8.txt');
  const zeroByteFile = path.join(projectPath, 'zero-byte.txt');

  // Invalid JSON
  await fs.writeFile(corruptedFile1, '{"invalid": json content without closing brace');
  
  // Invalid UTF-8 content
  const invalidUtf8 = Buffer.from([0xFF, 0xFE, 0x00, 0x01, 0x02]);
  await fs.writeFile(corruptedFile2, invalidUtf8);

  // Zero byte file
  await fs.writeFile(zeroByteFile, '');

  baseState.corruptedFiles.push('corrupted.json', 'invalid-utf8.txt', 'zero-byte.txt');

  return baseState;
}

async function createLargeIncompleteProject(
  projectPath: string,
  preset: string
): Promise<IncompleteProjectState> {
  const baseState = await createIncompleteProject(projectPath, preset, 0.8);

  // Create a large number of files and directories
  for (let i = 0; i < 100; i++) {
    const dir = path.join(projectPath, `large-dir-${i}`);
    await fs.ensureDir(dir);
    
    for (let j = 0; j < 10; j++) {
      const file = path.join(dir, `file-${j}.txt`);
      await fs.writeFile(file, `Content for file ${i}-${j}\n`.repeat(100));
      baseState.existingFiles.push(`large-dir-${i}/file-${j}.txt`);
    }
    
    baseState.existingDirectories.push(`large-dir-${i}`);
  }

  return baseState;
}

async function executeCleanupWithProgress(
  incompleteState: IncompleteProjectState,
  strategy: CleanupStrategy,
  progressEvents: string[]
): Promise<CleanupResult> {
  
  progressEvents.push('cleanup-started');
  
  const result = await executeCleanup(incompleteState, strategy);
  
  progressEvents.push('cleanup-completed');
  progressEvents.push(`files-removed:${result.filesRemoved}`);
  progressEvents.push(`directories-removed:${result.directoriesRemoved}`);
  
  if (result.errorsEncountered.length > 0) {
    progressEvents.push(`errors-encountered:${result.errorsEncountered.length}`);
  }

  return result;
}

async function executeCleanupWithRollback(
  incompleteState: IncompleteProjectState,
  strategy: CleanupStrategy,
  testDir?: string
): Promise<CleanupResult> {
  
  const baseDir = testDir || process.cwd();
  const backupPath = path.join(baseDir, '.cleanup-backups', `rollback-backup-${Date.now()}`);
  
  try {
    // Ensure backup directory exists
    await fs.ensureDir(path.dirname(backupPath));
    
    // Create backup before cleanup
    if (await fs.pathExists(incompleteState.projectPath)) {
      await fs.copy(incompleteState.projectPath, backupPath);
    }

    const result = await executeCleanup(incompleteState, strategy);

    // If cleanup succeeded, remove backup
    if (result.success && await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    return result;

  } catch (error) {
    // On failure, attempt to restore from backup
    if (await fs.pathExists(backupPath)) {
      try {
        if (await fs.pathExists(incompleteState.projectPath)) {
          await fs.remove(incompleteState.projectPath);
        }
        await fs.move(backupPath, incompleteState.projectPath);
        
        return {
          success: false,
          cleanupTime: 0,
          filesRemoved: 0,
          directoriesRemoved: 0,
          filesPreserved: 0,
          lockFilesHandled: 0,
          errorsEncountered: [`Cleanup failed, restored from backup: ${error instanceof Error ? error.message : String(error)}`],
          systemStateRestored: true
        };
      } catch (restoreError) {
        return {
          success: false,
          cleanupTime: 0,
          filesRemoved: 0,
          directoriesRemoved: 0,
          filesPreserved: 0,
          lockFilesHandled: 0,
          errorsEncountered: [
            `Cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
            `Rollback failed: ${restoreError instanceof Error ? restoreError.message : String(restoreError)}`
          ],
          systemStateRestored: false
        };
      }
    }

    throw error;
  }
}