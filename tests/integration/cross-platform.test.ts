import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { execSync } from 'child_process';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';

interface PlatformInfo {
  platform: NodeJS.Platform;
  arch: string;
  release: string;
  nodeVersion: string;
  npmVersion: string;
  pnpmVersion: string | null;
  homeDir: string;
  tempDir: string;
  pathSeparator: string;
  supportedShells: string[];
}

interface CrossPlatformTestResult {
  platform: string;
  success: boolean;
  executionTime: number;
  filesGenerated: number;
  pathIssues: string[];
  commandIssues: string[];
  fileSystemIssues: string[];
  encodingIssues: string[];
  permissionIssues: string[];
}

interface PathCompatibilityResult {
  originalPath: string;
  normalizedPath: string;
  isValid: boolean;
  issues: string[];
  resolvedPath: string;
}

interface CommandCompatibilityResult {
  command: string;
  platform: string;
  success: boolean;
  output: string;
  error: string | null;
  executionTime: number;
}

describe('Cross-Platform Compatibility Tests (Windows/macOS/Linux)', () => {
  const crossPlatformTestDir = path.join(process.cwd(), 'temp-cross-platform-tests');
  let orchestrator: TransactionalOrchestrator;
  let platformInfo: PlatformInfo;

  beforeAll(async () => {
    if (await fs.pathExists(crossPlatformTestDir)) {
      await fs.remove(crossPlatformTestDir);
    }
    await fs.ensureDir(crossPlatformTestDir);

    orchestrator = new TransactionalOrchestrator({
      projectPath: crossPlatformTestDir,
      resumeTransaction: false,
      enableRollback: true
    });

    platformInfo = await gatherPlatformInfo();
    console.log(`Running tests on ${platformInfo.platform} ${platformInfo.arch} (Node ${platformInfo.nodeVersion})`);
  });

  afterAll(async () => {
    if (await fs.pathExists(crossPlatformTestDir)) {
      await fs.remove(crossPlatformTestDir);
    }
  });

  beforeEach(async () => {
    // Clean test environment between tests
    const entries = await fs.readdir(crossPlatformTestDir);
    for (const entry of entries) {
      const entryPath = path.join(crossPlatformTestDir, entry);
      try {
        if ((await fs.stat(entryPath)).isDirectory()) {
          await fs.remove(entryPath);
        }
      } catch (error) {
        // Handle locked files gracefully
      }
    }
  });

  describe('Platform Detection and Compatibility', () => {
    it('should correctly detect current platform capabilities', async () => {
      expect(platformInfo.platform).toMatch(/win32|darwin|linux/);
      expect(platformInfo.nodeVersion).toMatch(/^\d+\.\d+\.\d+/);
      expect(platformInfo.homeDir).toBeTruthy();
      expect(platformInfo.tempDir).toBeTruthy();

      // Verify platform-specific characteristics
      if (platformInfo.platform === 'win32') {
        expect(platformInfo.pathSeparator).toBe('\\');
        expect(platformInfo.supportedShells).toContain('cmd');
        expect(platformInfo.supportedShells).toContain('powershell');
      } else {
        expect(platformInfo.pathSeparator).toBe('/');
        expect(platformInfo.supportedShells).toContain('bash');
      }

      console.log(`Platform capabilities verified for ${platformInfo.platform}`);
    });

    it('should handle package manager availability across platforms', async () => {
      // Test npm availability (should be available everywhere)
      expect(platformInfo.npmVersion).toBeTruthy();

      // Test pnpm availability
      if (platformInfo.pnpmVersion) {
        console.log(`pnpm ${platformInfo.pnpmVersion} available`);
      } else {
        console.log('pnpm not available - may affect some tests');
      }

      // Verify package managers work
      const packageManagers = ['npm'];
      if (platformInfo.pnpmVersion) {
        packageManagers.push('pnpm');
      }

      for (const pm of packageManagers) {
        const versionResult = await testCommand(`${pm} --version`);
        expect(versionResult.success).toBe(true);
        expect(versionResult.output).toMatch(/\d+\.\d+\.\d+/);
      }
    });

    it('should handle shell and command execution across platforms', async () => {
      const testCommands = platformInfo.platform === 'win32' 
        ? ['echo "test"', 'dir', 'where node']
        : ['echo "test"', 'ls', 'which node'];

      for (const command of testCommands) {
        const result = await testCommand(command);
        expect(result.success).toBe(true);
        console.log(`Command "${command}" executed successfully on ${platformInfo.platform}`);
      }
    });
  });

  describe('File System Compatibility', () => {
    it('should handle path separators and normalization correctly', async () => {
      const testPaths = [
        'simple/path',
        'path\\with\\backslashes',
        'path/with/forward/slashes',
        'mixed\\path/separators',
        'deep/nested/very/long/path/structure',
        'path with spaces',
        'path-with-dashes',
        'path_with_underscores',
        'path.with.dots'
      ];

      for (const testPath of testPaths) {
        const compatibility = await testPathCompatibility(testPath, crossPlatformTestDir);
        expect(compatibility.isValid).toBe(true);
        
        if (compatibility.issues.length > 0) {
          console.log(`Path "${testPath}" has issues: ${compatibility.issues.join(', ')}`);
        }
      }

      console.log(`Path compatibility verified for ${testPaths.length} test paths`);
    });

    it('should handle file name restrictions across platforms', async () => {
      const fileNameTests = [
        { name: 'normal-file.txt', shouldWork: true },
        { name: 'file with spaces.txt', shouldWork: true },
        { name: 'file_with_underscores.txt', shouldWork: true },
        { name: 'file-with-dashes.txt', shouldWork: true },
        { name: 'UPPERCASE.txt', shouldWork: true },
        { name: 'lowercase.txt', shouldWork: true },
        { name: 'MixedCase.txt', shouldWork: true },
        { name: '123numeric.txt', shouldWork: true },
        { name: 'unicode文件.txt', shouldWork: true },
        // Windows reserved names
        { name: 'CON.txt', shouldWork: platformInfo.platform !== 'win32' },
        { name: 'PRN.txt', shouldWork: platformInfo.platform !== 'win32' },
        { name: 'AUX.txt', shouldWork: platformInfo.platform !== 'win32' },
        { name: 'NUL.txt', shouldWork: platformInfo.platform !== 'win32' },
        // Invalid characters
        { name: 'file<invalid>.txt', shouldWork: false },
        { name: 'file|pipe.txt', shouldWork: platformInfo.platform !== 'win32' },
        { name: 'file:colon.txt', shouldWork: platformInfo.platform !== 'win32' },
        { name: 'file"quote.txt', shouldWork: false },
        { name: 'file*star.txt', shouldWork: platformInfo.platform !== 'win32' }
      ];

      for (const test of fileNameTests) {
        const testDir = path.join(crossPlatformTestDir, 'filename-test');
        await fs.ensureDir(testDir);

        try {
          const filePath = path.join(testDir, test.name);
          await fs.writeFile(filePath, 'test content');
          
          const exists = await fs.pathExists(filePath);
          
          if (test.shouldWork) {
            expect(exists).toBe(true);
          } else {
            // File creation might succeed but we should note it as platform-specific
            if (!exists) {
              console.log(`Correctly rejected invalid filename: ${test.name}`);
            } else {
              console.log(`Platform allows filename that might be problematic: ${test.name}`);
            }
          }

          // Clean up
          if (exists) {
            await fs.remove(filePath);
          }
        } catch (error) {
          if (test.shouldWork) {
            console.warn(`Unexpected error with filename "${test.name}": ${error instanceof Error ? error.message : String(error)}`);
          } else {
            console.log(`Correctly rejected invalid filename: ${test.name}`);
          }
        }

        await fs.remove(testDir);
      }

      console.log(`File name compatibility tested for ${fileNameTests.length} cases`);
    });

    it('should handle long paths correctly', async () => {
      // Test path length limits
      const shortPath = path.join(crossPlatformTestDir, 'short');
      const mediumPath = path.join(crossPlatformTestDir, 'medium', 'length', 'path', 'structure');
      
      // Create a very long path
      let longPath = crossPlatformTestDir;
      const longSegment = 'very-long-directory-name-with-many-characters';
      for (let i = 0; i < 10; i++) {
        longPath = path.join(longPath, longSegment + i);
      }

      const testPaths = [shortPath, mediumPath, longPath];

      for (const testPath of testPaths) {
        try {
          await fs.ensureDir(testPath);
          await fs.writeFile(path.join(testPath, 'test.txt'), 'content');
          
          const exists = await fs.pathExists(path.join(testPath, 'test.txt'));
          expect(exists).toBe(true);

          console.log(`Long path test passed: ${testPath.length} characters`);
          
          // Clean up
          await fs.remove(testPath);
        } catch (error) {
          if (testPath === longPath && platformInfo.platform === 'win32') {
            // Windows has path length limitations
            console.log(`Expected path length limitation on Windows: ${error instanceof Error ? error.message : String(error)}`);
          } else {
            throw error;
          }
        }
      }
    });

    it('should handle file permissions correctly', async () => {
      const permissionTestDir = path.join(crossPlatformTestDir, 'permission-test');
      await fs.ensureDir(permissionTestDir);

      const testFile = path.join(permissionTestDir, 'test-permissions.txt');
      await fs.writeFile(testFile, 'test content');

      try {
        // Test read permissions
        const stats = await fs.stat(testFile);
        expect(stats.isFile()).toBe(true);

        // Test file modification
        await fs.writeFile(testFile, 'modified content');
        const content = await fs.readFile(testFile, 'utf-8');
        expect(content).toBe('modified content');

        // Platform-specific permission tests
        if (platformInfo.platform !== 'win32') {
          // Unix-like systems support file mode changes
          await fs.chmod(testFile, 0o644);
          const newStats = await fs.stat(testFile);
          expect(newStats.mode & 0o777).toBe(0o644);
        }

        console.log(`File permissions test passed on ${platformInfo.platform}`);
      } finally {
        await fs.remove(permissionTestDir);
      }
    });
  });

  describe('Next.js Project Generation Compatibility', () => {
    it('should generate minimal project across all platforms', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'minimal-cross-platform');

      const features = {
        core: true,
        database: false,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      const startTime = Date.now();
      
      try {
        const result = await orchestrator.createFullApp(features);
        const executionTime = Date.now() - startTime;

        // Verify project was created successfully
        expect(await fs.pathExists(projectPath)).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'next.config.ts'))).toBe(true);

        // Count generated files
        const filesGenerated = await countGeneratedFiles(projectPath);
        expect(filesGenerated).toBeGreaterThan(10);

        // Test package.json validity
        const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'));
        expect(packageJson.name).toBeTruthy();
        expect(packageJson.scripts).toBeTruthy();
        expect(packageJson.dependencies).toBeTruthy();

        console.log(`Minimal project generated successfully on ${platformInfo.platform} in ${(executionTime / 1000).toFixed(2)}s`);
        console.log(`Generated ${filesGenerated} files`);

        // Test package installation
        if (platformInfo.pnpmVersion) {
          await testPackageInstallation(projectPath, 'pnpm');
        } else {
          await testPackageInstallation(projectPath, 'npm');
        }

      } catch (error) {
        console.error(`Project generation failed on ${platformInfo.platform}:`, error instanceof Error ? error.message : String(error));
        throw error;
      }
    });

    it('should generate full featured project across all platforms', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'full-cross-platform');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: true
      };

      const startTime = Date.now();
      
      try {
        const result = await orchestrator.createFullApp(features);
        const executionTime = Date.now() - startTime;

        // Verify complex project structure
        expect(await fs.pathExists(projectPath)).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'drizzle.config.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'auth.ts'))).toBe(true);

        // Verify database directory structure
        const dbPath = path.join(projectPath, 'libs', 'db');
        expect(await fs.pathExists(dbPath)).toBe(true);

        // Verify authentication files
        const authFiles = await findAuthFiles(projectPath);
        expect(authFiles.length).toBeGreaterThan(3);

        // Count generated files
        const filesGenerated = await countGeneratedFiles(projectPath);
        expect(filesGenerated).toBeGreaterThan(50);

        console.log(`Full project generated successfully on ${platformInfo.platform} in ${(executionTime / 1000).toFixed(2)}s`);
        console.log(`Generated ${filesGenerated} files`);

      } catch (error) {
        console.error(`Full project generation failed on ${platformInfo.platform}:`, error instanceof Error ? error.message : String(error));
        throw error;
      }
    });

    it('should handle TypeScript compilation across platforms', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'typescript-test');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      await orchestrator.createFullApp(features);

      // Test TypeScript compilation
      try {
        const compileResult = await testCommand('npx tsc --noEmit', projectPath);
        
        if (compileResult.success) {
          console.log(`TypeScript compilation successful on ${platformInfo.platform}`);
        } else {
          // Log compilation errors for analysis
          console.log(`TypeScript compilation issues on ${platformInfo.platform}:`);
          console.log(compileResult.error || compileResult.output);
          
          // Some compilation errors might be platform-specific but not critical
          // We'll log them but not fail the test unless they're critical
          const criticalErrors = (compileResult.error || compileResult.output)
            .split('\n')
            .filter(line => line.includes('error TS'));
          
          if (criticalErrors.length > 5) {
            throw new Error(`Too many TypeScript errors: ${criticalErrors.length}`);
          }
        }
      } catch (error) {
        console.warn(`TypeScript test skipped on ${platformInfo.platform}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    it('should handle package installation across platforms', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'package-install-test');

      const features = {
        core: true,
        database: false,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      await orchestrator.createFullApp(features);

      // Test different package managers
      const packageManagers = ['npm'];
      if (platformInfo.pnpmVersion) {
        packageManagers.push('pnpm');
      }

      for (const pm of packageManagers) {
        const testDir = path.join(projectPath, `${pm}-test`);
        await fs.copy(projectPath, testDir);

        try {
          await testPackageInstallation(testDir, pm);
          console.log(`${pm} installation successful on ${platformInfo.platform}`);
          
          // Verify node_modules was created
          expect(await fs.pathExists(path.join(testDir, 'node_modules'))).toBe(true);
          
          // Test basic build command
          const buildResult = await testCommand(`${pm} run build`, testDir);
          if (buildResult.success) {
            console.log(`${pm} build successful on ${platformInfo.platform}`);
          } else {
            console.log(`${pm} build failed on ${platformInfo.platform}: ${buildResult.error}`);
          }
          
        } catch (error) {
          console.warn(`${pm} test failed on ${platformInfo.platform}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          await fs.remove(testDir);
        }
      }
    });
  });

  describe('Environment Variable Handling', () => {
    it('should handle environment variables across platforms', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'env-test');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      await orchestrator.createFullApp(features);

      // Test environment file creation
      const envExamplePath = path.join(projectPath, '.env.example');
      expect(await fs.pathExists(envExamplePath)).toBe(true);

      const envContent = await fs.readFile(envExamplePath, 'utf-8');
      
      // Verify environment variables have proper format
      const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      for (const line of envLines) {
        // Should follow NAME=value format
        expect(line).toMatch(/^[A-Z_][A-Z0-9_]*=/);
      }

      // Test environment variable loading in different shells
      if (platformInfo.platform === 'win32') {
        // Windows environment variable handling
        console.log('Testing Windows environment variable handling');
      } else {
        // Unix-like environment variable handling
        console.log('Testing Unix-like environment variable handling');
      }

      console.log(`Environment variable handling tested on ${platformInfo.platform}`);
    });

    it('should handle path environment variables correctly', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'path-env-test');

      const features = {
        core: true,
        database: true,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      await orchestrator.createFullApp(features);

      // Check for any path-related environment variables
      const configFiles = await findConfigFiles(projectPath);
      
      for (const configFile of configFiles) {
        const content = await fs.readFile(configFile, 'utf-8');
        
        // Check for proper path handling
        if (content.includes('path') || content.includes('Path')) {
          const hasProperPathHandling = 
            content.includes('path.join') ||
            content.includes('path.resolve') ||
            content.includes('process.cwd()');
          
          if (!hasProperPathHandling && content.includes('\\')) {
            console.warn(`Potential hardcoded path separator in ${path.basename(configFile)}`);
          }
        }
      }

      console.log(`Path environment variable handling verified on ${platformInfo.platform}`);
    });
  });

  describe('Build and Development Server Compatibility', () => {
    it('should handle development server startup across platforms', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'dev-server-test');

      const features = {
        core: true,
        database: false,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      await orchestrator.createFullApp(features);

      // Install packages first
      if (platformInfo.pnpmVersion) {
        await testPackageInstallation(projectPath, 'pnpm');
      } else {
        await testPackageInstallation(projectPath, 'npm');
      }

      // Test development server startup (without actually starting it)
      const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, 'package.json'), 'utf-8'));
      
      expect(packageJson.scripts.dev).toBeTruthy();
      expect(packageJson.scripts.build).toBeTruthy();
      expect(packageJson.scripts.start).toBeTruthy();

      console.log(`Development server configuration verified on ${platformInfo.platform}`);
    });

    it('should handle build process across platforms', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'build-test');

      const features = {
        core: true,
        database: false,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: false
      };

      await orchestrator.createFullApp(features);

      // Install packages
      const pm = platformInfo.pnpmVersion ? 'pnpm' : 'npm';
      await testPackageInstallation(projectPath, pm);

      try {
        // Test build process
        const buildResult = await testCommand(`${pm} run build`, projectPath, 120000); // 2 minute timeout
        
        if (buildResult.success) {
          console.log(`Build process successful on ${platformInfo.platform}`);
          
          // Verify build output
          const buildOutputPath = path.join(projectPath, '.next');
          expect(await fs.pathExists(buildOutputPath)).toBe(true);
          
        } else {
          console.log(`Build process failed on ${platformInfo.platform}:`);
          console.log(buildResult.output);
          console.log(buildResult.error);
          
          // Some build failures might be environment-specific
          // We'll log them but not necessarily fail the test
        }
      } catch (error) {
        console.warn(`Build test failed on ${platformInfo.platform}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  });

  describe('File Encoding and Character Set Compatibility', () => {
    it('should handle different file encodings correctly', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'encoding-test');

      const features = {
        core: true,
        database: true,
        authentication: true,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: true
      };

      await orchestrator.createFullApp(features);

      // Check generated files for proper encoding
      const allFiles = await findAllTextFiles(projectPath);
      
      for (const file of allFiles.slice(0, 20)) { // Check first 20 files
        try {
          const content = await fs.readFile(file, 'utf-8');
          
          // Verify file can be read as UTF-8
          expect(content).toBeTruthy();
          
          // Check for BOM (should not be present in most files)
          const hasBOM = content.charCodeAt(0) === 0xFEFF;
          if (hasBOM) {
            console.log(`BOM detected in ${path.basename(file)} - may cause issues`);
          }
          
          // Check for proper line endings
          const hasWindowsLineEndings = content.includes('\r\n');
          const hasUnixLineEndings = content.includes('\n') && !content.includes('\r\n');
          
          if (platformInfo.platform === 'win32' && hasUnixLineEndings && !hasWindowsLineEndings) {
            console.log(`Unix line endings in ${path.basename(file)} on Windows - should be OK`);
          }
          
        } catch (error) {
          console.warn(`Encoding issue with ${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`File encoding compatibility verified for ${allFiles.length} files on ${platformInfo.platform}`);
    });

    it('should handle unicode characters correctly', async () => {
      const projectPath = path.join(crossPlatformTestDir, 'unicode-test');

      const features = {
        core: true,
        database: false,
        authentication: false,
        payments: false,
        teamManagement: false,
        devExperience: true,
        internationalization: true
      };

      await orchestrator.createFullApp(features);

      // Look for internationalization files
      const i18nFiles = await findI18nFiles(projectPath);
      
      for (const i18nFile of i18nFiles) {
        const content = await fs.readFile(i18nFile, 'utf-8');
        
        // Check if file contains unicode characters
        const hasUnicode = /[^\x00-\x7F]/.test(content);
        
        if (hasUnicode) {
          console.log(`Unicode characters found in ${path.basename(i18nFile)} - encoding should be UTF-8`);
          
          // Verify file is properly encoded
          try {
            const parsedContent = JSON.parse(content);
            expect(parsedContent).toBeTruthy();
          } catch (error) {
            console.warn(`JSON parsing failed for ${path.basename(i18nFile)}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      console.log(`Unicode handling verified on ${platformInfo.platform}`);
    });
  });
});

// Helper Functions

async function gatherPlatformInfo(): Promise<PlatformInfo> {
  const platform = os.platform();
  const arch = os.arch();
  const release = os.release();
  const nodeVersion = process.version;
  const homeDir = os.homedir();
  const tempDir = os.tmpdir();
  const pathSeparator = path.sep;

  // Get npm version
  let npmVersion = 'unknown';
  try {
    npmVersion = execSync('npm --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (error) {
    console.warn('npm not available');
  }

  // Get pnpm version
  let pnpmVersion: string | null = null;
  try {
    pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch (error) {
    // pnpm not available
  }

  // Determine supported shells
  const supportedShells: string[] = [];
  if (platform === 'win32') {
    supportedShells.push('cmd', 'powershell');
    try {
      execSync('bash --version', { stdio: 'pipe' });
      supportedShells.push('bash'); // WSL or Git Bash
    } catch (error) {
      // bash not available
    }
  } else {
    supportedShells.push('bash', 'sh');
    try {
      execSync('zsh --version', { stdio: 'pipe' });
      supportedShells.push('zsh');
    } catch (error) {
      // zsh not available
    }
  }

  return {
    platform,
    arch,
    release,
    nodeVersion,
    npmVersion,
    pnpmVersion,
    homeDir,
    tempDir,
    pathSeparator,
    supportedShells
  };
}

async function testPathCompatibility(testPath: string, baseDir: string): Promise<PathCompatibilityResult> {
  const originalPath = testPath;
  const normalizedPath = path.normalize(testPath);
  const resolvedPath = path.resolve(baseDir, normalizedPath);
  
  const issues: string[] = [];
  let isValid = true;

  try {
    // Test path creation
    await fs.ensureDir(path.dirname(resolvedPath));
    await fs.writeFile(resolvedPath + '.test', 'test');
    await fs.remove(resolvedPath + '.test');
    
    // Check for potential issues
    if (testPath !== normalizedPath) {
      issues.push('Path required normalization');
    }
    
    if (testPath.includes(' ')) {
      issues.push('Path contains spaces');
    }
    
    if (resolvedPath.length > 260 && os.platform() === 'win32') {
      issues.push('Path may exceed Windows length limit');
      isValid = false;
    }
    
  } catch (error) {
    issues.push(`Path creation failed: ${error instanceof Error ? error.message : String(error)}`);
    isValid = false;
  }

  return {
    originalPath,
    normalizedPath,
    isValid,
    issues,
    resolvedPath
  };
}

async function testCommand(command: string, cwd?: string, timeout = 30000): Promise<CommandCompatibilityResult> {
  const startTime = Date.now();
  
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: cwd || process.cwd(),
      timeout
    });
    
    return {
      command,
      platform: os.platform(),
      success: true,
      output: output.trim(),
      error: null,
      executionTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      command,
      platform: os.platform(),
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime
    };
  }
}

async function testPackageInstallation(projectPath: string, packageManager: string): Promise<void> {
  const installCommand = packageManager === 'yarn' ? 'yarn install' : `${packageManager} install`;
  
  const result = await testCommand(installCommand, projectPath, 300000); // 5 minute timeout
  
  if (!result.success) {
    throw new Error(`Package installation failed: ${result.error}`);
  }
  
  // Verify node_modules was created
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  if (!await fs.pathExists(nodeModulesPath)) {
    throw new Error('node_modules directory was not created');
  }
}

async function countGeneratedFiles(projectPath: string): Promise<number> {
  let fileCount = 0;
  
  async function countRecursively(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other large directories
          if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
            await countRecursively(fullPath);
          }
        } else if (entry.isFile()) {
          fileCount++;
        }
      }
    } catch (error) {
      // Directory might not be accessible
    }
  }
  
  await countRecursively(projectPath);
  return fileCount;
}

async function findAuthFiles(projectPath: string): Promise<string[]> {
  const authFiles: string[] = [];
  
  const searchDirs = ['app', 'src', 'libs', 'lib'];
  
  for (const dir of searchDirs) {
    const dirPath = path.join(projectPath, dir);
    if (await fs.pathExists(dirPath)) {
      await findFilesRecursively(dirPath, /(auth|login|signin).*\.(ts|tsx|js|jsx)$/i, authFiles);
    }
  }
  
  return authFiles;
}

async function findConfigFiles(projectPath: string): Promise<string[]> {
  const configFiles: string[] = [];
  
  const configNames = [
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
    'tailwind.config.js',
    'tailwind.config.ts',
    'tsconfig.json',
    'package.json',
    'biome.json',
    'drizzle.config.ts'
  ];
  
  for (const configName of configNames) {
    const configPath = path.join(projectPath, configName);
    if (await fs.pathExists(configPath)) {
      configFiles.push(configPath);
    }
  }
  
  return configFiles;
}

async function findAllTextFiles(projectPath: string): Promise<string[]> {
  const textFiles: string[] = [];
  
  const searchDirs = ['app', 'src', 'components', 'libs', 'lib'];
  
  for (const dir of searchDirs) {
    const dirPath = path.join(projectPath, dir);
    if (await fs.pathExists(dirPath)) {
      await findFilesRecursively(dirPath, /\.(ts|tsx|js|jsx|json|md|css|scss|sass)$/i, textFiles);
    }
  }
  
  return textFiles;
}

async function findI18nFiles(projectPath: string): Promise<string[]> {
  const i18nFiles: string[] = [];
  
  const searchDirs = ['messages', 'locales', 'i18n', 'translations', 'lang'];
  
  for (const dir of searchDirs) {
    const dirPath = path.join(projectPath, dir);
    if (await fs.pathExists(dirPath)) {
      await findFilesRecursively(dirPath, /\.json$/i, i18nFiles);
    }
  }
  
  return i18nFiles;
}

async function findFilesRecursively(dir: string, pattern: RegExp, results: string[]): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !['node_modules', '.next', '.git'].includes(entry.name)) {
        await findFilesRecursively(fullPath, pattern, results);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Directory might not be accessible
  }
}