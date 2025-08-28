import fs from "fs-extra";
import path from "node:path";
import { biomeConfigTemplate } from "../templates/biome-config.js";
import { vscodeSettingsTemplate } from "../templates/vscode-settings.js";
import { drizzleSchemaTemplate } from "../templates/drizzle-schema.js";
import { drizzleConfigTemplate } from "../templates/drizzle-config.js";
import { envTemplate } from "../templates/env-template.js";
import { biomeCustomRulesTemplate, biomeCustomRulesReadmeTemplate } from "../templates/biome-custom-rules.js";
export async function createBiomeConfig(projectPath) {
    console.error(`[DEBUG] Creating Biome config at ${projectPath}`);
    await fs.writeJSON(path.join(projectPath, "biome.json"), biomeConfigTemplate, { spaces: 2 });
    console.error(`[DEBUG] Biome config written successfully`);
    // Create custom rules directory and files for future Biome plugin support
    console.error(`[DEBUG] Creating Biome custom rules`);
    await createBiomeCustomRules(projectPath);
    console.error(`[DEBUG] Biome custom rules created successfully`);
}
export async function createBiomeCustomRules(projectPath) {
    const rulesDir = path.join(projectPath, ".biome", "rules");
    await fs.ensureDir(rulesDir);
    // Create the custom rules file
    await fs.writeFile(path.join(rulesDir, "custom-rules.grit"), biomeCustomRulesTemplate);
    // Create documentation
    await fs.writeFile(path.join(rulesDir, "README.md"), biomeCustomRulesReadmeTemplate);
}
export async function createVSCodeSettings(projectPath) {
    const vscodeDir = path.join(projectPath, ".vscode");
    await fs.ensureDir(vscodeDir);
    await fs.writeJSON(path.join(vscodeDir, "settings.json"), vscodeSettingsTemplate, { spaces: 2 });
}
export async function updatePackageJsonScripts(projectPath) {
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
export async function createDrizzleSchema(projectPath) {
    await fs.writeFile(path.join(projectPath, "lib", "db", "schema.ts"), drizzleSchemaTemplate);
}
export async function createDrizzleConfig(projectPath) {
    await fs.writeFile(path.join(projectPath, "drizzle.config.ts"), drizzleConfigTemplate);
}
export async function createEnvironmentFiles(projectPath) {
    await fs.writeFile(path.join(projectPath, ".env.example"), envTemplate);
    await fs.writeFile(path.join(projectPath, ".env"), envTemplate);
}
//# sourceMappingURL=config-creators.js.map