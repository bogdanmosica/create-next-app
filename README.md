# Create Next.js MCP Server

A Model Context Protocol (MCP) server that creates complete Next.js applications with predefined configurations.

## Features

This MCP server creates a Next.js application with:
- ✅ Next.js with TypeScript
- ✅ pnpm package manager
- ✅ Biome for linting and formatting (instead of ESLint)
- ✅ shadcn/ui components (all components included)
- ✅ Drizzle ORM setup
- ✅ Proper folder structure with examples
- ✅ VSCode configuration
- ✅ Environment files setup

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build the server:
```bash
pnpm run build
```

## Usage

### As a standalone MCP server

Run the server:
```bash
pnpm start
```

### Available Tools

#### `create_nextjs_app`
Creates a complete Next.js application with all the predefined configurations.

**Parameters:**
- `projectPath` (required): The path where the Next.js project should be created
- `projectName` (optional): The name of the project

**Example:**
```typescript
{
  "name": "create_nextjs_app",
  "arguments": {
    "projectPath": "/path/to/my-project",
    "projectName": "my-awesome-app"
  }
}
```

## What Gets Created

The server will create a complete Next.js application with:

### Dependencies Installed
- Next.js with TypeScript
- Biome (linting and formatting)
- shadcn/ui (all components)
- Drizzle ORM with PostgreSQL support
- Neon Database serverless client

### File Structure
```
your-project/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── actions/
│   ├── .gitkeep
│   └── README.md
├── components/
│   ├── ui/
│   ├── .gitkeep
│   └── README.md
├── lib/
│   ├── constants/
│   ├── db/
│   ├── .gitkeep
│   └── README.md
├── types/
│   └── .gitkeep
├── .vscode/
│   └── settings.json
├── .env
├── .env.example
├── biome.json
├── components.json
├── drizzle.config.ts
└── package.json
```

### Configurations
- **Biome**: Complete linting and formatting setup with custom rules
- **VSCode**: Auto-fix and organize imports on save
- **shadcn/ui**: All components pre-installed
- **Drizzle**: Ready-to-use ORM configuration for PostgreSQL
- **Environment**: Template files with all necessary variables

## Requirements Met

This MCP server implements all 21 requirements from the requirements table:
1. ✅ Next.js app initialization with pnpm
2. ✅ Biome installation and configuration
3. ✅ Custom biome.json setup
4. ✅ VSCode settings for auto-fix
5. ✅ shadcn/ui initialization and component installation
6. ✅ Component formatting with Biome
7. ✅ Package.json script addition
8. ✅ Complete folder structure creation
9. ✅ README files with code examples
10. ✅ Drizzle ORM installation and setup
11. ✅ Environment file creation

## Development

To modify or extend the server:

1. Edit `src/index.ts`
2. Rebuild: `pnpm run build`
3. Test: `pnpm start`

## Error Handling

The server includes comprehensive error handling and will report exactly which step failed if something goes wrong during the Next.js app creation process.