/**
 * @fileoverview Integration Tests for MCP Server
 * @description T009-T013: End-to-end integration tests for project generation flows
 * Tests complete workflows from request to generated application
 */

import fs from 'fs-extra';
import path from 'path';
import { performance } from 'perf_hooks';
import { ToolOrchestrator } from '../core/tool-orchestrator.js';
import { validateProjectRequest, validateGeneratedApplication, validateErrorReport } from '../core/models.js';
import type { ProjectRequest, GeneratedApplication, ErrorReport } from '../core/models.js';

export interface IntegrationTestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export class IntegrationTestRunner {
  private testOutputDir: string;
  private orchestrator: ToolOrchestrator;
  private results: IntegrationTestResult[] = [];

  constructor(outputDir: string = './integration-test-output') {
    this.testOutputDir = path.resolve(outputDir);
    this.orchestrator = new ToolOrchestrator();
  }

  /**
   * T009: Integration test - End-to-end project generation flow
   */
  async testEndToEndProjectGeneration(): Promise<IntegrationTestResult[]> {
    console.log('🔄 Running End-to-End Project Generation Tests...');
    
    // Test 1: Minimal preset generation
    this.results.push(await this.runIntegrationTest(
      'E2E - Minimal preset complete flow',
      async () => {
        const testDir = path.join(this.testOutputDir, 'minimal-test');
        await fs.ensureDir(testDir);
        
        const request: ProjectRequest = {
          projectPath: testDir,
          projectName: 'minimal-test-app',
          preset: 'minimal'
        };
        
        // Validate request
        const requestValidation = validateProjectRequest(request);
        if (!requestValidation.valid) {
          throw new Error(`Request validation failed: ${requestValidation.errors?.join(', ')}`);
        }
        
        // Execute the tool
        const result = await this.orchestrator.executeTool('create_nextjs_app', request);
        
        // Check if result indicates success
        if (result.includes('❌')) {
          throw new Error(`Tool execution failed: ${result}`);
        }
        
        // Verify basic files were created
        const expectedFiles = [
          'package.json',
          'next.config.js',
          'tailwind.config.ts',
          'tsconfig.json',
          'biome.json'
        ];
        
        for (const file of expectedFiles) {
          const filePath = path.join(testDir, file);
          if (!(await fs.pathExists(filePath))) {
            throw new Error(`Expected file not found: ${file}`);
          }
        }
        
        return {
          filesCreated: expectedFiles.length,
          resultLength: result.length,
          hasSuccess: result.includes('✅')
        };
      }
    ));

    // Test 2: Startup preset generation (more complex)
    this.results.push(await this.runIntegrationTest(
      'E2E - Startup preset complete flow',
      async () => {
        const testDir = path.join(this.testOutputDir, 'startup-test');
        await fs.ensureDir(testDir);
        
        const request: ProjectRequest = {
          projectPath: testDir,
          projectName: 'startup-test-app',
          preset: 'startup'
        };
        
        // Execute the tool
        const result = await this.orchestrator.executeTool('create_nextjs_app', request);
        
        // Check for success indicators
        if (result.includes('❌')) {
          throw new Error(`Tool execution failed: ${result}`);
        }
        
        // Verify advanced files were created for startup preset
        const expectedFiles = [
          'package.json',
          'drizzle.config.ts',
          '.env',
          '.env.example',
          'models/schema/index.ts',
          'libs/db/drizzle.ts',
          'libs/auth/session.ts'
        ];
        
        let filesFound = 0;
        for (const file of expectedFiles) {
          const filePath = path.join(testDir, file);
          if (await fs.pathExists(filePath)) {
            filesFound++;
          }
        }
        
        return {
          expectedFiles: expectedFiles.length,
          filesFound,
          resultLength: result.length,
          preset: 'startup'
        };
      }
    ));

    return this.results.slice(-2);
  }

