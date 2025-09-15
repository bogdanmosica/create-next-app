/**
 * @fileoverview Contract Tests for Core MCP Models
 * @description T006-T008: Contract tests for ProjectRequest, GeneratedApplication, ErrorReport
 * These tests validate input/output schemas and ensure API contracts are maintained
 */

import {
  ProjectRequestSchema,
  GeneratedApplicationSchema,
  ErrorReportSchema,
  validateProjectRequest,
  validateGeneratedApplication,
  validateErrorReport,
  ErrorReportBuilder,
  GeneratedApplicationBuilder,
  type ProjectRequest,
  type GeneratedApplication,
  type ErrorReport
} from '../core/models.js';

export interface ContractTestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export class ContractTestRunner {
  private results: ContractTestResult[] = [];

  /**
   * T006: Contract test - Validate ProjectRequest input and schema
   */
  async testProjectRequestContract(): Promise<ContractTestResult[]> {
    console.log('🧪 Running ProjectRequest Contract Tests...');
    
    // Test 1: Valid minimal project request
    this.results.push(await this.runTest('ProjectRequest - Valid minimal input', () => {
      const validInput = {
        projectPath: '/test/path'
      };
      
      const result = validateProjectRequest(validInput);
      if (!result.valid || !result.data) {
        throw new Error(`Expected valid request, got: ${result.errors?.join(', ')}`);
      }
      
      if (result.data.projectPath !== '/test/path') {
        throw new Error('Project path not preserved');
      }
      
      return { projectPath: result.data.projectPath };
    }));

    // Test 2: Valid full project request
    this.results.push(await this.runTest('ProjectRequest - Valid full input', () => {
      const validInput: ProjectRequest = {
        projectPath: '/test/path',
        projectName: 'test-app',
        preset: 'startup',
        features: {
          core: true,
          database: true,
          authentication: true,
          payments: false,
          teamManagement: false,
          devExperience: true,
          internationalization: true
        },
        options: {
          packageManager: 'pnpm',
          typescript: true,
          tailwind: true,
          appRouter: true,
          srcDir: true
        }
      };
      
      const result = validateProjectRequest(validInput);
      if (!result.valid || !result.data) {
        throw new Error(`Expected valid request, got: ${result.errors?.join(', ')}`);
      }
      
      if (result.data.preset !== 'startup') {
        throw new Error('Preset not preserved');
      }
      
      return { preset: result.data.preset, featuresCount: Object.keys(result.data.features || {}).length };
    }));

    // Test 3: Invalid project request - missing path
    this.results.push(await this.runTest('ProjectRequest - Invalid empty path', () => {
      const invalidInput = {
        projectPath: ''
      };
      
      const result = validateProjectRequest(invalidInput);
      if (result.valid) {
        throw new Error('Expected validation to fail for empty project path');
      }
      
      if (!result.errors || !result.errors.some(e => e.includes('Project path is required'))) {
        throw new Error('Expected specific error message for empty path');
      }
      
      return { errorCount: result.errors.length };
    }));

    // Test 4: Invalid preset enum
    this.results.push(await this.runTest('ProjectRequest - Invalid preset enum', () => {
      const invalidInput = {
        projectPath: '/test/path',
        preset: 'invalid-preset'
      };
      
      const result = validateProjectRequest(invalidInput);
      if (result.valid) {
        throw new Error('Expected validation to fail for invalid preset');
      }
      
      return { errorCount: result.errors?.length || 0 };
    }));

    return this.results.slice(-4);
  }

  /**
   * T007: Contract test - Validate GeneratedApplication output structure
   */
  async testGeneratedApplicationContract(): Promise<ContractTestResult[]> {
    console.log('🧪 Running GeneratedApplication Contract Tests...');
    
    // Test 1: Valid minimal generated application
    this.results.push(await this.runTest('GeneratedApplication - Valid minimal output', () => {
      const minimalApp = new GeneratedApplicationBuilder()
        .withProject('/test/path', 'test-app')
        .withFeatures({ core: true })
        .withDuration(1000)
        .build();
      
      const result = validateGeneratedApplication(minimalApp);
      if (!result.valid || !result.data) {
        throw new Error(`Expected valid application, got: ${result.errors?.join(', ')}`);
      }
      
      if (result.data.success !== true) {
        throw new Error('Expected success to be true');
      }
      
      return { success: result.data.success, filesCount: result.data.filesGenerated.length };
    }));

    // Test 2: Valid full generated application
    this.results.push(await this.runTest('GeneratedApplication - Valid full output', () => {
      const fullApp = new GeneratedApplicationBuilder()
        .withProject('/test/path', 'test-app', 'startup')
        .withFeatures({ core: true, database: true, authentication: true })
        .addFile('package.json', 'config', 2048)
        .addDirectory('src', 'structure')
        .withDependencies(['react', 'next'], ['typescript', '@types/node'])
        .withScripts({ dev: 'next dev', build: 'next build' })
        .withDuration(5000)
        .withWarnings(['Optional warning'])
        .withNextSteps(['Run pnpm install', 'Configure environment'])
        .build();
      
      const result = validateGeneratedApplication(fullApp);
      if (!result.valid || !result.data) {
        throw new Error(`Expected valid application, got: ${result.errors?.join(', ')}`);
      }
      
      if (result.data.preset !== 'startup') {
        throw new Error('Preset not preserved');
      }
      
      if (result.data.filesGenerated.length !== 2) {
        throw new Error('Expected 2 generated files');
      }
      
      return { 
        preset: result.data.preset,
        filesCount: result.data.filesGenerated.length,
        depsCount: result.data.dependencies.production.length + result.data.dependencies.development.length
      };
    }));

    // Test 3: Invalid structure - missing required fields
    this.results.push(await this.runTest('GeneratedApplication - Invalid missing fields', () => {
      const invalidApp = {
        success: true,
        // Missing required fields
      };
      
      const result = validateGeneratedApplication(invalidApp);
      if (result.valid) {
        throw new Error('Expected validation to fail for missing required fields');
      }
      
      return { errorCount: result.errors?.length || 0 };
    }));

    return this.results.slice(-3);
  }

