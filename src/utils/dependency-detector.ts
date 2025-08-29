/**
 * @fileoverview Dependency Detection Utilities
 * @description Detects existing tools and configurations in Next.js projects
 * Used to determine what tools are already installed and suggest missing dependencies
 */

import fs from "fs-extra";
import path from "node:path";

export interface ProjectState {
  hasNextJs: boolean;
  hasShadcn: boolean;
  hasBiome: boolean;
  hasVSCodeConfig: boolean;
  hasDrizzle: boolean;
  hasDatabase: boolean;
  hasEnvironmentVars: boolean;
  hasAuthentication: boolean;
  hasProtectedRoutes: boolean;
  hasStripe: boolean;
  hasStripePayments: boolean;
  hasStripeWebhooks: boolean;
  hasTeamManagement: boolean;
  hasFormHandling: boolean;
  hasValidation: boolean;
  hasReactQuery: boolean;
  hasTesting: boolean;
  hasGitWorkflow: boolean;
  hasInternationalization: boolean;
}

export async function detectProjectState(projectPath: string): Promise<ProjectState> {
  const packageJsonPath = path.join(projectPath, "package.json");
  let packageJson: any = {};
  
  try {
    packageJson = await fs.readJSON(packageJsonPath);
  } catch {
    // Package.json doesn't exist
  }

  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

  return {
    hasNextJs: dependencies?.["next"] !== undefined,
    hasShadcn: await fs.pathExists(path.join(projectPath, "components.json")),
    hasBiome: dependencies?.["@biomejs/biome"] !== undefined,
    hasVSCodeConfig: await fs.pathExists(path.join(projectPath, ".vscode", "settings.json")),
    hasDrizzle: dependencies?.["drizzle-orm"] !== undefined,
    hasDatabase: dependencies?.["drizzle-orm"] !== undefined,
    hasEnvironmentVars: await fs.pathExists(path.join(projectPath, ".env.example")),
    hasAuthentication: dependencies?.["jose"] !== undefined && dependencies?.["bcryptjs"] !== undefined,
    hasProtectedRoutes: await fs.pathExists(path.join(projectPath, "middleware.ts")),
    hasStripe: dependencies?.["stripe"] !== undefined,
    hasStripePayments: dependencies?.["stripe"] !== undefined,
    hasStripeWebhooks: await fs.pathExists(path.join(projectPath, "lib", "payments", "stripe.ts")),
    hasTeamManagement: await fs.pathExists(path.join(projectPath, "models", "team.ts")),
    hasFormHandling: dependencies?.["react-hook-form"] !== undefined,
    hasValidation: dependencies?.["zod"] !== undefined,
    hasReactQuery: dependencies?.["@tanstack/react-query"] !== undefined,
    hasTesting: dependencies?.["vitest"] !== undefined && dependencies?.["@playwright/test"] !== undefined,
    hasGitWorkflow: dependencies?.["lefthook"] !== undefined,
    hasInternationalization: dependencies?.["next-intl"] !== undefined,
  };
}

export function getMissingDependencies(state: ProjectState, requiredFeatures: string[]): string[] {
  const missing: string[] = [];
  
  const featureMap: Record<string, boolean> = {
    nextjs: state.hasNextJs,
    shadcn: state.hasShadcn,
    biome: state.hasBiome,
    vscode: state.hasVSCodeConfig,
    drizzle: state.hasDrizzle,
    environment: state.hasEnvironmentVars,
    authentication: state.hasAuthentication,
    routes: state.hasProtectedRoutes,
    stripe: state.hasStripe,
    webhooks: state.hasStripeWebhooks,
    teams: state.hasTeamManagement,
    forms: state.hasFormHandling,
    testing: state.hasTesting,
    git: state.hasGitWorkflow,
    i18n: state.hasInternationalization,
  };

  for (const feature of requiredFeatures) {
    if (!featureMap[feature]) {
      missing.push(feature);
    }
  }

  return missing;
}

export function getToolSuggestions(missingFeatures: string[]): string[] {
  const toolMap: Record<string, string> = {
    nextjs: "create_nextjs_base",
    shadcn: "create_nextjs_base",
    biome: "setup_biome_linting", 
    vscode: "setup_vscode_config",
    drizzle: "setup_drizzle_orm",
    environment: "setup_environment_vars",
    authentication: "setup_authentication_jwt",
    routes: "setup_protected_routes",
    stripe: "setup_stripe_payments",
    webhooks: "setup_stripe_webhooks",
    teams: "setup_team_management",
    forms: "setup_form_handling",
    testing: "setup_testing_suite",
    git: "setup_git_workflow",
    i18n: "setup_internationalization",
  };

  return missingFeatures.map(feature => toolMap[feature]).filter(Boolean);
}