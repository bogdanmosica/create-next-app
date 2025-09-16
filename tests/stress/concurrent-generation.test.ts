import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { performance } from 'perf_hooks';

interface StressTestResult {
  success: boolean;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  errors: string[];
  generatedProjects: number;
  concurrencyLevel: number;
}

interface ConcurrentGenerationMetrics {
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  memoryPeak: number;
  throughput: number; // projects per second
  errorRate: number;
  resourceContention: number;
}

describe('Concurrent Template Generation Stress Tests', () => {
  const stressTestDir = path.join(process.cwd(), 'temp-stress-tests');
  const maxConcurrency = 10;
  const testDurationLimit = 300000; // 5 minutes

  beforeAll(async () => {
    if (await fs.pathExists(stressTestDir)) {
      await fs.remove(stressTestDir);
    }
    await fs.ensureDir(stressTestDir);

    // Increase Node.js memory limit for stress tests
    if (process.env.NODE_OPTIONS?.includes('--max-old-space-size') === false) {
      console.warn('Consider running with: NODE_OPTIONS="--max-old-space-size=8192"');
    }
  });

  afterAll(async () => {
    if (await fs.pathExists(stressTestDir)) {
      await fs.remove(stressTestDir);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('Low Concurrency Stress Tests', () => {
    it('should handle 3 concurrent generations without performance degradation', async () => {
      const concurrencyLevel = 3;
      const result = await runConcurrentGenerationTest(concurrencyLevel, ['minimal', 'blog', 'dashboard']);

      expect(result.success).toBe(true);
      expect(result.successRate).toBeGreaterThan(95);
      expect(result.averageDuration).toBeLessThan(30000); // < 30 seconds per generation
      expect(result.memoryPeak).toBeLessThan(2 * 1024 * 1024 * 1024); // < 2GB
    }, testDurationLimit);

    it('should maintain consistent performance across multiple low-concurrency runs', async () => {
      const runs = 3;
      const results: ConcurrentGenerationMetrics[] = [];

      for (let i = 0; i < runs; i++) {
        const result = await runConcurrentGenerationTest(2, ['minimal', 'startup']);
        expect(result.success).toBe(true);
        results.push(result);

        // Clean up between runs
        await cleanupGeneratedProjects(2);
        await waitForMemoryCleanup();
      }

      // Check consistency across runs
      const avgDurations = results.map(r => r.averageDuration);
      const durationVariance = calculateVariance(avgDurations);
      const avgDuration = avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length;

      // Duration variance should be less than 20% of average
      expect(durationVariance).toBeLessThan((avgDuration * 0.2) ** 2);
    }, testDurationLimit);
  });

  describe('Medium Concurrency Stress Tests', () => {
    it('should handle 5 concurrent generations with acceptable performance', async () => {
      const concurrencyLevel = 5;
      const presets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];
      const result = await runConcurrentGenerationTest(concurrencyLevel, presets);

      expect(result.success).toBe(true);
      expect(result.successRate).toBeGreaterThan(90);
      expect(result.averageDuration).toBeLessThan(45000); // < 45 seconds per generation
      expect(result.memoryPeak).toBeLessThan(4 * 1024 * 1024 * 1024); // < 4GB
      expect(result.throughput).toBeGreaterThan(0.05); // > 0.05 projects per second
    }, testDurationLimit);

    it('should recover gracefully from partial failures in medium concurrency', async () => {
      const concurrencyLevel = 5;

      // Simulate some failures by using invalid project paths
      const mixedGenerationTest = async () => {
        const promises = [];
        const validPresets = ['minimal', 'blog', 'dashboard'];

        // 3 valid generations
        for (let i = 0; i < 3; i++) {
          promises.push(generateProject(validPresets[i], `valid-${i}`));
        }

        // 2 potentially problematic generations (invalid paths)
        promises.push(generateProject('minimal', ''));  // Empty name should be handled
        promises.push(generateProject('blog', 'test/../invalid')); // Path traversal attempt

        const results = await Promise.allSettled(promises);

        // Should have some successes even with some failures
        const successes = results.filter(r => r.status === 'fulfilled').length;
        expect(successes).toBeGreaterThan(0);

        return {
          totalRequests: 5,
          successes,
          failures: results.length - successes
        };
      };

      const result = await mixedGenerationTest();
      expect(result.successes).toBeGreaterThan(2); // At least 3 should succeed
    }, testDurationLimit);
  });

  describe('High Concurrency Stress Tests', () => {
    it('should handle maximum concurrency with degraded but acceptable performance', async () => {
      const concurrencyLevel = maxConcurrency;
      const presets = Array(maxConcurrency).fill(['minimal', 'blog', 'dashboard']).flat().slice(0, maxConcurrency);

      const result = await runConcurrentGenerationTest(concurrencyLevel, presets);

      // Allow for more graceful degradation at high concurrency
      expect(result.successRate).toBeGreaterThan(70); // 70% success rate acceptable
      expect(result.averageDuration).toBeLessThan(120000); // < 2 minutes per generation
      expect(result.memoryPeak).toBeLessThan(6 * 1024 * 1024 * 1024); // < 6GB
    }, testDurationLimit);

    it('should not cause memory leaks during high concurrency generation', async () => {
      const initialMemory = process.memoryUsage();
      const memorySnapshots: NodeJS.MemoryUsage[] = [initialMemory];

      // Run multiple rounds of high concurrency
      for (let round = 0; round < 3; round++) {
        const result = await runConcurrentGenerationTest(6, ['minimal', 'minimal', 'minimal', 'blog', 'blog', 'dashboard']);

        // Clean up generated projects
        await cleanupGeneratedProjects(6);
        await waitForMemoryCleanup();

        // Take memory snapshot
        const currentMemory = process.memoryUsage();
        memorySnapshots.push(currentMemory);

        expect(result.success).toBe(true);
      }

      // Check for memory leaks - heap should not grow indefinitely
      const heapGrowth = memorySnapshots[memorySnapshots.length - 1].heapUsed - initialMemory.heapUsed;
      const reasonableGrowthLimit = 500 * 1024 * 1024; // 500MB growth is acceptable

      expect(heapGrowth).toBeLessThan(reasonableGrowthLimit);
    }, testDurationLimit * 2);
  });

  describe('Resource Contention Tests', () => {
    it('should handle file system contention gracefully', async () => {
      // Test concurrent access to templates and file generation
      const concurrencyLevel = 8;

      // All use the same preset to maximize template contention
      const presets = Array(concurrencyLevel).fill('enterprise');

      const result = await runConcurrentGenerationTest(concurrencyLevel, presets);

      expect(result.success).toBe(true);
      expect(result.successRate).toBeGreaterThan(80);

      // Should not have file locking or contention errors
      const contentionErrors = result.errors.filter(error =>
        error.includes('EBUSY') ||
        error.includes('EMFILE') ||
        error.includes('ENFILE') ||
        error.includes('EACCES')
      );

      expect(contentionErrors).toHaveLength(0);
    }, testDurationLimit);

    it('should manage CPU usage efficiently during concurrent generation', async () => {
      const startTime = performance.now();
      const startCpuUsage = process.cpuUsage();

      const result = await runConcurrentGenerationTest(6, ['blog', 'dashboard', 'startup', 'enterprise', 'minimal', 'blog']);

      const endTime = performance.now();
      const endCpuUsage = process.cpuUsage(startCpuUsage);

      const totalTime = endTime - startTime;
      const cpuPercent = (endCpuUsage.user + endCpuUsage.system) / (totalTime * 1000); // Convert to percentage

      expect(result.success).toBe(true);

      // CPU usage should be reasonable (less than 200% on multi-core systems)
      expect(cpuPercent).toBeLessThan(2.0);
    }, testDurationLimit);
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue processing after individual generation failures', async () => {
      const concurrencyLevel = 5;
      const testScenarios = [
        { preset: 'minimal', name: 'valid-1' },
        { preset: 'invalid-preset' as any, name: 'invalid-preset-test' }, // Should fail
        { preset: 'blog', name: 'valid-2' },
        { preset: 'dashboard', name: '' }, // Should fail - empty name
        { preset: 'startup', name: 'valid-3' }
      ];

      const startTime = performance.now();
      const results = await Promise.allSettled(
        testScenarios.map(scenario => generateProject(scenario.preset, scenario.name))
      );
      const duration = performance.now() - startTime;

      // Should have some successes despite failures
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      expect(successes).toBeGreaterThan(2);
      expect(failures).toBeGreaterThan(0); // We expect some failures
      expect(duration).toBeLessThan(60000); // Should complete quickly despite failures
    });

    it('should handle system resource exhaustion gracefully', async () => {
      // Simulate resource exhaustion by creating many concurrent processes
      const highConcurrency = 15; // Beyond typical system limits

      const promises = [];
      for (let i = 0; i < highConcurrency; i++) {
        promises.push(generateProject('minimal', `resource-test-${i}`));
      }

      const results = await Promise.allSettled(promises);

      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      // At least some should succeed, and failures should be handled gracefully
      expect(successes).toBeGreaterThan(0);

      if (failures > 0) {
        // Check that failures are due to resource limits, not crashes
        const rejectedResults = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        const errorMessages = rejectedResults.map(r => r.reason?.message || '');

        // Should not have any unhandled crashes
        const crashErrors = errorMessages.filter(msg =>
          msg.includes('Cannot read property') ||
          msg.includes('undefined is not a function') ||
          msg.includes('Maximum call stack')
        );

        expect(crashErrors).toHaveLength(0);
      }
    });
  });
});

