/**
 * @fileoverview Configuration Manager
 * @description Centralized configuration system to eliminate hardcoded values
 * Provides flexible defaults with override capabilities for database, languages, linting, etc.
 */

import fs from 'fs-extra';
import path from 'path';

export interface MCPConfiguration {
  database: {
    defaultProvider: 'postgresql' | 'mysql' | 'sqlite';
    supportedProviders: ('postgresql' | 'mysql' | 'sqlite')[];
  };
  internationalization: {
    defaultLanguages: string[];
    supportedLanguages: Record<string, string>; // code -> name mapping
    includeAuthForms: boolean;
    includeRouting: boolean;
  };
  linting: {
    defaultTool: 'biome' | 'eslint' | 'none';
    supportedTools: ('biome' | 'eslint' | 'none')[];
    includeCustomRules: boolean;
  };
  development: {
    defaultPackageManager: 'pnpm' | 'npm' | 'yarn';
    includeTesting: boolean;
    includeGitHooks: boolean;
  };
  ui: {
    defaultFramework: 'tailwind' | 'styled-components' | 'emotion';
    includeComponents: boolean;
    componentLibrary: 'shadcn' | 'chakra' | 'mantine';
  };
}

export const DEFAULT_CONFIG: MCPConfiguration = {
  database: {
    defaultProvider: 'postgresql',
    supportedProviders: ['postgresql', 'mysql', 'sqlite']
  },
  internationalization: {
    defaultLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    supportedLanguages: {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'de': 'German',
      'ja': 'Japanese',
      'zh': 'Chinese (Simplified)',
      'pt': 'Portuguese',
      'it': 'Italian',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'ko': 'Korean',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'he': 'Hebrew'
    },
    includeAuthForms: true,
    includeRouting: true
  },
  linting: {
    defaultTool: 'biome',
    supportedTools: ['biome', 'eslint', 'none'],
    includeCustomRules: true
  },
  development: {
    defaultPackageManager: 'pnpm',
    includeTesting: true,
    includeGitHooks: true
  },
  ui: {
    defaultFramework: 'tailwind',
    includeComponents: true,
    componentLibrary: 'shadcn'
  }
};

export class ConfigManager {
  private static config: MCPConfiguration = DEFAULT_CONFIG;
  private static configFile = '.mcp-config.json';

  /**
   * Load configuration from file or use defaults
   */
  static async loadConfig(configPath?: string): Promise<MCPConfiguration> {
    const configFilePath = configPath || this.configFile;
    
    if (await fs.pathExists(configFilePath)) {
      try {
        const fileConfig = await fs.readJson(configFilePath);
        this.config = this.mergeConfigs(DEFAULT_CONFIG, fileConfig);
        console.error(`[CONFIG] Loaded configuration from ${configFilePath}`);
      } catch (error) {
        console.error(`[CONFIG] Failed to load config file, using defaults: ${error instanceof Error ? error.message : String(error)}`);
        this.config = DEFAULT_CONFIG;
      }
    } else {
      this.config = DEFAULT_CONFIG;
      console.error(`[CONFIG] Using default configuration`);
    }
    
    return this.config;
  }

  /**
   * Save configuration to file
   */
  static async saveConfig(config: Partial<MCPConfiguration>, configPath?: string): Promise<void> {
    const configFilePath = configPath || this.configFile;
    const mergedConfig = this.mergeConfigs(this.config, config);
    
    await fs.writeJson(configFilePath, mergedConfig, { spaces: 2 });
    this.config = mergedConfig;
    console.error(`[CONFIG] Saved configuration to ${configFilePath}`);
  }

  /**
   * Get current configuration
   */
  static getConfig(): MCPConfiguration {
    return this.config;
  }

  /**
   * Update configuration in memory
   */
  static updateConfig(updates: Partial<MCPConfiguration>): void {
    this.config = this.mergeConfigs(this.config, updates);
  }

  /**
   * Get database configuration with override support
   */
  static getDatabaseConfig(overrides?: Partial<MCPConfiguration['database']>): MCPConfiguration['database'] {
    return {
      ...this.config.database,
      ...overrides
    };
  }

  /**
   * Get internationalization configuration with override support
   */
  static getI18nConfig(overrides?: Partial<MCPConfiguration['internationalization']>): MCPConfiguration['internationalization'] {
    return {
      ...this.config.internationalization,
      ...overrides
    };
  }

  /**
   * Get linting configuration with override support
   */
  static getLintingConfig(overrides?: Partial<MCPConfiguration['linting']>): MCPConfiguration['linting'] {
    return {
      ...this.config.linting,
      ...overrides
    };
  }

  /**
   * Get development configuration with override support
   */
  static getDevConfig(overrides?: Partial<MCPConfiguration['development']>): MCPConfiguration['development'] {
    return {
      ...this.config.development,
      ...overrides
    };
  }

  /**
   * Get UI configuration with override support
   */
  static getUIConfig(overrides?: Partial<MCPConfiguration['ui']>): MCPConfiguration['ui'] {
    return {
      ...this.config.ui,
      ...overrides
    };
  }

  /**
   * Validate language codes against supported languages
   */
  static validateLanguages(languages: string[]): { valid: string[]; invalid: string[] } {
    const supported = Object.keys(this.config.internationalization.supportedLanguages);
    const valid = languages.filter(lang => supported.includes(lang));
    const invalid = languages.filter(lang => !supported.includes(lang));
    
    return { valid, invalid };
  }

  /**
   * Get language display name
   */
  static getLanguageName(code: string): string {
    return this.config.internationalization.supportedLanguages[code] || code.toUpperCase();
  }

  /**
   * Validate database provider
   */
  static validateDatabaseProvider(provider: string): boolean {
    return this.config.database.supportedProviders.includes(provider as any);
  }

  /**
   * Validate linting tool
   */
  static validateLintingTool(tool: string): boolean {
    return this.config.linting.supportedTools.includes(tool as any);
  }

  /**
   * Deep merge two configuration objects
   */
  private static mergeConfigs(base: MCPConfiguration, override: Partial<MCPConfiguration>): MCPConfiguration {
    const merged = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
        merged[key as keyof MCPConfiguration] = {
          ...merged[key as keyof MCPConfiguration],
          ...value
        } as any;
      } else if (value !== undefined) {
        (merged as any)[key] = value;
      }
    }
    
    return merged;
  }

  /**
   * Generate configuration template file
   */
  static async generateConfigTemplate(outputPath: string = '.mcp-config.example.json'): Promise<void> {
    const templateConfig: MCPConfiguration & { _comments: Record<string, string> } = {
      ...DEFAULT_CONFIG,
      _comments: {
        database: 'Database configuration - choose provider and supported options',
        internationalization: 'I18n settings - languages, routing, and form localization',
        linting: 'Code quality tools - choose between Biome, ESLint, or none',
        development: 'Development workflow preferences',
        ui: 'UI framework and component library choices'
      }
    };

    await fs.writeJson(outputPath, templateConfig, { spaces: 2 });
    console.error(`[CONFIG] Generated configuration template at ${outputPath}`);
  }

  /**
   * Initialize configuration system
   */
  static async initialize(configPath?: string): Promise<void> {
    await this.loadConfig(configPath);
    
    // Generate template if it doesn't exist
    const templatePath = '.mcp-config.example.json';
    if (!await fs.pathExists(templatePath)) {
      await this.generateConfigTemplate(templatePath);
    }
  }
}