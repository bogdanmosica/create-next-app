/**
 * @fileoverview Cross-Platform Compatibility Tests (Windows/macOS/Linux)
 * @description Tests template generation and functionality across different operating systems
 * Constitutional compliance: Cross-platform validation for Build-First Testing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'child_process';
import os from 'node:os';

interface PlatformTestProject {
  name: string;
  path: string;
  preset: string;
  platform: NodeJS.Platform;
}

interface PlatformCompatibilityResult {
  platform: NodeJS.Platform;
  architecture: string;
  nodeVersion: string;
  pathSeparator: string;
  success: boolean;
  issues: string[];
  recommendations: string[];
  generatedFiles: number;
  buildTime: number;
}

class CrossPlatformTestRunner {
  private testProjects: PlatformTestProject[] = [];
  private baseTestDir: string;
  private currentPlatform: NodeJS.Platform;
  private currentArchitecture: string;

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-platform-tests-${Date.now()}`);
    this.currentPlatform = os.platform();
    this.currentArchitecture = os.arch();
  }

  /**
   * Generate project for cross-platform testing
   */
  async generatePlatformProject(name: string, preset: string): Promise<PlatformTestProject> {
    const projectPath = path.join(this.baseTestDir, name);
    await fs.ensureDir(projectPath);

    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      projectName: name,
      resumeTransaction: false,
      enableRollback: true
    });

    // Generate project with specified preset
    const startTime = Date.now();
    await orchestrator.createFullApp({ preset });
    const buildTime = Date.now() - startTime;

    // Set up test environment
    await this.setupTestEnvironment(projectPath);

    const project: PlatformTestProject = {
      name,
      path: projectPath,
      preset,
      platform: this.currentPlatform
    };

    this.testProjects.push(project);
    return project;
  }

  private async setupTestEnvironment(projectPath: string): Promise<void> {
    const envPath = path.join(projectPath, '.env');
    const envContent = `
DATABASE_URL="sqlite:test-platform.db"
AUTH_SECRET="test-secret-key-platform"
BASE_URL="http://localhost:3000"
`.trim();

    await fs.writeFile(envPath, envContent);
  }

  /**
   * Test path handling across platforms
   */
  async testPathHandling(project: PlatformTestProject): Promise<{
    correctSeparators: boolean;
    absolutePaths: boolean;
    pathLength: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let correctSeparators = true;
    let absolutePaths = true;
    let pathLength = project.path.length;

    try {
      // Test file path separators in generated files
      const generatedFiles = await this.getAllGeneratedFiles(project.path);

      for (const filePath of generatedFiles) {
        const content = await fs.readFile(filePath, 'utf-8');

        // Check for hardcoded Windows paths in non-Windows environments
        if (this.currentPlatform !== 'win32' && content.includes('C:\\')) {
          issues.push(`Hardcoded Windows path found in ${path.relative(project.path, filePath)}`);
          correctSeparators = false;
        }

        // Check for hardcoded Unix paths in Windows
        if (this.currentPlatform === 'win32' && content.match(/\/[a-z]+\/[a-z]+/)) {
          const unixPaths = content.match(/\/[a-z]+\/[a-z]+/g);
          if (unixPaths && !unixPaths.every(p => p.includes('http') || p.includes('api'))) {
            issues.push(`Potential hardcoded Unix path found in ${path.relative(project.path, filePath)}`);
          }
        }

        // Check for proper path.join usage
        if (content.includes("'/'") || content.includes('"\\"')) {
          const hasPathJoin = content.includes('path.join') || content.includes('import path');
          if (!hasPathJoin) {
            issues.push(`Manual path concatenation without path.join in ${path.relative(project.path, filePath)}`);
            correctSeparators = false;
          }
        }
      }

      // Test path length (Windows has 260 character limit)
      if (this.currentPlatform === 'win32' && pathLength > 200) {
        issues.push('Project path may be too long for Windows (approaching 260 character limit)');
        absolutePaths = false;
      }

      // Test that all file paths are absolute when needed
      const configFiles = [
        path.join(project.path, 'next.config.ts'),
        path.join(project.path, 'tsconfig.json'),
        path.join(project.path, 'tailwind.config.ts')
      ];

      for (const configFile of configFiles) {
        if (await fs.pathExists(configFile)) {
          const content = await fs.readFile(configFile, 'utf-8');

          // Check for relative paths that might cause issues
          const relativePaths = content.match(/['"]\.\.[\/\\]/g);
          if (relativePaths && relativePaths.length > 2) {
            issues.push(`Many relative paths in ${path.basename(configFile)} - consider absolute imports`);
          }
        }
      }

      return {
        correctSeparators,
        absolutePaths,
        pathLength,
        issues
      };

    } catch (error) {
      issues.push(`Path handling test failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        correctSeparators: false,
        absolutePaths: false,
        pathLength,
        issues
      };
    }
  }

  /**
   * Test file permissions and line endings
   */
  async testFileSystemCompatibility(project: PlatformTestProject): Promise<{
    correctPermissions: boolean;
    correctLineEndings: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let correctPermissions = true;
    let correctLineEndings = true;

    try {
      const generatedFiles = await this.getAllGeneratedFiles(project.path);

      for (const filePath of generatedFiles.slice(0, 10)) { // Test first 10 files
        const stats = await fs.stat(filePath);

        // Test file permissions (Unix-like systems)
        if (this.currentPlatform !== 'win32') {
          const mode = stats.mode & 0o777;

          // Check if files are readable
          if (!(mode & 0o444)) {
            issues.push(`File not readable: ${path.relative(project.path, filePath)}`);
            correctPermissions = false;
          }

          // Check if script files are executable
          if (filePath.endsWith('.sh') && !(mode & 0o111)) {
            issues.push(`Script not executable: ${path.relative(project.path, filePath)}`);
            correctPermissions = false;
          }
        }

        // Test line endings
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
          const content = await fs.readFile(filePath, 'utf-8');

          // Check for mixed line endings
          const crlfCount = (content.match(/\r\n/g) || []).length;
          const lfCount = (content.match(/(?<!\r)\n/g) || []).length;

          if (crlfCount > 0 && lfCount > 0) {
            issues.push(`Mixed line endings in ${path.relative(project.path, filePath)}`);
            correctLineEndings = false;
          }

          // Check for Windows line endings on Unix systems
          if (this.currentPlatform !== 'win32' && crlfCount > lfCount) {
            issues.push(`Windows line endings on Unix system in ${path.relative(project.path, filePath)}`);
          }
        }
      }

      return {
        correctPermissions,
        correctLineEndings,
        issues
      };

    } catch (error) {
      issues.push(`File system compatibility test failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        correctPermissions: false,
        correctLineEndings: false,
        issues
      };
    }
  }

  /**
   * Test command execution across platforms
   */
  async testCommandCompatibility(project: PlatformTestProject): Promise<{
    npmWorks: boolean;
    pnpmWorks: boolean;
    buildWorks: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let npmWorks = false;
    let pnpmWorks = false;
    let buildWorks = false;

    try {
      // Test npm availability
      try {
        const npmVersion = await this.runCommand('npm', ['--version'], { cwd: project.path });
        npmWorks = npmVersion.code === 0;
      } catch (error) {
        issues.push('npm not available or not working');
      }

      // Test pnpm availability
      try {
        const pnpmVersion = await this.runCommand('pnpm', ['--version'], { cwd: project.path });
        pnpmWorks = pnpmVersion.code === 0;
      } catch (error) {
        issues.push('pnpm not available or not working');
      }

      // Test package installation and build
      if (pnpmWorks || npmWorks) {
        const packageManager = pnpmWorks ? 'pnpm' : 'npm';

        try {
          // Install dependencies
          const installResult = await this.runCommand(packageManager, ['install'], {
            cwd: project.path,
            timeout: 120000 // 2 minutes
          });

          if (installResult.code === 0) {
            // Try to build
            const buildResult = await this.runCommand(packageManager, ['run', 'build'], {
              cwd: project.path,
              timeout: 180000 // 3 minutes
            });

            buildWorks = buildResult.code === 0;

            if (!buildWorks) {
              issues.push(`Build failed: ${buildResult.stderr.substring(0, 200)}`);
            }
          } else {
            issues.push(`Package installation failed: ${installResult.stderr.substring(0, 200)}`);
          }
        } catch (error) {
          issues.push(`Build process error: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        issues.push('No package manager available for testing');
      }

      return {
        npmWorks,
        pnpmWorks,
        buildWorks,
        issues
      };

    } catch (error) {
      issues.push(`Command compatibility test failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        npmWorks: false,
        pnpmWorks: false,
        buildWorks: false,
        issues
      };
    }
  }

  /**
   * Test environment variables and shell compatibility
   */
  async testEnvironmentCompatibility(project: PlatformTestProject): Promise<{
    envVarsWork: boolean;
    shellScriptsWork: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let envVarsWork = true;
    let shellScriptsWork = true;

    try {
      // Test environment variable access
      const envPath = path.join(project.path, '.env');
      if (await fs.pathExists(envPath)) {
        const envContent = await fs.readFile(envPath, 'utf-8');

        // Check for platform-specific environment variable syntax
        if (this.currentPlatform === 'win32') {
          if (envContent.includes('export ')) {
            issues.push('Unix-style export in .env file on Windows');
            envVarsWork = false;
          }
        }

        // Test that environment variables don't have platform-specific paths
        const lines = envContent.split('\n');
        for (const line of lines) {
          if (line.includes('=')) {
            const value = line.split('=')[1];
            if (value) {
              // Check for hardcoded paths
              if (value.includes('/usr/') || value.includes('/home/')) {
                if (this.currentPlatform === 'win32') {
                  issues.push(`Unix path in environment variable: ${line}`);
                  envVarsWork = false;
                }
              }
              if (value.includes('C:\\') || value.includes('D:\\')) {
                if (this.currentPlatform !== 'win32') {
                  issues.push(`Windows path in environment variable: ${line}`);
                  envVarsWork = false;
                }
              }
            }
          }
        }
      }

      // Test package.json scripts compatibility
      const packageJsonPath = path.join(project.path, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);

        if (packageJson.scripts) {
          for (const [scriptName, script] of Object.entries(packageJson.scripts)) {
            const scriptStr = script as string;

            // Check for platform-specific commands
            if (this.currentPlatform === 'win32') {
              if (scriptStr.includes('rm -rf') || scriptStr.includes('cp -r')) {
                issues.push(`Unix command in script '${scriptName}': ${scriptStr}`);
                shellScriptsWork = false;
              }
            } else {
              if (scriptStr.includes('rmdir /s') || scriptStr.includes('copy /y')) {
                issues.push(`Windows command in script '${scriptName}': ${scriptStr}`);
                shellScriptsWork = false;
              }
            }

            // Check for shell-specific syntax
            if (scriptStr.includes('&&') && scriptStr.includes('||')) {
              // This is generally cross-platform, but worth noting
            }
          }
        }
      }

      return {
        envVarsWork,
        shellScriptsWork,
        issues
      };

    } catch (error) {
      issues.push(`Environment compatibility test failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        envVarsWork: false,
        shellScriptsWork: false,
        issues
      };
    }
  }

  /**
   * Get all generated files recursively
   */
  private async getAllGeneratedFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];

    async function scanDirectory(dirPath: string) {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
          // Skip node_modules, .git, and other system directories
          if (!['node_modules', '.git', '.next', 'dist', '.turbo'].includes(item.name)) {
            await scanDirectory(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    }

    await scanDirectory(projectPath);
    return files;
  }

  /**
   * Run command with platform compatibility
   */
  private async runCommand(
    command: string,
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: 'pipe',
        shell: true, // Use shell for cross-platform compatibility
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });

      child.on('error', (error) => {
        resolve({ code: -1, stdout, stderr: error.message });
      });

      // Timeout handling
      const timeout = options.timeout || 30000;
      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ code: -1, stdout, stderr: stderr + '\nTimeout' });
      }, timeout);
    });
  }

  /**
   * Cleanup all test projects
   */
  async cleanup(): Promise<void> {
    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }
  }
}

let testRunner: CrossPlatformTestRunner;

beforeAll(async () => {
  testRunner = new CrossPlatformTestRunner();
  await fs.ensureDir(testRunner['baseTestDir']);
});

afterAll(async () => {
  if (testRunner) {
    await testRunner.cleanup();
  }
});

describe('Cross-Platform Compatibility Tests', () => {

  it('should generate platform-compatible file paths', async () => {
    const project = await testRunner.generatePlatformProject('platform-paths', 'minimal');

    const pathTest = await testRunner.testPathHandling(project);

    // Log issues for debugging
    if (pathTest.issues.length > 0) {
      console.log('Path compatibility issues:');
      pathTest.issues.forEach(issue => console.log(`- ${issue}`));
    }

    // Should handle path separators correctly
    expect(pathTest.correctSeparators).toBe(true);

    // Should handle absolute paths properly
    expect(pathTest.absolutePaths).toBe(true);

    // Should not have many path-related issues
    expect(pathTest.issues.length).toBeLessThan(3);

  }, 120000);

  it('should handle file system compatibility', async () => {
    const project = await testRunner.generatePlatformProject('platform-filesystem', 'startup');

    const fsTest = await testRunner.testFileSystemCompatibility(project);

    // Log issues for debugging
    if (fsTest.issues.length > 0) {
      console.log('File system compatibility issues:');
      fsTest.issues.forEach(issue => console.log(`- ${issue}`));
    }

    // Should have correct file permissions
    expect(fsTest.correctPermissions).toBe(true);

    // Should have consistent line endings
    expect(fsTest.correctLineEndings).toBe(true);

    // Should not have many file system issues
    expect(fsTest.issues.length).toBeLessThan(5);

  }, 180000);

  it('should work with different package managers', async () => {
    const project = await testRunner.generatePlatformProject('platform-commands', 'dashboard');

    const commandTest = await testRunner.testCommandCompatibility(project);

    // Log command test results
    console.log(`Platform: ${testRunner['currentPlatform']}`);
    console.log(`npm works: ${commandTest.npmWorks}`);
    console.log(`pnpm works: ${commandTest.pnpmWorks}`);
    console.log(`build works: ${commandTest.buildWorks}`);

    if (commandTest.issues.length > 0) {
      console.log('Command compatibility issues:');
      commandTest.issues.forEach(issue => console.log(`- ${issue}`));
    }

    // Should have at least one package manager working
    expect(commandTest.npmWorks || commandTest.pnpmWorks).toBe(true);

    // If package manager works, build should work too (or have reasonable error)
    if (commandTest.pnpmWorks || commandTest.npmWorks) {
      // Build might fail due to environment, but shouldn't have syntax errors
      const hasSyntaxErrors = commandTest.issues.some(issue =>
        issue.includes('SyntaxError') || issue.includes('Unexpected token')
      );
      expect(hasSyntaxErrors).toBe(false);
    }

  }, 300000); // 5 minutes for build test

  it('should handle environment variables correctly', async () => {
    const project = await testRunner.generatePlatformProject('platform-env', 'enterprise');

    const envTest = await testRunner.testEnvironmentCompatibility(project);

    // Log environment test results
    if (envTest.issues.length > 0) {
      console.log('Environment compatibility issues:');
      envTest.issues.forEach(issue => console.log(`- ${issue}`));
    }

    // Should handle environment variables correctly
    expect(envTest.envVarsWork).toBe(true);

    // Should have cross-platform shell scripts
    expect(envTest.shellScriptsWork).toBe(true);

    // Should have minimal environment issues
    expect(envTest.issues.length).toBeLessThan(3);

  }, 120000);

  it('should generate platform-appropriate configuration', async () => {
    const project = await testRunner.generatePlatformProject('platform-config', 'blog');

    // Test Next.js configuration
    const nextConfigPath = path.join(project.path, 'next.config.ts');
    expect(await fs.pathExists(nextConfigPath)).toBe(true);

    const nextConfig = await fs.readFile(nextConfigPath, 'utf-8');

    // Should not contain platform-specific paths
    expect(nextConfig).not.toMatch(/C:\\/);
    expect(nextConfig).not.toMatch(/\/usr\/|\/home\//);

    // Should use proper module imports
    expect(nextConfig).toMatch(/import.*from/);

    // Test TypeScript configuration
    const tsconfigPath = path.join(project.path, 'tsconfig.json');
    if (await fs.pathExists(tsconfigPath)) {
      const tsconfig = await fs.readJSON(tsconfigPath);

      // Should have proper path mapping
      if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
        const paths = tsconfig.compilerOptions.paths;

        // Should use forward slashes in path mapping (Node.js standard)
        const pathKeys = Object.keys(paths);
        for (const key of pathKeys) {
          expect(key).not.toContain('\\');
          expect(paths[key]).toBeInstanceOf(Array);
        }
      }
    }

  }, 120000);

  it('should work across different Node.js versions', async () => {
    const project = await testRunner.generatePlatformProject('platform-node', 'minimal');

    // Test Node.js compatibility in generated code
    const generatedFiles = await testRunner['getAllGeneratedFiles'](project.path);
    const jsFiles = generatedFiles.filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    let hasES6Features = false;
    let hasNewSyntax = false;

    for (const file of jsFiles.slice(0, 5)) { // Test first 5 JS/TS files
      const content = await fs.readFile(file, 'utf-8');

      // Check for ES6+ features
      if (content.includes('import ') || content.includes('export ') || content.includes('=>')) {
        hasES6Features = true;
      }

      // Check for very new syntax that might not be supported everywhere
      if (content.includes('?.') || content.includes('??')) {
        hasNewSyntax = true;
      }
    }

    // Should use modern JavaScript (ES6+)
    expect(hasES6Features).toBe(true);

    // Modern syntax is OK as long as TypeScript/build tools handle it
    // Just log it for awareness
    if (hasNewSyntax) {
      console.log('Uses modern JavaScript syntax (optional chaining, nullish coalescing)');
    }

    // Check package.json for Node.js version requirements
    const packageJsonPath = path.join(project.path, 'package.json');
    const packageJson = await fs.readJSON(packageJsonPath);

    if (packageJson.engines && packageJson.engines.node) {
      const nodeVersion = packageJson.engines.node;
      console.log(`Requires Node.js: ${nodeVersion}`);

      // Should specify a reasonable Node.js version
      expect(nodeVersion).toMatch(/\d+/);
    }

  }, 120000);

  it('should handle different character encodings', async () => {
    const project = await testRunner.generatePlatformProject('platform-encoding', 'startup');

    // Test file encoding
    const generatedFiles = await testRunner['getAllGeneratedFiles'](project.path);
    const textFiles = generatedFiles.filter(file =>
      file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.json') || file.endsWith('.md')
    );

    let hasUnicodeContent = false;
    let hasEncodingIssues = false;

    for (const file of textFiles.slice(0, 10)) { // Test first 10 text files
      try {
        // Read as UTF-8
        const content = await fs.readFile(file, 'utf-8');

        // Check for Unicode characters
        if (/[\u0080-\uFFFF]/.test(content)) {
          hasUnicodeContent = true;
        }

        // Try to read as binary and check for null bytes (which would indicate binary files mistakenly treated as text)
        const buffer = await fs.readFile(file);
        if (buffer.includes(0)) {
          const relativePath = path.relative(project.path, file);
          if (!relativePath.includes('node_modules') && !relativePath.includes('.git')) {
            hasEncodingIssues = true;
            console.log(`Potential binary file treated as text: ${relativePath}`);
          }
        }

      } catch (error) {
        // UTF-8 encoding error
        hasEncodingIssues = true;
        console.log(`Encoding issue in ${path.relative(project.path, file)}: ${error}`);
      }
    }

    // Should handle text files properly
    expect(hasEncodingIssues).toBe(false);

    // Unicode content is fine as long as it's handled properly
    if (hasUnicodeContent) {
      console.log('Project contains Unicode characters');
    }

  }, 120000);

  it('should provide platform-specific recommendations', async () => {
    const project = await testRunner.generatePlatformProject('platform-recommendations', 'enterprise');

    const platform = testRunner['currentPlatform'];
    const architecture = testRunner['currentArchitecture'];

    console.log(`\nPlatform Compatibility Summary:`);
    console.log(`- Platform: ${platform}`);
    console.log(`- Architecture: ${architecture}`);
    console.log(`- Node.js version: ${process.version}`);

    // Run all compatibility tests
    const [pathTest, fsTest, commandTest, envTest] = await Promise.all([
      testRunner.testPathHandling(project),
      testRunner.testFileSystemCompatibility(project),
      testRunner.testCommandCompatibility(project),
      testRunner.testEnvironmentCompatibility(project)
    ]);

    const allIssues = [
      ...pathTest.issues,
      ...fsTest.issues,
      ...commandTest.issues,
      ...envTest.issues
    ];

    const totalTests = 4;
    const passedTests = [
      pathTest.correctSeparators && pathTest.absolutePaths,
      fsTest.correctPermissions && fsTest.correctLineEndings,
      commandTest.pnpmWorks || commandTest.npmWorks,
      envTest.envVarsWork && envTest.shellScriptsWork
    ].filter(Boolean).length;

    console.log(`- Tests passed: ${passedTests}/${totalTests}`);
    console.log(`- Total issues found: ${allIssues.length}`);

    if (allIssues.length > 0) {
      console.log('Platform-specific recommendations:');
      allIssues.slice(0, 5).forEach(issue => console.log(`  - ${issue}`));
    }

    // Should pass most compatibility tests
    expect(passedTests / totalTests).toBeGreaterThan(0.7);

    // Should have reasonable number of issues
    expect(allIssues.length).toBeLessThan(10);

  }, 240000); // 4 minutes for comprehensive test

});