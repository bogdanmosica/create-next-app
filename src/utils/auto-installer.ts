/**
 * @fileoverview Auto Package Installer
 * @description Handles automatic package installation for tools
 * Provides utilities for installing dependencies via pnpm
 */

import { runCommand } from "../runners/command-runner.js";

export interface PackageGroup {
  dependencies?: string[];
  devDependencies?: string[];
  commands?: string[];
}

export const packageConfigs: Record<string, PackageGroup> = {
  nextjs_base: {
    // Handled by create-next-app command
    commands: [
      "npx create-next-app@latest . --typescript --tailwind --app --use-pnpm --no-eslint --yes"
    ]
  },
  
  biome_linting: {
    devDependencies: ["@biomejs/biome"],
    commands: ["pnpm exec biome init"]
  },
  
  shadcn_ui: {
    commands: [
      "npx shadcn@latest init --yes -b neutral",
      "npx shadcn@latest add --all"
    ]
  },
  
  drizzle_orm: {
    dependencies: ["drizzle-orm", "@neondatabase/serverless", "ws"],
    devDependencies: ["drizzle-kit"]
  },
  
  authentication_jwt: {
    dependencies: ["bcryptjs", "jose", "zod"],
    devDependencies: ["@types/bcryptjs"]
  },
  
  stripe_payments: {
    dependencies: ["stripe"]
  },
  
  database_postgres: {
    dependencies: ["pg", "dotenv"],
    devDependencies: ["@types/pg"]
  },
  
  form_handling: {
    dependencies: ["@t3-oss/env-nextjs", "react-hook-form", "@hookform/resolvers", "@tanstack/react-query"]
  },
  
  internationalization: {
    dependencies: ["next-intl"]
  },
  
  testing_suite: {
    devDependencies: [
      "vitest", "vite", "@vitejs/plugin-react", 
      "@testing-library/react", "@testing-library/jest-dom", 
      "@testing-library/user-event", "jsdom", 
      "@playwright/test", "msw"
    ]
  },
  
  git_workflow: {
    devDependencies: [
      "lefthook", "lint-staged", "@commitlint/cli", 
      "@commitlint/config-conventional", "commitizen", 
      "cz-conventional-changelog"
    ]
  }
};

export async function installPackages(
  projectPath: string,
  packageGroup: string,
  options: {
    skipExisting?: boolean;
    verbose?: boolean;
  } = {}
): Promise<{ success: boolean; errors: string[] }> {
  const config = packageConfigs[packageGroup];
  const errors: string[] = [];
  
  if (!config) {
    errors.push(`Unknown package group: ${packageGroup}`);
    return { success: false, errors };
  }

  try {
    // Install dependencies
    if (config.dependencies?.length) {
      const depsCmd = `pnpm add ${config.dependencies.join(' ')}`;
      if (options.verbose) console.error(`[INSTALL] ${depsCmd}`);
      await runCommand(depsCmd, projectPath);
    }

    // Install dev dependencies  
    if (config.devDependencies?.length) {
      const devDepsCmd = `pnpm add -D ${config.devDependencies.join(' ')}`;
      if (options.verbose) console.error(`[INSTALL] ${devDepsCmd}`);
      await runCommand(devDepsCmd, projectPath);
    }

    // Run additional commands
    if (config.commands?.length) {
      for (const command of config.commands) {
        if (options.verbose) console.error(`[COMMAND] ${command}`);
        await runCommand(command, projectPath);
      }
    }

    return { success: true, errors: [] };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to install ${packageGroup}: ${errorMsg}`);
    return { success: false, errors };
  }
}

export async function installMultiplePackageGroups(
  projectPath: string,
  packageGroups: string[],
  options: {
    skipExisting?: boolean;
    verbose?: boolean;
    stopOnError?: boolean;
  } = {}
): Promise<{ success: boolean; errors: string[]; installed: string[] }> {
  const allErrors: string[] = [];
  const installed: string[] = [];

  for (const group of packageGroups) {
    const result = await installPackages(projectPath, group, options);
    
    if (result.success) {
      installed.push(group);
      if (options.verbose) console.error(`[SUCCESS] Installed ${group}`);
    } else {
      allErrors.push(...result.errors);
      if (options.verbose) console.error(`[ERROR] Failed to install ${group}`);
      
      if (options.stopOnError) {
        break;
      }
    }
  }

  return {
    success: allErrors.length === 0,
    errors: allErrors,
    installed
  };
}

export function getPackageGroupsForTool(toolName: string): string[] {
  const toolPackageMap: Record<string, string[]> = {
    create_nextjs_base: ["nextjs_base", "shadcn_ui"],
    setup_biome_linting: ["biome_linting"],
    setup_drizzle_orm: ["drizzle_orm", "database_postgres"],
    setup_authentication_jwt: ["authentication_jwt"],
    setup_stripe_payments: ["stripe_payments"],
    setup_form_handling: ["form_handling"],
    setup_internationalization: ["internationalization"],
    setup_testing_suite: ["testing_suite"],
    setup_git_workflow: ["git_workflow"],
  };

  return toolPackageMap[toolName] || [];
}