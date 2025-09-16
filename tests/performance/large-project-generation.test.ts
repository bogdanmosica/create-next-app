import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { performance } from 'perf_hooks';

interface LargeProjectMetrics {
  preset: string;
  generationTime: number;
  installTime: number;
  buildTime: number;
  totalTime: number;
  fileCount: number;
  totalSize: number;
  packageCount: number;
  memoryUsage: NodeJS.MemoryUsage;
  throughput: number; // files per second
}

interface PerformanceBenchmark {
  metric: string;
  value: number;
  unit: string;
  threshold: number;
  passed: boolean;
}

describe('Large Project Generation Performance Tests', () => {
  const performanceTestDir = path.join(process.cwd(), 'temp-performance-tests');
  const timeoutLimit = 600000; // 10 minutes for large project tests

  beforeAll(async () => {
    if (await fs.pathExists(performanceTestDir)) {
      await fs.remove(performanceTestDir);
    }
    await fs.ensureDir(performanceTestDir);

    // Warm up the system
    console.log('Warming up system for performance testing...');
    const warmupPath = path.join(performanceTestDir, 'warmup');
    const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
    await createNextjsApp({
      projectPath: warmupPath,
      preset: 'minimal',
      projectName: 'warmup'
    });
    await fs.remove(warmupPath);
  });

  afterAll(async () => {
    if (await fs.pathExists(performanceTestDir)) {
      await fs.remove(performanceTestDir);
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  });

  describe('Enterprise Preset Performance', () => {
    it('should generate enterprise project within performance thresholds', async () => {
      const projectPath = path.join(performanceTestDir, 'enterprise-perf-test');

      const metrics = await measureProjectGeneration(projectPath, 'enterprise', 'enterprise-perf-test');
      const benchmarks = evaluatePerformanceBenchmarks(metrics);

      // Performance expectations for enterprise preset
      expect(metrics.generationTime).toBeLessThan(60000); // < 1 minute generation
      expect(metrics.installTime).toBeLessThan(180000); // < 3 minutes install
      expect(metrics.buildTime).toBeLessThan(300000); // < 5 minutes build
      expect(metrics.totalTime).toBeLessThan(480000); // < 8 minutes total

      // Scale expectations
      expect(metrics.fileCount).toBeGreaterThan(100); // Should generate substantial number of files
      expect(metrics.packageCount).toBeGreaterThan(50); // Enterprise should have many dependencies
      expect(metrics.throughput).toBeGreaterThan(2); // > 2 files per second generation

      // Log detailed metrics for analysis
      console.log('Enterprise Project Metrics:', JSON.stringify(metrics, null, 2));
      console.log('Performance Benchmarks:', benchmarks);

      // All benchmarks should pass
      const failedBenchmarks = benchmarks.filter(b => !b.passed);
      if (failedBenchmarks.length > 0) {
        console.warn('Failed benchmarks:', failedBenchmarks);
      }

      expect(failedBenchmarks.length).toBeLessThan(benchmarks.length * 0.2); // < 20% failures acceptable
    }, timeoutLimit);

    it('should maintain consistent performance across multiple enterprise generations', async () => {
      const runs = 3;
      const metrics: LargeProjectMetrics[] = [];

      for (let i = 0; i < runs; i++) {
        const projectPath = path.join(performanceTestDir, `enterprise-consistency-${i}`);
        const runMetrics = await measureProjectGeneration(projectPath, 'enterprise', `enterprise-consistency-${i}`);
        metrics.push(runMetrics);

        // Clean up between runs
        await fs.remove(projectPath);
        await waitForCleanup();
      }

      // Analyze consistency
      const generationTimes = metrics.map(m => m.generationTime);
      const avgGenerationTime = generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length;
      const variance = calculateVariance(generationTimes);
      const coefficientOfVariation = Math.sqrt(variance) / avgGenerationTime;

      // Should have consistent performance (CV < 0.3)
      expect(coefficientOfVariation).toBeLessThan(0.3);

      // No run should be more than 50% slower than average
      const maxAcceptableTime = avgGenerationTime * 1.5;
      const slowRuns = generationTimes.filter(time => time > maxAcceptableTime);
      expect(slowRuns).toHaveLength(0);
    }, timeoutLimit * 2);
  });

  describe('Full Stack Generation Performance', () => {
    it('should generate startup project with database and payments efficiently', async () => {
      const projectPath = path.join(performanceTestDir, 'startup-full-stack');

      // Startup preset includes auth, database, payments, teams
      const metrics = await measureProjectGeneration(projectPath, 'startup', 'startup-full-stack');

      // Performance expectations for full-stack startup
      expect(metrics.generationTime).toBeLessThan(45000); // < 45 seconds generation
      expect(metrics.installTime).toBeLessThan(120000); // < 2 minutes install
      expect(metrics.buildTime).toBeLessThan(180000); // < 3 minutes build
      expect(metrics.totalTime).toBeLessThan(300000); // < 5 minutes total

      // Should generate comprehensive file structure
      expect(metrics.fileCount).toBeGreaterThan(80);
      expect(metrics.packageCount).toBeGreaterThan(40);

      // Check for key generated files
      const keyFiles = [
        'app/[locale]/auth/login/page.tsx',
        'app/[locale]/dashboard/page.tsx',
        'libs/db.ts',
        'models/user.ts',
        'models/team.ts',
        'components/auth/login-form.tsx',
        'middleware.ts'
      ];

      for (const file of keyFiles) {
        const filePath = path.join(projectPath, file);
        expect(await fs.pathExists(filePath)).toBe(true);
      }
    }, timeoutLimit);

    it('should handle complex feature combinations without performance degradation', async () => {
      const projectPath = path.join(performanceTestDir, 'complex-features');

      // Use enterprise preset and add additional features
      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');

      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      await createNextjsApp({
        projectPath,
        preset: 'enterprise',
        projectName: 'complex-features'
      });

      const generationTime = performance.now() - startTime;
      const memoryAfterGeneration = process.memoryUsage();

      // Install dependencies
      const installStart = performance.now();
      await runCommand('pnpm install', projectPath);
      const installTime = performance.now() - installStart;

      // Build project
      const buildStart = performance.now();
      await runCommand('pnpm build', projectPath);
      const buildTime = performance.now() - buildStart;

      const totalTime = performance.now() - startTime;

      // Performance assertions for complex project
      expect(generationTime).toBeLessThan(90000); // < 1.5 minutes generation
      expect(installTime).toBeLessThan(240000); // < 4 minutes install
      expect(buildTime).toBeLessThan(360000); // < 6 minutes build
      expect(totalTime).toBeLessThan(600000); // < 10 minutes total

      // Memory usage should be reasonable
      const memoryGrowth = memoryAfterGeneration.heapUsed - startMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(500 * 1024 * 1024); // < 500MB growth
    }, timeoutLimit);
  });

  describe('Scaling Performance Tests', () => {
    it('should handle multiple preset generations without cumulative slowdown', async () => {
      const presets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];
      const metrics: LargeProjectMetrics[] = [];
      const memorySnapshots: NodeJS.MemoryUsage[] = [];

      for (const preset of presets) {
        const projectPath = path.join(performanceTestDir, `scaling-${preset}`);

        const startMemory = process.memoryUsage();
        memorySnapshots.push(startMemory);

        const projectMetrics = await measureProjectGeneration(projectPath, preset, `scaling-${preset}`);
        metrics.push(projectMetrics);

        // Clean up immediately to prevent memory accumulation
        await fs.remove(projectPath);
        await waitForCleanup();
      }

      // Check for cumulative performance degradation
      const generationTimes = metrics.map(m => m.generationTime);

      // Later generations shouldn't be significantly slower than earlier ones
      const firstHalf = generationTimes.slice(0, Math.ceil(generationTimes.length / 2));
      const secondHalf = generationTimes.slice(Math.floor(generationTimes.length / 2));

      const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // Second half should not be more than 30% slower than first half
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 1.3);

      // Memory usage should not continuously increase
      const memoryGrowth = memorySnapshots.map((snapshot, index) =>
        index > 0 ? snapshot.heapUsed - memorySnapshots[0].heapUsed : 0
      );

      const maxGrowth = Math.max(...memoryGrowth);
      expect(maxGrowth).toBeLessThan(200 * 1024 * 1024); // < 200MB cumulative growth
    }, timeoutLimit * 2);

    it('should optimize template loading for repeated generations', async () => {
      // Test template caching by generating same preset multiple times
      const preset = 'dashboard';
      const runs = 5;
      const generationTimes: number[] = [];

      for (let i = 0; i < runs; i++) {
        const projectPath = path.join(performanceTestDir, `template-cache-${i}`);

        const startTime = performance.now();

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `template-cache-${i}`
        });

        const generationTime = performance.now() - startTime;
        generationTimes.push(generationTime);

        await fs.remove(projectPath);
      }

      // Later runs should be faster due to template caching/optimization
      const firstRun = generationTimes[0];
      const lastRun = generationTimes[generationTimes.length - 1];
      const avgLastThree = generationTimes.slice(-3).reduce((a, b) => a + b, 0) / 3;

      // Last runs should be faster or at least not significantly slower
      expect(avgLastThree).toBeLessThan(firstRun * 1.1); // Within 10% of first run
    }, timeoutLimit);
  });

  describe('Resource Usage Optimization', () => {
    it('should generate large projects without excessive memory consumption', async () => {
      const projectPath = path.join(performanceTestDir, 'memory-test-enterprise');

      const initialMemory = process.memoryUsage();
      let peakMemory = initialMemory.heapUsed;

      // Monitor memory during generation
      const memoryMonitor = setInterval(() => {
        const current = process.memoryUsage().heapUsed;
        peakMemory = Math.max(peakMemory, current);
      }, 50);

      const metrics = await measureProjectGeneration(projectPath, 'enterprise', 'memory-test-enterprise');

      clearInterval(memoryMonitor);

      const memoryGrowth = peakMemory - initialMemory.heapUsed;
      const memoryEfficiency = metrics.fileCount / (memoryGrowth / 1024 / 1024); // files per MB

      // Memory usage should be reasonable
      expect(memoryGrowth).toBeLessThan(1024 * 1024 * 1024); // < 1GB peak memory growth
      expect(memoryEfficiency).toBeGreaterThan(0.5); // > 0.5 files per MB

      console.log(`Memory efficiency: ${memoryEfficiency.toFixed(2)} files per MB`);
    }, timeoutLimit);

    it('should optimize file I/O operations for large generations', async () => {
      const projectPath = path.join(performanceTestDir, 'io-optimization-test');

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');

      // Measure file operations
      const startTime = performance.now();

      await createNextjsApp({
        projectPath,
        preset: 'enterprise',
        projectName: 'io-optimization-test'
      });

      const generationTime = performance.now() - startTime;

      // Analyze generated file structure
      const fileStats = await analyzeFileStructure(projectPath);
      const ioThroughput = fileStats.totalSize / (generationTime / 1000); // bytes per second

      // I/O throughput should be reasonable
      expect(ioThroughput).toBeGreaterThan(1024 * 1024); // > 1MB/s throughput

      // File generation efficiency
      const fileGenerationRate = fileStats.fileCount / (generationTime / 1000); // files per second
      expect(fileGenerationRate).toBeGreaterThan(5); // > 5 files per second

      console.log(`I/O Throughput: ${(ioThroughput / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`File Generation Rate: ${fileGenerationRate.toFixed(2)} files/s`);
    }, timeoutLimit);
  });

  describe('Build Performance Validation', () => {
    it('should generate projects that build efficiently', async () => {
      const presets = ['minimal', 'startup', 'enterprise'];

      for (const preset of presets) {
        const projectPath = path.join(performanceTestDir, `build-perf-${preset}`);

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `build-perf-${preset}`
        });

        await runCommand('pnpm install', projectPath);

        // Measure build performance
        const buildStart = performance.now();
        const buildResult = await runCommand('pnpm build', projectPath);
        const buildTime = performance.now() - buildStart;

        expect(buildResult.success).toBe(true);

        // Build time expectations based on preset complexity
        const buildTimeThresholds = {
          minimal: 30000, // 30 seconds
          startup: 120000, // 2 minutes
          enterprise: 300000 // 5 minutes
        };

        expect(buildTime).toBeLessThan(buildTimeThresholds[preset as keyof typeof buildTimeThresholds]);

        // Analyze build output size
        const buildStats = await analyzeBuildOutput(projectPath);
        expect(buildStats.totalSize).toBeGreaterThan(0);

        console.log(`${preset} build: ${(buildTime / 1000).toFixed(1)}s, size: ${(buildStats.totalSize / 1024).toFixed(0)}KB`);

        await fs.remove(projectPath);
      }
    }, timeoutLimit * 2);
  });
});

// Helper Functions

async function measureProjectGeneration(
  projectPath: string,
  preset: string,
  projectName: string
): Promise<LargeProjectMetrics> {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();

  // Generation phase
  const generationStart = performance.now();
  const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
  await createNextjsApp({
    projectPath,
    preset: preset as any,
    projectName
  });
  const generationTime = performance.now() - generationStart;

  // Install phase
  const installStart = performance.now();
  await runCommand('pnpm install', projectPath);
  const installTime = performance.now() - installStart;

  // Build phase
  const buildStart = performance.now();
  await runCommand('pnpm build', projectPath);
  const buildTime = performance.now() - buildStart;

  const totalTime = performance.now() - startTime;
  const endMemory = process.memoryUsage();

  // Analyze generated project
  const fileStats = await analyzeFileStructure(projectPath);
  const packageStats = await analyzePackageJson(projectPath);

  return {
    preset,
    generationTime,
    installTime,
    buildTime,
    totalTime,
    fileCount: fileStats.fileCount,
    totalSize: fileStats.totalSize,
    packageCount: packageStats.dependencyCount,
    memoryUsage: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
    },
    throughput: fileStats.fileCount / (generationTime / 1000)
  };
}

function evaluatePerformanceBenchmarks(metrics: LargeProjectMetrics): PerformanceBenchmark[] {
  const benchmarks: PerformanceBenchmark[] = [
    {
      metric: 'Generation Time',
      value: metrics.generationTime,
      unit: 'ms',
      threshold: 60000,
      passed: metrics.generationTime < 60000
    },
    {
      metric: 'Install Time',
      value: metrics.installTime,
      unit: 'ms',
      threshold: 180000,
      passed: metrics.installTime < 180000
    },
    {
      metric: 'Build Time',
      value: metrics.buildTime,
      unit: 'ms',
      threshold: 300000,
      passed: metrics.buildTime < 300000
    },
    {
      metric: 'File Throughput',
      value: metrics.throughput,
      unit: 'files/s',
      threshold: 2,
      passed: metrics.throughput > 2
    },
    {
      metric: 'Memory Efficiency',
      value: metrics.fileCount / (metrics.memoryUsage.heapUsed / 1024 / 1024),
      unit: 'files/MB',
      threshold: 1,
      passed: (metrics.fileCount / (metrics.memoryUsage.heapUsed / 1024 / 1024)) > 1
    }
  ];

  return benchmarks;
}

async function runCommand(command: string, cwd: string): Promise<{ success: boolean; output: string }> {
  const { promisify } = require('util');
  const exec = promisify(require('child_process').exec);

  try {
    const { stdout, stderr } = await exec(command, { cwd, timeout: 300000 });
    return { success: true, output: stdout };
  } catch (error: any) {
    return { success: false, output: error.stderr || error.message };
  }
}

async function analyzeFileStructure(projectPath: string): Promise<{
  fileCount: number;
  totalSize: number;
  directories: number;
}> {
  let fileCount = 0;
  let totalSize = 0;
  let directories = 0;

  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        directories++;
        await scanDirectory(fullPath);
      } else if (entry.isFile()) {
        fileCount++;
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  }

  await scanDirectory(projectPath);

  return { fileCount, totalSize, directories };
}

async function analyzePackageJson(projectPath: string): Promise<{
  dependencyCount: number;
  devDependencyCount: number;
  totalDependencies: number;
}> {
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!await fs.pathExists(packageJsonPath)) {
    return { dependencyCount: 0, devDependencyCount: 0, totalDependencies: 0 };
  }

  const packageJson = await fs.readJson(packageJsonPath);

  const dependencyCount = Object.keys(packageJson.dependencies || {}).length;
  const devDependencyCount = Object.keys(packageJson.devDependencies || {}).length;

  return {
    dependencyCount,
    devDependencyCount,
    totalDependencies: dependencyCount + devDependencyCount
  };
}

async function analyzeBuildOutput(projectPath: string): Promise<{ totalSize: number; fileCount: number }> {
  const buildDir = path.join(projectPath, '.next');

  if (!await fs.pathExists(buildDir)) {
    return { totalSize: 0, fileCount: 0 };
  }

  return await analyzeFileStructure(buildDir);
}

async function waitForCleanup(): Promise<void> {
  // Force garbage collection
  if (global.gc) {
    global.gc();
  }

  // Wait for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}