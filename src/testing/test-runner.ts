/**
 * @fileoverview MCP Tool Test Runner
 * @description Comprehensive testing system that creates real Next.js projects using MCP tools
 * Tests individual tools and combinations by actually running the tool functions
 */

import fs from "fs-extra";
import path from "path";
import { performance } from "perf_hooks";

// Import all tools for testing
import { createNextJsBase } from "../tools/core/nextjs-base.js";
import { setupBiomeLinting } from "../tools/core/biome-linting.js";
import { setupVSCodeConfig } from "../tools/core/vscode-config.js";
import { setupDrizzleOrm } from "../tools/database/drizzle-orm.js";
import { setupEnvironmentVars } from "../tools/database/environment-vars.js";
import { setupAuthenticationJwt } from "../tools/auth/authentication-jwt.js";
import { setupProtectedRoutes } from "../tools/auth/protected-routes.js";
import { setupStripePayments } from "../tools/payments/stripe-payments.js";
import { setupStripeWebhooks } from "../tools/payments/stripe-webhooks.js";
import { setupTeamManagement } from "../tools/teams/team-management.js";
import { setupFormHandling } from "../tools/forms/form-handling.js";

export interface TestCase {
  name: string;
  description: string;
  tools: TestToolConfig[];
  expectedFiles: string[];
  expectedPackages: string[];
  validationChecks: ValidationCheck[];
}

export interface TestToolConfig {
  name: string;
  config: any;
}

export interface ValidationCheck {
  type: 'file-exists' | 'package-installed' | 'typescript-compiles' | 'custom';
  description: string;
  check: string | ((projectPath: string) => Promise<boolean>);
}

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  errors: string[];
  warnings: string[];
  projectPath: string;
  toolResults: ToolResult[];
}

export interface ToolResult {
  toolName: string;
  success: boolean;
  duration: number;
  error?: string;
}

export class MCPTestRunner {
  private testDir: string;
  private results: TestResult[] = [];

  constructor(baseTestDir: string = "next_test_projects") {
    this.testDir = path.resolve(baseTestDir);
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log(`🧪 Starting MCP Tool Testing Suite`);
    console.log(`📁 Test directory: ${this.testDir}`);
    
    // Ensure test directory exists
    await fs.ensureDir(this.testDir);

    // Run all test cases
    const testCases = this.getTestCases();
    
    for (const testCase of testCases) {
      console.log(`\n🔬 Running test: ${testCase.name}`);
      const result = await this.runTestCase(testCase);
      this.results.push(result);
      
      if (result.success) {
        console.log(`✅ ${testCase.name} - PASSED (${result.duration.toFixed(2)}s)`);
      } else {
        console.log(`❌ ${testCase.name} - FAILED (${result.duration.toFixed(2)}s)`);
        result.errors.forEach(error => console.log(`   ❌ ${error}`));
      }
    }

    // Generate summary
    this.generateTestSummary();
    
    return this.results;
  }

