/**
 * @fileoverview Enhanced Structure Creators
 * @description Creates the enhanced project structure with libs, models, validations, and implementation templates
 * Inspired by Next.js Boilerplate patterns but adapted for JWT auth, Biome, and Drizzle setup
 */

import fs from "fs-extra";
import path from "node:path";
import {
  envLibTemplate,
  dbLibTemplate,
  loggerLibTemplate,
  utilsLibTemplate,
  userModelTemplate,
  teamModelTemplate,
  activityLogModelTemplate,
  schemaIndexTemplate,
  authValidationTemplate,
  teamValidationTemplate,
  validationIndexTemplate,
} from "../templates/enhanced-structure-templates.js";
import {
  loginFormTemplate,
  signupFormTemplate,
  authPagesTemplate,
  authActionsTemplate,
} from "../templates/auth-form-templates.js";

export async function createEnhancedProjectStructure(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating enhanced project structure at: ${projectPath}`);

  // Define enhanced folder structure
  const folders = [
    // Enhanced lib structure
    "lib/auth",
    "lib/constants", // existing
    "lib/db", // existing
    "lib/payments", // existing
    
    // New enhanced folders
    "libs", // New shared utilities
    "models", // Database models
    "validations", // Zod schemas
    "components/auth", // Auth components
    "app/auth/signin", // Auth pages
    "app/auth/signup",
    
    // Keep existing folders
    "actions",
    "components",
    "types",
  ];

  // Create all folders
  for (const folder of folders) {
    try {
      const folderPath = path.join(projectPath, folder);
      console.error(`[DEBUG] Creating enhanced folder: ${folderPath}`);
      await fs.ensureDir(folderPath);
    } catch (error) {
      console.error(`[ERROR] Failed to create folder ${folder}: ${error}`);
      throw new Error(`Failed to create enhanced folder structure for "${folder}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.error(`[DEBUG] Enhanced folders created successfully`);
}

export async function createLibsStructure(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating libs structure...`);

  const libsPath = path.join(projectPath, "libs");

  try {
    // Create lib files
    await fs.writeFile(path.join(libsPath, "env.ts"), envLibTemplate);
    await fs.writeFile(path.join(libsPath, "db.ts"), dbLibTemplate);
    await fs.writeFile(path.join(libsPath, "logger.ts"), loggerLibTemplate);
    await fs.writeFile(path.join(libsPath, "utils.ts"), utilsLibTemplate);

    // Create README for libs
    const libsReadme = `# libs/

Shared libraries and utilities for the application.

## Files

### \`env.ts\`
Type-safe environment variable validation using T3 Env and Zod.
- Server, client, and shared environment variables
- Runtime validation and type inference
- Development and production configurations

### \`db.ts\`
Database connection management with Drizzle ORM.
- Global connection pooling
- Hot reload prevention in development
- Type-safe database client

### \`logger.ts\`
Centralized logging utility for the application.
- Structured logging with context
- Different log levels (debug, info, warn, error)
- Development and production optimizations

### \`utils.ts\`
Common utility functions used across the application.
- Currency formatting
- Date formatting
- String utilities
- Class name utilities

## Usage

\`\`\`typescript
import { Env } from '@/libs/env';
import { db } from '@/libs/db';
import { logger } from '@/libs/logger';
import { formatCurrency, slugify } from '@/libs/utils';
\`\`\`
`;

    await fs.writeFile(path.join(libsPath, "README.md"), libsReadme);

    console.error(`[DEBUG] Libs structure created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create libs structure: ${error}`);
    throw error;
  }
}