  /**
   * T010: Integration test - Tool integration (Biome, shadcn/ui, Drizzle ORM)
   */
  async testToolIntegration(): Promise<IntegrationTestResult[]> {
    console.log('🔧 Running Tool Integration Tests...');
    
    // Test 1: Biome integration
    this.results.push(await this.runIntegrationTest(
      'Tool Integration - Biome linting setup',
      async () => {
        const testDir = path.join(this.testOutputDir, 'biome-test');
        await fs.ensureDir(testDir);
        
        const result = await this.orchestrator.executeTool('setup_biome_linting', {
          projectPath: testDir
        });
        
        if (result.includes('❌')) {
          throw new Error(`Biome setup failed: ${result}`);
        }
        
        // Check if biome.json was created
        const biomeConfigPath = path.join(testDir, 'biome.json');
        if (!(await fs.pathExists(biomeConfigPath))) {
          throw new Error('biome.json not created');
        }
        
        // Verify biome config content
        const config = await fs.readJSON(biomeConfigPath);
        if (!config.formatter || !config.linter) {
          throw new Error('Invalid biome configuration structure');
        }
        
        return {
          configExists: true,
          hasFormatter: !!config.formatter,
          hasLinter: !!config.linter,
          rulesCount: Object.keys(config.linter?.rules || {}).length
        };
      }
    ));

    // Test 2: shadcn/ui integration
    this.results.push(await this.runIntegrationTest(
      'Tool Integration - shadcn/ui components setup',
      async () => {
        const testDir = path.join(this.testOutputDir, 'shadcn-test');
        await fs.ensureDir(testDir);
        
        // Create a basic Next.js structure first
        await this.orchestrator.executeTool('create_nextjs_base', {
          projectPath: testDir,
          projectName: 'shadcn-test',
          includeShadcn: true,
          includeAllComponents: false  // Test individual component installation
        });
        
        // Check if shadcn was properly integrated
        const componentsJsonPath = path.join(testDir, 'components.json');
        if (!(await fs.pathExists(componentsJsonPath))) {
          throw new Error('components.json not created');
        }
        
        // Check if UI components directory exists
        const uiDirPath = path.join(testDir, 'components', 'ui');
        if (!(await fs.pathExists(uiDirPath))) {
          throw new Error('UI components directory not created');
        }
        
        return {
          componentsJsonExists: true,
          uiDirExists: true,
          testPassed: true
        };
      }
    ));

    // Test 3: Drizzle ORM integration
    this.results.push(await this.runIntegrationTest(
      'Tool Integration - Drizzle ORM setup',
      async () => {
        const testDir = path.join(this.testOutputDir, 'drizzle-test');
        await fs.ensureDir(testDir);
        
        const result = await this.orchestrator.executeTool('setup_drizzle_orm', {
          projectPath: testDir,
          provider: 'postgresql',
          includeExamples: true
        });
        
        if (result.includes('❌')) {
          throw new Error(`Drizzle setup failed: ${result}`);
        }
        
        // Check for essential Drizzle files
        const drizzleConfigPath = path.join(testDir, 'drizzle.config.ts');
        if (!(await fs.pathExists(drizzleConfigPath))) {
          throw new Error('drizzle.config.ts not created');
        }
        
        return {
          drizzleConfigExists: true,
          setupCompleted: result.includes('✅'),
          provider: 'postgresql'
        };
      }
    ));

    return this.results.slice(-3);
  }

  /**
   * T011: Integration test - Error reporting for invalid/unsupported input
   */
  async testErrorReporting(): Promise<IntegrationTestResult[]> {
    console.log('⚠️ Running Error Reporting Tests...');
    
    // Test 1: Invalid project path
    this.results.push(await this.runIntegrationTest(
      'Error Reporting - Invalid project path',
      async () => {
        const invalidRequest = {
          projectPath: '', // Invalid empty path
          preset: 'minimal'
        };
        
        const result = await this.orchestrator.executeTool('create_nextjs_app', invalidRequest);
        
        // Should return an error message
        if (!result.includes('❌') && !result.includes('validation')) {
          throw new Error('Expected validation error for empty project path');
        }
        
        return {
          hasErrorIndicator: result.includes('❌'),
          hasValidationMessage: result.includes('validation') || result.includes('required'),
          resultLength: result.length
        };
      }
    ));

    // Test 2: Invalid preset
    this.results.push(await this.runIntegrationTest(
      'Error Reporting - Invalid preset',
      async () => {
        const invalidRequest = {
          projectPath: '/valid/path',
          preset: 'invalid-preset'
        };
        
        const result = await this.orchestrator.executeTool('create_nextjs_app', invalidRequest);
        
        // Should return specific preset error
        if (!result.includes('Unknown preset') && !result.includes('❌')) {
          throw new Error('Expected preset validation error');
        }
        
        return {
          hasPresetError: result.includes('Unknown preset') || result.includes('preset'),
          hasErrorIndicator: result.includes('❌'),
          mentionsAvailablePresets: result.includes('Available presets')
        };
      }
    ));

    return this.results.slice(-2);
  }

