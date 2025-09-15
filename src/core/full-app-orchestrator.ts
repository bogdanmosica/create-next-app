/**
 * @fileoverview Full App Orchestrator  
 * @description Contains the main createNextJsApp logic - the 30-step process to create a complete SaaS application
 * Extracted from the main server file for better organization
 */

import fs from "fs-extra";
import path from "node:path";

// Import tool functions for orchestration
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

// Import utilities
import { checkSystemRequirements } from "../utils/system-checks.js";

export class FullAppOrchestrator {
  
  async createFullApp(projectPath: string, projectName?: string): Promise<string> {
    const fullPath = path.resolve(projectPath);
    
    console.error(`[DEBUG] Starting Next.js SaaS app creation at: ${fullPath}`);
    console.error(`[DEBUG] Project name: ${projectName || 'current directory'}`);
    console.error(`[DEBUG] Using tool-based orchestration pattern`);
    
    // System requirements check
    console.error(`[DEBUG] Checking system requirements...`);
    const systemCheck = await checkSystemRequirements();
    
    if (!systemCheck.valid) {
      const errorMessage = `❌ System requirements not met:\n${systemCheck.errors.join('\n')}`;
      console.error(`[ERROR] ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    if (systemCheck.warnings.length > 0) {
      console.error(`[WARNING] System warnings:\n${systemCheck.warnings.join('\n')}`);
    }
    
    console.error(`[DEBUG] System check passed - Git: ${systemCheck.checks.git.version}, Node: ${systemCheck.checks.node.version}, pnpm: ${systemCheck.checks.pnpm.version}`);
    
    // Ensure directory exists
    try {
      await fs.ensureDir(fullPath);
      console.error(`[DEBUG] Directory ensured: ${fullPath}`);
      
      // Check if directory is writable
      await fs.access(fullPath, fs.constants.W_OK);
      console.error(`[DEBUG] Directory is writable`);
    } catch (error) {
      throw new Error(`Failed to create or access project directory: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const steps: string[] = [];
    const startTime = Date.now();
    
    try {
      // Use tool-based orchestration for cleaner, more maintainable setup
      console.error(`[DEBUG] Starting tool-based SaaS application orchestration...`);
      
      // Step 1: Next.js Foundation
      const step1 = "Setting up Next.js foundation with shadcn/ui...";
      steps.push(step1);
      console.error(`[STEP 1/13] ${step1}`);
      await createNextJsBase({ 
        projectPath: fullPath, 
        projectName,
        includeShadcn: true,
        includeAllComponents: true
      });
      console.error(`[STEP 1/13] ✅ Completed: ${step1}`);

      // Step 2: Development Tools  
      const step2 = "Setting up Biome linting and VSCode config...";
      steps.push(step2);
      console.error(`[STEP 2/13] ${step2}`);
      await setupBiomeLinting({ projectPath: fullPath });
      await setupVSCodeConfig({ projectPath: fullPath });
      console.error(`[STEP 2/13] ✅ Completed: ${step2}`);

      // Step 3: Database Setup
      const step3 = "Setting up database with Drizzle ORM...";
      steps.push(step3);
      console.error(`[STEP 3/13] ${step3}`);
      await setupDrizzleOrm({ projectPath: fullPath });
      await setupEnvironmentVars({ projectPath: fullPath });
      console.error(`[STEP 3/13] ✅ Completed: ${step3}`);

      // Step 4: Authentication System
      const step4 = "Setting up JWT authentication system...";
      steps.push(step4);
      console.error(`[STEP 4/13] ${step4}`);
      await setupAuthenticationJwt({ projectPath: fullPath });
      await setupProtectedRoutes({ projectPath: fullPath });
      console.error(`[STEP 4/13] ✅ Completed: ${step4}`);

      // Step 5: Stripe Payments
      const step5 = "Setting up Stripe payments integration...";
      steps.push(step5);
      console.error(`[STEP 5/13] ${step5}`);
      await setupStripePayments({ projectPath: fullPath });
      await setupStripeWebhooks({ projectPath: fullPath });
      console.error(`[STEP 5/13] ✅ Completed: ${step5}`);

      // Step 6: Team Management
      const step6 = "Setting up multi-tenant team management...";
      steps.push(step6);
      console.error(`[STEP 6/13] ${step6}`);
      await setupTeamManagement({ projectPath: fullPath });
      console.error(`[STEP 6/13] ✅ Completed: ${step6}`);

      // Step 7: Form Handling
      const step7 = "Setting up React Hook Form and validation...";
      steps.push(step7);
      console.error(`[STEP 7/13] ${step7}`);
      await setupFormHandling({ projectPath: fullPath });
      console.error(`[STEP 7/13] ✅ Completed: ${step7}`);

      // Step 8: Testing Suite
      const step8 = "Setting up comprehensive testing suite...";
      steps.push(step8);
      console.error(`[STEP 8/13] ${step8}`);
      await setupTestingSuite({ projectPath: fullPath });
      console.error(`[STEP 8/13] ✅ Completed: ${step8}`);

      // Step 9: Git Workflow (conditional)
      const step9 = systemCheck.checks.git.valid 
        ? "Setting up Git hooks and development workflow..."
        : "Skipping Git hooks (Git version too old)...";
      steps.push(step9);
      console.error(`[STEP 9/13] ${step9}`);
      
      if (systemCheck.checks.git.valid) {
        await setupGitWorkflow({ projectPath: fullPath });
      } else {
        console.error(`[STEP 9/13] ⚠️  Skipped: Git hooks require Git 2.31.0+, found ${systemCheck.checks.git.version || 'unknown'}`);
      }
      console.error(`[STEP 9/13] ✅ Completed: ${step9}`);

      // Step 10: Internationalization
      const step10 = "Setting up internationalization with 6 languages...";
      steps.push(step10);
      console.error(`[STEP 10/13] ${step10}`);
      await setupInternationalization({ 
        projectPath: fullPath,
        languages: ["en", "es", "fr", "de", "ja", "zh"]
      });
      console.error(`[STEP 10/13] ✅ Completed: ${step10}`);

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`[SUCCESS] SaaS application orchestration completed in ${totalTime}s`);

      return `🎉 **Next.js SaaS Application Created Successfully!**\n\n📍 **Location**: ${fullPath}\n⏱️ **Total Time**: ${totalTime}s\n🏗️ **Architecture**: Tool-based orchestration (${steps.length} streamlined steps)\n\n✅ **Completed Setup**:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🚀 **Your Production-Ready SaaS Application Includes**:\n\n**🏗️ Core Foundation**\n- Next.js 15+ with App Router & TypeScript\n- Tailwind CSS + shadcn/ui component library\n- Biome linting with custom rules + VSCode optimization\n\n**💾 Data Layer**\n- PostgreSQL with Drizzle ORM\n- Type-safe environment variables (T3 Env)\n- Database migrations and seeding scripts\n\n**🔒 Authentication & Security**\n- JWT authentication with bcrypt hashing\n- Protected route middleware\n- Session management and refresh tokens\n\n**💳 Payments & Billing**\n- Stripe subscriptions and one-time payments\n- Customer portal for self-service billing\n- Webhook handling for payment events\n\n**👥 Team Management**\n- Multi-tenant architecture\n- Role-based permissions (admin, member, viewer)\n- Activity logging and audit trails\n\n**🛠️ Developer Experience**\n- React Hook Form with Zod validation\n- Comprehensive testing (Vitest + Playwright + MSW)\n- Git hooks with automated code quality${systemCheck.checks.git.valid ? '' : ' (skipped - upgrade Git)'}\n\n**🌍 Internationalization**\n- 6 languages: English, Spanish, French, German, Japanese, Chinese\n- Dynamic locale routing (/es, /fr, /de, etc.)\n- Translated authentication forms\n\n**🎯 Next Steps** (Required):\n\n1. **Environment Setup**:\n   - Copy \`.env.local.example\` → \`.env.local\`\n   - Add your database, Stripe, and auth secrets\n\n2. **Database Initialization**:\n   - \`pnpm db:generate\` - Create migrations\n   - \`pnpm db:setup\` - Initialize Stripe products\n   - \`pnpm db:seed\` - Create test data\n\n3. **Validation**:\n   - \`pnpm build\` - Check for errors\n   - \`pnpm lint\` - Validate code quality\n   - \`pnpm test\` - Run test suite\n\n4. **Start Development**:\n   - \`pnpm dev\` - Launch development server\n   - Visit http://localhost:3000 and test different locales\n\n💡 **Improvements Made**:\n✨ **Streamlined Architecture**: 30 manual steps → ${steps.length} tool orchestrations\n✨ **Consistent Patterns**: All features use standardized tool interface\n✨ **Better Error Handling**: Each tool includes validation and dependency detection\n✨ **Maintainable Code**: Clean separation between orchestration and implementation\n\n${!systemCheck.checks.git.valid ? '⚠️  **Note**: Git hooks were skipped due to Git version. Upgrade to 2.31.0+ and run `pnpm prepare`' : '🔗 **Git Hooks Active**: Automated linting, formatting, and commit standards enabled'}\n\n📚 Your application is ready for production deployment!`;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
      
      console.error(`[ERROR] Failed at step: ${currentStep}`);
      console.error(`[ERROR] Error details: ${errorMsg}`);
      console.error(`[ERROR] Project path: ${fullPath}`);
      console.error(`[ERROR] Completed steps: ${steps.slice(0, -1).join(', ')}`);
      console.error(`[ERROR] Full error object:`, error);
      console.error(`[ERROR] Error stack:`, error instanceof Error ? error.stack : 'No stack available');
      
      throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 Tip: Check the console logs above for more detailed debug information.`);
    }
  }
}