export async function createModelsStructure(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating models structure...`);

  const modelsPath = path.join(projectPath, "models");

  try {
    // Create model files
    await fs.writeFile(path.join(modelsPath, "user.ts"), userModelTemplate);
    await fs.writeFile(path.join(modelsPath, "team.ts"), teamModelTemplate);
    await fs.writeFile(path.join(modelsPath, "activity-log.ts"), activityLogModelTemplate);
    await fs.writeFile(path.join(modelsPath, "schema.ts"), schemaIndexTemplate);

    // Create README for models
    const modelsReadme = `# models/

Database models and schemas using Drizzle ORM.

## Files

### \`user.ts\`
User model with authentication fields.
- User table definition with JWT-compatible fields
- Relations to teams and activity logs
- Type exports for TypeScript

### \`team.ts\`
Team and team membership models.
- Teams table with Stripe integration
- Team members with role-based permissions
- Relations and type exports

### \`activity-log.ts\`
Activity logging model for user actions.
- Comprehensive activity tracking
- User and team context
- Metadata support for detailed logging

### \`schema.ts\`
Consolidated schema export for Drizzle ORM.
- All tables and relations exported
- Single import point for database operations
- Type-safe schema object

## Usage

\`\`\`typescript
import { users, teams, teamMembers } from '@/models/schema';
import { db } from '@/libs/db';

// Query users
const allUsers = await db.select().from(users);

// Create team with relations
const newTeam = await db.insert(teams).values({
  name: 'My Team',
  slug: 'my-team'
});
\`\`\`
`;

    await fs.writeFile(path.join(modelsPath, "README.md"), modelsReadme);

    console.error(`[DEBUG] Models structure created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create models structure: ${error}`);
    throw error;
  }
}

export async function createValidationsStructure(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating validations structure...`);

  const validationsPath = path.join(projectPath, "validations");

  try {
    // Create validation files
    await fs.writeFile(path.join(validationsPath, "auth.ts"), authValidationTemplate);
    await fs.writeFile(path.join(validationsPath, "team.ts"), teamValidationTemplate);
    await fs.writeFile(path.join(validationsPath, "index.ts"), validationIndexTemplate);

    // Create README for validations
    const validationsReadme = `# validations/

Zod validation schemas for form inputs and API requests.

## Files

### \`auth.ts\`
Authentication-related validation schemas.
- Sign up with password requirements
- Sign in validation
- Password reset and profile update schemas
- Type exports for React Hook Form

### \`team.ts\`
Team management validation schemas.
- Team creation and updates
- Member invitation and role management
- Slug validation and constraints
- Type exports for forms

### \`index.ts\`
Consolidated exports for all validation schemas.
- Single import point for all validations
- Re-exports with types for convenience

## Usage

\`\`\`typescript
import { signUpSchema, type SignUpInput } from '@/validations/auth';
import { createTeamSchema } from '@/validations/team';
import { zodResolver } from '@hookform/resolvers/zod';

// With React Hook Form
const { register, handleSubmit } = useForm<SignUpInput>({
  resolver: zodResolver(signUpSchema),
});

// Server-side validation
const result = signUpSchema.safeParse(formData);
if (result.success) {
  // Process valid data
}
\`\`\`
`;

    await fs.writeFile(path.join(validationsPath, "README.md"), validationsReadme);

    console.error(`[DEBUG] Validations structure created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create validations structure: ${error}`);
    throw error;
  }
}

export async function createAuthComponents(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating auth components...`);

  const authComponentsPath = path.join(projectPath, "components", "auth");

  try {
    // Create auth form components
    await fs.writeFile(path.join(authComponentsPath, "login-form.tsx"), loginFormTemplate);
    await fs.writeFile(path.join(authComponentsPath, "signup-form.tsx"), signupFormTemplate);

    // Create README for auth components
    const authComponentsReadme = `# components/auth/

Authentication form components with React Hook Form and shadcn/ui.

## Files

### \`login-form.tsx\`
Complete login form component.
- React Hook Form with Zod validation
- Password visibility toggle
- Error handling and loading states
- shadcn/ui components integration

### \`signup-form.tsx\`
Complete signup form component.
- Extended validation with terms acceptance
- Password strength requirements
- Success state handling
- Responsive design with Tailwind CSS

## Usage

\`\`\`typescript
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';

// In auth pages
export default function SignInPage() {
  return <LoginForm />;
}
\`\`\`

## Features

- **Form Validation**: Zod schemas with React Hook Form
- **Error Handling**: Server and client-side error display
- **Loading States**: Button states and form disable during submission
- **Accessibility**: Proper labels, ARIA attributes, and keyboard navigation
- **Responsive**: Works on all screen sizes with Tailwind CSS
`;

    await fs.writeFile(path.join(authComponentsPath, "README.md"), authComponentsReadme);

    console.error(`[DEBUG] Auth components created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create auth components: ${error}`);
    throw error;
  }
}

