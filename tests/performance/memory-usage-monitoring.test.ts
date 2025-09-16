import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { performance } from 'perf_hooks';

interface MemorySnapshot {
  timestamp: number;
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
  phase: string;
}

interface MemoryAnalysis {
  initialMemory: MemorySnapshot;
  peakMemory: MemorySnapshot;
  finalMemory: MemorySnapshot;
  memoryGrowth: number;
  peakGrowth: number;
  averageGrowthRate: number; // bytes per second
  memoryLeaks: MemoryLeak[];
  gcEfficiency: number;
}

interface MemoryLeak {
  phase: string;
  suspectedLeak: boolean;
  growthRate: number;
  description: string;
}

interface TemplateMemoryProfile {
  preset: string;
  templateLoadingMemory: MemoryAnalysis;
  fileGenerationMemory: MemoryAnalysis;
  totalMemoryFootprint: number;
  memoryEfficiency: number; // files per MB
  recommendedMaxConcurrency: number;
}

describe('Memory Usage Monitoring for Template Processing', () => {
  const memoryTestDir = path.join(process.cwd(), 'temp-memory-tests');
  const monitoringInterval = 50; // Monitor every 50ms

  beforeAll(async () => {
    if (await fs.pathExists(memoryTestDir)) {
      await fs.remove(memoryTestDir);
    }
    await fs.ensureDir(memoryTestDir);

    // Force initial garbage collection
    if (global.gc) {
      global.gc();
      global.gc(); // Double GC to ensure clean state
    }

    // Warm up the system to stabilize memory baseline
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (await fs.pathExists(memoryTestDir)) {
      await fs.remove(memoryTestDir);
    }

    // Final cleanup
    if (global.gc) {
      global.gc();
    }
  });

  describe('Template Loading Memory Analysis', () => {
    it('should monitor memory during template loading for all presets', async () => {
      const presets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];
      const profiles: TemplateMemoryProfile[] = [];

      for (const preset of presets) {
        const profile = await analyzeTemplateMemoryUsage(preset, `template-load-${preset}`);
        profiles.push(profile);

        // Memory usage should be reasonable for template loading
        expect(profile.templateLoadingMemory.peakGrowth).toBeLessThan(100 * 1024 * 1024); // < 100MB growth
        expect(profile.templateLoadingMemory.memoryLeaks).toHaveLength(0);

        // Clean up between tests
        await forceGarbageCollection();
      }

      // Analyze memory usage patterns across presets
      const memoryFootprints = profiles.map(p => p.totalMemoryFootprint);
      const maxFootprint = Math.max(...memoryFootprints);
      const avgFootprint = memoryFootprints.reduce((a, b) => a + b, 0) / memoryFootprints.length;

      // Enterprise should use more memory, but not excessively
      const enterpriseProfile = profiles.find(p => p.preset === 'enterprise');
      const minimalProfile = profiles.find(p => p.preset === 'minimal');

      expect(enterpriseProfile!.totalMemoryFootprint).toBeGreaterThan(minimalProfile!.totalMemoryFootprint);
      expect(enterpriseProfile!.totalMemoryFootprint).toBeLessThan(minimalProfile!.totalMemoryFootprint * 10);

      console.log('Memory Profiles:', profiles.map(p => ({
        preset: p.preset,
        footprint: `${(p.totalMemoryFootprint / 1024 / 1024).toFixed(2)}MB`,
        efficiency: `${p.memoryEfficiency.toFixed(2)} files/MB`,
        maxConcurrency: p.recommendedMaxConcurrency
      })));
    });

    it('should detect memory leaks in template caching', async () => {
      const preset = 'dashboard';
      const iterations = 10;
      const memorySnapshots: MemorySnapshot[] = [];

      // Baseline
      await forceGarbageCollection();
      const baseline = captureMemorySnapshot('baseline');
      memorySnapshots.push(baseline);

      // Load same template multiple times
      for (let i = 0; i < iterations; i++) {
        const projectPath = path.join(memoryTestDir, `cache-leak-test-${i}`);

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `cache-leak-test-${i}`
        });

        // Remove generated files but keep templates in memory
        await fs.remove(projectPath);

        // Force GC and capture snapshot
        await forceGarbageCollection();
        const snapshot = captureMemorySnapshot(`iteration-${i}`);
        memorySnapshots.push(snapshot);
      }

      // Analyze memory growth pattern
      const leakAnalysis = detectMemoryLeaks(memorySnapshots);

      // Should not have significant memory growth after initial loading
      const finalGrowth = memorySnapshots[memorySnapshots.length - 1].heapUsed - baseline.heapUsed;
      const acceptableGrowth = 50 * 1024 * 1024; // 50MB acceptable growth

      expect(finalGrowth).toBeLessThan(acceptableGrowth);
      expect(leakAnalysis.suspectedLeaks).toHaveLength(0);

      if (leakAnalysis.suspectedLeaks.length > 0) {
        console.warn('Suspected memory leaks:', leakAnalysis.suspectedLeaks);
      }
    });

    it('should validate memory efficiency for large template files', async () => {
      const preset = 'enterprise'; // Largest template set
      const projectPath = path.join(memoryTestDir, 'large-template-memory');

      const memoryMonitor = new MemoryMonitor();
      memoryMonitor.start();

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: preset as any,
        projectName: 'large-template-memory'
      });

      const analysis = memoryMonitor.stop();

      // Count generated files
      const fileStats = await countGeneratedFiles(projectPath);

      // Calculate memory efficiency
      const memoryEfficiency = fileStats.fileCount / (analysis.peakGrowth / 1024 / 1024);

      expect(memoryEfficiency).toBeGreaterThan(1); // > 1 file per MB
      expect(analysis.peakGrowth).toBeLessThan(500 * 1024 * 1024); // < 500MB peak

      // Memory should be released after generation
      await forceGarbageCollection();
      const finalMemory = process.memoryUsage();
      const retainedMemory = finalMemory.heapUsed - analysis.initialMemory.heapUsed;

      expect(retainedMemory).toBeLessThan(analysis.peakGrowth * 0.3); // < 30% retained

      console.log(`Memory efficiency: ${memoryEfficiency.toFixed(2)} files/MB`);
      console.log(`Peak memory: ${(analysis.peakGrowth / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Concurrent Processing Memory Monitoring', () => {
    it('should monitor memory during concurrent template processing', async () => {
      const concurrencyLevels = [2, 4, 6];

      for (const concurrency of concurrencyLevels) {
        const memoryMonitor = new MemoryMonitor();
        memoryMonitor.start();

        const promises = [];
        for (let i = 0; i < concurrency; i++) {
          const projectPath = path.join(memoryTestDir, `concurrent-${concurrency}-${i}`);
          promises.push(generateProjectWithMemoryTracking(projectPath, 'blog', `concurrent-${concurrency}-${i}`));
        }

        await Promise.all(promises);
        const analysis = memoryMonitor.stop();

        // Memory usage should scale reasonably with concurrency
        const memoryPerProcess = analysis.peakGrowth / concurrency;
        expect(memoryPerProcess).toBeLessThan(200 * 1024 * 1024); // < 200MB per process

        // Should not have excessive memory fragmentation
        expect(analysis.gcEfficiency).toBeGreaterThan(0.7); // > 70% GC efficiency

        console.log(`Concurrency ${concurrency}: Peak ${(analysis.peakGrowth / 1024 / 1024).toFixed(2)}MB, Per Process ${(memoryPerProcess / 1024 / 1024).toFixed(2)}MB`);

        // Clean up
        for (let i = 0; i < concurrency; i++) {
          const projectPath = path.join(memoryTestDir, `concurrent-${concurrency}-${i}`);
          await fs.remove(projectPath);
        }

        await forceGarbageCollection();
      }
    });

    it('should prevent memory exhaustion under high load', async () => {
      const highConcurrency = 8;
      const memoryLimit = 1024 * 1024 * 1024; // 1GB limit

      const memoryMonitor = new MemoryMonitor();
      memoryMonitor.start();

      // Set up memory monitoring with limits
      let memoryExhausted = false;
      const memoryWatcher = setInterval(() => {
        const current = process.memoryUsage();
        if (current.heapUsed > memoryLimit) {
          memoryExhausted = true;
        }
      }, 100);

      try {
        const promises = [];
        for (let i = 0; i < highConcurrency; i++) {
          const projectPath = path.join(memoryTestDir, `high-load-${i}`);
          promises.push(generateProjectWithMemoryTracking(projectPath, 'startup', `high-load-${i}`));
        }

        const results = await Promise.allSettled(promises);
        const successes = results.filter(r => r.status === 'fulfilled').length;

        // Should handle high load gracefully
        expect(successes).toBeGreaterThan(0);
        expect(memoryExhausted).toBe(false);

      } finally {
        clearInterval(memoryWatcher);
        const analysis = memoryMonitor.stop();

        // Memory usage should be controlled
        expect(analysis.peakGrowth).toBeLessThan(memoryLimit);

        // Clean up
        for (let i = 0; i < highConcurrency; i++) {
          const projectPath = path.join(memoryTestDir, `high-load-${i}`);
          if (await fs.pathExists(projectPath)) {
            await fs.remove(projectPath);
          }
        }
      }
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect template string memory leaks', async () => {
      const iterations = 20;
      const memorySnapshots: MemorySnapshot[] = [];

      // Baseline measurement
      await forceGarbageCollection();
      memorySnapshots.push(captureMemorySnapshot('baseline'));

      for (let i = 0; i < iterations; i++) {
        // Load template files multiple times
        const { loadTemplateFile } = await import('../../src/utils/template-loader.js');

        try {
          // Try to load different template types
          await loadTemplateFile('package.json');
          await loadTemplateFile('tsconfig.json');
          await loadTemplateFile('next.config.mjs');
        } catch (error) {
          // Some templates might not exist, which is fine for this test
        }

        // Force GC every few iterations
        if (i % 5 === 0) {
          await forceGarbageCollection();
          memorySnapshots.push(captureMemorySnapshot(`gc-${i}`));
        }
      }

      // Final measurement
      await forceGarbageCollection();
      memorySnapshots.push(captureMemorySnapshot('final'));

      // Analyze for memory leaks
      const leakAnalysis = detectMemoryLeaks(memorySnapshots);

      // Should not have linear memory growth
      expect(leakAnalysis.linearGrowth).toBe(false);
      expect(leakAnalysis.suspectedLeaks).toHaveLength(0);

      const totalGrowth = memorySnapshots[memorySnapshots.length - 1].heapUsed - memorySnapshots[0].heapUsed;
      expect(totalGrowth).toBeLessThan(100 * 1024 * 1024); // < 100MB total growth
    });

    it('should validate proper cleanup after template processing', async () => {
      const preset = 'enterprise';
      const projectPath = path.join(memoryTestDir, 'cleanup-validation');

      // Measure baseline
      await forceGarbageCollection();
      const baselineMemory = process.memoryUsage();

      // Generate project
      const memoryMonitor = new MemoryMonitor();
      memoryMonitor.start();

      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
      await createNextjsApp({
        projectPath,
        preset: preset as any,
        projectName: 'cleanup-validation'
      });

      const generationAnalysis = memoryMonitor.stop();

      // Remove generated files
      await fs.remove(projectPath);

      // Force multiple GC cycles to ensure cleanup
      await forceGarbageCollection();
      await new Promise(resolve => setTimeout(resolve, 100));
      await forceGarbageCollection();

      const finalMemory = process.memoryUsage();

      // Memory should return close to baseline
      const retainedMemory = finalMemory.heapUsed - baselineMemory.heapUsed;
      const cleanupEfficiency = 1 - (retainedMemory / generationAnalysis.peakGrowth);

      expect(cleanupEfficiency).toBeGreaterThan(0.8); // > 80% memory cleanup
      expect(retainedMemory).toBeLessThan(50 * 1024 * 1024); // < 50MB retained

      console.log(`Cleanup efficiency: ${(cleanupEfficiency * 100).toFixed(1)}%`);
      console.log(`Retained memory: ${(retainedMemory / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Memory Performance Optimization', () => {
    it('should optimize memory usage for repeated template access', async () => {
      const preset = 'dashboard';
      const repetitions = 5;
      const memoryUsages: number[] = [];

      for (let i = 0; i < repetitions; i++) {
        const projectPath = path.join(memoryTestDir, `optimization-${i}`);

        await forceGarbageCollection();
        const beforeMemory = process.memoryUsage();

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `optimization-${i}`
        });

        const afterMemory = process.memoryUsage();
        const memoryUsed = afterMemory.heapUsed - beforeMemory.heapUsed;
        memoryUsages.push(memoryUsed);

        await fs.remove(projectPath);
      }

      // Later generations should use less memory due to caching
      const firstGeneration = memoryUsages[0];
      const laterGenerations = memoryUsages.slice(2); // Skip first 2 for cache warmup
      const avgLaterMemory = laterGenerations.reduce((a, b) => a + b, 0) / laterGenerations.length;

      // Should see memory optimization (later generations use ≤ first generation)
      expect(avgLaterMemory).toBeLessThanOrEqual(firstGeneration * 1.1); // Allow 10% variance

      console.log(`First generation: ${(firstGeneration / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Average later: ${(avgLaterMemory / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});

// Helper Classes and Functions

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private interval?: NodeJS.Timeout;
  private startTime = 0;

  start(): void {
    this.startTime = performance.now();
    this.snapshots = [];

    // Take initial snapshot
    this.snapshots.push(captureMemorySnapshot('start'));

    // Monitor memory every 50ms
    this.interval = setInterval(() => {
      this.snapshots.push(captureMemorySnapshot('monitoring'));
    }, 50);
  }

  stop(): MemoryAnalysis {
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Final snapshot
    this.snapshots.push(captureMemorySnapshot('end'));

    return this.analyzeMemoryUsage();
  }

  private analyzeMemoryUsage(): MemoryAnalysis {
    const initial = this.snapshots[0];
    const final = this.snapshots[this.snapshots.length - 1];
    const peak = this.snapshots.reduce((prev, current) =>
      current.heapUsed > prev.heapUsed ? current : prev
    );

    const memoryGrowth = final.heapUsed - initial.heapUsed;
    const peakGrowth = peak.heapUsed - initial.heapUsed;
    const duration = (final.timestamp - initial.timestamp) / 1000; // seconds
    const averageGrowthRate = memoryGrowth / duration;

    const memoryLeaks = this.detectLeaks();
    const gcEfficiency = this.calculateGCEfficiency();

    return {
      initialMemory: initial,
      peakMemory: peak,
      finalMemory: final,
      memoryGrowth,
      peakGrowth,
      averageGrowthRate,
      memoryLeaks,
      gcEfficiency
    };
  }

  private detectLeaks(): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    const windowSize = 10;

    for (let i = windowSize; i < this.snapshots.length; i++) {
      const window = this.snapshots.slice(i - windowSize, i);
      const growthRates = window.map((snapshot, index) =>
        index > 0 ? snapshot.heapUsed - window[index - 1].heapUsed : 0
      );

      const avgGrowthRate = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
      const consistentGrowth = growthRates.filter(rate => rate > 0).length / growthRates.length;

      if (avgGrowthRate > 1024 * 1024 && consistentGrowth > 0.8) { // > 1MB/snapshot and 80% consistent
        leaks.push({
          phase: `snapshot-${i}`,
          suspectedLeak: true,
          growthRate: avgGrowthRate,
          description: `Consistent memory growth detected: ${(avgGrowthRate / 1024).toFixed(2)}KB/snapshot`
        });
      }
    }

    return leaks;
  }

  private calculateGCEfficiency(): number {
    let gcEvents = 0;
    let totalReclaimed = 0;

    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const current = this.snapshots[i];

      if (current.heapUsed < prev.heapUsed) {
        gcEvents++;
        totalReclaimed += prev.heapUsed - current.heapUsed;
      }
    }

    const totalAllocated = this.snapshots.reduce((total, snapshot, index) =>
      index > 0 ? total + Math.max(0, snapshot.heapUsed - this.snapshots[index - 1].heapUsed) : total,
      0
    );

    return totalAllocated > 0 ? totalReclaimed / totalAllocated : 1;
  }
}

function captureMemorySnapshot(phase: string): MemorySnapshot {
  const memory = process.memoryUsage();
  return {
    timestamp: performance.now(),
    rss: memory.rss,
    heapTotal: memory.heapTotal,
    heapUsed: memory.heapUsed,
    external: memory.external,
    arrayBuffers: memory.arrayBuffers,
    phase
  };
}

async function analyzeTemplateMemoryUsage(preset: string, projectName: string): Promise<TemplateMemoryProfile> {
  const projectPath = path.join(memoryTestDir, projectName);

  // Template loading phase
  const templateMonitor = new MemoryMonitor();
  templateMonitor.start();

  const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');

  const templateLoadingAnalysis = templateMonitor.stop();

  // File generation phase
  const generationMonitor = new MemoryMonitor();
  generationMonitor.start();

  await createNextjsApp({
    projectPath,
    preset: preset as any,
    projectName
  });

  const fileGenerationAnalysis = generationMonitor.stop();

  // Analyze generated files
  const fileStats = await countGeneratedFiles(projectPath);

  const totalMemoryFootprint = templateLoadingAnalysis.peakGrowth + fileGenerationAnalysis.peakGrowth;
  const memoryEfficiency = fileStats.fileCount / (totalMemoryFootprint / 1024 / 1024);

  // Calculate recommended max concurrency based on memory usage
  const systemMemory = 8 * 1024 * 1024 * 1024; // Assume 8GB system
  const safeMemoryLimit = systemMemory * 0.6; // Use 60% of system memory
  const recommendedMaxConcurrency = Math.floor(safeMemoryLimit / totalMemoryFootprint);

  // Clean up
  await fs.remove(projectPath);

  return {
    preset,
    templateLoadingMemory: templateLoadingAnalysis,
    fileGenerationMemory: fileGenerationAnalysis,
    totalMemoryFootprint,
    memoryEfficiency,
    recommendedMaxConcurrency: Math.max(1, recommendedMaxConcurrency)
  };
}

async function generateProjectWithMemoryTracking(
  projectPath: string,
  preset: string,
  projectName: string
): Promise<MemoryAnalysis> {
  const monitor = new MemoryMonitor();
  monitor.start();

  const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
  await createNextjsApp({
    projectPath,
    preset: preset as any,
    projectName
  });

  return monitor.stop();
}

async function countGeneratedFiles(projectPath: string): Promise<{ fileCount: number; totalSize: number }> {
  let fileCount = 0;
  let totalSize = 0;

  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await scanDirectory(fullPath);
      } else if (entry.isFile()) {
        fileCount++;
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  }

  if (await fs.pathExists(projectPath)) {
    await scanDirectory(projectPath);
  }

  return { fileCount, totalSize };
}

function detectMemoryLeaks(snapshots: MemorySnapshot[]): {
  suspectedLeaks: MemoryLeak[];
  linearGrowth: boolean;
  growthRate: number;
} {
  const leaks: MemoryLeak[] = [];
  let linearGrowth = false;
  let growthRate = 0;

  if (snapshots.length < 3) {
    return { suspectedLeaks: leaks, linearGrowth, growthRate };
  }

  // Check for linear memory growth
  const memoryValues = snapshots.map(s => s.heapUsed);
  const timeValues = snapshots.map(s => s.timestamp);

  // Calculate correlation coefficient for linear growth
  const correlation = calculateCorrelation(timeValues, memoryValues);
  linearGrowth = Math.abs(correlation) > 0.8; // Strong correlation indicates linear growth

  if (linearGrowth) {
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const timeDiff = (lastSnapshot.timestamp - firstSnapshot.timestamp) / 1000; // seconds
    growthRate = (lastSnapshot.heapUsed - firstSnapshot.heapUsed) / timeDiff; // bytes per second

    if (growthRate > 1024 * 1024) { // > 1MB per second growth
      leaks.push({
        phase: 'overall',
        suspectedLeak: true,
        growthRate,
        description: `Linear memory growth detected: ${(growthRate / 1024 / 1024).toFixed(2)}MB/s`
      });
    }
  }

  return { suspectedLeaks: leaks, linearGrowth, growthRate };
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

async function forceGarbageCollection(): Promise<void> {
  if (global.gc) {
    global.gc();
    global.gc(); // Double GC for thorough cleanup
  }

  // Wait for async cleanup
  await new Promise(resolve => setTimeout(resolve, 50));
}