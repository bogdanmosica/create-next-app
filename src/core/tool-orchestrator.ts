/**
 * @fileoverview Tool Orchestrator
 * @description Handles tool execution, validation, and the main app creation orchestration
 * Extracted from the main server file for better organization
 */

import path from "node:path";
import { validateToolInput, getDefaultConfig } from "../utils/tool-validator.js";
import { EnhancedValidator, EnhancedToolName } from "../utils/enhanced-validator.js";
import { UpfrontValidator } from "../utils/upfront-validator.js";
import { TokenTracker } from "../utils/token-metrics.js";
import { PROJECT_PRESETS, getPreset, getAllPresets, validatePresetFeatures, estimateSetupTime, type FeatureConfig } from "../utils/preset-configs.js";
import { EnhancedErrorHandler, type ErrorContext } from "../utils/error-handler.js";
import { validateProjectRequest, ErrorReportBuilder, GeneratedApplicationBuilder } from "./models.js";

// Import all tool functions
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
import { setupTestingSuite } from "../tools/dev/testing-suite.js";
import { setupGitWorkflow } from "../tools/dev/git-workflow.js";
import { setupInternationalization } from "../tools/i18n/internationalization.js";
import { analyzeTokenUsage } from "../tools/analytics/token-analytics.js";

// Import orchestrators
import { FullAppOrchestrator } from "./full-app-orchestrator.js";
import { TransactionalOrchestrator } from "./transactional-orchestrator.js";

export class ToolOrchestrator {
  private fullAppOrchestrator: FullAppOrchestrator;

  constructor() {
    this.fullAppOrchestrator = new FullAppOrchestrator();
  }

