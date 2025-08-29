/**
 * @fileoverview Drizzle ORM Setup Tool
 * @description Sets up Drizzle ORM with PostgreSQL/MySQL/SQLite support
 * Creates database configuration, schemas, and connection setup
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../../runners/command-runner.js";
import { createDrizzleConfig } from "../../creators/config-creators.js";
import { installPackages } from "../../utils/auto-installer.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface DrizzleOrmConfig {
  projectPath: string;
  provider?: "postgresql" | "mysql" | "sqlite";
  includeExamples?: boolean;
}

export async function setupDrizzleOrm(config: DrizzleOrmConfig): Promise<string> {
  const {
    projectPath,
    provider = "postgresql",
    includeExamples = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check if Drizzle is already set up
  if (projectState.hasDrizzle) {
    throw new Error("Drizzle ORM is already set up in this project. Database configuration already exists.");
  }

  console.error(`[DEBUG] Starting Drizzle ORM setup with ${provider} at: ${fullPath}`);
  
  try {
    // Step 1: Install Drizzle dependencies
    const step1 = `Installing Drizzle ORM dependencies for ${provider}...`;
    steps.push(step1);
    console.error(`[STEP 1/6] ${step1}`);
    
    // Install core Drizzle packages
    const corePackages = ["drizzle-orm"];
    let driverPackages: string[] = [];
    let devPackages = ["drizzle-kit"];

    // Add provider-specific packages
    switch (provider) {
      case "postgresql":
        driverPackages = ["@neondatabase/serverless", "ws"];
        devPackages.push("@types/pg");
        break;
      case "mysql":
        driverPackages = ["mysql2"];
        break;
      case "sqlite":
        driverPackages = ["better-sqlite3"];
        devPackages.push("@types/better-sqlite3");
        break;
    }

    // Install dependencies
    await runCommand(`pnpm add ${[...corePackages, ...driverPackages].join(' ')}`, fullPath);
    await runCommand(`pnpm add -D ${devPackages.join(' ')}`, fullPath);
    
    console.error(`[STEP 1/6] ✅ Completed: ${step1}`);

    // Step 2: Create Drizzle configuration
    const step2 = "Creating Drizzle configuration file...";
    steps.push(step2);
    console.error(`[STEP 2/6] ${step2}`);
    await createDrizzleConfig(fullPath);
    console.error(`[STEP 2/6] ✅ Completed: ${step2}`);

    // Step 3: Create database connection setup
    const step3 = "Setting up database connection...";
    steps.push(step3);
    console.error(`[STEP 3/6] ${step3}`);
    
    const libDbDir = path.join(fullPath, "lib", "db");
    await fs.ensureDir(libDbDir);
    
    // Create database connection file
    const dbConnectionTemplate = createDbConnectionTemplate(provider);
    await fs.writeFile(path.join(libDbDir, "index.ts"), dbConnectionTemplate);
    
    console.error(`[STEP 3/6] ✅ Completed: ${step3}`);

    // Step 4: Create example schema (if enabled)
    const step4 = includeExamples 
      ? "Creating example database schema..."
      : "Creating basic schema structure...";
    steps.push(step4);
    console.error(`[STEP 4/6] ${step4}`);
    
    const modelsDir = path.join(fullPath, "models");
    await fs.ensureDir(modelsDir);
    
    if (includeExamples) {
      // Create example user schema
      const userSchemaTemplate = createUserSchemaTemplate(provider);
      await fs.writeFile(path.join(modelsDir, "user.ts"), userSchemaTemplate);
      
      // Create schema index file
      const schemaIndexTemplate = `export * from './user.js';\n`;
      await fs.writeFile(path.join(modelsDir, "index.ts"), schemaIndexTemplate);
    } else {
      // Create basic schema structure
      const basicSchemaTemplate = createBasicSchemaTemplate(provider);
      await fs.writeFile(path.join(modelsDir, "schema.ts"), basicSchemaTemplate);
    }
    
    console.error(`[STEP 4/6] ✅ Completed: ${step4}`);

    // Step 5: Create migration directory and utilities
    const step5 = "Setting up migration system...";
    steps.push(step5);
    console.error(`[STEP 5/6] ${step5}`);
    
    const migrationsDir = path.join(libDbDir, "migrations");
    await fs.ensureDir(migrationsDir);
    await fs.writeFile(path.join(migrationsDir, ".gitkeep"), "");
    
    // Create migration utilities
    const migrationUtilsTemplate = createMigrationUtilsTemplate(provider);
    await fs.writeFile(path.join(libDbDir, "migrate.ts"), migrationUtilsTemplate);
    
    console.error(`[STEP 5/6] ✅ Completed: ${step5}`);

    // Step 6: Update package.json scripts
    const step6 = "Adding database scripts to package.json...";
    steps.push(step6);
    console.error(`[STEP 6/6] ${step6}`);
    
    const packageJsonPath = path.join(fullPath, "package.json");
    const packageJson = await fs.readJSON(packageJsonPath);
    
    // Add database scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "db:generate": "drizzle-kit generate",
      "db:migrate": "tsx lib/db/migrate.ts",
      "db:studio": "drizzle-kit studio",
      "db:push": "drizzle-kit push"
    };
    
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    console.error(`[STEP 6/6] ✅ Completed: ${step6}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Drizzle ORM setup completed in ${totalTime}s`);

    return `🎉 Drizzle ORM setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🗄️ **Database Configuration:**\n- **Provider**: ${provider.charAt(0).toUpperCase() + provider.slice(1)}\n- **ORM**: Drizzle ORM with TypeScript support\n- **Migration System**: Built-in migration management\n- **Studio**: Drizzle Studio for database exploration${includeExamples ? '\n- **Example Schema**: User model with common fields' : '\n- **Basic Structure**: Ready for custom schemas'}\n\n📋 **Available Scripts:**\n- \`pnpm db:generate\` - Generate migration files\n- \`pnpm db:migrate\` - Run pending migrations\n- \`pnpm db:studio\` - Open Drizzle Studio\n- \`pnpm db:push\` - Push schema changes directly\n\n📁 **Files Created:**\n- \`drizzle.config.ts\` - Drizzle configuration\n- \`lib/db/index.ts\` - Database connection setup\n- \`lib/db/migrate.ts\` - Migration utilities\n- \`lib/db/migrations/\` - Migration files directory${includeExamples ? '\n- `models/user.ts` - Example user schema\n- `models/index.ts` - Schema exports' : '\n- `models/schema.ts` - Basic schema template'}\n\n⚙️ **Database Connection:**\n\`\`\`typescript\nimport { db } from './lib/db';\n\n// Query examples\nconst users = await db.select().from(userTable);\nconst user = await db.select().from(userTable).where(eq(userTable.id, 1));\n\`\`\`\n\n💡 **Next steps:**\n1. **Set up environment variables** with \`setup_environment_vars\`\n2. **Configure your ${provider} database** connection string\n3. **Generate your first migration**: \`pnpm db:generate\`\n4. **Run migrations**: \`pnpm db:migrate\`\n5. **Explore your database**: \`pnpm db:studio\`\n\n🔗 **Integration:**\n- Ready for authentication setup with \`setup_authentication_jwt\`\n- Compatible with team management via \`setup_team_management\`\n- Works with all other MCP tools\n\n📚 **Documentation:** Check the generated files for TypeScript examples and patterns.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have pnpm installed\n- Check that the project directory is writable\n- Verify Next.js project exists (run create_nextjs_base first)\n- For ${provider}, ensure you have the correct database setup`);
  }
}

function createDbConnectionTemplate(provider: string): string {
  switch (provider) {
    case "postgresql":
      return `/**
 * @fileoverview Database Connection Setup
 * @description Drizzle ORM connection for PostgreSQL using Neon
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../models/index.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
export { schema };
`;

    case "mysql":
      return `/**
 * @fileoverview Database Connection Setup
 * @description Drizzle ORM connection for MySQL
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../models/index.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const connection = mysql.createConnection({
  uri: process.env.DATABASE_URL,
});

export const db = drizzle(connection, { schema });

export type Database = typeof db;
export { schema };
`;

    case "sqlite":
      return `/**
 * @fileoverview Database Connection Setup
 * @description Drizzle ORM connection for SQLite
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../models/index.js';

const sqlite = new Database(process.env.DATABASE_URL || 'sqlite.db');
export const db = drizzle(sqlite, { schema });

export type Database = typeof db;
export { schema };
`;

    default:
      throw new Error(`Unsupported database provider: ${provider}`);
  }
}

function createUserSchemaTemplate(provider: string): string {
  const timestampType = provider === "postgresql" ? "timestamp" : "integer";
  const primaryKeyType = provider === "sqlite" ? "integer" : "serial";
  
  return `/**
 * @fileoverview User Database Schema
 * @description User table definition with common fields
 */

