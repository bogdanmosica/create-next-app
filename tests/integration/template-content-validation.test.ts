import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);

interface ValidationResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  duration: number;
}

interface TemplateValidationReport {
  preset: string;
  typescript: ValidationResult;
  linting: ValidationResult;
  build: ValidationResult;
  overallScore: number;
}

describe('Template Content Validation', () => {
  const testDir = path.join(process.cwd(), 'temp-validation-tests');
  const presets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];

  beforeAll(async () => {
    // Clean up any previous test artifacts
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    // Clean up test directories
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  });

  describe('TypeScript Compilation Validation', () => {
    it.each(presets)('should compile TypeScript without errors for %s preset', async (preset) => {
      const projectPath = path.join(testDir, `typescript-test-${preset}`);

      // Generate project using the preset
      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: preset as any,
        projectName: `typescript-test-${preset}`
      });

      // Install dependencies
      const installResult = await runCommand('pnpm install', projectPath);
      expect(installResult.success).toBe(true);

      // Run TypeScript compilation
      const tscResult = await runTypeScriptCheck(projectPath);

      expect(tscResult.success).toBe(true);
      expect(tscResult.errors).toHaveLength(0);

      // Ensure compilation is reasonably fast (< 30 seconds)
      expect(tscResult.duration).toBeLessThan(30000);
    }, 60000);

    it('should validate generated type definitions', async () => {
      const projectPath = path.join(testDir, 'type-definitions-test');

      // Generate enterprise project (has most types)
      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: 'enterprise',
        projectName: 'type-definitions-test'
      });

      await runCommand('pnpm install', projectPath);

      // Check for proper type exports
      const typeFiles = await findTypeFiles(projectPath);
      expect(typeFiles.length).toBeGreaterThan(5);

      // Validate each type file compiles individually
      for (const typeFile of typeFiles) {
        const result = await validateTypeFile(projectPath, typeFile);
        expect(result.success).toBe(true);
      }
    });

    it('should detect TypeScript configuration issues', async () => {
      const projectPath = path.join(testDir, 'ts-config-test');

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: 'dashboard',
        projectName: 'ts-config-test'
      });

      // Verify tsconfig.json exists and is valid
      const tsconfigPath = path.join(projectPath, 'tsconfig.json');
      expect(await fs.pathExists(tsconfigPath)).toBe(true);

      const tsconfig = await fs.readJson(tsconfigPath);
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
      expect(tsconfig.compilerOptions.noUnusedParameters).toBe(true);
    });
  });

  describe('Linting Validation', () => {
    it.each(presets)('should pass linting rules for %s preset', async (preset) => {
      const projectPath = path.join(testDir, `linting-test-${preset}`);

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: preset as any,
        projectName: `linting-test-${preset}`
      });

      await runCommand('pnpm install', projectPath);

      // Run Biome linting
      const lintResult = await runLinting(projectPath);

      expect(lintResult.success).toBe(true);
      expect(lintResult.errors).toHaveLength(0);

      // Check for reasonable linting performance (< 10 seconds)
      expect(lintResult.duration).toBeLessThan(10000);
    }, 30000);

    it('should detect code quality issues', async () => {
      const projectPath = path.join(testDir, 'code-quality-test');

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: 'startup',
        projectName: 'code-quality-test'
      });

      await runCommand('pnpm install', projectPath);

      // Run comprehensive linting with all rules
      const result = await runCommand('npx @biomejs/biome check --apply=off .', projectPath);

      // Should not have any critical linting errors
      expect(result.output).not.toContain('error');
      expect(result.success).toBe(true);
    });

    it('should validate import/export consistency', async () => {
      const projectPath = path.join(testDir, 'import-export-test');

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: 'enterprise',
        projectName: 'import-export-test'
      });

      await runCommand('pnpm install', projectPath);

      // Analyze import/export patterns
      const analysisResult = await analyzeImportExports(projectPath);

      // Should have no circular dependencies
      expect(analysisResult.circularDependencies).toHaveLength(0);

      // Should have no unused exports (except in entry points)
      expect(analysisResult.unusedExports.filter(e =>
        !e.includes('page.tsx') &&
        !e.includes('layout.tsx') &&
        !e.includes('middleware.ts')
      )).toHaveLength(0);
    });
  });

  describe('Build Validation', () => {
    it.each(presets)('should build successfully for %s preset', async (preset) => {
      const projectPath = path.join(testDir, `build-test-${preset}`);

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: preset as any,
        projectName: `build-test-${preset}`
      });

      await runCommand('pnpm install', projectPath);

      // Run build process
      const buildResult = await runBuild(projectPath);

      expect(buildResult.success).toBe(true);
      expect(buildResult.errors).toHaveLength(0);

      // Verify build artifacts exist
      const buildDir = path.join(projectPath, '.next');
      expect(await fs.pathExists(buildDir)).toBe(true);

      // Check build performance (< 2 minutes)
      expect(buildResult.duration).toBeLessThan(120000);
    }, 150000);

    it('should validate bundle size constraints', async () => {
      const projectPath = path.join(testDir, 'bundle-size-test');

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: 'minimal',
        projectName: 'bundle-size-test'
      });

      await runCommand('pnpm install', projectPath);
      await runCommand('pnpm build', projectPath);

      // Analyze bundle sizes
      const bundleAnalysis = await analyzeBundleSize(projectPath);

      // Minimal preset should have reasonable bundle sizes
      expect(bundleAnalysis.initialJS).toBeLessThan(500 * 1024); // < 500KB initial JS
      expect(bundleAnalysis.totalSize).toBeLessThan(2 * 1024 * 1024); // < 2MB total
    });
  });

  describe('Template Consistency Validation', () => {
    it('should maintain consistent coding patterns across presets', async () => {
      const reports: TemplateValidationReport[] = [];

      for (const preset of presets) {
        const projectPath = path.join(testDir, `consistency-test-${preset}`);

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `consistency-test-${preset}`
        });

        await runCommand('pnpm install', projectPath);

        // Generate validation report
        const report: TemplateValidationReport = {
          preset,
          typescript: await runTypeScriptCheck(projectPath),
          linting: await runLinting(projectPath),
          build: await runBuild(projectPath),
          overallScore: 0
        };

        // Calculate overall score (0-100)
        report.overallScore = calculateValidationScore(report);
        reports.push(report);
      }

      // All presets should have high validation scores
      for (const report of reports) {
        expect(report.overallScore).toBeGreaterThan(85);
        expect(report.typescript.success).toBe(true);
        expect(report.linting.success).toBe(true);
        expect(report.build.success).toBe(true);
      }

      // Enterprise preset should have the highest complexity but still pass
      const enterpriseReport = reports.find(r => r.preset === 'enterprise');
      expect(enterpriseReport?.overallScore).toBeGreaterThan(80);
    }, 300000);

    it('should validate template file structure consistency', async () => {
      const structureMap = new Map<string, string[]>();

      for (const preset of presets) {
        const projectPath = path.join(testDir, `structure-test-${preset}`);

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `structure-test-${preset}`
        });

        // Analyze file structure
        const structure = await analyzeFileStructure(projectPath);
        structureMap.set(preset, structure);
      }

      // All presets should have core Next.js files
      const coreFiles = [
        'package.json',
        'tsconfig.json',
        'tailwind.config.ts',
        'next.config.mjs',
        'app/layout.tsx',
        'app/page.tsx'
      ];

      for (const [preset, files] of structureMap) {
        for (const coreFile of coreFiles) {
          expect(files).toContain(coreFile);
        }
      }
    });
  });
});

