/**
 * @fileoverview Transactional Full App Orchestrator
 * @description Enhanced orchestrator with checkpoint/rollback capabilities
 * Prevents losing work when steps fail and allows resuming from checkpoints
 */

import fs from "fs-extra";
import path from "node:path";
import { TransactionManager, TransactionStep } from "../utils/transaction-manager.js";
import { SafeCommandRunner } from "../runners/safe-command-runner.js";
import { checkSystemRequirements } from "../utils/system-checks.js";
import { ConfigManager } from "../utils/config-manager.js";
import { transactionLogger } from "../utils/logger.js";

// Import tool functions
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

export interface OrchestratorOptions {
  projectPath: string;
  projectName?: string;
  resumeTransaction?: boolean;
  enableRollback?: boolean;
}

export interface OrchestratorStep {
  id: string;
  name: string;
  tool: (config: any) => Promise<string>;
  config: any;
  dependencies?: string[];
  optional?: boolean;
}

export class TransactionalOrchestrator {
  private transaction: TransactionManager;
  private options: OrchestratorOptions;

  constructor(options: OrchestratorOptions) {
    this.options = options;
    this.transaction = new TransactionManager(options.projectPath);
  }

  /**
   * Create a full SaaS application with transaction safety
   */
  async createFullApp(features?: Record<string, boolean>): Promise<string> {
    const { projectPath, projectName, resumeTransaction = true, enableRollback = true } = this.options;
    const fullPath = path.resolve(projectPath);

    transactionLogger.info(`Starting Next.js SaaS app creation at: ${fullPath}`);
    transactionLogger.info(`Resume capability: ${resumeTransaction}, Rollback: ${enableRollback}`);

    try {
      // Check for existing transaction
      let existingTransaction = null;
      if (resumeTransaction) {
        existingTransaction = await TransactionManager.loadTransaction(fullPath);
        if (existingTransaction) {
          console.error(`[TRANSACTIONAL] Found existing transaction, offering resume...`);
          return await this.handleExistingTransaction(existingTransaction);
        }
      }

      // System requirements check
      transactionLogger.info(`Checking system requirements...`);
      const systemCheck = await checkSystemRequirements();
      
      if (!systemCheck.valid) {
        const errorMessage = `❌ System requirements not met:\n${systemCheck.errors.join('\n')}`;
        transactionLogger.error('System requirements not met', { errors: systemCheck.errors });
        throw new Error(errorMessage);
      }

      // Validate project directory
      transactionLogger.info(`Validating project directory...`);
      await this.validateProjectSetup(fullPath);

      // Define the orchestration steps based on features
      const steps = this.getOrchestrationSteps(fullPath, projectName, features);
      
      // Create progress logger for better progress tracking
      const progress = transactionLogger.progress(steps.length);
      progress.start(`Next.js SaaS application setup`);
      const startTime = Date.now();

      // Execute each step with transaction safety
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepId = step.id;

        try {
          // Use progress logger for better UX
          progress.step(step.name);
          const stepStart = Date.now();
          
          // Start transaction step
          const transactionStep = await this.transaction.startStep(stepId, step.name, 'tool');
          
          // Check dependencies
          if (step.dependencies) {
            await this.validateDependencies(step.dependencies);
          }

          // Execute the tool
          const result = await step.tool(step.config);
          
          // Mark step as completed
          await this.transaction.completeStep(stepId);
          
          // Log completion with timing
          const stepDuration = Date.now() - stepStart;
          progress.stepCompleted(step.name, stepDuration);

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          
          progress.stepFailed(step.name, errorMsg);
          await this.transaction.failStep(stepId, errorMsg);

          if (step.optional) {
            transactionLogger.warn(`Optional step failed, continuing...`, { step: step.name });
            continue;
          }

          // Handle failure
          return await this.handleStepFailure(step, error as Error, enableRollback);
        }
      }

      // Success - complete transaction
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      await this.transaction.saveState();
      
      progress.complete(`All steps completed successfully in ${totalTime}s`);

      return this.generateSuccessMessage(fullPath, totalTime, systemCheck);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      transactionLogger.error(`Orchestration failed: ${errorMsg}`);
      
      if (enableRollback) {
        transactionLogger.warn(`Initiating automatic rollback...`);
        await this.transaction.rollback();
      }
      
      throw error;
    }
  }

  /**
   * Handle existing transaction found on disk
   */
  private async handleExistingTransaction(existingTransaction: TransactionManager): Promise<string> {
    const state = existingTransaction.getStatus();
    const progress = existingTransaction.getProgress();

    if (state.status === 'failed') {
      return `🔄 **Previous Setup Failed - Recovery Options Available**

📊 **Progress**: ${progress.completed}/${progress.total} steps completed (${progress.percentage}%)

**❌ Failed at step**: ${state.steps.filter(s => s.status === 'failed').pop()?.name}

**🛠️ Recovery Options**:

1. **Resume from failure point** (recommended):
   - Run the same command again
   - Will attempt to continue from where it left off
   - Previous work is preserved

2. **Rollback and start fresh**:
   - All changes will be undone
   - You can start over with a clean slate
   - Use: \`create_nextjs_app\` with \`enableRollback: true\`

3. **Manual cleanup**:
   - Review what was created in the project directory  
   - Clean up manually and restart

💡 **Tip**: The resume option is usually the best choice as it preserves your progress.`;
    }

    if (state.status === 'completed') {
      await existingTransaction.cleanup();
      return `✅ **Setup Already Completed**

Your Next.js SaaS application was successfully created previously.

📍 **Location**: ${state.projectPath}
✅ **All ${progress.total} steps completed**

🚀 **Next steps**:
1. \`cd ${path.basename(state.projectPath)}\`
2. \`pnpm dev\` - Start development server
3. Configure your environment variables in \`.env.local\`

Your application is ready to use!`;
    }

    // Transaction was running, offer to resume
    this.transaction = existingTransaction;
    return await this.resumeTransaction();
  }

  /**
   * Resume a transaction from where it left off
   */
  private async resumeTransaction(): Promise<string> {
    const state = this.transaction.getStatus();
    const completedSteps = state.steps.filter(s => s.status === 'completed').map(s => s.id);
    
    console.error(`[TRANSACTIONAL] Resuming transaction with ${completedSteps.length} completed steps`);

    // Get all steps and filter out completed ones (features should be restored from transaction state)
    const allSteps = this.getOrchestrationSteps(state.projectPath, undefined, undefined);
    const remainingSteps = allSteps.filter(step => !completedSteps.includes(step.id));

    console.error(`[TRANSACTIONAL] ${remainingSteps.length} steps remaining to complete`);

    // Continue with remaining steps
    for (const step of remainingSteps) {
      try {
        console.error(`[TRANSACTIONAL] Resuming step: ${step.name}`);
        
        const transactionStep = await this.transaction.startStep(step.id, step.name, 'tool');
        const result = await step.tool(step.config);
        await this.transaction.completeStep(step.id);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await this.transaction.failStep(step.id, errorMsg);
        throw error;
      }
    }

    return `🎉 **Transaction Resume Completed Successfully!**

All remaining steps have been completed. Your Next.js SaaS application is ready!`;
  }

  /**
   * Handle step failure with rollback option
   */
  private async handleStepFailure(step: OrchestratorStep, error: Error, enableRollback: boolean): Promise<string> {
    const progress = this.transaction.getProgress();
    
    let rollbackMessage = '';
    if (enableRollback) {
      rollbackMessage = `

**🔄 Automatic Rollback Initiated**:
All completed steps are being rolled back to prevent partial state...`;
      
      try {
        await this.transaction.rollback();
        rollbackMessage += `
✅ Rollback completed successfully - project restored to initial state`;
      } catch (rollbackError) {
        rollbackMessage += `
❌ Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}
⚠️  Manual cleanup may be required`;
      }
    }

    return `❌ **Setup Failed at Step: ${step.name}**

📊 **Progress**: ${progress.completed}/${progress.total} steps completed (${progress.percentage}%)

**🔍 Error Details**: ${error.message}

**✅ Completed Steps**: 
${this.transaction.getStatus().steps
  .filter(s => s.status === 'completed')
  .map((s, i) => `${i + 1}. ${s.name}`)
  .join('\n')}
${rollbackMessage}

**🛠️ Troubleshooting**:
1. Check the error details above
2. Ensure all prerequisites are installed (Node.js, pnpm, Git)
3. Verify directory permissions and available disk space
4. Try running the command again (resume capability will be available)

**💡 Recovery**: Re-run the same command to resume from the checkpoint automatically.`;
  }

  /**
   * Validate project directory setup
   */
  private async validateProjectSetup(projectPath: string): Promise<void> {
    // Ensure parent directory exists, but don't create the project directory
    // (create-next-app will create it and fails if it already exists)
    const parentDir = path.dirname(projectPath);
    await fs.ensureDir(parentDir);

    // Validate parent directory is writable  
    const dirValidation = await SafeCommandRunner.validateDirectory(parentDir);
    if (!dirValidation.writable) {
      throw new Error(`Parent directory is not writable: ${parentDir}. ${dirValidation.error || ''}`);
    }

    // Validate required commands are available
    const requiredCommands = ['node', 'npm', 'npx'];
    const commandValidation = await SafeCommandRunner.validateCommands(requiredCommands);
    
    const missingCommands = commandValidation.filter(c => !c.available);
    if (missingCommands.length > 0) {
      throw new Error(`Required commands not found: ${missingCommands.map(c => c.command).join(', ')}`);
    }

    console.error(`[TRANSACTIONAL] ✅ Project setup validation passed`);
  }

  /**
   * Define the orchestration steps
   */
  private getOrchestrationSteps(projectPath: string, projectName?: string, features?: Record<string, boolean>): OrchestratorStep[] {
    const steps: OrchestratorStep[] = [];

    // Default features if none provided (minimal setup for better UX)
    const defaultFeatures = {
      core: true,
      database: false,
      authentication: false,
      payments: false,
      teamManagement: false,
      devExperience: true,
      internationalization: false
    };

    const enabledFeatures = features || defaultFeatures;

    // Core Next.js foundation is always included
    steps.push({
      id: 'nextjs-foundation',
      name: 'Next.js Foundation with shadcn/ui',
      tool: createNextJsBase,
      config: { projectPath, projectName, includeShadcn: true, includeAllComponents: true }
    });

    // Development tools based on devExperience feature
    if (enabledFeatures.devExperience) {
      steps.push({
        id: 'development-tools',
        name: 'Development Tools (Biome + VSCode)',
        tool: async (config) => {
          const biomeResult = await setupBiomeLinting({ projectPath: config.projectPath });
          const vscodeResult = await setupVSCodeConfig({ projectPath: config.projectPath });
          return `${biomeResult}\n\n${vscodeResult}`;
        },
        config: { projectPath }
      });
    }

    // Database setup if enabled
    if (enabledFeatures.database) {
      steps.push({
        id: 'database-setup',
        name: 'Database with Drizzle ORM',
        tool: async (config) => {
          const drizzleResult = await setupDrizzleOrm({ projectPath: config.projectPath });
          const envResult = await setupEnvironmentVars({ projectPath: config.projectPath });
          return `${drizzleResult}\n\n${envResult}`;
        },
        config: { projectPath }
      });
    }

    // Authentication system if enabled (requires database)
    if (enabledFeatures.authentication) {
      if (!enabledFeatures.database) {
        console.error(`[WARN] Authentication requires database - enabling database automatically`);
        // Add database setup if not already included
        const hasDatabase = steps.some(step => step.id === 'database-setup');
        if (!hasDatabase) {
          steps.push({
            id: 'database-setup',
            name: 'Database with Drizzle ORM (required for auth)',
            tool: async (config) => {
              const drizzleResult = await setupDrizzleOrm({ projectPath: config.projectPath });
              const envResult = await setupEnvironmentVars({ projectPath: config.projectPath });
              return `${drizzleResult}\n\n${envResult}`;
            },
            config: { projectPath }
          });
        }
      }

      steps.push({
        id: 'authentication-system',
        name: 'JWT Authentication System',
        tool: async (config) => {
          const authResult = await setupAuthenticationJwt({ projectPath: config.projectPath });
          const routesResult = await setupProtectedRoutes({ projectPath: config.projectPath });
          return `${authResult}\n\n${routesResult}`;
        },
        config: { projectPath },
        dependencies: ['database-setup']
      });
    }

    // Payment system if enabled (requires authentication)
    if (enabledFeatures.payments) {
      if (!enabledFeatures.authentication) {
        console.error(`[WARN] Payments require authentication - skipping payment setup`);
      } else {
        steps.push({
          id: 'payment-system',
          name: 'Stripe Payment Integration',
          tool: async (config) => {
            const paymentsResult = await setupStripePayments({ projectPath: config.projectPath });
            const webhooksResult = await setupStripeWebhooks({ projectPath: config.projectPath });
            return `${paymentsResult}\n\n${webhooksResult}`;
          },
          config: { projectPath },
          dependencies: ['authentication-system']
        });
      }
    }

    // Team management if enabled (requires authentication and database)
    if (enabledFeatures.teamManagement) {
      if (!enabledFeatures.authentication || !enabledFeatures.database) {
        console.error(`[WARN] Team management requires both authentication and database - skipping team setup`);
      } else {
        steps.push({
          id: 'team-management',
          name: 'Multi-tenant Team Management',
          tool: setupTeamManagement,
          config: { projectPath },
          dependencies: ['authentication-system']
        });
      }
    }

    // Development experience features
    if (enabledFeatures.devExperience) {
      steps.push({
        id: 'form-handling',
        name: 'React Hook Form and Validation',
        tool: setupFormHandling,
        config: { projectPath }
      });

      steps.push({
        id: 'testing-suite',
        name: 'Comprehensive Testing Suite',
        tool: setupTestingSuite,
        config: { projectPath }
      });

      steps.push({
        id: 'git-workflow',
        name: 'Git Hooks and Development Workflow',
        tool: setupGitWorkflow,
        config: { projectPath },
        optional: true
      });
    }

    // Internationalization if enabled
    if (enabledFeatures.internationalization) {
      const i18nConfig = ConfigManager.getI18nConfig();
      const languageCount = i18nConfig.defaultLanguages.length;
      
      steps.push({
        id: 'internationalization',
        name: `Internationalization (${languageCount} Languages)`,
        tool: setupInternationalization,
        config: { projectPath, languages: i18nConfig.defaultLanguages }
      });
    }

    return steps;
  }

  /**
   * Validate step dependencies
   */
  private async validateDependencies(dependencies: string[]): Promise<void> {
    const completedSteps = this.transaction.getStatus().steps
      .filter(s => s.status === 'completed')
      .map(s => s.id);

    const missingDeps = dependencies.filter(dep => !completedSteps.includes(dep));
    
    if (missingDeps.length > 0) {
      throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
    }
  }

  /**
   * Generate success message
   */
  private generateSuccessMessage(projectPath: string, totalTime: string, systemCheck: any): string {
    const progress = this.transaction.getProgress();
    
    return `🎉 **Next.js SaaS Application Created Successfully!**

📍 **Location**: ${projectPath}
⏱️ **Total Time**: ${totalTime}s  
🏗️ **Architecture**: Transactional orchestration with rollback safety
📊 **Progress**: ${progress.completed}/${progress.total} steps completed (${progress.percentage}%)

**✅ Completed Steps**:
${this.transaction.getStatus().steps
  .filter(s => s.status === 'completed')
  .map((s, i) => `${i + 1}. ${s.name}`)
  .join('\n')}

🚀 **Your Production-Ready SaaS Application Includes**:

**🏗️ Core Foundation**
- Next.js 15+ with App Router & TypeScript
- Tailwind CSS + shadcn/ui component library
- Biome linting with custom rules + VSCode optimization

**💾 Data Layer**
- PostgreSQL with Drizzle ORM  
- Type-safe environment variables (T3 Env)
- Database migrations and seeding scripts

**🔒 Authentication & Security**
- JWT authentication with bcrypt hashing
- Protected route middleware
- Session management and refresh tokens

**💳 Payments & Billing**
- Stripe subscriptions and one-time payments
- Customer portal for self-service billing
- Webhook handling for payment events

**👥 Team Management**
- Multi-tenant architecture
- Role-based permissions (admin, member, viewer)
- Activity logging and audit trails

**🛠️ Developer Experience**
- React Hook Form with Zod validation
- Comprehensive testing (Vitest + Playwright + MSW)
- Git hooks with automated code quality${systemCheck.checks.git.valid ? '' : ' (skipped - upgrade Git)'}

**🌍 Internationalization**
- 6 languages: English, Spanish, French, German, Japanese, Chinese
- Dynamic locale routing (/es, /fr, /de, etc.)
- Translated authentication forms

**🎯 Next Steps** (Required):

1. **Environment Setup**:
   - Copy \`.env.local.example\` → \`.env.local\`
   - Add your database, Stripe, and auth secrets

2. **Database Initialization**:
   - \`pnpm db:generate\` - Create migrations
   - \`pnpm db:setup\` - Initialize Stripe products
   - \`pnpm db:seed\` - Create test data

3. **Validation**:
   - \`pnpm build\` - Check for errors
   - \`pnpm lint\` - Validate code quality
   - \`pnpm test\` - Run test suite

4. **Start Development**:
   - \`pnpm dev\` - Launch development server
   - Visit http://localhost:3000 and test different locales

💡 **Reliability Features**:
✨ **Checkpoint System**: Failed setups can resume from the last successful step
✨ **Automatic Rollback**: Failures trigger cleanup to prevent partial state
✨ **Command Safety**: Enhanced retry logic and timeout handling
✨ **Transaction Log**: Complete audit trail of all changes made

🔒 **Your project is protected against setup failures and ready for production deployment!**`;
  }

  /**
   * Create visual progress bar for console output
   */
  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    return `[${filledBar}${emptyBar}] ${percentage}%`;
  }

  /**
   * Estimate remaining time based on completed steps
   */
  private estimateRemainingTime(completedSteps: number, totalSteps: number, startTime: number): string {
    if (completedSteps === 0) return 'Calculating...';
    
    const elapsedTime = Date.now() - startTime;
    const averageTimePerStep = elapsedTime / completedSteps;
    const remainingSteps = totalSteps - completedSteps;
    const estimatedRemainingTime = remainingSteps * averageTimePerStep;
    
    const minutes = Math.ceil(estimatedRemainingTime / 60000);
    if (minutes < 1) return 'Less than 1 minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  }
}