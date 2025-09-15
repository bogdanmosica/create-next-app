/**
 * @fileoverview Dependency Resolver
 * @description Standardized dependency resolution for all tools
 * Provides consistent auto-installation behavior across the MCP
 */

import { setupDrizzleOrm } from "../tools/database/drizzle-orm.js";
import { setupAuthenticationJwt } from "../tools/auth/authentication-jwt.js";
import { setupStripePayments } from "../tools/payments/stripe-payments.js";
import { setupEnvironmentVars } from "../tools/database/environment-vars.js";

export interface DependencyConfig {
  name: string;
  tool: (config: any) => Promise<string>;
  config: any;
  description: string;
}

export interface DependencyOptions {
  autoInstall: boolean;
  throwOnMissing: boolean;
  verbose: boolean;
}

export const DEPENDENCIES: Record<string, DependencyConfig> = {
  database: {
    name: 'Database (Drizzle ORM)',
    tool: setupDrizzleOrm,
    config: {},
    description: 'PostgreSQL database with Drizzle ORM'
  },
  authentication: {
    name: 'Authentication (JWT)',
    tool: setupAuthenticationJwt,
    config: {},
    description: 'JWT authentication system with bcrypt'
  },
  payments: {
    name: 'Payments (Stripe)',
    tool: setupStripePayments,
    config: {},
    description: 'Stripe payment integration'
  },
  environment: {
    name: 'Environment Variables',
    tool: setupEnvironmentVars,
    config: {},
    description: 'Type-safe environment configuration'
  }
};

export class DependencyResolver {
  constructor(
    private projectPath: string,
    private options: DependencyOptions = {
      autoInstall: true,
      throwOnMissing: false,
      verbose: true
    }
  ) {}

  /**
   * Resolve a single dependency
   */
  async resolveDependency(
    dependencyKey: string,
    projectState: any,
    customConfig?: any
  ): Promise<{ resolved: boolean; message?: string }> {
    const dependency = DEPENDENCIES[dependencyKey];
    
    if (!dependency) {
      throw new Error(`Unknown dependency: ${dependencyKey}`);
    }

    // Check if dependency is already satisfied
    const isResolved = this.checkDependencyState(dependencyKey, projectState);
    
    if (isResolved) {
      if (this.options.verbose) {
        console.error(`[DEPENDENCY] ✅ ${dependency.name} already available`);
      }
      return { resolved: true };
    }

    // Handle missing dependency based on options
    if (this.options.autoInstall) {
      if (this.options.verbose) {
        console.error(`[DEPENDENCY] 🔧 Auto-installing ${dependency.name}...`);
      }
      
      try {
        const config = { 
          projectPath: this.projectPath,
          ...dependency.config,
          ...customConfig
        };
        
        const result = await dependency.tool(config);
        
        if (this.options.verbose) {
          console.error(`[DEPENDENCY] ✅ ${dependency.name} installed successfully`);
        }
        
        return { resolved: true, message: result };
        
      } catch (error) {
        const errorMsg = `Failed to auto-install ${dependency.name}: ${error instanceof Error ? error.message : String(error)}`;
        
        if (this.options.throwOnMissing) {
          throw new Error(errorMsg);
        }
        
        return { 
          resolved: false, 
          message: `⚠️ ${errorMsg}. Please install manually.`
        };
      }
    } else {
      const errorMsg = `${dependency.name} is required but not installed. Run the corresponding setup tool first.`;
      
      if (this.options.throwOnMissing) {
        throw new Error(errorMsg);
      }
      
      return { resolved: false, message: errorMsg };
    }
  }

  /**
   * Resolve multiple dependencies
   */
  async resolveDependencies(
    dependencyKeys: string[],
    projectState: any,
    customConfigs?: Record<string, any>
  ): Promise<{ allResolved: boolean; results: Record<string, any> }> {
    const results: Record<string, any> = {};
    let allResolved = true;

    for (const key of dependencyKeys) {
      const customConfig = customConfigs?.[key];
      const result = await this.resolveDependency(key, projectState, customConfig);
      
      results[key] = result;
      
      if (!result.resolved) {
        allResolved = false;
      }
    }

    return { allResolved, results };
  }

  /**
   * Check if a dependency is already satisfied
   */
  private checkDependencyState(dependencyKey: string, projectState: any): boolean {
    switch (dependencyKey) {
      case 'database':
        return projectState.hasDrizzle || projectState.hasDatabase;
      case 'authentication':
        return projectState.hasAuthentication;
      case 'payments':
        return projectState.hasStripe;
      case 'environment':
        return projectState.hasEnvironmentVars;
      default:
        return false;
    }
  }

  /**
   * Get dependency chain for a feature (what dependencies it needs)
   */
  static getDependencyChain(feature: string): string[] {
    const dependencyChains: Record<string, string[]> = {
      authentication: ['database', 'environment'],
      payments: ['authentication', 'environment'], 
      teamManagement: ['authentication', 'database'],
      protectedRoutes: ['authentication'],
      stripeWebhooks: ['payments', 'environment']
    };

    return dependencyChains[feature] || [];
  }

  /**
   * Create resolver with preset options for different scenarios
   */
  static createResolver(projectPath: string, mode: 'auto' | 'manual' | 'strict'): DependencyResolver {
    const options = {
      auto: { autoInstall: true, throwOnMissing: false, verbose: true },
      manual: { autoInstall: false, throwOnMissing: false, verbose: true },
      strict: { autoInstall: false, throwOnMissing: true, verbose: true }
    };

    return new DependencyResolver(projectPath, options[mode]);
  }
}

/**
 * Convenience function for tools to resolve their dependencies
 */
export async function resolveDependencies(
  projectPath: string,
  dependencyKeys: string[],
  projectState: any,
  options: Partial<DependencyOptions> = {}
): Promise<{ success: boolean; messages: string[] }> {
  const resolver = new DependencyResolver(projectPath, {
    autoInstall: true,
    throwOnMissing: false,
    verbose: true,
    ...options
  });

  const result = await resolver.resolveDependencies(dependencyKeys, projectState);
  
  const messages = Object.values(result.results)
    .map((r: any) => r.message)
    .filter(Boolean);

  return {
    success: result.allResolved,
    messages
  };
}