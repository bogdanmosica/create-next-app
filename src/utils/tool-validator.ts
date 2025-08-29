/**
 * @fileoverview Tool Input Validation
 * @description Validates tool inputs and provides helpful error messages
 * Ensures tool parameters are valid before execution
 */

import fs from "fs-extra";
import path from "node:path";
import { z } from "zod";

// Base schema for all tools
const baseToolSchema = z.object({
  projectPath: z.string().min(1, "Project path is required"),
  projectName: z.string().optional(),
});

// Individual tool schemas
export const toolSchemas = {
  create_nextjs_base: baseToolSchema.extend({
    includeShadcn: z.boolean().optional(),
    includeAllComponents: z.boolean().optional(),
  }),
  
  setup_biome_linting: baseToolSchema.extend({
    includeCustomRules: z.boolean().optional(),
    strictMode: z.boolean().optional(),
  }),
  
  setup_vscode_config: baseToolSchema.extend({
    optimizeForBiome: z.boolean().optional(),
  }),
  
  setup_drizzle_orm: baseToolSchema.extend({
    provider: z.enum(["postgresql", "mysql", "sqlite"]).optional(),
    includeExamples: z.boolean().optional(),
  }),
  
  setup_environment_vars: baseToolSchema.extend({
    includeT3Validation: z.boolean().optional(),
    includeExampleFile: z.boolean().optional(),
  }),
  
  setup_authentication_jwt: baseToolSchema.extend({
    includePasswordHashing: z.boolean().optional(),
    includeUserManagement: z.boolean().optional(),
    requireDatabase: z.boolean().optional(),
  }),
  
  setup_protected_routes: baseToolSchema.extend({
    protectionLevel: z.enum(["basic", "advanced"]).optional(),
    requireAuth: z.boolean().optional(),
  }),
  
  setup_stripe_payments: baseToolSchema.extend({
    includeSubscriptions: z.boolean().optional(),
    includeOneTime: z.boolean().optional(),
    requireAuth: z.boolean().optional(),
  }),
  
  setup_stripe_webhooks: baseToolSchema.extend({
    includeCustomerPortal: z.boolean().optional(),
    requireStripe: z.boolean().optional(),
  }),
  
  setup_team_management: baseToolSchema.extend({
    includeRoles: z.boolean().optional(),
    includeActivityLogs: z.boolean().optional(),
    requireAuth: z.boolean().optional(),
    requireDatabase: z.boolean().optional(),
  }),
  
  setup_form_handling: baseToolSchema.extend({
    includeZodValidation: z.boolean().optional(),
    includeReactQuery: z.boolean().optional(),
  }),
  
  setup_testing_suite: baseToolSchema.extend({
    includeUnitTests: z.boolean().optional(),
    includeE2ETests: z.boolean().optional(),
    includeMocking: z.boolean().optional(),
  }),
  
  setup_git_workflow: baseToolSchema.extend({
    includeHooks: z.boolean().optional(),
    includeCommitStandards: z.boolean().optional(),
    includeLintStaged: z.boolean().optional(),
  }),
  
  setup_internationalization: baseToolSchema.extend({
    languages: z.array(z.string()).optional(),
    includeRouting: z.boolean().optional(),
    includeAuthForms: z.boolean().optional(),
  }),

  // Main orchestrator tool
  create_nextjs_app: baseToolSchema.extend({
    features: z.object({
      core: z.boolean().optional(),
      database: z.boolean().optional(),
      authentication: z.boolean().optional(),
      payments: z.boolean().optional(),
      teamManagement: z.boolean().optional(),
      devExperience: z.boolean().optional(),
      internationalization: z.boolean().optional(),
    }).optional(),
  }),
};

export type ToolName = keyof typeof toolSchemas;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateToolInput(
  toolName: ToolName,
  input: any
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Schema validation
  const schema = toolSchemas[toolName];
  const parseResult = schema.safeParse(input);
  
  if (!parseResult.success) {
    result.valid = false;
    result.errors.push(...parseResult.error.issues.map((issue: any) => issue.message));
    return result;
  }

  // Path validation
  const { projectPath } = parseResult.data;
  const fullPath = path.resolve(projectPath);

  try {
    // Check if path exists and is writable
    await fs.ensureDir(fullPath);
    await fs.access(fullPath, fs.constants.W_OK);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Cannot access or write to project path: ${fullPath}`);
    return result;
  }

  // Check if directory is empty for base tool
  if (toolName === 'create_nextjs_base') {
    try {
      const files = await fs.readdir(fullPath);
      const nonHiddenFiles = files.filter(file => !file.startsWith('.'));
      if (nonHiddenFiles.length > 0) {
        result.warnings.push(`Directory ${fullPath} is not empty. Existing files may be overwritten.`);
      }
    } catch {
      // Directory doesn't exist yet, which is fine
    }
  }

  return result;
}

export function getDefaultConfig(toolName: ToolName): Record<string, any> {
  const defaults: Record<ToolName, Record<string, any>> = {
    create_nextjs_base: {
      includeShadcn: true,
      includeAllComponents: true,
    },
    setup_biome_linting: {
      includeCustomRules: true,
      strictMode: true,
    },
    setup_vscode_config: {
      optimizeForBiome: true,
    },
    setup_drizzle_orm: {
      provider: "postgresql",
      includeExamples: true,
    },
    setup_environment_vars: {
      includeT3Validation: true,
      includeExampleFile: true,
    },
    setup_authentication_jwt: {
      includePasswordHashing: true,
      includeUserManagement: true,
      requireDatabase: true,
    },
    setup_protected_routes: {
      protectionLevel: "advanced",
      requireAuth: true,
    },
    setup_stripe_payments: {
      includeSubscriptions: true,
      includeOneTime: true,
      requireAuth: true,
    },
    setup_stripe_webhooks: {
      includeCustomerPortal: true,
      requireStripe: true,
    },
    setup_team_management: {
      includeRoles: true,
      includeActivityLogs: true,
      requireAuth: true,
      requireDatabase: true,
    },
    setup_form_handling: {
      includeZodValidation: true,
      includeReactQuery: true,
    },
    setup_testing_suite: {
      includeUnitTests: true,
      includeE2ETests: true,
      includeMocking: true,
    },
    setup_git_workflow: {
      includeHooks: true,
      includeCommitStandards: true,
      includeLintStaged: true,
    },
    setup_internationalization: {
      languages: ["en", "es", "fr", "de", "ja", "zh"],
      includeRouting: true,
      includeAuthForms: true,
    },
    create_nextjs_app: {
      features: {
        core: true,
        database: true,
        authentication: true,
        payments: true,
        teamManagement: true,
        devExperience: true,
        internationalization: true,
      },
    },
  };

  return defaults[toolName] || {};
}