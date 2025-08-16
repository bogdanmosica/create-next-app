# Creating a SaaS NextJs App with MCP

## Automated Setup (Recommended)

Use the Model Context Protocol to automatically create a complete SaaS starter:

```bash
# Using MCP to create a complete SaaS app
npx @modelcontextprotocol/cli create-nextjs-mcp /path/to/your/project
```

This will automatically execute all 18 steps below and create a production-ready SaaS application with:

- ✅ Next.js with TypeScript
- ✅ Tailwind CSS
- ✅ Biome for linting and formatting
- ✅ shadcn/ui components (all components)
- ✅ Drizzle ORM with PostgreSQL
- ✅ JWT Authentication system (bcrypt + jose)
- ✅ Stripe payments integration
- ✅ Team/user management
- ✅ Protected routes middleware
- ✅ Complete folder structure
- ✅ Environment configuration
- ✅ VSCode settings

## Manual Setup (Step by Step)

If you prefer to set up manually, follow these steps:

### 1. Install Next without eslint and using pnpm

```cmd
npx create-next-app@latest . --typescript --tailwind --app --use-pnpm --yes
```

### 2. Install Biome instead of Eslint

```cmd
pnpm add -D -E @biomejs/biome
```

### 3. Initialize Biome config
```cmd
pnpm exec biome init
```

### 4. Copy Biome config content
```json
{
  "$schema": "https://biomejs.dev/schemas/2.2.0/schema.json",
  "vcs": {
    "enabled": false,
    "clientKind": "git",
    "useIgnoreFile": false
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "app/**/*",
      "biome.json",
      "package.json",
      "tsconfig.json",
      "!node_modules",
      "!next",
      "!.next",
      "!out",
      "!build"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "recommended": true,
        "useComponentExportOnlyModules": "off"
      },
      "a11y": "warn",
      "suspicious": {
        "recommended": true,
        "noReactSpecificProps": "off"
      },
      "complexity": {
        "recommended": true,
        "noExcessiveLinesPerFunction": {
          "level": "warn",
          "options": {
            "maxLines": 120
          }
        }
      },
      "security": "warn",
      "performance": {
        "recommended": true,
        "noNamespaceImport": "off",
        "useSolidForComponent": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": {
          "level": "on",
          "options": {
            "groups": [
              [":PACKAGE:", "react", "next", "next/**"],
              ":BLANK_LINE:",
              "@/actions",
              ":BLANK_LINE:",
              "@/components",
              ":BLANK_LINE:",
              "@/hooks",
              ":BLANK_LINE:",
              "@/lib",
              ":BLANK_LINE:",
              "@/types",
              ":BLANK_LINE:",
              ":PATH:"
            ]
          }
        }
      }
    }
  }
}
```

### 5. Create a file in `.vscode/settings.json` and add:
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

### 6. Add shadcn components:

> First we initialize `components.json` file:

```cmd
npx shadcn@latest init --yes -b neutral

```
> Then we create all ui components by:

```cmd
npx shadcn@latest add --all
```

> Use Biome to fix issues in components folder:
```cmd
pnpm exec biome check --write components
```
>**also add this line to `package.json` in `scripts` name as `components:format:fix`**

### 7. Create following folders if they don't exist:
```md
.
├── app
│    ├── favicon.ico
│    ├── globals.css
│    ├── layout.tsx
│    └── page.tsx
├── actions
│   ├── .gitkeep
│   └── README.md
├── components
│   ├── .gitkeep
│   ├── README.md
│   └── ui (created by shadcn)
├── lib
│   ├── auth/
│   │   ├── middleware.ts
│   │   └── session.ts
│   ├── db/
│   │   ├── migrations/
│   │   ├── drizzle.ts
│   │   ├── queries.ts
│   │   ├── schema.ts
│   │   ├── seed.ts
│   │   └── setup.ts
│   ├── payments/
│   │   ├── actions.ts
│   │   └── stripe.ts
│   ├── constants/
│   └── utils.ts
├── types
├── middleware.ts (root level)
├── .env
├── .env.example
├── biome.json
├── next-env.d.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
└── tsconfig.json
```

### 8. Install SaaS Dependencies

```cmd
# Core SaaS dependencies
pnpm add stripe bcryptjs jose zod drizzle-orm postgres dotenv

# Dev dependencies
pnpm add -D @types/bcryptjs drizzle-kit
```