// Helper Functions

async function runConcurrentGenerationTest(
  concurrencyLevel: number,
  presets: string[]
): Promise<StressTestResult & ConcurrentGenerationMetrics> {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  let peakMemory = 0;

  // Monitor memory usage during test
  const memoryMonitor = setInterval(() => {
    const currentMemory = process.memoryUsage().heapUsed;
    peakMemory = Math.max(peakMemory, currentMemory);
  }, 100);

  const promises = presets.slice(0, concurrencyLevel).map((preset, index) =>
    generateProject(preset, `stress-test-${index}-${Date.now()}`)
  );

  const results = await Promise.allSettled(promises);

  clearInterval(memoryMonitor);

  const endTime = performance.now();
  const totalDuration = endTime - startTime;
  const successes = results.filter(r => r.status === 'fulfilled').length;
  const failures = results.filter(r => r.status === 'rejected').length;
  const errors = results
    .filter(r => r.status === 'rejected')
    .map(r => (r as PromiseRejectedResult).reason?.message || 'Unknown error');

  const metrics: StressTestResult & ConcurrentGenerationMetrics = {
    success: successes > 0,
    duration: totalDuration,
    memoryUsage: process.memoryUsage(),
    errors,
    generatedProjects: successes,
    concurrencyLevel,
    totalDuration,
    averageDuration: totalDuration / concurrencyLevel,
    successRate: (successes / concurrencyLevel) * 100,
    memoryPeak: peakMemory,
    throughput: successes / (totalDuration / 1000),
    errorRate: (failures / concurrencyLevel) * 100,
    resourceContention: failures > 0 ? failures / concurrencyLevel : 0
  };

  return metrics;
}

async function generateProject(preset: string, projectName: string): Promise<string> {
  const projectPath = path.join(stressTestDir, projectName);

  try {
    // Add some validation for invalid inputs
    if (!projectName || projectName.includes('..') || projectName === '') {
      throw new Error(`Invalid project name: ${projectName}`);
    }

    const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
    await createNextjsApp({
      projectPath,
      preset: preset as any,
      projectName
    });

    // Verify the generation was successful
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error(`Generation failed: package.json not created for ${projectName}`);
    }

    return projectPath;
  } catch (error: any) {
    // Clean up failed generation attempt
    try {
      if (await fs.pathExists(projectPath)) {
        await fs.remove(projectPath);
      }
    } catch {
      // Ignore cleanup errors
    }

    throw error;
  }
}

async function cleanupGeneratedProjects(count: number): Promise<void> {
  const entries = await fs.readdir(stressTestDir);
  const projectDirs = entries
    .filter(entry => entry.startsWith('stress-test-'))
    .slice(0, count);

  await Promise.all(
    projectDirs.map(dir => fs.remove(path.join(stressTestDir, dir)))
  );
}

async function waitForMemoryCleanup(): Promise<void> {
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Wait a bit for async cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
}