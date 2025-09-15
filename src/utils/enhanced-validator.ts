/**
 * @fileoverview Enhanced Tool Input Validation
 * @description Advanced validation system with detailed error messages, context-aware suggestions, and comprehensive checks
 * Replaces the basic tool-validator.ts with more user-friendly validation
 */

import fs from "fs-extra";
import path from "node:path";
import { z } from "zod";
import { ConfigManager } from "./config-manager.js";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  context?: ValidationContext;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  suggestion: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  suggestion: string;
  ignorable: boolean;
}

export interface ValidationContext {
  toolName: string;
  projectPath?: string;
  detectedFeatures?: string[];
  systemInfo?: SystemInfo;
}

export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  availableCommands: string[];
  diskSpace: number;
  pathLength: number;
}

// Enhanced Zod schemas with better error messages
const createPathSchema = (context: string) => z.string()
  .min(1, `${context} path cannot be empty`)
  .max(240, `${context} path too long (max 240 characters to avoid system limits)`)
  .refine(
    (path) => {
      // Remove Windows drive letter before checking invalid chars
      const pathWithoutDrive = path.replace(/^[A-Za-z]:/, '');
      return !pathWithoutDrive.includes('<') && !pathWithoutDrive.includes('>') && !pathWithoutDrive.includes('|');
    },
    {
      message: "Path contains invalid characters (<, >, |). Use standard filesystem characters only."
    }
  )
  .refine(
    (path) => {
      // Remove Windows drive letter before checking wildcards
      const pathWithoutDrive = path.replace(/^[A-Za-z]:/, '');
      return !/[*?"]/g.test(pathWithoutDrive);
    },
    {
      message: "Path contains wildcard characters (*, ?, \"). Use specific directory names."
    }
  );

const createLanguageArraySchema = () => z.array(z.string())
  .min(1, "At least one language is required for internationalization")
  .max(20, "Too many languages specified (max 20 for performance)")
  .refine(
    (languages) => {
      const config = ConfigManager.getI18nConfig();
      const supported = Object.keys(config.supportedLanguages);
      const invalid = languages.filter(lang => !supported.includes(lang));
      return invalid.length === 0;
    },
    {
      message: "Some language codes are not supported. Check the configuration for valid language codes."
    }
  );

// Tool-specific enhanced schemas
export const enhancedToolSchemas = {
  create_nextjs_app: z.object({
    projectPath: createPathSchema("Project"),
    projectName: z.string()
      .optional()
      .refine(
        (name) => !name || /^[a-z0-9-_]+$/i.test(name),
        {
          message: "Project name should contain only letters, numbers, hyphens, and underscores"
        }
      ),
    preset: z.string()
      .optional()
      .refine(
        (preset) => {
          if (!preset) return true;
          // Skip validation for now - preset validation handled elsewhere
          const validPresets = ['minimal', 'blog', 'dashboard', 'startup', 'enterprise', 'custom'];
          return validPresets.includes(preset);
        },
        {
          message: "Unknown preset specified. Use 'setup_nextjs_project_wizard' to see available presets."
        }
      ),
    features: z.object({
      core: z.boolean().optional(),
      database: z.boolean().optional(),
      authentication: z.boolean().optional(),
      payments: z.boolean().optional(),
      teamManagement: z.boolean().optional(),
      devExperience: z.boolean().optional(),
      internationalization: z.boolean().optional(),
    }).optional().refine(
      (features) => {
        if (!features) return true;
        
        // Check feature dependencies
        const errors = [];
        if (features.teamManagement && (!features.authentication || !features.database)) {
          errors.push("Team management requires both authentication and database features");
        }
        if (features.payments && !features.authentication) {
          errors.push("Payments feature requires authentication feature");
        }
        
        return errors.length === 0;
      },
      {
        message: "Feature dependencies not satisfied. Check that required features are enabled."
      }
    )
  }),

  setup_drizzle_orm: z.object({
    projectPath: createPathSchema("Project"),
    provider: z.enum(["postgresql", "mysql", "sqlite"])
      .optional()
      .refine(
        (provider) => {
          if (!provider) return true;
          return ConfigManager.validateDatabaseProvider(provider);
        },
        {
          message: "Database provider not supported in current configuration"
        }
      ),
    includeExamples: z.boolean().optional()
  }),

  setup_internationalization: z.object({
    projectPath: createPathSchema("Project"),
    languages: createLanguageArraySchema().optional(),
    includeRouting: z.boolean().optional(),
    includeAuthForms: z.boolean().optional()
  }),

  setup_biome_linting: z.object({
    projectPath: createPathSchema("Project"),
    includeCustomRules: z.boolean().optional(),
    strictMode: z.boolean().optional()
  }).refine(
    (data) => {
      const lintConfig = ConfigManager.getLintingConfig();
      if (lintConfig.defaultTool !== 'biome') {
        return false; // Will trigger error message
      }
      return true;
    },
    {
      message: "Biome is not the configured default linting tool. Update configuration or use the configured linter."
    }
  ),

  // Add schemas for other tools...
  setup_nextjs_project_wizard: z.object({
    projectPath: createPathSchema("Project")
  }),

  create_nextjs_base: z.object({
    projectPath: createPathSchema("Project"),
    projectName: z.string().optional(),
    includeShadcn: z.boolean().optional(),
    includeAllComponents: z.boolean().optional()
  })
};

export type EnhancedToolName = keyof typeof enhancedToolSchemas;

export class EnhancedValidator {
  private static async getSystemInfo(projectPath?: string): Promise<SystemInfo> {
    const nodeVersion = process.version;
    const platform = process.platform;
    const pathLength = projectPath ? path.resolve(projectPath).length : 0;
    
    // Check available commands
    const commands = ['node', 'npm', 'pnpm', 'git'];
    const availableCommands: string[] = [];
    
    for (const cmd of commands) {
      try {
        const { execSync } = await import('node:child_process');
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        availableCommands.push(cmd);
      } catch {
        // Command not available
      }
    }

    return {
      nodeVersion,
      platform,
      availableCommands,
      diskSpace: 0, // Could implement actual disk space check
      pathLength
    };
  }

  /**
   * Enhanced validation with detailed error reporting
   */
  static async validateToolInput(
    toolName: EnhancedToolName,
    input: any
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      context: {
        toolName,
        projectPath: input?.projectPath
      }
    };

    // Get system info
    result.context!.systemInfo = await this.getSystemInfo(input?.projectPath);

    // Schema validation with enhanced error messages
    const schema = enhancedToolSchemas[toolName];
    if (!schema) {
      result.valid = false;
      result.errors.push({
        field: 'toolName',
        message: `Unknown tool: ${toolName}`,
        code: 'UNKNOWN_TOOL',
        suggestion: 'Check available tools using the tool registry or setup wizard',
        severity: 'critical'
      });
      return result;
    }

    const parseResult = schema.safeParse(input);
    
    if (!parseResult.success) {
      result.valid = false;
      
      for (const issue of parseResult.error.issues) {
        const fieldPath = issue.path.join('.');
        
        result.errors.push({
          field: fieldPath || 'input',
          message: issue.message,
          code: issue.code.toUpperCase(),
          suggestion: this.generateSuggestionForError(issue.code, fieldPath, issue.message, input),
          severity: this.getSeverityForError(issue.code, fieldPath)
        });
      }
    }

    // Additional contextual validation
    if (result.valid && parseResult.success) {
      await this.performContextualValidation(parseResult.data, result);
    }

    // Add general suggestions
    this.addGeneralSuggestions(result, input);

    return result;
  }

  /**
   * Perform additional contextual validation beyond schema
   */
  private static async performContextualValidation(
    data: any,
    result: ValidationResult
  ): Promise<void> {
    const { projectPath } = data;
    
    if (!projectPath) return;

    const fullPath = path.resolve(projectPath);
    result.context!.projectPath = fullPath;

    // Path accessibility check
    try {
      await fs.ensureDir(fullPath);
      await fs.access(fullPath, fs.constants.W_OK);
    } catch (error) {
      result.valid = false;
      result.errors.push({
        field: 'projectPath',
        message: `Cannot access or create directory at: ${fullPath}`,
        code: 'PATH_ACCESS_ERROR',
        suggestion: 'Check directory permissions, parent directory exists, and you have write access',
        severity: 'critical'
      });
      return;
    }

    // Windows path length check
    if (process.platform === 'win32' && fullPath.length > 200) {
      result.warnings.push({
        field: 'projectPath',
        message: 'Path may be too long for Windows (>200 characters)',
        code: 'LONG_PATH_WARNING',
        suggestion: 'Use a shorter path or enable Windows long path support',
        ignorable: true
      });
    }

    // Check for existing files
    try {
      const files = await fs.readdir(fullPath);
      const nonHiddenFiles = files.filter(file => !file.startsWith('.') && !file.endsWith('.json'));
      
      if (nonHiddenFiles.length > 0) {
        result.warnings.push({
          field: 'projectPath',
          message: `Directory contains ${nonHiddenFiles.length} existing files`,
          code: 'NON_EMPTY_DIRECTORY',
          suggestion: 'Files may be overwritten. Consider using an empty directory or backing up existing files',
          ignorable: true
        });
      }
    } catch {
      // Directory doesn't exist, which is fine
    }

    // Detect existing project features
    await this.detectExistingFeatures(fullPath, result);
  }

  /**
   * Detect existing project features
   */
  private static async detectExistingFeatures(
    projectPath: string,
    result: ValidationResult
  ): Promise<void> {
    const features = [];
    
    // Check for Next.js
    if (await fs.pathExists(path.join(projectPath, 'next.config.js')) ||
        await fs.pathExists(path.join(projectPath, 'next.config.ts'))) {
      features.push('nextjs');
    }

    // Check for database
    if (await fs.pathExists(path.join(projectPath, 'drizzle.config.ts'))) {
      features.push('database');
    }

    // Check for auth
    if (await fs.pathExists(path.join(projectPath, 'libs/auth'))) {
      features.push('authentication');
    }

    if (features.length > 0) {
      result.context!.detectedFeatures = features;
      result.warnings.push({
        field: 'projectPath',
        message: `Detected existing features: ${features.join(', ')}`,
        code: 'EXISTING_FEATURES',
        suggestion: 'Some setup steps may be skipped or may conflict with existing features',
        ignorable: true
      });
    }
  }

  /**
   * Generate contextual suggestions for errors
   */
  private static generateSuggestionForError(
    code: string,
    field: string,
    message: string,
    input: any
  ): string {
    switch (code) {
      case 'too_small':
        if (field === 'projectPath') {
          return 'Provide a valid directory path, e.g., "./my-project" or "/absolute/path/to/project"';
        }
        return 'This field requires a value';

      case 'too_big':
        if (field === 'projectPath') {
          return 'Use a shorter path. Consider moving closer to root directory (C:\\projects\\app)';
        }
        return 'Value is too large';

      case 'invalid_enum_value':
        if (field === 'provider') {
          const dbConfig = ConfigManager.getDatabaseConfig();
          return `Use one of: ${dbConfig.supportedProviders.join(', ')}. Default is ${dbConfig.defaultProvider}`;
        }
        return 'Choose from the allowed values';

      case 'custom':
        if (message.includes('language codes')) {
          const i18nConfig = ConfigManager.getI18nConfig();
          const supported = Object.keys(i18nConfig.supportedLanguages).slice(0, 10).join(', ');
          return `Use supported language codes like: ${supported}...`;
        }
        if (message.includes('Feature dependencies')) {
          return 'Enable required features: team management needs authentication + database, payments need authentication';
        }
        return 'Check the specific requirements mentioned in the error';

      default:
        return 'Please correct this field and try again';
    }
  }

  /**
   * Determine error severity
   */
  private static getSeverityForError(code: string, field: string): 'error' | 'critical' {
    if (code === 'required' || field === 'projectPath') {
      return 'critical';
    }
    return 'error';
  }

  /**
   * Add general suggestions based on context
   */
  private static addGeneralSuggestions(result: ValidationResult, input: any): void {
    const suggestions = [];

    // Node version suggestion
    const nodeVersion = result.context?.systemInfo?.nodeVersion;
    if (nodeVersion) {
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      if (majorVersion < 18) {
        suggestions.push(`Upgrade to Node.js 18+ (current: ${nodeVersion}) for best compatibility`);
      }
    }

    // Package manager suggestion
    const availableCommands = result.context?.systemInfo?.availableCommands || [];
    if (!availableCommands.includes('pnpm')) {
      suggestions.push('Install pnpm for better performance: npm install -g pnpm');
    }

    // Git suggestion
    if (!availableCommands.includes('git')) {
      suggestions.push('Install Git for development workflow features: https://git-scm.com/');
    }

    // Path suggestion for Windows
    if (process.platform === 'win32' && input.projectPath) {
      const pathLength = path.resolve(input.projectPath).length;
      if (pathLength > 150) {
        suggestions.push('Consider shorter paths like C:\\dev\\project-name for Windows compatibility');
      }
    }

    result.suggestions.push(...suggestions);
  }

  /**
   * Format validation result for user-friendly display
   */
  static formatValidationResult(result: ValidationResult): string {
    let output = '';

    if (result.errors.length > 0) {
      output += '❌ **Validation Errors**:\n';
      result.errors.forEach((error, i) => {
        const severity = error.severity === 'critical' ? '🚨' : '❌';
        output += `${i + 1}. ${severity} **${error.field}**: ${error.message}\n`;
        output += `   💡 *Suggestion*: ${error.suggestion}\n\n`;
      });
    }

    if (result.warnings.length > 0) {
      output += '⚠️ **Warnings**:\n';
      result.warnings.forEach((warning, i) => {
        const ignorable = warning.ignorable ? ' (can be ignored)' : '';
        output += `${i + 1}. ⚠️ **${warning.field}**: ${warning.message}${ignorable}\n`;
        output += `   💡 *Suggestion*: ${warning.suggestion}\n\n`;
      });
    }

    if (result.suggestions.length > 0) {
      output += '💡 **General Suggestions**:\n';
      result.suggestions.forEach((suggestion, i) => {
        output += `${i + 1}. ${suggestion}\n`;
      });
      output += '\n';
    }

    if (result.context?.detectedFeatures) {
      output += `🔍 **Detected Features**: ${result.context.detectedFeatures.join(', ')}\n\n`;
    }

    return output;
  }
}