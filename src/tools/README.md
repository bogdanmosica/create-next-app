# Tools

Individual MCP tools for Next.js SaaS application setup. Each tool handles a specific aspect of the application setup process.

## Directory Structure

### `core/`
Foundation tools for basic Next.js setup:
- **nextjs-base.ts** - Base Next.js + shadcn/ui setup
- **biome-linting.ts** - Biome linting and formatting
- **vscode-config.ts** - VSCode editor configuration

### `database/`
Database and environment setup:
- **drizzle-orm.ts** - Drizzle ORM configuration
- **environment-vars.ts** - Environment variables + T3 validation

### `auth/`
Authentication system:
- **authentication-jwt.ts** - JWT authentication setup
- **protected-routes.ts** - Route protection middleware

### `payments/`
Payment integration:
- **stripe-payments.ts** - Stripe payments setup
- **stripe-webhooks.ts** - Webhook handling + customer portal

### `team/`
Team management:
- **team-management.ts** - Multi-tenant team system

### `dev/`
Developer experience:
- **form-handling.ts** - React Hook Form + Zod
- **testing-suite.ts** - Vitest + Playwright + MSW
- **git-workflow.ts** - Git hooks + commit standards

### `i18n/`
Internationalization:
- **internationalization.ts** - next-intl + 6 languages

## Usage Pattern

Each tool:
1. Takes projectPath and optional configuration
2. Auto-installs required packages via pnpm
3. Creates necessary files using existing templates
4. Updates configurations (package.json, etc.)
5. Provides dependency detection and validation

## Dependencies

Tools depend on:
- `../utils/dependency-detector.ts` - Check existing setup
- `../utils/tool-validator.ts` - Validate inputs
- `../utils/auto-installer.ts` - Handle package installation
- `../runners/command-runner.ts` - Execute system commands
- `../creators/` - File creation functions
- `../templates/` - File content templates