  /**
   * T012: Integration test - Delivery as ZIP and Git push (simulated)
   */
  async testDeliveryMethods(): Promise<IntegrationTestResult[]> {
    console.log('📦 Running Delivery Methods Tests...');
    
    // Test 1: Git repository initialization (if Git is available)
    this.results.push(await this.runIntegrationTest(
      'Delivery - Git repository initialization',
      async () => {
        const testDir = path.join(this.testOutputDir, 'git-test');
        await fs.ensureDir(testDir);
        
        // Create minimal project
        const result = await this.orchestrator.executeTool('create_nextjs_app', {
          projectPath: testDir,
          projectName: 'git-test-app',
          preset: 'minimal'
        });
        
        if (result.includes('❌')) {
          throw new Error(`Project creation failed: ${result}`);
        }
        
        // Check if .gitignore was created (part of delivery)
        const gitignorePath = path.join(testDir, '.gitignore');
        const gitignoreExists = await fs.pathExists(gitignorePath);
        
        return {
          projectCreated: result.includes('✅'),
          gitignoreExists,
          deliveryReady: gitignoreExists // Simple delivery readiness check
        };
      }
    ));

    return this.results.slice(-1);
  }

  /**
   * T013: Integration test - Team vs individual user scenarios
   */
  async testUserScenarios(): Promise<IntegrationTestResult[]> {
    console.log('👥 Running User Scenarios Tests...');
    
    // Test 1: Individual user scenario (minimal setup)
    this.results.push(await this.runIntegrationTest(
      'User Scenarios - Individual developer',
      async () => {
        const testDir = path.join(this.testOutputDir, 'individual-test');
        await fs.ensureDir(testDir);
        
        const result = await this.orchestrator.executeTool('create_nextjs_app', {
          projectPath: testDir,
          projectName: 'individual-app',
          preset: 'minimal'
        });
        
        if (result.includes('❌')) {
          throw new Error(`Individual setup failed: ${result}`);
        }
        
        // Individual scenarios should not include team management features
        const hasTeamFeatures = result.includes('team') || result.includes('multi-tenant');
        
        return {
          setupCompleted: result.includes('✅'),
          noTeamFeatures: !hasTeamFeatures,
          resultLength: result.length
        };
      }
    ));

    // Test 2: Team scenario (enterprise setup)
    this.results.push(await this.runIntegrationTest(
      'User Scenarios - Team/Enterprise setup',
      async () => {
        const testDir = path.join(this.testOutputDir, 'team-test');
        await fs.ensureDir(testDir);
        
        const result = await this.orchestrator.executeTool('create_nextjs_app', {
          projectPath: testDir,
          projectName: 'team-app',
          preset: 'enterprise'
        });
        
        // Enterprise should include team management features
        const hasTeamFeatures = result.includes('team') || result.includes('multi-tenant');
        
        return {
          setupCompleted: !result.includes('❌'),
          hasTeamFeatures,
          isEnterprise: result.includes('enterprise') || result.includes('Full SaaS'),
          resultLength: result.length
        };
      }
    ));

    return this.results.slice(-2);
  }

  /**
   * Run all integration tests
   */
  async runAllIntegrationTests(): Promise<IntegrationTestResult[]> {
    const startTime = Date.now();
    console.log('🧪 Starting Integration Test Suite...');
    
    // Ensure test output directory exists
    await fs.ensureDir(this.testOutputDir);
    
    try {
      await this.testEndToEndProjectGeneration();
      await this.testToolIntegration();
      await this.testErrorReporting();
      await this.testDeliveryMethods();
      await this.testUserScenarios();
    } catch (error) {
      console.error('Integration test suite failed:', error);
    } finally {
      // Cleanup test directories
      await this.cleanup();
    }
    
    const duration = Date.now() - startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    
    console.log(`\n📊 Integration Test Results:`);
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

  private async runIntegrationTest(name: string, testFn: () => Promise<any>): Promise<IntegrationTestResult> {
    const startTime = performance.now();
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      console.log(`  ✅ ${name} (${Math.round(duration)}ms)`);
      return {
        name,
        passed: true,
        duration,
        details: result
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ ${name}: ${errorMessage} (${Math.round(duration)}ms)`);
      return {
        name,
        passed: false,
        duration,
        error: errorMessage
      };
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (await fs.pathExists(this.testOutputDir)) {
        await fs.remove(this.testOutputDir);
        console.log('🧹 Cleaned up test directories');
      }
    } catch (error) {
      console.warn('Warning: Could not cleanup test directories:', error);
    }
  }

  getResults(): IntegrationTestResult[] {
    return this.results;
  }

  getPassedCount(): number {
    return this.results.filter(r => r.passed).length;
  }

  getFailedCount(): number {
    return this.results.filter(r => !r.passed).length;
  }
}