  /**
   * Execute a tool by name with given arguments
   */
  async executeTool(name: string, args: any): Promise<string> {
    // 1. Validate using new ProjectRequest schema for create_nextjs_app
    if (name === 'create_nextjs_app') {
      const requestValidation = validateProjectRequest(args);
      if (!requestValidation.valid) {
        const errorReport = new ErrorReportBuilder()
          .withError('VALIDATION_ERROR', 'Invalid project request', requestValidation.errors?.join('; '))
          .withContext('create_nextjs_app', 'input_validation')
          .withSuggestions(
            'Please fix the validation errors',
            requestValidation.errors || ['Check your input parameters'],
            'error',
            true
          )
          .build();
        
        return `❌ **Input Validation Failed**\n\n${requestValidation.errors?.join('\n')}\n\n🔧 Please correct the issues above and try again.`;
      }
    }
    
    // 2. Enhanced input validation for other tools
    const enhancedValidation = await EnhancedValidator.validateToolInput(name as EnhancedToolName, args);
    
    if (!enhancedValidation.valid) {
      const formattedErrors = EnhancedValidator.formatValidationResult(enhancedValidation);
      return `❌ **Input Validation Failed**\n\n${formattedErrors}\n🔧 Please correct the issues above and try again.`;
    }

    // 3. Upfront path and system validation for tools that create projects  
    // DISABLED: Path validation has issues with Windows drive letters
    if (args.projectPath && ['create_nextjs_app', 'create_nextjs_base'].includes(name)) {
      console.log(`Creating project at: ${args.projectPath}`);
      // Skip validation for now
    }

    // Show enhanced validation warnings and suggestions
    if (enhancedValidation.warnings.length > 0 || enhancedValidation.suggestions.length > 0) {
      const formattedWarnings = EnhancedValidator.formatValidationResult(enhancedValidation);
      console.error(`[VALIDATION] ${formattedWarnings}`);
    }

    // Merge with defaults
    const config = { ...getDefaultConfig(name as any), ...args };

    // Handle each tool with token tracking
    const startTime = Date.now();
    
    switch (name) {
      case "setup_nextjs_project_wizard":
        const wizardResult = this.createProjectWizardResponse(config.projectPath);
        TokenTracker.trackTool(name, '', wizardResult, Date.now() - startTime, 0);
        return wizardResult;

      case "create_nextjs_app":
        // Handle preset-based configuration with smart defaults
        let finalConfig = config;
        
        // If no preset specified and no features provided, default to minimal
        if (!config.preset && !config.features) {
          config.preset = 'minimal';
          console.error(`[DEFAULT] No preset specified, using 'minimal' preset for better UX`);
        }
        
        if (config.preset && typeof config.preset === 'string') {
          const preset = getPreset(config.preset);
          if (!preset) {
            return `❌ Unknown preset: ${config.preset}. Available presets: ${Object.keys(PROJECT_PRESETS).join(', ')}`;
          }
          
          // Merge preset features with any explicit overrides
          finalConfig = {
            ...config,
            features: {
              ...preset.features,
              ...(config.features || {})
            }
          };
          
          console.error(`[PRESET] Using '${preset.name}' preset - estimated time: ${preset.estimatedTime}`);
          console.error(`[PRESET] Features: ${Object.entries(preset.features).filter(([_, enabled]) => enabled).map(([feature]) => feature).join(', ')}`);
        }

        // Validate feature dependencies
        if (finalConfig.features) {
          const validation = validatePresetFeatures(finalConfig.features);
          if (!validation.valid) {
            return `❌ Feature validation failed: ${validation.errors.join(', ')}`;
          }
        }

        try {
          // Use transactional orchestrator for enhanced reliability
          const transactionalOrchestrator = new TransactionalOrchestrator({
            projectPath: finalConfig.projectPath,
            projectName: finalConfig.projectName,
            resumeTransaction: true,
            enableRollback: true
          });
          
          // Pass the resolved features to the orchestrator
          const appResult = await transactionalOrchestrator.createFullApp(finalConfig.features);
          TokenTracker.trackTool(name, JSON.stringify(finalConfig), appResult, Date.now() - startTime, 50);
          return appResult;
          
        } catch (error) {
          // Enhanced error handling with recovery suggestions
          const errorContext: ErrorContext = {
            operation: 'create_nextjs_app',
            preset: finalConfig.preset,
            features: finalConfig.features,
            projectPath: finalConfig.projectPath
          };
          
          const suggestion = EnhancedErrorHandler.handleError(error as Error, errorContext);
          const formattedError = EnhancedErrorHandler.formatErrorMessage(suggestion, errorContext);
          
          TokenTracker.trackTool(name, JSON.stringify(finalConfig), formattedError, Date.now() - startTime, 0);
          return formattedError;
        }
        
      case "create_nextjs_base":
        return await this.wrapToolWithTracking(name, createNextJsBase, config as any);
        
      case "setup_biome_linting":
        return await this.wrapToolWithTracking(name, setupBiomeLinting, config as any);
        
      case "setup_vscode_config":
        return await this.wrapToolWithTracking(name, setupVSCodeConfig, config as any);
        
      case "setup_drizzle_orm":
        return await this.wrapToolWithTracking(name, setupDrizzleOrm, config as any);
        
      case "setup_environment_vars":
        return await this.wrapToolWithTracking(name, setupEnvironmentVars, config as any);
        
      case "setup_authentication_jwt":
        return await this.wrapToolWithTracking(name, setupAuthenticationJwt, config as any);
        
      case "setup_protected_routes":
        return await this.wrapToolWithTracking(name, setupProtectedRoutes, config as any);
        
      case "setup_stripe_payments":
        return await this.wrapToolWithTracking(name, setupStripePayments, config as any);
        
      case "setup_stripe_webhooks":
        return await this.wrapToolWithTracking(name, setupStripeWebhooks, config as any);
        
      case "setup_team_management":
        return await this.wrapToolWithTracking(name, setupTeamManagement, config as any);
        
      case "setup_form_handling":
        return await this.wrapToolWithTracking(name, setupFormHandling, config as any);
        
      case "setup_testing_suite":
        return await this.wrapToolWithTracking(name, setupTestingSuite, config as any);
        
      case "setup_git_workflow":
        return await this.wrapToolWithTracking(name, setupGitWorkflow, config as any);
        
      case "setup_internationalization":
        return await this.wrapToolWithTracking(name, setupInternationalization, config as any);

      case "analyze_token_usage":
        return await analyzeTokenUsage(config as any);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Create the project wizard response with preset-focused UX
   */
  private createProjectWizardResponse(projectPath: string): string {
    const presets = getAllPresets();
    
    // Generate preset cards
    const presetCards = presets
      .filter(preset => preset.id !== 'custom') // Show custom option separately
      .map(preset => {
        const featuresText = Object.entries(preset.features)
          .filter(([_, enabled]) => enabled)
          .map(([feature]) => feature)
          .join(', ');
        
        return `### ${preset.emoji} **${preset.name}** 
*${preset.description}* • ${preset.estimatedTime} • ${preset.complexity}

**Perfect for:** ${preset.useCase}

**Includes:**
${preset.includes.map(item => `- ${item}`).join('\n')}

\`\`\`
create_nextjs_app({
  projectPath: "${projectPath}",
  preset: "${preset.id}"
})
\`\`\``;
      }).join('\n\n---\n\n');

    return `🚀 **Next.js Project Setup Wizard**

Choose a preset that matches your project needs. If you just run \`create_nextjs_app\` without options, we'll use the **Minimal** preset by default.

## 📦 **Ready-to-Use Presets**

> **💡 Default**: If no preset is specified, **Minimal** preset will be used automatically

${presetCards}

---

### 🎨 **Custom Configuration**
*Build exactly what you need*

Pick and choose your features:
\`\`\`
create_nextjs_app({
  projectPath: "${projectPath}",
  features: {
    core: true,              // ✅ Always included
    database: false,         // PostgreSQL + Drizzle ORM
    authentication: false,   // JWT + protected routes  
    payments: false,         // Stripe integration
    teamManagement: false,   // Multi-tenant teams
    devExperience: true,     // Testing + linting + git hooks
    internationalization: false // 6 languages support
  }
})
\`\`\`

## 🎯 **Quick Start Examples**

**Just tell me what you're building:**
- "I want a **blog**" → Uses Blog/Content preset
- "I need a **dashboard**" → Uses Dashboard/Admin preset  
- "I'm building a **SaaS**" → Uses Startup MVP or Full SaaS preset

**Or pick a preset directly:**
- \`create_nextjs_app({ projectPath: "${projectPath}", preset: "minimal" })\`
- \`create_nextjs_app({ projectPath: "${projectPath}", preset: "blog" })\`
- \`create_nextjs_app({ projectPath: "${projectPath}", preset: "dashboard" })\`
- \`create_nextjs_app({ projectPath: "${projectPath}", preset: "startup" })\`
- \`create_nextjs_app({ projectPath: "${projectPath}", preset: "enterprise" })\`

🏗️ **All presets include:** Next.js 15+, TypeScript, Tailwind CSS, shadcn/ui components

What type of project are you building?`;
  }

  /**
   * Wrap a tool function with token tracking
   */
  private async wrapToolWithTracking<T extends any[]>(
    toolName: string,
    toolFunction: (...args: T) => Promise<string>,
    ...args: T
  ): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Execute the tool
      const result = await toolFunction(...args);
      
      // Track the execution
      const executionTime = Date.now() - startTime;
      const configStr = JSON.stringify(args[0] || {});
      TokenTracker.trackTool(toolName, configStr, result, executionTime, this.estimateFilesGenerated(result));
      
      return result;
    } catch (error) {
      // Track failed execution
      const executionTime = Date.now() - startTime;
      TokenTracker.trackTool(toolName, JSON.stringify(args[0] || {}), '', executionTime, 0);
      throw error;
    }
  }

  /**
   * Estimate number of files generated from result text
   */
  private estimateFilesGenerated(result: string): number {
    // Count common file generation indicators
    const fileMatches = result.match(/\b\w+\.(ts|tsx|js|jsx|json|md|css|scss)|\bCreated.*file|\bGenerated.*file/gi);
    return fileMatches ? Math.max(fileMatches.length, 1) : 1;
  }
}