import { ${provider === "postgresql" ? "pgTable, serial, varchar, text, timestamp, boolean" : provider === "mysql" ? "mysqlTable, serial, varchar, text, timestamp, boolean" : "sqliteTable, integer, text"} } from 'drizzle-orm/${provider === "postgresql" ? "pg-core" : provider === "mysql" ? "mysql-core" : "sqlite-core"}';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const userTable = ${provider === "postgresql" ? "pgTable" : provider === "mysql" ? "mysqlTable" : "sqliteTable"}('users', {
  id: ${primaryKeyType === "integer" ? "integer('id').primaryKey({ autoIncrement: true })" : "serial('id').primaryKey()"},
  email: ${provider === "sqlite" ? "text('email').notNull().unique()" : "varchar('email', { length: 255 }).notNull().unique()"},
  name: ${provider === "sqlite" ? "text('name')" : "varchar('name', { length: 255 })"},
  ${provider === "sqlite" ? 
    `createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),` :
    `createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),`}
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(userTable);
export const selectUserSchema = createSelectSchema(userTable);

export type User = typeof userTable.$inferSelect;
export type NewUser = typeof userTable.$inferInsert;
`;
}

function createBasicSchemaTemplate(provider: string): string {
  return `/**
 * @fileoverview Database Schema
 * @description Main database schema file
 */

import { ${provider === "postgresql" ? "pgTable" : provider === "mysql" ? "mysqlTable" : "sqliteTable"} } from 'drizzle-orm/${provider === "postgresql" ? "pg-core" : provider === "mysql" ? "mysql-core" : "sqlite-core"}';

// Add your tables here
// Example:
// export const exampleTable = ${provider === "postgresql" ? "pgTable" : provider === "mysql" ? "mysqlTable" : "sqliteTable"}('example', {
//   // Define your columns
// });
`;
}

function createMigrationUtilsTemplate(provider: string): string {
  return `/**
 * @fileoverview Migration Utilities
 * @description Run database migrations programmatically
 */

import { migrate } from 'drizzle-orm/${provider === "postgresql" ? "neon-http" : provider === "mysql" ? "mysql2" : "better-sqlite3"}/migrator';
import { db } from './index.js';

async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  runMigrations();
}
`;
}