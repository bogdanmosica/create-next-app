# Next.js SaaS Starter MCP

## Overview
This Model Context Protocol (MCP) server automatically creates production-ready Next.js SaaS applications with complete authentication, payments, and team management systems.

## Architecture Overview

### Source Structure
- `src/creators/` - Functions that create files/configs during app setup
- `src/runners/` - Command execution utilities for running npm/system commands
- `src/templates/` - All file templates and content for generated apps
- `dist/` - Compiled TypeScript output for distribution

### Key Files
- `src/index.ts` - Main MCP server entry point with 18-step creation process
- `src/creators/saas-lib-creators.ts` - SaaS-specific file creation (auth, payments, db)
- `src/templates/saas-lib-templates.ts` - Complete SaaS file templates
- `src/creators/config-creators.ts` - Configuration files (Biome, VSCode, Drizzle)
- `src/creators/folder-creators.ts` - Project folder structure creation

## What This MCP Creates

### Complete SaaS Application Features
- ✅ **Authentication System**: JWT + bcrypt password hashing
- ✅ **Payment Integration**: Stripe checkout, subscriptions, customer portal
- ✅ **Team Management**: Multi-tenant with role-based permissions
- ✅ **Database**: PostgreSQL with Drizzle ORM, migrations, seeding
- ✅ **Security**: Protected routes middleware, session management
- ✅ **Development Tools**: Biome linting, shadcn/ui components, TypeScript

### Generated Project Structure
```
your-app/
├── app/                    # Next.js app directory
├── actions/                # Server actions with examples
├── components/             # shadcn/ui components + custom
├── lib/
│   ├── auth/              # JWT session + password handling
│   ├── db/                # Drizzle schema, queries, migrations
│   ├── payments/          # Stripe integration
│   └── constants/         # Shared constants
├── types/                 # TypeScript type definitions
├── middleware.ts          # Route protection middleware
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

### Process (18 Steps)
1. **Next.js Setup**: TypeScript, Tailwind, App Router
2. **Biome**: Linting and formatting instead of ESLint
3. **shadcn/ui**: All UI components installed
4. **Folder Structure**: Organized project layout
5. **Drizzle ORM**: PostgreSQL integration
6. **SaaS Features**: Auth, payments, teams, middleware
7. **Dependencies**: All required packages installed
8. **Configuration**: Environment files, VSCode settings

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
- **Framework**: Next.js 15+ with App Router
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with jose + bcrypt
- **Payments**: Stripe with webhooks
- **UI**: shadcn/ui + Tailwind CSS
- **Validation**: Zod schemas
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