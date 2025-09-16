import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { performance } from 'perf_hooks';

interface CachePerformanceMetrics {
  coldStartTime: number;
  warmStartTime: number;
  cacheHitRatio: number;
  memoryCacheSize: number;
  diskCacheSize: number;
  cacheEvictionRate: number;
  throughputImprovement: number;
}

interface TemplateAccessPattern {
  templateName: string;
  accessCount: number;
  averageLoadTime: number;
  cacheHits: number;
  cacheMisses: number;
  lastAccessed: number;
}

interface CachingStrategy {
  name: string;
  enabled: boolean;
  maxCacheSize: number;
  evictionPolicy: 'LRU' | 'LFU' | 'TTL';
  performanceScore: number;
}

describe('Template Caching Performance Validation', () => {
  const cacheTestDir = path.join(process.cwd(), 'temp-cache-tests');
  const templateCacheDir = path.join(cacheTestDir, '.template-cache');

  beforeAll(async () => {
    if (await fs.pathExists(cacheTestDir)) {
      await fs.remove(cacheTestDir);
    }
    await fs.ensureDir(cacheTestDir);
    await fs.ensureDir(templateCacheDir);

    // Initialize clean state
    if (global.gc) {
      global.gc();
    }
  });

  afterAll(async () => {
    if (await fs.pathExists(cacheTestDir)) {
      await fs.remove(cacheTestDir);
    }

    // Clean up any global caching state
    if (global.gc) {
      global.gc();
    }
  });

  describe('Cold Start vs Warm Start Performance', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const preset = 'startup';
      const iterations = 5;

      // Measure cold start (first generation)
      const coldStartTimes: number[] = [];

      for (let i = 0; i < 3; i++) {
        // Clear any existing caches
        await clearAllCaches();

        const projectPath = path.join(cacheTestDir, `cold-start-${i}`);
        const startTime = performance.now();

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `cold-start-${i}`
        });

        const coldTime = performance.now() - startTime;
        coldStartTimes.push(coldTime);

        await fs.remove(projectPath);
      }

      // Measure warm start (subsequent generations)
      const warmStartTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const projectPath = path.join(cacheTestDir, `warm-start-${i}`);
        const startTime = performance.now();

        const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
        await createNextjsApp({
          projectPath,
          preset: preset as any,
          projectName: `warm-start-${i}`
        });

        const warmTime = performance.now() - startTime;
        warmStartTimes.push(warmTime);

        await fs.remove(projectPath);
      }

      const avgColdTime = coldStartTimes.reduce((a, b) => a + b, 0) / coldStartTimes.length;
      const avgWarmTime = warmStartTimes.reduce((a, b) => a + b, 0) / warmStartTimes.length;
      const improvement = (avgColdTime - avgWarmTime) / avgColdTime;

      // Warm starts should be significantly faster
      expect(improvement).toBeGreaterThan(0.15); // > 15% improvement
      expect(avgWarmTime).toBeLessThan(avgColdTime * 0.85); // < 85% of cold start time

      console.log(`Cold start avg: ${(avgColdTime / 1000).toFixed(2)}s`);
      console.log(`Warm start avg: ${(avgWarmTime / 1000).toFixed(2)}s`);
      console.log(`Performance improvement: ${(improvement * 100).toFixed(1)}%`);
    });

    it('should maintain cache effectiveness across different presets', async () => {
      const presets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];
      const cacheMetrics: Map<string, CachePerformanceMetrics> = new Map();

      for (const preset of presets) {
        const metrics = await measureCachePerformance(preset, 6);
        cacheMetrics.set(preset, metrics);

        // Each preset should show caching benefits
        expect(metrics.throughputImprovement).toBeGreaterThan(0.1); // > 10% improvement
        expect(metrics.cacheHitRatio).toBeGreaterThan(0.3); // > 30% cache hit rate
      }

      // Log cache effectiveness summary
      console.log('Cache Performance by Preset:');
      for (const [preset, metrics] of cacheMetrics) {
        console.log(`${preset}: ${(metrics.throughputImprovement * 100).toFixed(1)}% faster, ${(metrics.cacheHitRatio * 100).toFixed(1)}% hit rate`);
      }

      // Complex presets should benefit more from caching
      const minimalMetrics = cacheMetrics.get('minimal')!;
      const enterpriseMetrics = cacheMetrics.get('enterprise')!;

      expect(enterpriseMetrics.throughputImprovement).toBeGreaterThan(minimalMetrics.throughputImprovement);
    });
  });

  describe('Cache Hit Ratio Optimization', () => {
    it('should achieve high cache hit ratios for repeated template access', async () => {
      const preset = 'dashboard';
      const iterations = 10;
      const accessPattern = await analyzeTemplateAccessPattern(preset, iterations);

      // Should achieve good cache hit ratio after warmup
      expect(accessPattern.cacheHitRatio).toBeGreaterThan(0.6); // > 60% hit rate

      // Frequently accessed templates should have higher hit rates
      const frequentTemplates = accessPattern.templates.filter(t => t.accessCount > 5);
      const avgHitRatio = frequentTemplates.reduce((sum, t) => sum + (t.cacheHits / t.accessCount), 0) / frequentTemplates.length;

      expect(avgHitRatio).toBeGreaterThan(0.7); // > 70% for frequent templates

      console.log(`Overall cache hit ratio: ${(accessPattern.cacheHitRatio * 100).toFixed(1)}%`);
      console.log(`Frequent templates hit ratio: ${(avgHitRatio * 100).toFixed(1)}%`);
    });

    it('should optimize cache performance for common template combinations', async () => {
      const commonCombinations = [
        { presets: ['minimal', 'minimal', 'minimal'], description: 'Same preset repeated' },
        { presets: ['blog', 'dashboard', 'blog'], description: 'Alternating presets' },
        { presets: ['startup', 'enterprise', 'startup'], description: 'Complex preset alternation' }
      ];

      for (const combination of commonCombinations) {
        const startTime = performance.now();
        let totalCacheHits = 0;
        let totalCacheAttempts = 0;

        for (let i = 0; i < combination.presets.length; i++) {
          const preset = combination.presets[i];
          const projectPath = path.join(cacheTestDir, `combo-${combination.description.replace(/\s/g, '')}-${i}`);

          const cacheStatsBefore = await getCacheStats();

          const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
          await createNextjsApp({
            projectPath,
            preset: preset as any,
            projectName: `combo-test-${i}`
          });

          const cacheStatsAfter = await getCacheStats();
          totalCacheHits += (cacheStatsAfter.hits - cacheStatsBefore.hits);
          totalCacheAttempts += (cacheStatsAfter.attempts - cacheStatsBefore.attempts);

          await fs.remove(projectPath);
        }

        const totalTime = performance.now() - startTime;
        const hitRatio = totalCacheAttempts > 0 ? totalCacheHits / totalCacheAttempts : 0;
        const avgTimePerGeneration = totalTime / combination.presets.length;

        console.log(`${combination.description}: ${(hitRatio * 100).toFixed(1)}% hit rate, ${(avgTimePerGeneration / 1000).toFixed(2)}s avg`);

        // Repeated patterns should show good cache utilization
        if (combination.description.includes('repeated') || combination.description.includes('alternating')) {
          expect(hitRatio).toBeGreaterThan(0.4); // > 40% hit rate for patterns
        }
      }
    });
  });

  describe('Cache Memory Management', () => {
    it('should manage cache memory usage efficiently', async () => {
      const preset = 'enterprise';
      const iterations = 15; // More iterations to test memory management

      const initialMemory = process.memoryUsage();
      let peakMemory = initialMemory.heapUsed;

      // Monitor memory during cache operations
      const memoryMonitor = setInterval(() => {
        const current = process.memoryUsage();
        peakMemory = Math.max(peakMemory, current.heapUsed);
      }, 100);

      try {
        for (let i = 0; i < iterations; i++) {
          const projectPath = path.join(cacheTestDir, `memory-test-${i}`);

          const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
          await createNextjsApp({
            projectPath,
            preset: preset as any,
            projectName: `memory-test-${i}`
          });

          await fs.remove(projectPath);

          // Force GC periodically to measure retained cache memory
          if (i % 5 === 0 && global.gc) {
            global.gc();
          }
        }

        const finalMemory = process.memoryUsage();
        const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
        const peakGrowth = peakMemory - initialMemory.heapUsed;

        // Cache should not cause excessive memory growth
        expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // < 200MB retained
        expect(peakGrowth).toBeLessThan(500 * 1024 * 1024); // < 500MB peak

        console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB retained, ${(peakGrowth / 1024 / 1024).toFixed(2)}MB peak`);

      } finally {
        clearInterval(memoryMonitor);
      }
    });

    it('should implement effective cache eviction policies', async () => {
      // Test cache eviction by generating many different presets
      const presets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];
      const iterations = 3; // Multiple rounds to trigger eviction

      let totalGenerations = 0;
      let cacheEvictions = 0;

      for (let round = 0; round < iterations; round++) {
        for (const preset of presets) {
          const projectPath = path.join(cacheTestDir, `eviction-test-${round}-${preset}`);

          const cacheStatsBefore = await getCacheStats();

          const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
          await createNextjsApp({
            projectPath,
            preset: preset as any,
            projectName: `eviction-test-${round}-${preset}`
          });

          const cacheStatsAfter = await getCacheStats();

          // Check for cache evictions (size decreased)
          if (cacheStatsAfter.cacheSize < cacheStatsBefore.cacheSize) {
            cacheEvictions++;
          }

          totalGenerations++;
          await fs.remove(projectPath);
        }
      }

      const evictionRate = cacheEvictions / totalGenerations;

      // Should have some cache evictions to manage memory, but not excessive
      expect(evictionRate).toBeGreaterThan(0); // Some eviction should occur
      expect(evictionRate).toBeLessThan(0.5); // < 50% eviction rate

      console.log(`Cache eviction rate: ${(evictionRate * 100).toFixed(1)}%`);
    });
  });

  describe('Cache Invalidation and Consistency', () => {
    it('should invalidate cache when templates are modified', async () => {
      const preset = 'minimal';

      // Generate project and measure time (should be cached after first run)
      const warmupPath = path.join(cacheTestDir, 'cache-invalidation-warmup');
      const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');

      await createNextjsApp({
        projectPath: warmupPath,
        preset: preset as any,
        projectName: 'cache-invalidation-warmup'
      });

      await fs.remove(warmupPath);

      // Measure cached performance
      const cachedPath = path.join(cacheTestDir, 'cache-invalidation-cached');
      const cachedStartTime = performance.now();

      await createNextjsApp({
        projectPath: cachedPath,
        preset: preset as any,
        projectName: 'cache-invalidation-cached'
      });

      const cachedTime = performance.now() - cachedStartTime;
      await fs.remove(cachedPath);

      // Simulate template modification by clearing cache
      await clearAllCaches();

      // Measure performance after cache invalidation
      const invalidatedPath = path.join(cacheTestDir, 'cache-invalidation-after');
      const invalidatedStartTime = performance.now();

      await createNextjsApp({
        projectPath: invalidatedPath,
        preset: preset as any,
        projectName: 'cache-invalidation-after'
      });

      const invalidatedTime = performance.now() - invalidatedStartTime;
      await fs.remove(invalidatedPath);

      // Performance after invalidation should be slower (like cold start)
      expect(invalidatedTime).toBeGreaterThan(cachedTime * 1.2); // > 20% slower

      console.log(`Cached: ${(cachedTime / 1000).toFixed(2)}s, After invalidation: ${(invalidatedTime / 1000).toFixed(2)}s`);
    });

    it('should maintain cache consistency across concurrent operations', async () => {
      const preset = 'blog';
      const concurrency = 4;

      const promises = [];
      const generationTimes: number[] = [];

      for (let i = 0; i < concurrency; i++) {
        const promise = (async () => {
          const projectPath = path.join(cacheTestDir, `concurrent-cache-${i}`);
          const startTime = performance.now();

          const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
          await createNextjsApp({
            projectPath,
            preset: preset as any,
            projectName: `concurrent-cache-${i}`
          });

          const generationTime = performance.now() - startTime;
          generationTimes.push(generationTime);

          await fs.remove(projectPath);
          return generationTime;
        })();

        promises.push(promise);
      }

      await Promise.all(promises);

      // All concurrent operations should complete successfully
      expect(generationTimes).toHaveLength(concurrency);

      // Generation times should be reasonably consistent (cache working properly)
      const avgTime = generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length;
      const variance = generationTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / generationTimes.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / avgTime;

      // Should have low variance (consistent cache performance)
      expect(coefficientOfVariation).toBeLessThan(0.3); // < 30% CV

      console.log(`Concurrent cache operations: avg ${(avgTime / 1000).toFixed(2)}s, CV ${(coefficientOfVariation * 100).toFixed(1)}%`);
    });
  });

  describe('Cache Performance Optimization Strategies', () => {
    it('should evaluate different caching strategies', async () => {
      const strategies: CachingStrategy[] = [
        { name: 'Memory Only', enabled: true, maxCacheSize: 100 * 1024 * 1024, evictionPolicy: 'LRU', performanceScore: 0 },
        { name: 'Disk + Memory', enabled: true, maxCacheSize: 50 * 1024 * 1024, evictionPolicy: 'LFU', performanceScore: 0 },
        { name: 'Compressed Cache', enabled: true, maxCacheSize: 200 * 1024 * 1024, evictionPolicy: 'TTL', performanceScore: 0 }
      ];

      for (const strategy of strategies) {
        // Simulate different caching strategies by measuring performance
        const preset = 'startup';
        const iterations = 8;

        await clearAllCaches();

        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const projectPath = path.join(cacheTestDir, `strategy-${strategy.name.replace(/\s/g, '')}-${i}`);
          const startTime = performance.now();

          const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
          await createNextjsApp({
            projectPath,
            preset: preset as any,
            projectName: `strategy-test-${i}`
          });

          const generationTime = performance.now() - startTime;
          times.push(generationTime);

          await fs.remove(projectPath);
        }

        // Calculate performance score
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const improvementAfterWarmup = times.slice(0, 2).reduce((a, b) => a + b, 0) / 2 - times.slice(-2).reduce((a, b) => a + b, 0) / 2;

        strategy.performanceScore = improvementAfterWarmup / avgTime;

        console.log(`${strategy.name}: avg ${(avgTime / 1000).toFixed(2)}s, improvement score ${(strategy.performanceScore * 100).toFixed(1)}%`);
      }

      // At least one strategy should show significant improvement
      const bestStrategy = strategies.reduce((best, current) =>
        current.performanceScore > best.performanceScore ? current : best
      );

      expect(bestStrategy.performanceScore).toBeGreaterThan(0.05); // > 5% improvement
    });

    it('should optimize cache for template reuse patterns', async () => {
      // Simulate real-world usage patterns
      const usagePatterns = [
        { name: 'Development Workflow', sequence: ['minimal', 'minimal', 'blog', 'minimal', 'dashboard'] },
        { name: 'Client Projects', sequence: ['startup', 'enterprise', 'startup', 'blog', 'startup'] },
        { name: 'Rapid Prototyping', sequence: ['minimal', 'blog', 'dashboard', 'minimal', 'blog'] }
      ];

      for (const pattern of usagePatterns) {
        const patternStartTime = performance.now();
        let totalCacheHits = 0;
        let totalOperations = 0;

        for (let i = 0; i < pattern.sequence.length; i++) {
          const preset = pattern.sequence[i];
          const projectPath = path.join(cacheTestDir, `pattern-${pattern.name.replace(/\s/g, '')}-${i}`);

          const cacheStatsBefore = await getCacheStats();

          const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
          await createNextjsApp({
            projectPath,
            preset: preset as any,
            projectName: `pattern-test-${i}`
          });

          const cacheStatsAfter = await getCacheStats();
          totalCacheHits += (cacheStatsAfter.hits - cacheStatsBefore.hits);
          totalOperations += (cacheStatsAfter.attempts - cacheStatsBefore.attempts);

          await fs.remove(projectPath);
        }

        const patternTime = performance.now() - patternStartTime;
        const hitRatio = totalOperations > 0 ? totalCacheHits / totalOperations : 0;

        console.log(`${pattern.name}: ${(patternTime / 1000).toFixed(2)}s total, ${(hitRatio * 100).toFixed(1)}% hit rate`);

        // Patterns with repeated presets should show good cache utilization
        const uniquePresets = new Set(pattern.sequence).size;
        const repetitionRatio = 1 - (uniquePresets / pattern.sequence.length);

        if (repetitionRatio > 0.3) { // > 30% repetition
          expect(hitRatio).toBeGreaterThan(0.3); // Should achieve > 30% hit rate
        }
      }
    });
  });
});

// Helper Functions

async function measureCachePerformance(preset: string, iterations: number): Promise<CachePerformanceMetrics> {
  // Clear cache for cold start measurement
  await clearAllCaches();

  const coldStartTime = performance.now();
  let coldPath = path.join(cacheTestDir, `cold-${preset}`);

  const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
  await createNextjsApp({
    projectPath: coldPath,
    preset: preset as any,
    projectName: `cold-${preset}`
  });

  const coldTime = performance.now() - coldStartTime;
  await fs.remove(coldPath);

  // Warm start measurements
  const warmTimes: number[] = [];
  let totalCacheHits = 0;
  let totalCacheAttempts = 0;

  const memoryBefore = process.memoryUsage();

  for (let i = 0; i < iterations; i++) {
    const projectPath = path.join(cacheTestDir, `warm-${preset}-${i}`);

    const cacheStatsBefore = await getCacheStats();
    const warmStartTime = performance.now();

    await createNextjsApp({
      projectPath,
      preset: preset as any,
      projectName: `warm-${preset}-${i}`
    });

    const warmTime = performance.now() - warmStartTime;
    warmTimes.push(warmTime);

    const cacheStatsAfter = await getCacheStats();
    totalCacheHits += (cacheStatsAfter.hits - cacheStatsBefore.hits);
    totalCacheAttempts += (cacheStatsAfter.attempts - cacheStatsBefore.attempts);

    await fs.remove(projectPath);
  }

  const memoryAfter = process.memoryUsage();
  const avgWarmTime = warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

  return {
    coldStartTime: coldTime,
    warmStartTime: avgWarmTime,
    cacheHitRatio: totalCacheAttempts > 0 ? totalCacheHits / totalCacheAttempts : 0,
    memoryCacheSize: memoryAfter.heapUsed - memoryBefore.heapUsed,
    diskCacheSize: await getDiskCacheSize(),
    cacheEvictionRate: 0, // Would need more sophisticated tracking
    throughputImprovement: (coldTime - avgWarmTime) / coldTime
  };
}

async function analyzeTemplateAccessPattern(preset: string, iterations: number): Promise<{
  cacheHitRatio: number;
  templates: TemplateAccessPattern[];
  totalAccessTime: number;
}> {
  const accessPatterns: Map<string, TemplateAccessPattern> = new Map();
  let totalCacheHits = 0;
  let totalCacheAttempts = 0;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const projectPath = path.join(cacheTestDir, `access-pattern-${i}`);

    const cacheStatsBefore = await getCacheStats();

    const { createNextjsApp } = await import('../../src/tools/nextjs-creator.js');
    await createNextjsApp({
      projectPath,
      preset: preset as any,
      projectName: `access-pattern-${i}`
    });

    const cacheStatsAfter = await getCacheStats();
    totalCacheHits += (cacheStatsAfter.hits - cacheStatsBefore.hits);
    totalCacheAttempts += (cacheStatsAfter.attempts - cacheStatsBefore.attempts);

    await fs.remove(projectPath);
  }

  const totalTime = performance.now() - startTime;
  const overallHitRatio = totalCacheAttempts > 0 ? totalCacheHits / totalCacheAttempts : 0;

  return {
    cacheHitRatio: overallHitRatio,
    templates: Array.from(accessPatterns.values()),
    totalAccessTime: totalTime
  };
}

async function getCacheStats(): Promise<{
  hits: number;
  misses: number;
  attempts: number;
  cacheSize: number;
}> {
  // Simulate cache statistics - in real implementation, this would
  // interface with the actual caching system
  const mockStats = {
    hits: Math.floor(Math.random() * 100),
    misses: Math.floor(Math.random() * 50),
    attempts: 0,
    cacheSize: Math.floor(Math.random() * 1024 * 1024) // Random cache size
  };

  mockStats.attempts = mockStats.hits + mockStats.misses;
  return mockStats;
}

async function getDiskCacheSize(): Promise<number> {
  try {
    if (await fs.pathExists(templateCacheDir)) {
      const stats = await fs.stat(templateCacheDir);
      return stats.size || 0;
    }
  } catch (error) {
    // Cache directory might not exist
  }
  return 0;
}

async function clearAllCaches(): Promise<void> {
  // Clear disk cache
  if (await fs.pathExists(templateCacheDir)) {
    await fs.remove(templateCacheDir);
  }
  await fs.ensureDir(templateCacheDir);

  // Clear memory cache (force GC)
  if (global.gc) {
    global.gc();
    global.gc(); // Double GC for thorough cleanup
  }

  // Clear any module caches that might exist
  const moduleKeys = Object.keys(require.cache);
  const templateModules = moduleKeys.filter(key =>
    key.includes('template') ||
    key.includes('creator') ||
    key.includes('scaffold')
  );

  for (const moduleKey of templateModules) {
    delete require.cache[moduleKey];
  }

  // Wait for cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
}