### 9. Add Drizzle and complete setup

```cmd
# Generate Drizzle configuration
pnpm drizzle-kit generate --config=drizzle.config.ts
```

## SaaS Features Included

### Authentication System
- JWT-based session management
- Password hashing with bcrypt
- Protected routes middleware
- User registration/login

### Payment Integration
- Stripe checkout sessions
- Customer portal
- Subscription management
- Webhook handling

### Database Schema
- Users table with roles
- Teams and team members
- Activity logs
- Stripe integration fields

### Team Management
- Multi-tenant architecture
- Team member invitations
- Role-based permissions
- Team subscriptions

## How to aggregate README.md 

For each folder that contains a `README.md` file, copy the given content into each README.md file:

### `./actions`

```md
## Example of action 

> File name example `./user.ts`; we will take user as example, it can be anything, post, to do, article.
```typescript
'use server'
import { db } from '@/lib/db' // Your database client

import { UserModel } from '@/types' // Your types folder
 
export async function createUser(data: UserModel) {
  const user = await db.user.create({ data })
  return user
}
```


```typescript
'use server'
import { db } from '@/lib/db'
 
export async function fetchUsers() {
  const users = await db.user.findMany()
  return users
}
``` 
> and how to use it:
```jsx
'use client'
import { fetchUsers } from '@/actions';
import { Button } from '@/components/ui/button';
 
export default function MyButton() {
  return <Button onClick={() => fetchUsers()}>Fetch Users</Button>
}
```

### `./components`

```md
## Example use of a Shadcn component:

```jsx
"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ObjectType = {
  Age: "age",
  Sex: "sex",
  Country: "country",
} as const;

const selectOptions = [
  { label: "Age", value: ObjectType.Age },
  { label: "Sex", value: ObjectType.Sex },
  { label: "Country", value: ObjectType.Country },
];

export function SelectExample() {
  const [selected, setSelected] = useState("");

  return (
    <Select value={selected} onValueChange={setSelected}>
      <SelectTrigger>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {selectOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```
> **IMPORTANT** if a constant like `ObjectType` in this example is used across all the other components it should be saved under `lib/constants/object-type.ts` in our case, that goes for any other constants.
```

## SaaS Starter Features

### Authentication (`lib/auth/`)
- **session.ts**: JWT token management, password hashing
- **middleware.ts**: Action validation, user/team middleware

### Database (`lib/db/`)
- **schema.ts**: Complete database schema (users, teams, team_members, activity_logs)
- **drizzle.ts**: Database connection setup
- **queries.ts**: Database query functions
- **seed.ts**: Initial data seeding with Stripe products
- **setup.ts**: Stripe CLI setup and configuration

### Payments (`lib/payments/`)
- **stripe.ts**: Stripe client, checkout sessions, customer portal
- **actions.ts**: Server actions for payment flows

### Root Middleware
- **middleware.ts**: Route protection, session management

### Key Features
- ✅ Multi-tenant team structure
- ✅ Role-based permissions (owner, member)
- ✅ Stripe subscription management
- ✅ JWT session handling
- ✅ Protected routes
- ✅ Activity logging
- ✅ Database migrations
- ✅ TypeScript throughout

## Getting Started

### Quick Start
1. Create your SaaS app using the MCP (recommended)
2. Set up PostgreSQL database
3. Configure Stripe account
4. Set environment variables
5. Initialize database
6. Start development

## Environment Setup

After creation, configure your environment:

### 1. Database Setup
```bash
# Set up PostgreSQL database URL in .env
POSTGRES_URL="postgresql://username:password@localhost:5432/dbname"
```

### 2. Stripe Configuration
```bash
# Add your Stripe keys to .env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Initialize Database
```bash
# Set up Stripe products
pnpm db:setup

# Seed initial data
pnpm db:seed

# Run migrations
pnpm db:migrate
```

### 4. Available Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:setup": "npx tsx lib/db/setup.ts",
    "db:seed": "npx tsx lib/db/seed.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "components:format:fix": "biome check --write components"
  }
}
```

### 5. Environment Variables

Complete `.env` file structure:

```env
# Database
POSTGRES_URL="postgresql://username:password@localhost:5432/dbname"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App
BASE_URL=http://localhost:3000
AUTH_SECRET=4dc1b1d64debc9db673f360d3bd4c114e3b6b14fa36d93d5973d0a31b48c319f
```
