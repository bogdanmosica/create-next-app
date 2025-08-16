import fs from "fs-extra";
import path from "path";
import { biomeConfigTemplate } from "../templates/biome-config.js";
import { vscodeSettingsTemplate } from "../templates/vscode-settings.js";
import { drizzleSchemaTemplate } from "../templates/drizzle-schema.js";
import { drizzleConfigTemplate } from "../templates/drizzle-config.js";
import { envTemplate } from "../templates/env-template.js";

export async function createBiomeConfig(projectPath: string): Promise<void> {
  await fs.writeJSON(path.join(projectPath, "biome.json"), biomeConfigTemplate, { spaces: 2 });
}

export async function createVSCodeSettings(projectPath: string): Promise<void> {
  const vscodeDir = path.join(projectPath, ".vscode");
  await fs.ensureDir(vscodeDir);

  await fs.writeJSON(path.join(vscodeDir, "settings.json"), vscodeSettingsTemplate, { spaces: 2 });
}

export async function updatePackageJsonScripts(projectPath: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, "package.json");
  const packageJson = await fs.readJSON(packageJsonPath);

  packageJson.scripts = {
    ...packageJson.scripts,
    "components:format:fix": "biome check --write components",
    "db:setup": "npx tsx lib/db/setup.ts",
    "db:seed": "npx tsx lib/db/seed.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  };

  await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
}

export async function createDrizzleSchema(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "lib", "db", "schema.ts"), drizzleSchemaTemplate);
}

export async function createDrizzleConfig(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, "drizzle.config.ts"), drizzleConfigTemplate);
}

export async function createEnvironmentFiles(projectPath: string): Promise<void> {
  await fs.writeFile(path.join(projectPath, ".env.example"), envTemplate);
  await fs.writeFile(path.join(projectPath, ".env"), envTemplate);
}