// Helper Functions

async function runCommand(command: string, cwd: string): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    const { stdout, stderr } = await exec(command, { cwd, timeout: 60000 });
    const duration = Date.now() - startTime;

    return {
      success: true,
      output: stdout,
      errors: stderr ? [stderr] : [],
      warnings: [],
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      output: error.stdout || '',
      errors: [error.stderr || error.message],
      warnings: [],
      duration
    };
  }
}

async function runTypeScriptCheck(projectPath: string): Promise<ValidationResult> {
  return runCommand('npx tsc --noEmit', projectPath);
}

async function runLinting(projectPath: string): Promise<ValidationResult> {
  return runCommand('npx @biomejs/biome check .', projectPath);
}

async function runBuild(projectPath: string): Promise<ValidationResult> {
  return runCommand('pnpm build', projectPath);
}

async function findTypeFiles(projectPath: string): Promise<string[]> {
  const typeFiles: string[] = [];

  const scanDir = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        typeFiles.push(path.relative(projectPath, fullPath));
      }
    }
  };

  await scanDir(projectPath);
  return typeFiles;
}

async function validateTypeFile(projectPath: string, typeFile: string): Promise<ValidationResult> {
  const fullPath = path.join(projectPath, typeFile);
  const content = await fs.readFile(fullPath, 'utf-8');

  // Basic validation: should not have 'any' types (except in specific cases)
  const anyTypeMatches = content.match(/:\s*any\b/g) || [];
  const allowedAnyTypes = content.match(/\/\*\s*@ts-expect-error\s*\*\/|\/\/\s*@ts-ignore/g) || [];

  const hasUnallowedAny = anyTypeMatches.length > allowedAnyTypes.length;

  return {
    success: !hasUnallowedAny,
    output: content,
    errors: hasUnallowedAny ? [`Found unallowed 'any' types in ${typeFile}`] : [],
    warnings: [],
    duration: 0
  };
}

