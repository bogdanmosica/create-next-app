import fs from "fs-extra";
import path from "path";
export async function createBiomeConfig(projectPath) {
    const biomeConfig = {
        "$schema": "https://biomejs.dev/schemas/2.2.0/schema.json",
        "vcs": {
            "enabled": false,
            "clientKind": "git",
            "useIgnoreFile": false
        },
        "files": {
            "ignoreUnknown": false,
            "includes": [
                "app/**/*",
                "biome.json",
                "package.json",
                "tsconfig.json",
                "!node_modules",
                "!next",
                "!.next",
                "!out",
                "!build"
            ]
        },
        "formatter": {
            "enabled": true,
            "indentStyle": "space",
            "indentWidth": 2
        },
        "linter": {
            "enabled": true,
            "rules": {
                "recommended": true,
                "style": {
                    "recommended": true,
                    "useComponentExportOnlyModules": "off"
                },
                "a11y": "warn",
                "suspicious": {
                    "recommended": true,
                    "noReactSpecificProps": "off"
                },
                "complexity": {
                    "recommended": true,
                    "noExcessiveLinesPerFunction": {
                        "level": "warn",
                        "options": {
                            "maxLines": 120
                        }
                    }
                },
                "security": "warn",
                "performance": {
                    "recommended": true,
                    "noNamespaceImport": "off",
                    "useSolidForComponent": "off"
                }
            }
        },
        "javascript": {
            "formatter": {
                "quoteStyle": "double"
            }
        },
        "assist": {
            "enabled": true,
            "actions": {
                "source": {
                    "organizeImports": {
                        "level": "on",
                        "options": {
                            "groups": [
                                [":PACKAGE:", "react", "next", "next/**"],
                                ":BLANK_LINE:",
                                "@/actions",
                                ":BLANK_LINE:",
                                "@/components",
                                ":BLANK_LINE:",
                                "@/hooks",
                                ":BLANK_LINE:",
                                "@/lib",
                                ":BLANK_LINE:",
                                "@/types",
                                ":BLANK_LINE:",
                                ":PATH:"
                            ]
                        }
                    }
                }
            }
        }
    };
    await fs.writeJSON(path.join(projectPath, "biome.json"), biomeConfig, { spaces: 2 });
}
export async function createVSCodeSettings(projectPath) {
    const vscodeDir = path.join(projectPath, ".vscode");
    await fs.ensureDir(vscodeDir);
    const settings = {
        "editor.codeActionsOnSave": {
            "source.fixAll.biome": "explicit",
            "source.organizeImports.biome": "explicit"
        }
    };
    await fs.writeJSON(path.join(vscodeDir, "settings.json"), settings, { spaces: 2 });
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
    const schemaContent = `import { integer, pgSchema } from "drizzle-orm/pg-core";

export const customSchema = pgSchema('custom');

export const users = customSchema.table('users', {
  id: integer()
});`;
    await fs.writeFile(path.join(projectPath, "lib", "db", "schema.ts"), schemaContent);
}
export async function createDrizzleConfig(projectPath) {
    const content = `import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
} satisfies Config;`;
    await fs.writeFile(path.join(projectPath, "drizzle.config.ts"), content);
}
export async function createEnvironmentFiles(projectPath) {
    const envContent = `POSTGRES_URL=""

STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

BASE_URL=http://localhost:3000
AUTH_SECRET=4dc1b1d64debc9db673f360d3bd4c114e3b6b14fa36d93d5973d0a31b48c319f`;
    await fs.writeFile(path.join(projectPath, ".env.example"), envContent);
    await fs.writeFile(path.join(projectPath, ".env"), envContent);
}
//# sourceMappingURL=config-creators.js.map