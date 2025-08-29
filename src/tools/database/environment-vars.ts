/**
 * @fileoverview Environment Variables Setup Tool
 * @description Creates environment variable files with T3 Env validation
 * Sets up type-safe environment variable handling for Next.js applications
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../../runners/command-runner.js";
import { createEnvironmentFiles } from "../../creators/config-creators.js";
import { createEnvValidation } from "../../creators/dev-experience-creators.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface EnvironmentVarsConfig {
  projectPath: string;
  includeT3Validation?: boolean;
  includeExampleFile?: boolean;
}

export async function setupEnvironmentVars(config: EnvironmentVarsConfig): Promise<string> {
  const {
    projectPath,
    includeT3Validation = true,
    includeExampleFile = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check if environment setup already exists
  if (projectState.hasEnvironmentVars) {
    throw new Error("Environment variables are already set up in this project. .env.example file already exists.");
  }

  console.error(`[DEBUG] Starting environment variables setup at: ${fullPath}`);
  
  try {
    // Step 1: Install T3 Env (if enabled)
    let step1: string;
    if (includeT3Validation) {
      step1 = "Installing T3 Env for type-safe environment variables...";
      steps.push(step1);
      console.error(`[STEP 1/5] ${step1}`);
      
      await runCommand("pnpm add @t3-oss/env-nextjs", fullPath);
    } else {
      step1 = "Skipping T3 Env installation (disabled)...";
      steps.push(step1);
      console.error(`[STEP 1/5] ${step1}`);
    }
    
    console.error(`[STEP 1/5] ✅ Completed: ${step1}`);

    // Step 2: Create environment files (.env.local.example, .env)
    const step2 = includeExampleFile 
      ? "Creating environment files (.env.local.example, .env.local)..."
      : "Creating basic environment setup...";
    steps.push(step2);
    console.error(`[STEP 2/5] ${step2}`);
    
    await createEnvironmentFiles(fullPath);
    
    console.error(`[STEP 2/5] ✅ Completed: ${step2}`);

    // Step 3: Create T3 Env validation (if enabled)
    const step3 = includeT3Validation 
      ? "Setting up T3 Env validation schema..."
      : "Skipping T3 Env validation (disabled)...";
    steps.push(step3);
    console.error(`[STEP 3/5] ${step3}`);
    
    if (includeT3Validation) {
      await createEnvValidation(fullPath);
    }
    
    console.error(`[STEP 3/5] ✅ Completed: ${step3}`);

    // Step 4: Create enhanced environment template
    const step4 = "Creating comprehensive environment template...";
    steps.push(step4);
    console.error(`[STEP 4/5] ${step4}`);
    
    // Detect what features are available to create appropriate template
    const hasDatabase = projectState.hasDrizzle;
    const hasAuth = projectState.hasAuthentication;
    const hasStripe = projectState.hasStripe;
    
    const enhancedTemplate = createEnhancedEnvTemplate(hasDatabase, hasAuth, hasStripe);
    
    if (includeExampleFile) {
      await fs.writeFile(path.join(fullPath, ".env.local.example"), enhancedTemplate);
    }
    
    // Create initial .env.local file if it doesn't exist
    const envLocalPath = path.join(fullPath, ".env.local");
    if (!await fs.pathExists(envLocalPath)) {
      await fs.writeFile(envLocalPath, enhancedTemplate);
    }
    
    console.error(`[STEP 4/5] ✅ Completed: ${step4}`);

    // Step 5: Update .gitignore to protect environment files
    const step5 = "Updating .gitignore for environment file protection...";
    steps.push(step5);
    console.error(`[STEP 5/5] ${step5}`);
    
    const gitignorePath = path.join(fullPath, ".gitignore");
    let gitignoreContent = "";
    
    if (await fs.pathExists(gitignorePath)) {
      gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
    }
    
    const envEntries = [
      "# Environment Variables",
      ".env.local",
      ".env.*.local",
      ".env"
    ];
    
    // Add environment entries if not present
    for (const entry of envEntries) {
      if (!gitignoreContent.includes(entry)) {
        gitignoreContent += `\n${entry}`;
      }
    }
    
    await fs.writeFile(gitignorePath, gitignoreContent);
    
    console.error(`[STEP 5/5] ✅ Completed: ${step5}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Environment variables setup completed in ${totalTime}s`);

    const integrationStatus = `🚀 **Integration:**${projectState.hasDrizzle ? '\n- ✅ **Database Ready**: Your Drizzle setup will use DATABASE_URL' : '\n- 🔧 **Database**: Run `setup_drizzle_orm` to add database integration'}${projectState.hasAuthentication ? '\n- ✅ **Auth Ready**: Your authentication will use AUTH_SECRET' : '\n- 🔐 **Authentication**: Run `setup_authentication_jwt` to add user auth'}${projectState.hasStripe ? '\n- ✅ **Payments Ready**: Your Stripe setup will use the payment keys' : '\n- 💳 **Payments**: Run `setup_stripe_payments` to add payment processing'}`;

    const typeSafeUsage = includeT3Validation ? `🔒 **Type-Safe Usage:**
\`\`\`typescript
import { env } from "@/libs/env";

// Fully typed and validated at runtime
const dbUrl = env.DATABASE_URL;
const appUrl = env.NEXT_PUBLIC_APP_URL;
\`\`\`

` : '';

    return `🎉 Environment variables setup completed successfully!

⏱️ Total time: ${totalTime}s

✅ Completed steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

⚙️ **Environment Configuration:**${includeT3Validation ? '\n- **T3 Env**: Type-safe environment variable validation' : ''}
- **Security**: Environment files protected in .gitignore${includeExampleFile ? '\n- **Template**: .env.local.example with all variables documented' : ''}
- **Development**: .env.local ready for local development
- **Type Safety**: Full TypeScript integration${includeT3Validation ? ' with runtime validation' : ''}

📁 **Files Created:**${includeT3Validation ? '\n- \`libs/env.ts\` - T3 Env validation schema' : ''}
- \`.env.local\` - Your local environment variables${includeExampleFile ? '\n- \`.env.local.example\` - Template with documentation' : ''}
- Updated \`.gitignore\` - Environment file protection

🔐 **Environment Variables Available:**
\`\`\`bash
# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database${projectState.hasDrizzle ? ' (Detected: Drizzle ORM)' : ''}
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# Authentication${projectState.hasAuthentication ? ' (Detected: JWT Auth)' : ''}
AUTH_SECRET="your-super-secret-jwt-key-min-32-chars"
AUTH_SECRET_KEY="your-auth-secret-key"

# Payments${projectState.hasStripe ? ' (Detected: Stripe)' : ''}
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
\`\`\`

${typeSafeUsage}💡 **Next steps:**
1. **Copy template**: \`cp .env.local.example .env.local\`
2. **Fill in values**: Add your actual database URLs and secrets
3. **Database setup**: Configure your database connection
4. **Test validation**: Run your app to validate environment variables

${integrationStatus}

⚠️  **Security Reminders:**
- Never commit .env.local to version control
- Use different values for development/production
- Rotate secrets regularly
- Use strong, unique values for AUTH_SECRET (32+ characters)

📚 **Documentation:** Check the .env.local.example file for detailed variable descriptions.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have pnpm installed\n- Check that the project directory is writable\n- Verify Next.js project exists (run create_nextjs_base first)\n- Ensure .gitignore file is writable`);
  }
}

function createEnhancedEnvTemplate(hasDatabase: boolean, hasAuth: boolean, hasStripe: boolean): string {
  return `# ==============================================
# ENVIRONMENT VARIABLES
# ==============================================
# Copy this file to .env.local and fill in the actual values
# Never commit .env.local to version control!

# ==============================================
# NEXT.JS CONFIGURATION
# ==============================================
# The base URL of your application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Node environment (development, production, test)
NODE_ENV="development"

${hasDatabase ? `
# ==============================================
# DATABASE CONFIGURATION
# ==============================================
# PostgreSQL connection string
# Format: postgresql://username:password@host:port/database
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp"

# Alternative formats:
# MySQL: mysql://username:password@host:port/database
# SQLite: file:./dev.db
` : `
# ==============================================
# DATABASE CONFIGURATION (when added)
# ==============================================
# Uncomment and configure when you add database support
# DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp"
`}

${hasAuth ? `
# ==============================================
# AUTHENTICATION CONFIGURATION  
# ==============================================
# JWT secret key - MUST be 32+ characters for security
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"

# Alternative auth secret for additional security layers
AUTH_SECRET_KEY="your-additional-auth-secret-key"
` : `
# ==============================================
# AUTHENTICATION CONFIGURATION (when added)
# ==============================================
# Uncomment when you add authentication support
# AUTH_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
# AUTH_SECRET_KEY="your-additional-auth-secret-key"
`}

${hasStripe ? `
# ==============================================
# STRIPE PAYMENT CONFIGURATION
# ==============================================
# Get these from your Stripe Dashboard (https://dashboard.stripe.com)

# Secret key (server-side) - starts with sk_test_ or sk_live_
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"

# Publishable key (client-side) - starts with pk_test_ or pk_live_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"

# Webhook secret for secure webhook handling
# Get this from Stripe webhook endpoint configuration
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
` : `
# ==============================================
# STRIPE PAYMENT CONFIGURATION (when added)
# ==============================================
# Uncomment when you add Stripe payment support
# STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
# STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
`}

# ==============================================
# OPTIONAL THIRD-PARTY SERVICES
# ==============================================
# Email service (when implemented)
# EMAIL_FROM="noreply@yourapp.com"
# SMTP_HOST="smtp.gmail.com"
# SMTP_PORT="587"
# SMTP_USER="your-email@gmail.com"
# SMTP_PASS="your-app-password"

# Analytics (when implemented)
# NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
# NEXT_PUBLIC_POSTHOG_KEY="your-posthog-key"

# File uploads (when implemented)
# UPLOADTHING_SECRET="your-uploadthing-secret"
# UPLOADTHING_APP_ID="your-uploadthing-app-id"

# ==============================================
# DEVELOPMENT ONLY
# ==============================================
# Uncomment for additional development features
# DEBUG="true"
# LOG_LEVEL="debug"

# ==============================================
# PRODUCTION NOTES
# ==============================================
# For production deployment:
# 1. Change NEXT_PUBLIC_APP_URL to your production domain
# 2. Use production database URLs
# 3. Use live Stripe keys (sk_live_, pk_live_)
# 4. Set NODE_ENV="production"
# 5. Use strong, unique secrets
# 6. Enable proper SSL/TLS
`;
}