  async runTestCase(testCase: TestCase): Promise<TestResult> {
    const startTime = performance.now();
    const projectPath = path.join(this.testDir, testCase.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase());
    
    const result: TestResult = {
      testName: testCase.name,
      success: false,
      duration: 0,
      errors: [],
      warnings: [],
      projectPath,
      toolResults: [],
    };

    try {
      // Clean up any existing test project
      if (await fs.pathExists(projectPath)) {
        await fs.remove(projectPath);
      }

      // Create project directory
      await fs.ensureDir(projectPath);

      // Run each tool in sequence
      for (const toolConfig of testCase.tools) {
        const toolResult = await this.runTool(toolConfig, projectPath);
        result.toolResults.push(toolResult);

        if (!toolResult.success) {
          result.errors.push(`Tool ${toolConfig.name} failed: ${toolResult.error}`);
        }
      }

      // Run validation checks
      for (const check of testCase.validationChecks) {
        const checkResult = await this.runValidationCheck(check, projectPath);
        if (!checkResult.success) {
          result.errors.push(`Validation failed: ${check.description} - ${checkResult.error}`);
        }
      }

      // Check if all expected files exist
      for (const expectedFile of testCase.expectedFiles) {
        const filePath = path.join(projectPath, expectedFile);
        if (!(await fs.pathExists(filePath))) {
          result.errors.push(`Expected file not found: ${expectedFile}`);
        }
      }

      // Check if all expected packages are installed
      const packageJsonPath = path.join(projectPath, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJSON(packageJsonPath);
        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        for (const expectedPackage of testCase.expectedPackages) {
          if (!allDeps[expectedPackage]) {
            result.errors.push(`Expected package not installed: ${expectedPackage}`);
          }
        }
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Test execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    result.duration = (performance.now() - startTime) / 1000;
    return result;
  }

  private async runTool(toolConfig: TestToolConfig, projectPath: string): Promise<ToolResult> {
    const startTime = performance.now();
    
    try {
      let toolResult: string;
      
      switch (toolConfig.name) {
        case 'create_nextjs_base':
          toolResult = await createNextJsBase({ projectPath, ...toolConfig.config });
          break;
        case 'setup_biome_linting':
          toolResult = await setupBiomeLinting({ projectPath, ...toolConfig.config });
          break;
        case 'setup_vscode_config':
          toolResult = await setupVSCodeConfig({ projectPath, ...toolConfig.config });
          break;
        case 'setup_drizzle_orm':
          toolResult = await setupDrizzleOrm({ projectPath, ...toolConfig.config });
          break;
        case 'setup_environment_vars':
          toolResult = await setupEnvironmentVars({ projectPath, ...toolConfig.config });
          break;
        case 'setup_authentication_jwt':
          toolResult = await setupAuthenticationJwt({ projectPath, ...toolConfig.config });
          break;
        case 'setup_protected_routes':
          toolResult = await setupProtectedRoutes({ projectPath, ...toolConfig.config });
          break;
        case 'setup_stripe_payments':
          toolResult = await setupStripePayments({ projectPath, ...toolConfig.config });
          break;
        case 'setup_stripe_webhooks':
          toolResult = await setupStripeWebhooks({ projectPath, ...toolConfig.config });
          break;
        case 'setup_team_management':
          toolResult = await setupTeamManagement({ projectPath, ...toolConfig.config });
          break;
        case 'setup_form_handling':
          toolResult = await setupFormHandling({ projectPath, ...toolConfig.config });
          break;
        default:
          throw new Error(`Unknown tool: ${toolConfig.name}`);
      }

      return {
        toolName: toolConfig.name,
        success: true,
        duration: (performance.now() - startTime) / 1000,
      };

    } catch (error) {
      return {
        toolName: toolConfig.name,
        success: false,
        duration: (performance.now() - startTime) / 1000,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async runValidationCheck(check: ValidationCheck, projectPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      switch (check.type) {
        case 'file-exists':
          const filePath = path.join(projectPath, check.check as string);
          const exists = await fs.pathExists(filePath);
          return { success: exists, error: exists ? undefined : `File does not exist: ${check.check}` };
          
        case 'package-installed':
          const packageJsonPath = path.join(projectPath, "package.json");
          if (!(await fs.pathExists(packageJsonPath))) {
            return { success: false, error: "package.json not found" };
          }
          const packageJson = await fs.readJSON(packageJsonPath);
          const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          const isInstalled = allDeps[check.check as string];
          return { success: !!isInstalled, error: isInstalled ? undefined : `Package not installed: ${check.check}` };
          
        case 'typescript-compiles':
          // TODO: Implement TypeScript compilation check
          return { success: true };
          
        case 'custom':
          if (typeof check.check === 'function') {
            const result = await check.check(projectPath);
            return { success: result, error: result ? undefined : `Custom check failed: ${check.description}` };
          }
          return { success: false, error: "Invalid custom check function" };
          
        default:
          return { success: false, error: `Unknown validation check type: ${check.type}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private getTestCases(): TestCase[] {
    return [
      // Test 1: Basic Next.js setup
      {
        name: "Basic Next.js Setup",
        description: "Test core Next.js project creation with shadcn/ui",
        tools: [
          { name: "create_nextjs_base", config: { includeShadcn: true, includeAllComponents: true } }
        ],
        expectedFiles: [
          "package.json",
          "next.config.js",
          "tailwind.config.ts",
          "components.json",
          "components/ui/button.tsx",
          "lib/utils.ts"
        ],
        expectedPackages: ["next", "@radix-ui/react-slot", "tailwindcss"],
        validationChecks: [
          { type: 'file-exists', description: 'Next.js config exists', check: 'next.config.js' },
          { type: 'package-installed', description: 'Next.js installed', check: 'next' },
          { type: 'package-installed', description: 'Tailwind installed', check: 'tailwindcss' }
        ]
      },

      // Test 2: Core tools combination
      {
        name: "Core Tools Setup",
        description: "Test Next.js + Biome + VSCode configuration",
        tools: [
          { name: "create_nextjs_base", config: {} },
          { name: "setup_biome_linting", config: { includeCustomRules: true } },
          { name: "setup_vscode_config", config: { optimizeForBiome: true } }
        ],
        expectedFiles: [
          "package.json",
          "biome.json",
          ".vscode/settings.json",
          ".vscode/extensions.json"
        ],
        expectedPackages: ["next", "@biomejs/biome"],
        validationChecks: [
          { type: 'file-exists', description: 'Biome config exists', check: 'biome.json' },
          { type: 'file-exists', description: 'VSCode settings exist', check: '.vscode/settings.json' }
        ]
      },

      // Test 3: Database setup
      {
        name: "Database Integration",
        description: "Test Drizzle ORM with environment variables",
        tools: [
          { name: "create_nextjs_base", config: {} },
          { name: "setup_drizzle_orm", config: { provider: "postgresql" } },
          { name: "setup_environment_vars", config: { includeT3Validation: true } }
        ],
        expectedFiles: [
          "drizzle.config.ts",
          "lib/db.ts",
          "models/user.ts",
          ".env.example",
          "libs/env.ts"
        ],
        expectedPackages: ["drizzle-orm", "drizzle-kit", "@t3-oss/env-nextjs"],
        validationChecks: [
          { type: 'file-exists', description: 'Drizzle config exists', check: 'drizzle.config.ts' },
          { type: 'package-installed', description: 'Drizzle ORM installed', check: 'drizzle-orm' }
        ]
      },

      // Test 4: Authentication system
      {
        name: "Authentication System",
        description: "Test JWT authentication with protected routes",
        tools: [
          { name: "create_nextjs_base", config: {} },
          { name: "setup_drizzle_orm", config: { provider: "postgresql" } },
          { name: "setup_environment_vars", config: {} },
          { name: "setup_authentication_jwt", config: { includePasswordHashing: true } },
          { name: "setup_protected_routes", config: { protectionLevel: "advanced" } }
        ],
        expectedFiles: [
          "lib/auth/session.ts",
          "lib/auth/password.ts",
          "actions/auth.ts",
          "components/auth/login-form.tsx",
          "middleware.ts",
          "app/dashboard/layout.tsx"
        ],
        expectedPackages: ["jose", "bcryptjs", "zod"],
        validationChecks: [
          { type: 'file-exists', description: 'Auth session exists', check: 'lib/auth/session.ts' },
          { type: 'file-exists', description: 'Middleware exists', check: 'middleware.ts' },
          { type: 'package-installed', description: 'JWT library installed', check: 'jose' }
        ]
      },

      // Test 5: Payment integration
      {
        name: "Stripe Payments",
        description: "Test Stripe payments with webhooks",
        tools: [
          { name: "create_nextjs_base", config: {} },
          { name: "setup_authentication_jwt", config: {} },
          { name: "setup_stripe_payments", config: { includeSubscriptions: true } },
          { name: "setup_stripe_webhooks", config: { includeCustomerPortal: true } }
        ],
        expectedFiles: [
          "lib/payments/stripe-client.ts",
          "lib/payments/stripe-utils.ts",
          "actions/payments/stripe-actions.ts",
          "components/payments/payment-button.tsx",
          "app/api/webhooks/stripe/route.ts",
          "lib/payments/webhook-handlers.ts"
        ],
        expectedPackages: ["stripe", "@stripe/stripe-js"],
        validationChecks: [
          { type: 'file-exists', description: 'Stripe client exists', check: 'lib/payments/stripe-client.ts' },
          { type: 'file-exists', description: 'Webhook endpoint exists', check: 'app/api/webhooks/stripe/route.ts' }
        ]
      },

      // Test 6: Team management
      {
        name: "Team Management System",
        description: "Test multi-tenant team management with roles",
        tools: [
          { name: "create_nextjs_base", config: {} },
          { name: "setup_drizzle_orm", config: {} },
          { name: "setup_authentication_jwt", config: {} },
          { name: "setup_team_management", config: { includeRoles: true, includeActivityLogs: true } }
        ],
        expectedFiles: [
          "models/team.ts",
          "lib/db/team-queries.ts",
          "validations/team.ts",
          "actions/team.ts",
          "components/teams/team-form.tsx",
          "components/teams/member-list.tsx"
        ],
        expectedPackages: ["zod"],
        validationChecks: [
          { type: 'file-exists', description: 'Team models exist', check: 'models/team.ts' },
          { type: 'file-exists', description: 'Team actions exist', check: 'actions/team.ts' }
        ]
      },

      // Test 7: Form handling
      {
        name: "Advanced Form Handling",
        description: "Test React Hook Form with Zod validation and React Query",
        tools: [
          { name: "create_nextjs_base", config: {} },
          { name: "setup_form_handling", config: { includeZodValidation: true, includeReactQuery: true } }
        ],
        expectedFiles: [
          "lib/forms/hooks.ts",
          "lib/forms/utils.ts",
          "lib/forms/query-provider.tsx",
          "components/forms/form-input.tsx",
          "components/forms/form-field.tsx",
          "validations/forms/schemas.ts"
        ],
        expectedPackages: ["react-hook-form", "@hookform/resolvers", "zod", "@tanstack/react-query"],
        validationChecks: [
          { type: 'file-exists', description: 'Form hooks exist', check: 'lib/forms/hooks.ts' },
          { type: 'file-exists', description: 'Form components exist', check: 'components/forms/form-input.tsx' },
          { type: 'package-installed', description: 'React Hook Form installed', check: 'react-hook-form' }
        ]
      },

      // Test 8: Complete SaaS setup
      {
        name: "Complete SaaS Application",
        description: "Test full SaaS setup with all major features",
        tools: [
          { name: "create_nextjs_base", config: { includeShadcn: true } },
          { name: "setup_biome_linting", config: {} },
          { name: "setup_drizzle_orm", config: { provider: "postgresql" } },
          { name: "setup_environment_vars", config: {} },
          { name: "setup_authentication_jwt", config: {} },
          { name: "setup_protected_routes", config: {} },
          { name: "setup_stripe_payments", config: {} },
          { name: "setup_stripe_webhooks", config: {} },
          { name: "setup_team_management", config: {} },
          { name: "setup_form_handling", config: {} }
        ],
        expectedFiles: [
          "package.json",
          "biome.json",
          "drizzle.config.ts",
          "middleware.ts",
          "lib/auth/session.ts",
          "lib/payments/stripe-client.ts",
          "models/team.ts",
          "lib/forms/hooks.ts"
        ],
        expectedPackages: [
          "next", "@biomejs/biome", "drizzle-orm", "jose", "bcryptjs",
          "stripe", "react-hook-form", "zod", "@tanstack/react-query"
        ],
        validationChecks: [
          { type: 'file-exists', description: 'All core files exist', check: 'package.json' },
          {
            type: 'custom',
            description: 'Project structure is complete',
            check: async (projectPath: string) => {
              // Custom validation for complete project structure
              const criticalFiles = [
                'lib/auth/session.ts',
                'models/team.ts',
                'lib/payments/stripe-client.ts',
                'components/forms/form-input.tsx'
              ];
              
              for (const file of criticalFiles) {
                if (!(await fs.pathExists(path.join(projectPath, file)))) {
                  return false;
                }
              }
              return true;
            }
          }
        ]
      }
    ];
  }

  private generateTestSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 MCP TOOL TESTING SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
    console.log(`📁 Test Directory: ${this.testDir}`);

    if (failedTests > 0) {
      console.log(`\n❌ FAILED TESTS:`);
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   • ${result.testName}`);
          result.errors.forEach(error => console.log(`     - ${error}`));
        });
    }

    console.log(`\n🧹 Cleanup: Test projects remain in ${this.testDir} for manual inspection`);
    console.log(`   You can safely delete this directory when testing is complete.`);
  }

  async cleanupTestProjects(): Promise<void> {
    if (await fs.pathExists(this.testDir)) {
      await fs.remove(this.testDir);
      console.log(`🧹 Cleaned up test directory: ${this.testDir}`);
    }
  }
}