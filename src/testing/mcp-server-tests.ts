/**
 * @fileoverview MCP Server Tests
 * @description Comprehensive test suite for the MCP server itself
 * Tests tool orchestration, error handling, configuration, dependency resolution, etc.
 */

import fs from 'fs-extra';
import path from 'path';
import { performance } from 'perf_hooks';

// Import MCP server components
import { ToolOrchestrator } from '../core/tool-orchestrator.js';
import { TransactionalOrchestrator } from '../core/transactional-orchestrator.js';
import { ConfigManager } from '../utils/config-manager.js';
import { DependencyResolver } from '../utils/dependency-resolver.js';
import { EnhancedErrorHandler } from '../utils/error-handler.js';
import { getToolRegistry } from '../core/tool-registry.js';

export interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  totalDuration: number;
  passCount: number;
  failCount: number;
}

export class MCPServerTestRunner {
  private testOutputDir: string;
  private orchestrator: ToolOrchestrator;

  constructor(outputDir: string = './mcp-test-output') {
    this.testOutputDir = path.resolve(outputDir);
    this.orchestrator = new ToolOrchestrator();
  }

  /**
   * Run all MCP server tests
   */
  async runAllTests(): Promise<TestSuite[]> {
    console.log('🧪 Starting MCP Server Test Suite...\n');

    const suites: TestSuite[] = [
      await this.runConfigurationTests(),
      await this.runToolOrchestrationTests(),
      await this.runErrorHandlingTests(),
      await this.runDependencyResolutionTests(),
      await this.runPresetSystemTests(),
      await this.runTransactionTests()
    ];

    this.printTestSummary(suites);
    return suites;
  }

  /**
   * Test configuration management system
   */
  async runConfigurationTests(): Promise<TestSuite> {
    const suiteName = 'Configuration Management';
    const tests: TestResult[] = [];
    const suiteStart = performance.now();

    console.log(`📋 Running ${suiteName} Tests...`);

    // Test 1: Config initialization
    tests.push(await this.runTest('Config Initialization', async () => {
      await ConfigManager.initialize();
      const config = ConfigManager.getConfig();
      
      if (!config.database || !config.internationalization || !config.linting) {
        throw new Error('Configuration not properly initialized');
      }
      
      return { configKeys: Object.keys(config) };
    }));

    // Test 2: Database config validation
    tests.push(await this.runTest('Database Provider Validation', async () => {
      const valid = ConfigManager.validateDatabaseProvider('postgresql');
      const invalid = ConfigManager.validateDatabaseProvider('invalid');
      
      if (!valid || invalid) {
        throw new Error('Database provider validation failed');
      }
      
      return { postgresql: valid, invalid: invalid };
    }));

    // Test 3: Language validation
    tests.push(await this.runTest('Language Validation', async () => {
      const result = ConfigManager.validateLanguages(['en', 'es', 'invalid', 'fr']);
      
      if (result.valid.length !== 3 || result.invalid.length !== 1) {
        throw new Error(`Expected 3 valid, 1 invalid. Got ${result.valid.length} valid, ${result.invalid.length} invalid`);
      }
      
      return result;
    }));

    // Test 4: Config overrides
    tests.push(await this.runTest('Config Overrides', async () => {
      const dbConfig = ConfigManager.getDatabaseConfig({ defaultProvider: 'mysql' });
      
      if (dbConfig.defaultProvider !== 'mysql') {
        throw new Error('Config override not applied correctly');
      }
      
      return { overrideApplied: dbConfig.defaultProvider };
    }));

    const suiteDuration = performance.now() - suiteStart;
    const passCount = tests.filter(t => t.success).length;
    const failCount = tests.filter(t => !t.success).length;

    return {
      name: suiteName,
      tests,
      totalDuration: suiteDuration,
      passCount,
      failCount
    };
  }