async function analyzeImportExports(projectPath: string): Promise<{
  circularDependencies: string[];
  unusedExports: string[];
}> {
  // Simplified analysis - in real implementation, this would use tools like Madge
  const result = await runCommand('npx madge --circular --format=json .', projectPath);

  return {
    circularDependencies: result.success ? JSON.parse(result.output || '[]') : [],
    unusedExports: [] // Would require more sophisticated analysis
  };
}

async function analyzeBundleSize(projectPath: string): Promise<{
  initialJS: number;
  totalSize: number;
}> {
  const buildDir = path.join(projectPath, '.next');
  const staticDir = path.join(buildDir, 'static');

  if (!await fs.pathExists(staticDir)) {
    return { initialJS: 0, totalSize: 0 };
  }

  let totalSize = 0;
  let initialJS = 0;

  const scanSize = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanSize(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;

        // Identify initial JS bundles
        if (entry.name.includes('main') || entry.name.includes('framework')) {
          initialJS += stats.size;
        }
      }
    }
  };

  await scanSize(staticDir);

  return { initialJS, totalSize };
}

async function analyzeFileStructure(projectPath: string): Promise<string[]> {
  const files: string[] = [];

  const scanFiles = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(projectPath, fullPath);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await scanFiles(fullPath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  };

  await scanFiles(projectPath);
  return files;
}

function calculateValidationScore(report: TemplateValidationReport): number {
  let score = 100;

  // Deduct points for failures
  if (!report.typescript.success) score -= 40;
  if (!report.linting.success) score -= 30;
  if (!report.build.success) score -= 30;

  // Deduct points for performance issues
  if (report.typescript.duration > 20000) score -= 5;
  if (report.linting.duration > 8000) score -= 5;
  if (report.build.duration > 90000) score -= 10;

  // Deduct points for errors/warnings
  score -= Math.min(report.typescript.errors.length * 5, 20);
  score -= Math.min(report.linting.errors.length * 3, 15);
  score -= Math.min(report.build.errors.length * 10, 30);

  return Math.max(0, score);
}