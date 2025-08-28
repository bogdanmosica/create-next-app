/**
 * @fileoverview SaaS Library Structure Creator
 * @description Creates complete SaaS lib structure including auth, database, and payments
 * Generates all files needed for a production-ready SaaS application
 */

import fs from "fs-extra";
import path from "node:path";
import { middlewareTemplate } from "../templates/middleware-template.js";
import {
  authMiddlewareTemplate,
  authSessionTemplate,
  dbDrizzleTemplate,
  dbQueriesTemplate,
  dbSchemaTemplate,
  dbSeedTemplate,
  dbSetupTemplate,
  paymentsActionsTemplate,
  paymentsStripeTemplate
} from "../templates/saas-lib-templates.js";

export async function createSaaSMiddleware(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "middleware.ts"), middlewareTemplate);
}

export async function createSaaSLibStructure(projectPath: string): Promise<void> {
  const libPath = path.join(projectPath, "lib");
  
  // Create directory structure
  await fs.ensureDir(path.join(libPath, "auth"));
  await fs.ensureDir(path.join(libPath, "db", "migrations"));
  await fs.ensureDir(path.join(libPath, "payments"));

  // Create auth files
  await fs.writeFile(
    path.join(libPath, "auth", "middleware.ts"),
    authMiddlewareTemplate
  );
  await fs.writeFile(
    path.join(libPath, "auth", "session.ts"),
    authSessionTemplate
  );

  // Create db files
  await fs.writeFile(
    path.join(libPath, "db", "drizzle.ts"),
    dbDrizzleTemplate
  );
  await fs.writeFile(
    path.join(libPath, "db", "queries.ts"),
    dbQueriesTemplate
  );
  await fs.writeFile(
    path.join(libPath, "db", "schema.ts"),
    dbSchemaTemplate
  );
  await fs.writeFile(
    path.join(libPath, "db", "seed.ts"),
    dbSeedTemplate
  );
  await fs.writeFile(
    path.join(libPath, "db", "setup.ts"),
    dbSetupTemplate
  );

  // Create payments files
  await fs.writeFile(
    path.join(libPath, "payments", "actions.ts"),
    paymentsActionsTemplate
  );
  await fs.writeFile(
    path.join(libPath, "payments", "stripe.ts"),
    paymentsStripeTemplate
  );

  // Create migrations directory .gitkeep
  await fs.writeFile(
    path.join(libPath, "db", "migrations", ".gitkeep"),
    ""
  );
}

export async function updatePackageJsonForSaaS(projectPath: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = await fs.readJSON(packageJsonPath);

  // Add SaaS-specific dependencies
  packageJson.dependencies = {
    ...packageJson.dependencies,
    "stripe": "^17.4.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.6",
    "zod": "^3.24.1",
    "drizzle-orm": "^0.36.4",
    "postgres": "^3.4.5",
    "dotenv": "^16.4.7"
  };

  packageJson.devDependencies = {
    ...packageJson.devDependencies,
    "@types/bcryptjs": "^2.4.6",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.2"
  };

  // Add SaaS-specific scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    "db:setup": "npx tsx lib/db/setup.ts",
    "db:seed": "npx tsx lib/db/seed.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  };

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}
