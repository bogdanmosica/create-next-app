/**
 * @fileoverview Package and Component Configuration Templates
 * @description Templates for package.json modifications and shadcn/ui config
 */

export const packageJsonTemplate = `{
  "name": "{{PROJECT_NAME}}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "lint:fix": "biome check . --apply",
    "format": "biome format . --write",
    "type-check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx libs/db/seed.ts",
    "db:setup": "tsx libs/db/setup.ts"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
`;

export const shadcnConfigTemplate = `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "{{STYLE}}",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "{{BASE_COLOR}}",
    "cssVariables": {{CSS_VARIABLES}}
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/libs/utils",
    "ui": "@/components/ui",
    "lib": "@/libs",
    "hooks": "@/hooks"
  }
}
`;
