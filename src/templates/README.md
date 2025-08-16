# Templates

All file content templates used to generate the SaaS application files. These templates contain the actual code and configuration that gets written to the generated project.

## Files

### `biome-config.ts`
Biome linting and formatting configuration:
- Modern ESLint replacement with faster performance
- TypeScript and React-specific rules
- Import organization with custom groups
- Security and performance linting rules

### `vscode-settings.ts`
VSCode editor configuration:
- Biome integration for format-on-save
- Import organization on save
- Optimized for the generated project structure

### `drizzle-schema.ts` & `drizzle-config.ts`
Basic Drizzle ORM setup:
- Simple PostgreSQL schema example
- Database configuration template
- Migration settings

### `env-template.ts`
Environment variables template:
- Database connection string
- Stripe API keys
- Authentication secrets
- Base URL configuration

### `readme-templates.ts`
Documentation templates for generated folders:
- **Actions README** - Server action examples and patterns
- **Components README** - shadcn/ui usage examples
- **Lib README** - Utility and constant organization
- **Database README** - Schema organization patterns

### `middleware-template.ts`
Root-level middleware for route protection:
- Session validation
- Protected route handling
- JWT token refresh logic
- Redirect logic for unauthenticated users

### `saas-lib-templates.ts`
Complete SaaS functionality templates:

#### Authentication
- **JWT session management** - Token signing, verification, refresh
- **Password handling** - bcrypt hashing and comparison
- **Action middleware** - Validation and user context

#### Database
- **Schema definitions** - Users, teams, team members, activity logs
- **Query functions** - User lookup, team management, subscription updates
- **Database connection** - Drizzle + PostgreSQL setup
- **Seeding scripts** - Initial data and Stripe products
- **Setup scripts** - Stripe CLI integration

#### Payments
- **Stripe integration** - Client setup, checkout sessions
- **Server actions** - Payment flow handlers
- **Customer portal** - Subscription management

## Template Organization

Templates are organized by feature area:
- **Basic configs** - Development tools and environment
- **Database** - Schema and connection setup
- **Authentication** - User management and security
- **Payments** - Stripe integration
- **Documentation** - README files and examples

## Usage Pattern

Templates are imported by creators and written to specific file paths:
```typescript
import { templateName } from '../templates/template-file';
await fs.writeFile(filePath, templateName);
```

## Content Types

- **JSON configurations** - Exported as JavaScript objects
- **TypeScript code** - Exported as template strings
- **Markdown documentation** - Exported as template strings
- **Environment files** - Exported as template strings