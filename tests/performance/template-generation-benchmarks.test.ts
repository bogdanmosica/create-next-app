/**
 * @fileoverview Performance Benchmarking Tests for Template Generation
 * @description Measures and validates template generation speed and resource usage
 * Constitutional compliance: Performance validation for Build-First Testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import { ToolOrchestrator } from '../../src/core/tool-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  testName: string;
  preset: string;
  duration: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  filesGenerated: number;
  projectSize: number; // in bytes
  success: boolean;
  error?: string;
}

interface PerformanceThresholds {
  maxDuration: number; // milliseconds
  maxMemoryIncrease: number; // bytes
  minFilesGenerated: number;
  maxProjectSize: number; // bytes
}

class PerformanceBenchmarker {
  private benchmarkResults: BenchmarkResult[] = [];
  private baseTestDir: string;
  private thresholds: Map<string, PerformanceThresholds>;

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-perf-tests-${Date.now()}`);
    this.setupThresholds();
  }

  private setupThresholds() {
    this.thresholds = new Map([
      ['minimal', {
        maxDuration: 30000, // 30 seconds
        maxMemoryIncrease: 100 * 1024 * 1024, // 100MB
        minFilesGenerated: 10,
        maxProjectSize: 50 * 1024 * 1024 // 50MB
      }],
      ['blog', {
        maxDuration: 45000, // 45 seconds
        maxMemoryIncrease: 150 * 1024 * 1024, // 150MB
        minFilesGenerated: 15,
        maxProjectSize: 75 * 1024 * 1024 // 75MB
      }],
      ['dashboard', {
        maxDuration: 60000, // 1 minute
        maxMemoryIncrease: 200 * 1024 * 1024, // 200MB
        minFilesGenerated: 25,
        maxProjectSize: 100 * 1024 * 1024 // 100MB
      }],
      ['startup', {
        maxDuration: 90000, // 1.5 minutes
        maxMemoryIncrease: 300 * 1024 * 1024, // 300MB
        minFilesGenerated: 35,
        maxProjectSize: 150 * 1024 * 1024 // 150MB
      }],
      ['enterprise', {
        maxDuration: 120000, // 2 minutes
        maxMemoryIncrease: 400 * 1024 * 1024, // 400MB
        minFilesGenerated: 50,
        maxProjectSize: 200 * 1024 * 1024 // 200MB
      }]
    ]);
  }

  /**
   * Benchmark template generation performance
   */
  async benchmarkPreset(preset: string, iterations: number = 1): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.runSingleBenchmark(preset, i);
      results.push(result);
      this.benchmarkResults.push(result);

      // Clean up between iterations
      if (i < iterations - 1) {
        await this.cleanupIteration(result.testName);
      }
    }

    return results;
  }

  private async runSingleBenchmark(preset: string, iteration: number): Promise<BenchmarkResult> {
    const testName = `${preset}-${iteration}`;
    const projectPath = path.join(this.baseTestDir, testName);

    // Initial memory measurement
    const initialMemory = process.memoryUsage();
    let peakMemory = initialMemory;

    // Monitor memory usage during generation
    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage();
      if (currentMemory.heapUsed > peakMemory.heapUsed) {
        peakMemory = currentMemory;
      }
    }, 100);

    const startTime = performance.now();

    try {
      // Generate project
      await fs.ensureDir(projectPath);

      const orchestrator = new TransactionalOrchestrator({
        projectPath,
        projectName: testName,
        resumeTransaction: false,
        enableRollback: true
      });

      await orchestrator.createFullApp({ preset });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Calculate project metrics
      const filesGenerated = await this.countGeneratedFiles(projectPath);
      const projectSize = await this.calculateProjectSize(projectPath);

      // Final memory measurement
      const finalMemory = process.memoryUsage();

      clearInterval(memoryMonitor);

      return {
        testName,
        preset,
        duration,
        memoryUsage: {
          initial: initialMemory.heapUsed,
          peak: peakMemory.heapUsed,
          final: finalMemory.heapUsed
        },
        filesGenerated,
        projectSize,
        success: true
      };

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const finalMemory = process.memoryUsage();

      clearInterval(memoryMonitor);

      return {
        testName,
        preset,
        duration,
        memoryUsage: {
          initial: initialMemory.heapUsed,
          peak: peakMemory.heapUsed,
          final: finalMemory.heapUsed
        },
        filesGenerated: 0,
        projectSize: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async countGeneratedFiles(projectPath: string): Promise<number> {
    try {
      let count = 0;

      async function countRecursive(dirPath: string) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);

          if (item.isDirectory()) {
            // Skip node_modules and .git
            if (item.name !== 'node_modules' && item.name !== '.git') {
              await countRecursive(fullPath);
            }
          } else {
            count++;
          }
        }
      }

      await countRecursive(projectPath);
      return count;

    } catch (error) {
      return 0;
    }
  }

  private async calculateProjectSize(projectPath: string): Promise<number> {
    try {
      let totalSize = 0;

      async function calculateRecursive(dirPath: string) {
        const items = await fs.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);

          if (item.isDirectory()) {
            // Skip node_modules for size calculation
            if (item.name !== 'node_modules') {
              await calculateRecursive(fullPath);
            }
          } else {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          }
        }
      }

      await calculateRecursive(projectPath);
      return totalSize;

    } catch (error) {
      return 0;
    }
  }

  private async cleanupIteration(testName: string): Promise<void> {
    const projectPath = path.join(this.baseTestDir, testName);
    if (await fs.pathExists(projectPath)) {
      await fs.remove(projectPath);
    }
  }

  /**
   * Validate benchmark results against thresholds
   */
  validateResults(results: BenchmarkResult[]): {
    passed: number;
    failed: number;
    failures: Array<{ result: BenchmarkResult; failures: string[] }>;
  } {
    let passed = 0;
    let failed = 0;
    const failures: Array<{ result: BenchmarkResult; failures: string[] }> = [];

    for (const result of results) {
      if (!result.success) {
        failed++;
        failures.push({
          result,
          failures: [`Generation failed: ${result.error}`]
        });
        continue;
      }

      const threshold = this.thresholds.get(result.preset);
      if (!threshold) {
        failed++;
        failures.push({
          result,
          failures: [`No threshold defined for preset: ${result.preset}`]
        });
        continue;
      }

      const resultFailures: string[] = [];

      // Check duration
      if (result.duration > threshold.maxDuration) {
        resultFailures.push(`Duration ${result.duration}ms exceeds threshold ${threshold.maxDuration}ms`);
      }

      // Check memory increase
      const memoryIncrease = result.memoryUsage.peak - result.memoryUsage.initial;
      if (memoryIncrease > threshold.maxMemoryIncrease) {
        resultFailures.push(`Memory increase ${memoryIncrease} bytes exceeds threshold ${threshold.maxMemoryIncrease} bytes`);
      }

      // Check files generated
      if (result.filesGenerated < threshold.minFilesGenerated) {
        resultFailures.push(`Files generated ${result.filesGenerated} below minimum ${threshold.minFilesGenerated}`);
      }

      // Check project size
      if (result.projectSize > threshold.maxProjectSize) {
        resultFailures.push(`Project size ${result.projectSize} bytes exceeds threshold ${threshold.maxProjectSize} bytes`);
      }

      if (resultFailures.length > 0) {
        failed++;
        failures.push({ result, failures: resultFailures });
      } else {
        passed++;
      }
    }

    return { passed, failed, failures };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const validation = this.validateResults(this.benchmarkResults);

    let report = '# MCP Template Generation Performance Report\n\n';

    // Summary
    report += `## Summary\n`;
    report += `- Total Tests: ${this.benchmarkResults.length}\n`;
    report += `- Passed: ${validation.passed}\n`;
    report += `- Failed: ${validation.failed}\n\n`;

    // Results by preset
    const presetGroups = new Map<string, BenchmarkResult[]>();
    for (const result of this.benchmarkResults) {
      if (!presetGroups.has(result.preset)) {
        presetGroups.set(result.preset, []);
      }
      presetGroups.get(result.preset)!.push(result);
    }

    report += `## Results by Preset\n\n`;

    for (const [preset, results] of presetGroups) {
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const avgFiles = results.reduce((sum, r) => sum + r.filesGenerated, 0) / results.length;
      const avgSize = results.reduce((sum, r) => sum + r.projectSize, 0) / results.length;

      report += `### ${preset.charAt(0).toUpperCase() + preset.slice(1)}\n`;
      report += `- Average Duration: ${avgDuration.toFixed(2)}ms\n`;
      report += `- Average Files Generated: ${avgFiles.toFixed(0)}\n`;
      report += `- Average Project Size: ${(avgSize / 1024).toFixed(2)}KB\n`;
      report += `- Success Rate: ${(results.filter(r => r.success).length / results.length * 100).toFixed(1)}%\n\n`;
    }

    // Failures
    if (validation.failures.length > 0) {
      report += `## Failures\n\n`;
      for (const failure of validation.failures) {
        report += `### ${failure.result.testName}\n`;
        for (const failureMsg of failure.failures) {
          report += `- ${failureMsg}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }

  /**
   * Cleanup all benchmark data
   */
  async cleanup(): Promise<void> {
    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }
  }
}

let benchmarker: PerformanceBenchmarker;

beforeAll(async () => {
  benchmarker = new PerformanceBenchmarker();
  await fs.ensureDir(benchmarker['baseTestDir']);
});

afterAll(async () => {
  if (benchmarker) {
    // Generate and save performance report
    const report = benchmarker.generateReport();
    await fs.writeFile(
      path.join(process.cwd(), 'test-results', 'performance-report.md'),
      report
    );
    await benchmarker.cleanup();
  }
});

describe('Template Generation Performance Benchmarks', () => {

  it('Minimal preset should meet performance thresholds', async () => {
    const results = await benchmarker.benchmarkPreset('minimal', 3);

    const validation = benchmarker.validateResults(results);

    expect(validation.passed).toBeGreaterThan(0);
    expect(validation.failed).toBe(0);

    // All results should be successful
    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(30000); // 30 seconds
      expect(result.filesGenerated).toBeGreaterThan(5);
    }

  }, 180000); // 3 minutes timeout

  it('Blog preset should meet performance thresholds', async () => {
    const results = await benchmarker.benchmarkPreset('blog', 2);

    const validation = benchmarker.validateResults(results);

    expect(validation.passed).toBeGreaterThan(0);

    for (const result of results.filter(r => r.success)) {
      expect(result.duration).toBeLessThan(45000); // 45 seconds
      expect(result.filesGenerated).toBeGreaterThan(10);
    }

  }, 150000); // 2.5 minutes timeout

  it('Dashboard preset should meet performance thresholds', async () => {
    const results = await benchmarker.benchmarkPreset('dashboard', 2);

    const validation = benchmarker.validateResults(results);

    expect(validation.passed).toBeGreaterThan(0);

    for (const result of results.filter(r => r.success)) {
      expect(result.duration).toBeLessThan(60000); // 1 minute
      expect(result.filesGenerated).toBeGreaterThan(20);
    }

  }, 180000); // 3 minutes timeout

  it('Startup preset should meet performance thresholds', async () => {
    const results = await benchmarker.benchmarkPreset('startup', 1);

    const validation = benchmarker.validateResults(results);

    expect(validation.passed).toBeGreaterThan(0);

    for (const result of results.filter(r => r.success)) {
      expect(result.duration).toBeLessThan(90000); // 1.5 minutes
      expect(result.filesGenerated).toBeGreaterThan(30);
    }

  }, 200000); // 3+ minutes timeout

  it('Enterprise preset should meet performance thresholds', async () => {
    const results = await benchmarker.benchmarkPreset('enterprise', 1);

    const validation = benchmarker.validateResults(results);

    expect(validation.passed).toBeGreaterThan(0);

    for (const result of results.filter(r => r.success)) {
      expect(result.duration).toBeLessThan(120000); // 2 minutes
      expect(result.filesGenerated).toBeGreaterThan(40);
    }

  }, 240000); // 4 minutes timeout

  it('Should have consistent performance across multiple runs', async () => {
    const results = await benchmarker.benchmarkPreset('minimal', 5);

    const successfulResults = results.filter(r => r.success);
    expect(successfulResults.length).toBeGreaterThan(3); // At least 3/5 should succeed

    if (successfulResults.length > 1) {
      const durations = successfulResults.map(r => r.duration);
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be reasonable (less than 50% of average)
      expect(stdDev).toBeLessThan(avgDuration * 0.5);
    }

  }, 300000); // 5 minutes timeout

  it('Should not have excessive memory leaks', async () => {
    const results = await benchmarker.benchmarkPreset('minimal', 3);

    for (const result of results.filter(r => r.success)) {
      const memoryIncrease = result.memoryUsage.final - result.memoryUsage.initial;

      // Memory should not increase by more than 50MB per generation
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }

  }, 180000);

});