# Research: Next.js App Creation Server

## Unknowns & Research Tasks
- Best practices for Next.js app generation with TypeScript, pnpm
- Integration patterns for Biome, shadcn/ui, Drizzle ORM
- Error handling and validation strategies for project generators
- Delivery methods: archive (ZIP), Git push
- Handling unsupported tools, conflicting configs, network/file errors

## Findings
### Next.js App Generation
- Decision: Use official create-next-app with TypeScript and pnpm
- Rationale: Ensures compatibility and best practices
- Alternatives: Manual setup, custom templates

### Biome Integration
- Decision: Add Biome for linting/formatting
- Rationale: Modern, fast, supports TypeScript
- Alternatives: ESLint, Prettier

### shadcn/ui Integration
- Decision: Use shadcn/ui for UI components
- Rationale: Popular, customizable, works with Next.js
- Alternatives: Material UI, Chakra UI

### Drizzle ORM Integration
- Decision: Add Drizzle ORM for database
- Rationale: Modern, TypeScript-first ORM
- Alternatives: Prisma, TypeORM

### Error Handling & Validation
- Decision: Validate user input, catch and report errors
- Rationale: Improves UX, prevents silent failures
- Alternatives: Minimal validation, manual error handling

### Delivery Methods
- Decision: Provide ZIP archive, support Git push
- Rationale: Flexible for users/teams
- Alternatives: Only ZIP, only Git

### Edge Cases
- Unsupported tools: Report error, suggest alternatives
- Conflicting configs: Validate, report conflict
- Network/file errors: Catch, report, retry if possible

## Summary
All unknowns resolved. Best practices and integration patterns identified for each technology and scenario.