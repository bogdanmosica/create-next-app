# Next.js SaaS Starter MCP

## Overview
This is a **Model Context Protocol (MCP) server** - a code generation tool that automatically creates production-ready Next.js SaaS applications. This repository contains the MCP server code, templates, and utilities for generating complete SaaS applications.

## Important Distinction
- **This Repository**: Contains the MCP server (TypeScript + ES modules) that generates Next.js applications
- **Generated Applications**: The actual Next.js SaaS applications created by this MCP server

### MCP Server (This Repository)
- Language: TypeScript with ES modules (`"type": "module"`)
- Purpose: Code generation and template processing
- Structure: MCP tools, templates, creators, and utilities
- **Critical Requirement**: `.js` extensions in imports for ES module compatibility
- **Import Style**: `import { foo } from "./bar.js"` (NOT `"./bar"`)

### Generated Next.js Applications
- Language: TypeScript with modern Next.js setup
- Purpose: Production-ready SaaS applications
- Structure: Standard Next.js app with enhanced features
- **Import Style**: `import { foo } from "./bar"` (standard Next.js TypeScript)
- Requirements: Standard Next.js TypeScript configuration

## Architecture Overview

### MCP Server Structure (This Repository)
- `src/creators/` - Functions that create files/configs during app generation
- `src/runners/` - Command execution utilities for running npm/system commands
- `src/templates/` - All file templates and content for generated Next.js apps
- `src/tools/` - MCP tool implementations for different SaaS features
- `src/utils/` - MCP server utilities (template loading, validation, etc.)
- `dist/` - Compiled TypeScript output for MCP server distribution

### Key MCP Server Files
- `src/index.ts` - Main MCP server entry point with tool registration
- `src/core/server.ts` - MCP server implementation and orchestration
- `src/creators/saas-lib-creators.ts` - SaaS-specific file generation functions
- `src/templates/saas-lib-templates.ts` - Templates for generated SaaS applications
- `src/utils/template-loader.ts` - Template loading and processing utilities

**Critical Note**: This MCP server uses ES modules (`"type": "module"`) and **requires `.js` extensions in ALL imports** for proper module resolution. This is different from the Next.js applications it generates, which use standard TypeScript imports without extensions.

### Import Examples:
```typescript
// ✅ CORRECT - MCP Server imports (this repo)
import { loadTemplate } from "../utils/template-loader.js";
import { middlewareTemplate } from "../templates/middleware-template.js";

// ❌ INCORRECT - Will cause "Cannot find module" errors
import { loadTemplate } from "../utils/template-loader";
import { middlewareTemplate } from "../templates/middleware-template";

// ✅ CORRECT - Generated Next.js app imports (different style)
import { Button } from "@/components/ui/button";
import { db } from "@/libs/db";
```

## What This MCP Server Generates

### Complete SaaS Application Features
- ✅ **Authentication System**: JWT + bcrypt password hashing
- ✅ **Internationalization**: 6 languages with next-intl, dynamic routing
- ✅ **Enhanced Structure**: libs/, models/, validations/ organization
- ✅ **Payment Integration**: Stripe checkout, subscriptions, customer portal
- ✅ **Team Management**: Multi-tenant with role-based permissions
- ✅ **Database**: PostgreSQL with Drizzle ORM, migrations, seeding
- ✅ **Security**: Protected routes middleware, session management
- ✅ **Development Tools**: Biome linting, shadcn/ui components, TypeScript

### Generated Project Structure
```
your-app/
├── app/
│   └── [locale]/          # Next.js i18n app directory
│       ├── auth/          # Internationalized auth pages
│       └── dashboard/     # Protected dashboard routes
├── actions/               # Server actions with examples
├── components/
│   ├── auth/              # Complete login/signup forms
│   └── ui/                # shadcn/ui + language switcher
├── libs/                  # Enhanced shared utilities
│   ├── env.ts             # Type-safe env validation
│   ├── db.ts              # Database connection
│   ├── i18n-config.ts     # Internationalization setup
│   └── utils.ts           # Common utilities
├── models/                # Database models & schemas
│   ├── user.ts            # User model with JWT support
│   ├── team.ts            # Team management models
│   └── schema.ts          # Drizzle schema exports
├── validations/           # Zod validation schemas
│   ├── auth.ts            # Authentication validation
│   └── team.ts            # Team management validation
├── locales/               # Translation files
│   ├── en.json            # English (complete)
│   ├── es.json            # Spanish (complete)
│   ├── fr.json            # French (complete)
│   └── de.json, ja.json, zh.json  # Basic translations
├── libs/                   # Legacy structure (maintained)
│   ├── auth/              # JWT session + password handling
│   ├── db/                # Drizzle queries, migrations
│   └── payments/          # Stripe integration
├── types/                 # TypeScript type definitions
├── middleware.ts          # i18n + route protection
├── .env                   # Environment variables
└── package.json           # Complete dependencies
```

### Database Schema
- **Users**: Authentication, roles, soft deletes
- **Teams**: Multi-tenant structure with Stripe integration
- **Team Members**: Role-based team membership
- **Activity Logs**: User action tracking

## Usage

### MCP Tool
```javascript
{
  "name": "create_nextjs_app",
  "description": "Creates a complete Next.js SaaS application",
  "inputSchema": {
    "projectPath": "string", // Required: Where to create the app
    "projectName": "string"  // Optional: Project name
  }
}
```