  /**
   * Test tool orchestration system
   */
  async runToolOrchestrationTests(): Promise<TestSuite> {
    const suiteName = 'Tool Orchestration';
    const tests: TestResult[] = [];
    const suiteStart = performance.now();

    console.log(`📋 Running ${suiteName} Tests...`);

    // Test 1: Tool registry completeness
    tests.push(await this.runTest('Tool Registry Completeness', async () => {
      const tools = getToolRegistry();
      
      if (tools.length < 10) {
        throw new Error(`Expected at least 10 tools, got ${tools.length}`);
      }
      
      const requiredTools = ['create_nextjs_app', 'setup_biome_linting', 'setup_drizzle_orm'];
      const toolNames = tools.map(t => t.name);
      const missing = requiredTools.filter(name => !toolNames.includes(name));
      
      if (missing.length > 0) {
        throw new Error(`Missing required tools: ${missing.join(', ')}`);
      }
      
      return { totalTools: tools.length, toolNames };
    }));

    // Test 2: Wizard response generation
    tests.push(await this.runTest('Project Wizard Response', async () => {
      const result = await this.orchestrator.executeTool('setup_nextjs_project_wizard', {
        projectPath: '/test/path'
      });
      
      if (!result.includes('Next.js Project Setup Wizard') || !result.includes('Minimal')) {
        throw new Error('Wizard response does not contain expected content');
      }
      
      return { responseLength: result.length, containsMinimal: result.includes('Minimal') };
    }));

    // Test 3: Preset validation
    tests.push(await this.runTest('Preset Validation', async () => {
      // Test valid preset
      const validResult = await this.orchestrator.executeTool('create_nextjs_app', {
        projectPath: path.join(this.testOutputDir, 'preset-valid'),
        preset: 'minimal'
      });
      
      if (validResult.includes('❌')) {
        throw new Error('Valid preset was rejected');
      }
      
      return { validPreset: 'passed' };
    }));

    const suiteDuration = performance.now() - suiteStart;
    const passCount = tests.filter(t => t.success).length;
    const failCount = tests.filter(t => !t.success).length;

    return {
      name: suiteName,
      tests,
      totalDuration: suiteDuration,
      passCount,
      failCount
    };
  }

  /**
   * Test error handling system
   */
  async runErrorHandlingTests(): Promise<TestSuite> {
    const suiteName = 'Error Handling';
    const tests: TestResult[] = [];
    const suiteStart = performance.now();

    console.log(`📋 Running ${suiteName} Tests...`);

    // Test 1: Error suggestion generation
    tests.push(await this.runTest('Error Suggestion Generation', async () => {
      const nodeError = new Error('Node version 16.0.0 is not supported, please use 18+');
      const suggestion = EnhancedErrorHandler.handleError(nodeError, { operation: 'test' });
      
      if (!suggestion.actions.some(action => action.includes('Node.js 18+'))) {
        throw new Error('Error handler did not provide Node.js upgrade suggestion');
      }
      
      return { 
        message: suggestion.message,
        actionCount: suggestion.actions.length,
        recoverable: suggestion.recoverable 
      };
    }));

    // Test 2: Permission error handling
    tests.push(await this.runTest('Permission Error Handling', async () => {
      const permError = new Error('EACCES: permission denied, mkdir \'/protected/folder\'');
      const suggestion = EnhancedErrorHandler.handleError(permError, { operation: 'test' });
      
      if (!suggestion.message.toLowerCase().includes('permission')) {
        throw new Error('Permission error not properly detected');
      }
      
      return { 
        severity: suggestion.severity,
        actionCount: suggestion.actions.length 
      };
    }));

    // Test 3: Network error recovery
    tests.push(await this.runTest('Network Error Recovery', async () => {
      const networkError = new Error('network timeout while fetching registry data');
      const suggestion = EnhancedErrorHandler.handleError(networkError, { operation: 'test' });
      
      if (suggestion.severity !== 'warning') {
        throw new Error('Network errors should be warnings, not errors');
      }
      
      return { 
        severity: suggestion.severity,
        recoverable: suggestion.recoverable 
      };
    }));

    const suiteDuration = performance.now() - suiteStart;
    const passCount = tests.filter(t => t.success).length;
    const failCount = tests.filter(t => !t.success).length;

    return {
      name: suiteName,
      tests,
      totalDuration: suiteDuration,
      passCount,
      failCount
    };
  }

