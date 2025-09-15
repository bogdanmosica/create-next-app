/**
 * @fileoverview Core MCP Models
 * @description Core model definitions for project requests, generated applications, and error reports
 * Required for T014-T016 contract testing and validation
 */

import { z } from 'zod';

// T014: ProjectRequest model and validation
export const ProjectRequestSchema = z.object({
  projectPath: z.string().min(1, 'Project path is required'),
  projectName: z.string().optional(),
  preset: z.enum(['minimal', 'blog', 'dashboard', 'startup', 'enterprise', 'custom']).optional(),
  features: z.object({
    core: z.boolean().default(true),
    database: z.boolean().default(false),
    authentication: z.boolean().default(false),
    payments: z.boolean().default(false),
    teamManagement: z.boolean().default(false),
    devExperience: z.boolean().default(true),
    internationalization: z.boolean().default(false),
  }).optional(),
  options: z.object({
    packageManager: z.enum(['npm', 'yarn', 'pnpm']).default('pnpm'),
    typescript: z.boolean().default(true),
    tailwind: z.boolean().default(true),
    appRouter: z.boolean().default(true),
    srcDir: z.boolean().default(true),
  }).optional(),
});

export type ProjectRequest = z.infer<typeof ProjectRequestSchema>;

// T015: GeneratedApplication model and output logic
export const GeneratedApplicationSchema = z.object({
  success: z.boolean(),
  projectPath: z.string(),
  projectName: z.string(),
  preset: z.string().optional(),
  features: z.record(z.string(), z.boolean()),
  filesGenerated: z.array(z.object({
    path: z.string(),
    type: z.enum(['file', 'directory']),
    category: z.string(),
    size: z.number().optional(),
  })),
  dependencies: z.object({
    production: z.array(z.string()),
    development: z.array(z.string()),
  }),
  scripts: z.record(z.string(), z.string()),
  duration: z.number(),
  warnings: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
});

export type GeneratedApplication = z.infer<typeof GeneratedApplicationSchema>;

// T016: ErrorReport model and error handling
export const ErrorReportSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.string().optional(),
    stack: z.string().optional(),
  }),
  context: z.object({
    operation: z.string(),
    step: z.string().optional(),
    preset: z.string().optional(),
    features: z.record(z.string(), z.boolean()).optional(),
    projectPath: z.string().optional(),
    timestamp: z.date().default(() => new Date()),
  }),
  suggestions: z.object({
    message: z.string(),
    actions: z.array(z.string()),
    severity: z.enum(['error', 'warning', 'info']),
    recoverable: z.boolean(),
  }).optional(),
  systemInfo: z.object({
    nodeVersion: z.string().optional(),
    npmVersion: z.string().optional(),
    pnpmVersion: z.string().optional(),
    platform: z.string().optional(),
    gitVersion: z.string().optional(),
  }).optional(),
});

export type ErrorReport = z.infer<typeof ErrorReportSchema>;

// Combined response type
export const MCPResponseSchema = z.union([
  GeneratedApplicationSchema,
  ErrorReportSchema
]);

export type MCPResponse = z.infer<typeof MCPResponseSchema>;

// Validation functions
export function validateProjectRequest(data: unknown): {
  valid: boolean;
  data?: ProjectRequest;
  errors?: string[];
} {
  try {
    const result = ProjectRequestSchema.parse(data);
    return { valid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Invalid project request format']
    };
  }
}

export function validateGeneratedApplication(data: unknown): {
  valid: boolean;
  data?: GeneratedApplication;
  errors?: string[];
} {
  try {
    const result = GeneratedApplicationSchema.parse(data);
    return { valid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Invalid generated application format']
    };
  }
}

export function validateErrorReport(data: unknown): {
  valid: boolean;
  data?: ErrorReport;
  errors?: string[];
} {
  try {
    const result = ErrorReportSchema.parse(data);
    return { valid: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      valid: false,
      errors: ['Invalid error report format']
    };
  }
}

// Error report builder utility
export class ErrorReportBuilder {
  private report: Partial<ErrorReport> = {
    success: false,
    error: { code: '', message: '' },
    context: { operation: '', timestamp: new Date() }
  };

  withError(code: string, message: string, details?: string): this {
    this.report.error = { code, message, details };
    return this;
  }

  withContext(operation: string, step?: string, preset?: string): this {
    this.report.context = {
      ...this.report.context,
      operation,
      step,
      preset,
      timestamp: new Date()
    };
    return this;
  }

  withSuggestions(message: string, actions: string[], severity: 'error' | 'warning' | 'info' = 'error', recoverable = true): this {
    this.report.suggestions = { message, actions, severity, recoverable };
    return this;
  }

  withSystemInfo(info: Partial<ErrorReport['systemInfo']>): this {
    this.report.systemInfo = { ...this.report.systemInfo, ...info };
    return this;
  }

  build(): ErrorReport {
    const result = ErrorReportSchema.parse(this.report);
    return result;
  }
}

// Generated application builder utility
export class GeneratedApplicationBuilder {
  private app: Partial<GeneratedApplication> = {
    success: true,
    filesGenerated: [],
    features: {},
    dependencies: { production: [], development: [] },
    scripts: {},
    duration: 0
  };

  withProject(path: string, name: string, preset?: string): this {
    this.app.projectPath = path;
    this.app.projectName = name;
    this.app.preset = preset;
    return this;
  }

  withFeatures(features: Record<string, boolean>): this {
    this.app.features = features;
    return this;
  }

  addFile(path: string, category: string, size?: number): this {
    this.app.filesGenerated!.push({
      path,
      type: 'file',
      category,
      size
    });
    return this;
  }

  addDirectory(path: string, category: string): this {
    this.app.filesGenerated!.push({
      path,
      type: 'directory',
      category
    });
    return this;
  }

  withDependencies(production: string[], development: string[]): this {
    this.app.dependencies = { production, development };
    return this;
  }

  withScripts(scripts: Record<string, string>): this {
    this.app.scripts = scripts;
    return this;
  }

  withDuration(duration: number): this {
    this.app.duration = duration;
    return this;
  }

  withWarnings(warnings: string[]): this {
    this.app.warnings = warnings;
    return this;
  }

  withNextSteps(steps: string[]): this {
    this.app.nextSteps = steps;
    return this;
  }

  build(): GeneratedApplication {
    const result = GeneratedApplicationSchema.parse(this.app);
    return result;
  }
}
