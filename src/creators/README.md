# Creators

File creation functions for different features of the generated SaaS application.

## Files

### `config-creators.ts`
Creates configuration files for development tools:
- **Biome configuration** - Linting and formatting rules
- **VSCode settings** - Editor configuration for optimal development
- **Drizzle config** - Database ORM configuration
- **Environment files** - `.env` and `.env.example` with required variables
- **Package.json updates** - Adds necessary scripts

### `folder-creators.ts`
Creates the project folder structure:
- **Actions folder** - Server actions with examples
- **Components folder** - UI components directory
- **Lib folder** - Utilities and core functionality
- **Types folder** - TypeScript definitions
- **README files** - Documentation for each folder with examples

### `readme-creators.ts`
Generates README.md files with code examples:
- **Actions examples** - Server action patterns
- **Components examples** - shadcn/ui usage patterns
- **Lib examples** - Utility function patterns
- **Database examples** - Schema and query patterns

### `saas-lib-creators.ts`
Creates the complete SaaS library structure:
- **Authentication system** - JWT session management, password hashing
- **Database layer** - Schema, queries, migrations, seeding
- **Payment integration** - Stripe checkout, customer portal
- **Middleware** - Route protection and session handling
- **Package updates** - Installs SaaS-specific dependencies

## Usage Pattern

Each creator function:
1. Takes a `projectPath` parameter
2. Uses templates from `../templates/`
3. Creates files using `fs-extra`
4. Handles errors appropriately
5. Provides console logging for debugging

## Dependencies

All creators depend on:
- `fs-extra` for file operations
- `path` for cross-platform path handling
- Templates from the `../templates/` directory