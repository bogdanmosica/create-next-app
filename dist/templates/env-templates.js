/**
 * @fileoverview Environment Variable Templates
 * @description Templates for T3 Env configuration and type-safe environment variables
 * Used to generate env.ts file for runtime environment validation
 */
export const envConfigTemplate = `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    POSTGRES_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32),
    STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
    NODE_ENV: z.enum(["development", "test", "production"]),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * \`NEXT_PUBLIC_\`.
   */
  client: {
    NEXT_PUBLIC_BASE_URL: z.string().url(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  },

  /**
   * You can't destruct \`process.env\` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    POSTGRES_URL: process.env.POSTGRES_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
  /**
   * Run \`build\` or \`dev\` with \`SKIP_ENV_VALIDATION\` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. \`SOME_VAR: z.string()\` and
   * \`SOME_VAR=''\` will throw an error.
   */
  emptyStringAsUndefined: true,
});`;
export const envExampleTemplate = `# Database
POSTGRES_URL="postgresql://user:password@localhost:5432/database"

# Authentication
AUTH_SECRET="your-32-character-secret-key-here-make-it-long-enough"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# App Configuration
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"

# Optional: Skip environment validation during build (useful for Docker)
# SKIP_ENV_VALIDATION="true"`;
export const envLocalTemplate = `# This file is automatically created by your MCP
# Copy this to .env.local and fill in your actual values
# Never commit .env.local to version control

# Database - Set up your PostgreSQL database
POSTGRES_URL="postgresql://user:password@localhost:5432/your_db_name"

# Authentication - Generate a secure secret (32+ characters)
AUTH_SECRET=""

# Stripe - Get these from your Stripe dashboard
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""

# App Configuration
NEXT_PUBLIC_BASE_URL="http://localhost:3000"`;
//# sourceMappingURL=env-templates.js.map