  /**
   * T008: Contract test - ErrorReport handling and reporting
   */
  async testErrorReportContract(): Promise<ContractTestResult[]> {
    console.log('🧪 Running ErrorReport Contract Tests...');
    
    // Test 1: Valid minimal error report
    this.results.push(await this.runTest('ErrorReport - Valid minimal error', () => {
      const minimalError = new ErrorReportBuilder()
        .withError('VALIDATION_ERROR', 'Invalid input provided')
        .withContext('create_nextjs_app')
        .build();
      
      const result = validateErrorReport(minimalError);
      if (!result.valid || !result.data) {
        throw new Error(`Expected valid error report, got: ${result.errors?.join(', ')}`);
      }
      
      if (result.data.success !== false) {
        throw new Error('Expected success to be false for error report');
      }
      
      if (result.data.error.code !== 'VALIDATION_ERROR') {
        throw new Error('Error code not preserved');
      }
      
      return { errorCode: result.data.error.code, operation: result.data.context.operation };
    }));

    // Test 2: Valid full error report
    this.results.push(await this.runTest('ErrorReport - Valid full error', () => {
      const fullError = new ErrorReportBuilder()
        .withError('SYSTEM_ERROR', 'Node.js version incompatible', 'Found v14, need v18+')
        .withContext('create_nextjs_app', 'system_check', 'startup')
        .withSuggestions('Update Node.js version', ['Install Node.js 18+', 'Use nvm'], 'error', true)
        .withSystemInfo({ nodeVersion: '14.0.0', platform: 'linux' })
        .build();
      
      const result = validateErrorReport(fullError);
      if (!result.valid || !result.data) {
        throw new Error(`Expected valid error report, got: ${result.errors?.join(', ')}`);
      }
      
      if (!result.data.suggestions || result.data.suggestions.actions.length !== 2) {
        throw new Error('Suggestions not properly structured');
      }
      
      if (!result.data.systemInfo || !result.data.systemInfo.nodeVersion) {
        throw new Error('System info not preserved');
      }
      
      return { 
        hasDetails: !!result.data.error.details,
        suggestionsCount: result.data.suggestions.actions.length,
        hasSystemInfo: !!result.data.systemInfo
      };
    }));

    // Test 3: Invalid structure - success should be false
    this.results.push(await this.runTest('ErrorReport - Invalid success field', () => {
      const invalidError = {
        success: true, // Should be false for error reports
        error: {
          code: 'TEST',
          message: 'Test error'
        },
        context: {
          operation: 'test'
        }
      };
      
      const result = validateErrorReport(invalidError);
      if (result.valid) {
        throw new Error('Expected validation to fail when success is true in error report');
      }
      
      return { errorCount: result.errors?.length || 0 };
    }));

    return this.results.slice(-3);
  }

  /**
   * Run all contract tests
   */
  async runAllContractTests(): Promise<ContractTestResult[]> {
    const startTime = Date.now();
    console.log('🧪 Starting Contract Test Suite...');
    
    await this.testProjectRequestContract();
    await this.testGeneratedApplicationContract();
    await this.testErrorReportContract();
    
    const duration = Date.now() - startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    console.log(`\n📊 Contract Test Results:`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Duration: ${duration}ms\n`);
    
    if (failed > 0) {
      console.log('❌ Failed tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
    
    return this.results;
  }

  private async runTest(name: string, testFn: () => any): Promise<ContractTestResult> {
    try {
      const result = testFn();
      console.log(`  ✅ ${name}`);
      return {
        name,
        passed: true,
        details: result
      };
    } catch (error) {
      console.log(`  ❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getResults(): ContractTestResult[] {
    return this.results;
  }

  getPassedCount(): number {
    return this.results.filter(r => r.passed).length;
  }

  getFailedCount(): number {
    return this.results.filter(r => !r.passed).length;
  }
}