  /**
   * Test dependency resolution system
   */
  async runDependencyResolutionTests(): Promise<TestSuite> {
    const suiteName = 'Dependency Resolution';
    const tests: TestResult[] = [];
    const suiteStart = performance.now();

    console.log(`📋 Running ${suiteName} Tests...`);

    // Test 1: Dependency resolver creation
    tests.push(await this.runTest('Dependency Resolver Creation', async () => {
      const autoResolver = DependencyResolver.createResolver('/test', 'auto');
      const manualResolver = DependencyResolver.createResolver('/test', 'manual');
      const strictResolver = DependencyResolver.createResolver('/test', 'strict');
      
      if (!autoResolver || !manualResolver || !strictResolver) {
        throw new Error('Failed to create dependency resolvers');
      }
      
      return { 
        autoCreated: !!autoResolver,
        manualCreated: !!manualResolver,
        strictCreated: !!strictResolver 
      };
    }));

    // Test 2: Dependency chain calculation
    tests.push(await this.runTest('Dependency Chain Calculation', async () => {
      const authChain = DependencyResolver.getDependencyChain('authentication');
      const paymentsChain = DependencyResolver.getDependencyChain('payments');
      const teamsChain = DependencyResolver.getDependencyChain('teamManagement');
      
      if (authChain.length === 0 || paymentsChain.length === 0 || teamsChain.length === 0) {
        throw new Error('Dependency chains not calculated correctly');
      }
      
      return { 
        authDeps: authChain,
        paymentDeps: paymentsChain,
        teamDeps: teamsChain 
      };
    }));

    const suiteDuration = performance.now() - suiteStart;
    const passCount = tests.filter(t => t.success).length;
    const failCount = tests.filter(t => !t.success).length;

    return {
      name: suiteName,
      tests,
      totalDuration: suiteDuration,
      passCount,
      failCount
    };
  }

  /**
   * Test preset system
   */
  async runPresetSystemTests(): Promise<TestSuite> {
    const suiteName = 'Preset System';
    const tests: TestResult[] = [];
    const suiteStart = performance.now();

    console.log(`📋 Running ${suiteName} Tests...`);

    // Import preset functions
    const { getAllPresets, getPresetsByComplexity, getPreset, validatePresetFeatures } = 
      await import('../utils/preset-configs.js');

    // Test 1: Preset availability
    tests.push(await this.runTest('Preset Availability', async () => {
      const allPresets = getAllPresets();
      const requiredPresets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise'];
      
      const presetIds = allPresets.map(p => p.id);
      const missing = requiredPresets.filter(id => !presetIds.includes(id));
      
      if (missing.length > 0) {
        throw new Error(`Missing presets: ${missing.join(', ')}`);
      }
      
      return { 
        totalPresets: allPresets.length,
        availablePresets: presetIds 
      };
    }));

    // Test 2: Preset complexity filtering
    tests.push(await this.runTest('Preset Complexity Filtering', async () => {
      const simple = getPresetsByComplexity('simple');
      const moderate = getPresetsByComplexity('moderate');
      const advanced = getPresetsByComplexity('advanced');
      
      if (simple.length === 0 || moderate.length === 0 || advanced.length === 0) {
        throw new Error('Preset complexity filtering failed');
      }
      
      return { 
        simpleCount: simple.length,
        moderateCount: moderate.length,
        advancedCount: advanced.length 
      };
    }));

    // Test 3: Feature validation
    tests.push(await this.runTest('Feature Validation', async () => {
      // Valid configuration
      const validResult = validatePresetFeatures({
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: true
      });
      
      // Invalid configuration (teams without auth)
      const invalidResult = validatePresetFeatures({
        core: true,
        database: false,
        authentication: false,
        payments: false,
        teamManagement: true,
        devExperience: true,
        internationalization: false
      });
      
      if (!validResult.valid || invalidResult.valid) {
        throw new Error('Feature validation logic incorrect');
      }
      
      return { 
        validPassed: validResult.valid,
        invalidFailed: !invalidResult.valid,
        invalidErrors: invalidResult.errors 
      };
    }));

    const suiteDuration = performance.now() - suiteStart;
    const passCount = tests.filter(t => t.success).length;
    const failCount = tests.filter(t => !t.success).length;

    return {
      name: suiteName,
      tests,
      totalDuration: suiteDuration,
      passCount,
      failCount
    };
  }