export async function createAuthPages(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating auth pages...`);

  try {
    // Create signin page
    const signinPath = path.join(projectPath, "app", "auth", "signin");
    await fs.writeFile(path.join(signinPath, "page.tsx"), authPagesTemplate.signInPage);

    // Create signup page
    const signupPath = path.join(projectPath, "app", "auth", "signup");
    await fs.writeFile(path.join(signupPath, "page.tsx"), authPagesTemplate.signUpPage);

    // Create auth layout
    const authLayoutPath = path.join(projectPath, "app", "auth");
    await fs.writeFile(path.join(authLayoutPath, "layout.tsx"), authPagesTemplate.layoutTemplate);

    console.error(`[DEBUG] Auth pages created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create auth pages: ${error}`);
    throw error;
  }
}

export async function createEnhancedAuthActions(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating enhanced auth actions...`);

  const actionsPath = path.join(projectPath, "actions");

  try {
    // Update the existing auth actions with enhanced version
    await fs.writeFile(path.join(actionsPath, "auth.ts"), authActionsTemplate);

    console.error(`[DEBUG] Enhanced auth actions created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create enhanced auth actions: ${error}`);
    throw error;
  }
}

export async function createEnhancedStructureReadme(projectPath: string): Promise<void> {
  console.error(`[DEBUG] Creating enhanced structure documentation...`);

  const mainReadme = `# Enhanced Project Structure

This Next.js SaaS application follows a well-organized, scalable architecture inspired by modern best practices.

## Directory Structure

\`\`\`
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   │   ├── signin/        # Sign in page
│   │   ├── signup/        # Sign up page
│   │   └── layout.tsx     # Auth layout
│   └── dashboard/         # Protected dashboard routes
├── actions/               # Server actions
│   └── auth.ts           # Authentication actions
├── components/            # React components
│   ├── auth/             # Authentication forms
│   └── ui/               # shadcn/ui components
├── libs/                  # Shared utilities (NEW)
│   ├── env.ts            # Environment validation
│   ├── db.ts             # Database connection
│   ├── logger.ts         # Logging utilities
│   └── utils.ts          # Common utilities
├── models/                # Database models (NEW)
│   ├── user.ts           # User model
│   ├── team.ts           # Team models
│   ├── activity-log.ts   # Activity logging
│   └── schema.ts         # Schema exports
├── validations/           # Zod schemas (NEW)
│   ├── auth.ts           # Auth validation
│   ├── team.ts           # Team validation
│   └── index.ts          # Schema exports
├── lib/                   # Legacy lib structure
│   ├── auth/             # JWT utilities
│   ├── db/               # Database queries
│   └── payments/         # Stripe integration
└── types/                 # TypeScript definitions
\`\`\`

## Key Improvements

### 1. **Organized Utilities (\`libs/\`)**
- Centralized environment validation
- Database connection management
- Structured logging
- Common utility functions

### 2. **Database Models (\`models/\`)**
- Clean Drizzle ORM schemas
- Proper relations and types
- Modular model organization

### 3. **Input Validation (\`validations/\`)**
- Zod schemas for all forms
- Type-safe input validation
- Consistent validation patterns

### 4. **Authentication Components**
- Complete login/signup forms
- React Hook Form integration
- Error handling and loading states
- shadcn/ui component integration

## Usage Patterns

### Import Structure
\`\`\`typescript
// Environment and configuration
import { Env } from '@/libs/env';

// Database operations  
import { db } from '@/libs/db';
import { users } from '@/models/user';

// Validation
import { signUpSchema } from '@/validations/auth';

// Components
import { LoginForm } from '@/components/auth/login-form';
\`\`\`

### Development Workflow
1. **Models**: Define database schemas in \`models/\`
2. **Validations**: Create Zod schemas in \`validations/\`
3. **Components**: Build forms using validation schemas
4. **Actions**: Implement server actions with proper validation
5. **Pages**: Compose pages using components

This structure provides a scalable foundation for growing Next.js applications while maintaining clean separation of concerns.
`;

  try {
    await fs.writeFile(path.join(projectPath, "STRUCTURE.md"), mainReadme);
    console.error(`[DEBUG] Enhanced structure documentation created successfully`);
  } catch (error) {
    console.error(`[ERROR] Failed to create enhanced structure documentation: ${error}`);
    throw error;
  }
}