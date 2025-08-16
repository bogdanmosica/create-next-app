# Project Structure Documentation

## Generated SaaS Application Architecture

This document details the complete structure and functionality of applications created by the Next.js SaaS Starter MCP.

## Generated Project Overview

```
your-saas-app/
├── app/                    # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── actions/                # Server Actions
│   ├── .gitkeep
│   └── README.md          # Examples and patterns
├── components/             # React Components
│   ├── ui/                # shadcn/ui components (auto-generated)
│   ├── .gitkeep
│   └── README.md          # Usage examples
├── lib/                   # Core Application Logic
│   ├── auth/              # Authentication System
│   │   ├── middleware.ts  # Action validation & user context
│   │   └── session.ts     # JWT management & password hashing
│   ├── db/                # Database Layer
│   │   ├── migrations/    # Drizzle migrations
│   │   ├── drizzle.ts     # Database connection
│   │   ├── queries.ts     # Database operations
│   │   ├── schema.ts      # Database schema
│   │   ├── seed.ts        # Data seeding
│   │   └── setup.ts       # Stripe setup
│   ├── payments/          # Payment Integration
│   │   ├── actions.ts     # Payment server actions
│   │   └── stripe.ts      # Stripe client & sessions
│   ├── constants/         # Shared Constants
│   └── utils.ts           # Utility functions (shadcn)
├── types/                 # TypeScript Definitions
│   ├── .gitkeep
│   └── README.md
├── middleware.ts          # Route Protection
├── drizzle.config.ts      # Drizzle Configuration
├── .env                   # Environment Variables
├── .env.example           # Environment Template
├── .vscode/
│   └── settings.json      # Editor Configuration
├── biome.json             # Linting Configuration
└── package.json           # Dependencies & Scripts
```

## Feature Breakdown

### 1. Authentication System (`lib/auth/`)

#### `session.ts` - JWT Session Management
- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: jose library for signing/verification
- **Session Management**: Cookie-based sessions with 1-day expiry
- **Security**: HTTP-only, secure, SameSite cookies

**Key Functions:**
- `hashPassword()` - Secure password hashing
- `comparePasswords()` - Password verification
- `signToken()` - JWT token creation
- `verifyToken()` - JWT token validation
- `getSession()` - Current session retrieval
- `setSession()` - Session establishment

#### `middleware.ts` - Action Validation
- **Action Validation**: Zod schema validation for forms
- **User Context**: Automatic user injection for authenticated actions
- **Team Context**: Team-based action middleware
- **Error Handling**: Standardized error responses

### 2. Database Layer (`lib/db/`)

#### `schema.ts` - Database Schema
Complete multi-tenant SaaS schema:

**Tables:**
- **users**: Authentication, roles, soft deletes
- **teams**: Multi-tenant structure with Stripe integration
- **team_members**: Role-based team membership
- **activity_logs**: User action tracking

**Features:**
- Type-safe with Drizzle ORM
- Automatic timestamps
- Stripe integration fields
- Activity tracking enums
- Relation definitions

#### `queries.ts` - Database Operations
- **User Management**: Authentication, profile updates
- **Team Operations**: Team creation, member management
- **Stripe Integration**: Customer/subscription updates
- **Security**: Session validation, permission checks

#### `drizzle.ts` - Database Connection
- PostgreSQL connection with connection pooling
- Environment variable validation
- Schema integration
- Error handling

#### `seed.ts` - Data Initialization
- **Test User**: Default admin user creation
- **Test Team**: Initial team setup
- **Stripe Products**: Automated product/price creation
- **Development Data**: Ready-to-use test data

#### `setup.ts` - Environment Setup
- **Stripe CLI**: Automated authentication check
- **Product Creation**: Base and Plus subscription tiers
- **Webhook Setup**: Development webhook configuration
- **Environment Validation**: Required variable checks

### 3. Payment System (`lib/payments/`)

#### `stripe.ts` - Payment Integration
- **Checkout Sessions**: Subscription flow with trials
- **Customer Portal**: Self-service subscription management
- **Product Management**: Automated tier configuration
- **Error Handling**: Graceful payment failures

**Features:**
- 14-day trial periods
- Promotional code support
- Automatic customer creation
- Portal configuration management

#### `actions.ts` - Payment Server Actions
- **Checkout Flow**: Team-based subscription purchase
- **Portal Access**: Customer subscription management
- **Security**: Team membership validation
- **Redirects**: Proper success/failure handling

### 4. Route Protection (`middleware.ts`)

**Functionality:**
- **Protected Routes**: `/dashboard` and sub-routes
- **Session Validation**: JWT verification on each request
- **Token Refresh**: Automatic session extension
- **Redirects**: Unauthenticated user handling
- **Performance**: GET request optimization

## Development Workflow

### Initial Setup
```bash
# 1. Environment Configuration
cp .env.example .env
# Configure POSTGRES_URL, STRIPE_SECRET_KEY, etc.

# 2. Database Setup
pnpm db:setup    # Sets up Stripe products
pnpm db:migrate  # Applies database schema
pnpm db:seed     # Creates initial test data

# 3. Development
pnpm dev         # Start development server
```

### Available Scripts
- **`pnpm dev`** - Development server with hot reload
- **`pnpm build`** - Production build
- **`pnpm start`** - Production server
- **`pnpm db:generate`** - Generate new migrations
- **`pnpm db:migrate`** - Apply database changes
- **`pnpm db:seed`** - Reset with fresh test data
- **`pnpm db:studio`** - Visual database browser
- **`pnpm components:format:fix`** - Format UI components

### Environment Variables

**Required:**
```env
POSTGRES_URL="postgresql://user:pass@localhost:5432/dbname"
STRIPE_SECRET_KEY="sk_test_..."
AUTH_SECRET="your-32-char-secret"
```

**Optional:**
```env
STRIPE_WEBHOOK_SECRET="whsec_..."  # For webhook handling
BASE_URL="http://localhost:3000"   # For redirects
```

## Security Features

1. **Authentication**: JWT with secure session management
2. **Authorization**: Role-based team permissions
3. **Route Protection**: Middleware-level access control
4. **Password Security**: bcrypt hashing with salt
5. **Session Security**: HTTP-only, secure cookies
6. **Input Validation**: Zod schema validation
7. **SQL Security**: Drizzle ORM prevents injection

## Extensibility Points

### Adding New Features
1. **Database Changes**: Update `schema.ts` and generate migrations
2. **New Routes**: Add to middleware protection if needed
3. **Payment Tiers**: Update Stripe products in `seed.ts`
4. **Team Roles**: Extend role enum and permissions
5. **Activity Types**: Add to activity log enum

### Customization
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: PostgreSQL with easy provider switching
- **Authentication**: JWT-based, easily replaceable
- **Payments**: Stripe integration, swappable providers
- **Deployment**: Next.js compatible with any platform

## Testing Strategy

### Test Data
- **Default User**: `test@test.com` / `admin123`
- **Default Team**: "Test Team" with owner permissions
- **Stripe Products**: Base ($8/month) and Plus ($12/month)

### Development Flow
1. Run `pnpm db:seed` for fresh test data
2. Login with test credentials
3. Test subscription flows with Stripe test mode
4. Use `pnpm db:studio` for database inspection

This structure provides a complete, production-ready SaaS foundation that can be immediately deployed and customized for specific business needs.