/**
 * @fileoverview MCP Tool Registry
 * @description Centralized registry of all available MCP tools with their schemas and metadata
 * Extracted from the main server file for better organization and maintainability
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Complete registry of all available MCP tools
 */
export function getToolRegistry(): Tool[] {
  return [
    // Interactive setup helper
    {
      name: "setup_nextjs_project_wizard",
      description: "Interactive wizard that asks user about their Next.js project preferences and creates a customized application based on their choices. Use this when user says 'create a Next.js app' without specifying features.",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: {
            type: "string",
            description: "The path where the Next.js project should be created",
          },
        },
        required: ["projectPath"],
      },
    },

    // Main orchestrator tool with preset support
    {
      name: "create_nextjs_app",
      description: "Creates a Next.js application using presets (minimal, blog, dashboard, startup, enterprise) or custom feature combinations. Use presets for best UX - they provide curated feature sets for common use cases.",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: {
            type: "string",
            description: "The path where the Next.js project should be created",
          },
          projectName: {
            type: "string",
            description: "The name of the project (optional, defaults to current directory)",
          },
          preset: {
            type: "string",
            description: "Pre-configured feature set: 'minimal' (basic setup), 'blog' (content sites), 'dashboard' (admin tools), 'startup' (SaaS MVP), 'enterprise' (full SaaS)",
            enum: ["minimal", "blog", "dashboard", "startup", "enterprise", "custom"]
          },
          features: {
            type: "object",
            description: "Custom features (only needed if not using preset or to override preset features)",
            properties: {
              core: { type: "boolean", description: "Base Next.js + shadcn/ui setup (always included)" },
              database: { type: "boolean", description: "Drizzle ORM + PostgreSQL setup" },
              authentication: { type: "boolean", description: "JWT authentication system + protected routes" },
              payments: { type: "boolean", description: "Stripe payments integration" },
              teamManagement: { type: "boolean", description: "Multi-tenant team system" },
              devExperience: { type: "boolean", description: "Testing suite + linting + git workflow" },
              internationalization: { type: "boolean", description: "Multi-language support (6 languages)" },
            },
          },
        },
        required: ["projectPath"],
      },
    },
    
    // Core foundation tools
    {
      name: "create_nextjs_base",
      description: "Creates basic Next.js application with TypeScript and Tailwind. Includes configurable shadcn/ui setup with multiple color schemes and optional dashboard showcase.",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          projectName: { type: "string", description: "Project name (optional)" },
          includeShadcn: { type: "boolean", description: "Include shadcn/ui components (default: true)" },
          includeAllComponents: { type: "boolean", description: "Add all shadcn components (default: true)" },
          shadcnBaseColor: { 
            type: "string", 
            enum: ["neutral", "gray", "zinc", "stone", "slate"], 
            description: "shadcn base color theme (default: neutral)" 
          },
          useCssVariables: { type: "boolean", description: "Use CSS variables for theming (default: true)" },
          silent: { type: "boolean", description: "Run shadcn setup silently (default: false)" },
          includeDashboard: { type: "boolean", description: "Create interactive dashboard to showcase all shadcn/ui components (default: false)" },
        },
        required: ["projectPath"],
      },
    },
    {
      name: "setup_biome_linting",
      description: "Sets up Biome for linting and formatting with custom rules",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeCustomRules: { type: "boolean", description: "Include GritQL custom rules (default: true)" },
          strictMode: { type: "boolean", description: "Enable strict linting mode (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    {
      name: "setup_vscode_config",
      description: "Creates VSCode settings optimized for the project",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          optimizeForBiome: { type: "boolean", description: "Optimize for Biome linting (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    
    // Database tools
    {
      name: "setup_drizzle_orm",
      description: "Sets up Drizzle ORM with PostgreSQL/MySQL/SQLite",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          provider: { type: "string", enum: ["postgresql", "mysql", "sqlite"], description: "Database provider (default: from configuration, fallback to postgresql)" },
          includeExamples: { type: "boolean", description: "Include example schemas (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    {
      name: "setup_environment_vars",
      description: "Creates environment variable files with T3 validation",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeT3Validation: { type: "boolean", description: "Include T3 Env validation (default: true)" },
          includeExampleFile: { type: "boolean", description: "Create .env.example file (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    
    // Authentication tools
    {
      name: "setup_authentication_jwt",
      description: "Sets up NextAuth.js authentication with credentials provider and bcrypt password hashing",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includePasswordHashing: { type: "boolean", description: "Include bcrypt password hashing (default: true)" },
          includeUserManagement: { type: "boolean", description: "Include user CRUD operations (default: true)" },
          requireDatabase: { type: "boolean", description: "Auto-install database if missing (default: true)" },
          autoDependencies: { type: "boolean", description: "Automatically install missing dependencies (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    {
      name: "setup_protected_routes",
      description: "Creates middleware for route protection",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          protectionLevel: { type: "string", enum: ["basic", "advanced"], description: "Protection level (default: advanced)" },
          requireAuth: { type: "boolean", description: "Auto-install auth if missing (default: true)" },
          autoDependencies: { type: "boolean", description: "Automatically install missing dependencies (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    
    // Payment tools
    {
      name: "setup_stripe_payments",
      description: "Sets up Stripe payments with subscriptions and one-time payments",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeSubscriptions: { type: "boolean", description: "Include subscription payments (default: true)" },
          includeOneTime: { type: "boolean", description: "Include one-time payments (default: true)" },
          requireAuth: { type: "boolean", description: "Auto-install auth if missing (default: true)" },
          autoDependencies: { type: "boolean", description: "Automatically install missing dependencies (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    {
      name: "setup_stripe_webhooks",
      description: "Sets up Stripe webhooks and customer portal",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeCustomerPortal: { type: "boolean", description: "Include customer portal (default: true)" },
          requireStripe: { type: "boolean", description: "Auto-install Stripe if missing (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    
    // Team management
    {
      name: "setup_team_management",
      description: "Sets up multi-tenant team management system",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeRoles: { type: "boolean", description: "Include role-based permissions (default: true)" },
          includeActivityLogs: { type: "boolean", description: "Include activity logging (default: true)" },
          requireAuth: { type: "boolean", description: "Auto-install auth if missing (default: true)" },
          autoDependencies: { type: "boolean", description: "Automatically install missing dependencies (default: true)" },
          requireDatabase: { type: "boolean", description: "Auto-install database if missing (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    
    // Developer experience tools
    {
      name: "setup_form_handling",
      description: "Sets up React Hook Form with Zod validation and React Query",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeZodValidation: { type: "boolean", description: "Include Zod validation schemas (default: true)" },
          includeReactQuery: { type: "boolean", description: "Include React Query for data fetching (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    {
      name: "setup_testing_suite",
      description: "Sets up comprehensive testing with Vitest, Playwright, and MSW",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeUnitTests: { type: "boolean", description: "Include Vitest for unit tests (default: true)" },
          includeE2ETests: { type: "boolean", description: "Include Playwright for E2E tests (default: true)" },
          includeMocking: { type: "boolean", description: "Include MSW for API mocking (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    {
      name: "setup_git_workflow",
      description: "Sets up Git hooks, commit standards, and development workflow",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          includeHooks: { type: "boolean", description: "Include Lefthook git hooks (default: true)" },
          includeCommitStandards: { type: "boolean", description: "Include Commitizen standards (default: true)" },
          includeLintStaged: { type: "boolean", description: "Include lint-staged (default: true)" },
        },
        required: ["projectPath"],
      },
    },
    
    // Internationalization
    {
      name: "setup_internationalization",
      description: "Sets up next-intl with multi-language support and routing",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Project directory path" },
          languages: { type: "array", items: { type: "string" }, description: "Supported languages (default: en,es,fr,de,ja,zh)" },
          includeRouting: { type: "boolean", description: "Include internationalized routing (default: true)" },
          includeAuthForms: { type: "boolean", description: "Include translated auth forms (default: true)" },
        },
        required: ["projectPath"],
      },
    },

    // Analytics tools
    {
      name: "analyze_token_usage",
      description: "Analyzes token usage of MCP templates and provides optimization recommendations for improving LLM efficiency",
      inputSchema: {
        type: "object",
        properties: {
          projectPath: { type: "string", description: "Optional: Path to save detailed report (default: current directory)" },
          analyzeTemplates: { type: "boolean", description: "Analyze template files for token efficiency (default: true)" },
          generateReport: { type: "boolean", description: "Generate detailed markdown report (default: true)" },
          optimizeTemplates: { type: "boolean", description: "Show template optimization suggestions (default: false)" },
        },
        required: [],
      },
    },
  ] as Tool[];
}