### Process (30 Steps)
1. **Next.js Setup**: TypeScript, Tailwind, App Router
2. **Biome**: Linting and formatting instead of ESLint
3. **shadcn/ui**: All UI components installed
4. **Enhanced Structure**: libs/, models/, validations/ folders
5. **Drizzle ORM**: PostgreSQL integration
6. **SaaS Features**: Auth, payments, teams, middleware
7. **Environment Validation**: T3 Env for type-safe variables
8. **Form Handling**: React Hook Form with Zod validation
9. **Testing Setup**: Vitest, Playwright, MSW mocking
10. **Git Hooks**: Lefthook, lint-staged, Commitizen
11. **Internationalization**: next-intl with 6 languages
12. **i18n Routing**: Dynamic [locale] structure
13. **Translation Files**: Complete locale management
14. **i18n Components**: Internationalized auth forms
15. **Dependencies**: CLI-based installation of all packages
16. **Configuration**: Environment files, VSCode settings

## Environment Setup (Post-Creation)

### Required Environment Variables
```env
# Database
POSTGRES_URL="postgresql://user:pass@localhost:5432/db"

# Authentication
AUTH_SECRET="your-secret-key"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
BASE_URL="http://localhost:3000"
```

### Initialization Commands
```bash
# Set up Stripe products
pnpm db:setup

# Seed initial data (creates test user/team)
pnpm db:seed

# Run database migrations
pnpm db:migrate
```

## Development Workflow

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Apply database migrations
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:seed` - Seed database with initial data

### Key Features Ready Out of Box
- User registration/login with JWT
- Team creation and member management
- Stripe subscription checkout
- Protected dashboard routes
- Activity logging
- Database migrations
- TypeScript throughout

## Technical Stack
- **Framework**: Next.js 15+ with App Router (async params/cookies compatible)
- **Database**: PostgreSQL with Drizzle ORM (pg client)
- **Authentication**: JWT with jose + bcrypt
- **Payments**: Stripe with webhooks (v2024-06-20 API)
- **Internationalization**: next-intl with 6 languages
- **UI**: shadcn/ui + Tailwind CSS
- **Validation**: Zod schemas with proper regex patterns
- **Linting**: Biome (replaces ESLint)
- **TypeScript**: Full type safety

## File Organization
- Templates are extracted from inline strings for maintainability
- Creators are modular functions for specific features
- Runners handle system command execution
- Clear separation between MCP logic and generated app content

## Development Guidelines

### Adding New Features
When extending the MCP with new functionality, follow these practices:

#### 1. **New Creator Files**
```typescript
/**
 * @fileoverview [Feature Name] Creator
 * @description [Brief description of what this creator does]
 * [Additional context about the feature]
 */

import fs from "fs-extra";
import path from "path";
// Import templates...

export async function create[FeatureName](projectPath: string): Promise<void> {
  // Implementation
}
```

#### 2. **New Template Files**
```typescript
/**
 * @fileoverview [Feature Name] Templates
 * @description [Description of templates contained in this file]
 * [Usage context and any special notes]
 */

export const [featureName]Template = `[template content]`;
```

#### 3. **New Folders Must Include**
- **README.md** - Purpose, usage examples, and file descriptions
- **File headers** - All .ts files should have descriptive @fileoverview comments
- **Update parent README** - If creating subfolders, update parent folder's README

#### 4. **Folder README Template**
```markdown
# [Folder Name]

[Brief description of folder purpose]

## Files

### `filename.ts`
[Description of what this file does]
- **Key functions/exports**
- **Usage patterns**
- **Dependencies**

## Usage

[Examples of how to use files in this folder]

## Dependencies

[What this folder depends on]
```

#### 5. **Documentation Updates Required**
When adding new features, update:
- **CLAUDE.md** - Add feature to overview and generated app features
- **docs/STRUCTURE.md** - Include in generated project structure
- **how-to.md** - Add to manual setup steps if applicable
- **package.json** - Add relevant keywords if needed

#### 6. **Generated App Documentation**
If your feature creates new folders in the generated app:
- **Create README.md** in the generated folder with usage examples
- **Update existing READMEs** that reference the new folder
- **Add to folder structure documentation**

### Consistency Practices

#### File Headers
All TypeScript files should start with:
```typescript
/**
 * @fileoverview [Brief title describing the file]
 * @description [Detailed description of functionality]
 * [Additional context, usage notes, or warnings]
 */
```

#### README Structure
Keep README files consistent:
1. **Purpose** - What the folder/feature does
2. **Files** - Description of each file
3. **Usage** - Examples and patterns
4. **Dependencies** - What it relies on

#### Template Organization
- **Group related templates** in single files
- **Use descriptive export names** that match their purpose
- **Include template comments** explaining the generated code
- **Extract complex templates** into separate files when they grow large

### Maintenance Checklist

When adding new functionality:
- [ ] Create appropriate file headers
- [ ] Add README.md to new folders
- [ ] Update parent folder READMEs
- [ ] Update CLAUDE.md with new features
- [ ] Update docs/STRUCTURE.md if generating new files
- [ ] Add relevant package.json keywords
- [ ] Test that generated apps include proper documentation
- [ ] Verify all build processes still work

This ensures the MCP remains well-documented and maintainable as it grows.