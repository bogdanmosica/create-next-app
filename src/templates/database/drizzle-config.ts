/**
 * @fileoverview Drizzle Configuration Template
 * @description Template for drizzle.config.ts in generated Next.js applications
 */

export const drizzleConfigTemplate = `import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: './models/schema/index.ts',
  out: './libs/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
  verbose: true,
  strict: true,
});
`;

export const drizzleEnvTemplate = `# Database Configuration
POSTGRES_URL="postgresql://username:password@localhost:5432/database"

# For development with local PostgreSQL
# POSTGRES_URL="postgresql://postgres:password@localhost:5432/myapp_dev"

# For Neon serverless PostgreSQL
# POSTGRES_URL="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/dbname?sslmode=require"
`;