  /**
   * Test transaction system
   */
  async runTransactionTests(): Promise<TestSuite> {
    const suiteName = 'Transaction System';
    const tests: TestResult[] = [];
    const suiteStart = performance.now();

    console.log(`📋 Running ${suiteName} Tests...`);

    // Test 1: Transaction orchestrator creation
    tests.push(await this.runTest('Transaction Orchestrator Creation', async () => {
      const testPath = path.join(this.testOutputDir, 'transaction-test');
      await fs.ensureDir(testPath);
      
      const orchestrator = new TransactionalOrchestrator({
        projectPath: testPath,
        projectName: 'test-project',
        resumeTransaction: true,
        enableRollback: true
      });
      
      if (!orchestrator) {
        throw new Error('Failed to create transaction orchestrator');
      }
      
      return { orchestratorCreated: true };
    }));

    const suiteDuration = performance.now() - suiteStart;
    const passCount = tests.filter(t => t.success).length;
    const failCount = tests.filter(t => !t.success).length;

    return {
      name: suiteName,
      tests,
      totalDuration: suiteDuration,
      passCount,
      failCount
    };
  }

  /**
   * Run individual test with error handling
   */
  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const start = performance.now();
    
    try {
      const details = await testFn();
      const duration = performance.now() - start;
      
      console.log(`  ✅ ${name} (${duration.toFixed(2)}ms)`);
      
      return {
        name,
        success: true,
        duration,
        details
      };
    } catch (error) {
      const duration = performance.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`  ❌ ${name} (${duration.toFixed(2)}ms): ${errorMessage}`);
      
      return {
        name,
        success: false,
        duration,
        error: errorMessage
      };
    }
  }

  /**
   * Print test summary
   */
  private printTestSummary(suites: TestSuite[]): void {
    const totalTests = suites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = suites.reduce((sum, suite) => sum + suite.passCount, 0);
    const totalFailed = suites.reduce((sum, suite) => sum + suite.failCount, 0);
    const totalDuration = suites.reduce((sum, suite) => sum + suite.totalDuration, 0);

    console.log('\n' + '='.repeat(60));
    console.log('🧪 MCP Server Test Summary');
    console.log('='.repeat(60));

    suites.forEach(suite => {
      const passRate = ((suite.passCount / suite.tests.length) * 100).toFixed(1);
      console.log(`📋 ${suite.name}: ${suite.passCount}/${suite.tests.length} (${passRate}%) - ${suite.totalDuration.toFixed(2)}ms`);
    });

    console.log('='.repeat(60));
    const overallPassRate = ((totalPassed / totalTests) * 100).toFixed(1);
    console.log(`🎯 Overall: ${totalPassed}/${totalTests} tests passed (${overallPassRate}%)`);
    console.log(`⏱️  Total time: ${totalDuration.toFixed(2)}ms`);

    if (totalFailed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log(`⚠️  ${totalFailed} test(s) failed`);
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment(): Promise<void> {
    await fs.ensureDir(this.testOutputDir);
    console.log(`📁 Test output directory: ${this.testOutputDir}`);
  }

  /**
   * Cleanup test environment
   */
  async cleanupTestEnvironment(): Promise<void> {
    if (await fs.pathExists(this.testOutputDir)) {
      await fs.remove(this.testOutputDir);
      console.log(`🧹 Cleaned up test output directory`);
    }
  }
}