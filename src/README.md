# MCP Source Code

This directory contains the Model Context Protocol server source code that creates complete Next.js SaaS applications.

## Structure

- **`index.ts`** - Main MCP server entry point with 18-step app creation process
- **`creators/`** - Modular functions that create different parts of the SaaS app
- **`runners/`** - Utilities for executing system commands safely
- **`templates/`** - All file content templates for the generated applications

## How It Works

1. **MCP Server** (`index.ts`) receives `create_nextjs_app` tool requests
2. **Creators** generate files and configurations for different features
3. **Templates** provide the actual content for generated files
4. **Runners** execute npm commands and system operations

## Key Features Generated

- Complete Next.js app with TypeScript
- Authentication system (JWT + bcrypt)
- Stripe payments integration
- Team management with roles
- Database setup with Drizzle ORM
- Protected middleware
- shadcn/ui components
- Development tooling (Biome, VSCode config)

## Development

```bash
# Build the MCP server
npm run build

# The compiled output goes to dist/
```