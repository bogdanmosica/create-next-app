/**
 * @fileoverview NextAuth.js Authentication Setup Tool
 * @description Sets up NextAuth.js (Auth.js) authentication with credentials provider and database integration
 * Creates complete authentication system with session handling and user CRUD operations
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../../runners/command-runner.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface AuthenticationJwtConfig {
  projectPath: string;
  includePasswordHashing?: boolean;
  includeUserManagement?: boolean;
  requireDatabase?: boolean;
  includeOAuthProviders?: boolean;
}

export async function setupAuthenticationJwt(config: AuthenticationJwtConfig): Promise<string> {
  const {
    projectPath,
    includePasswordHashing = true,
    includeUserManagement = true,
    requireDatabase = true,
    includeOAuthProviders = false
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check if authentication is already set up
  if (projectState.hasAuthentication) {
    throw new Error("NextAuth.js authentication is already set up in this project. Authentication libraries are already installed.");
  }

  // Check database requirement
  if (requireDatabase && !projectState.hasDrizzle) {
    throw new Error("Database setup required for authentication. Run 'setup_drizzle_orm' first to set up the database layer.");
  }

  console.error(`[DEBUG] Starting NextAuth.js authentication setup at: ${fullPath}`);
  
  try {
    // Step 1: Install authentication dependencies
    const step1 = "Installing NextAuth.js authentication dependencies...";
    steps.push(step1);
    console.error(`[STEP 1/7] ${step1}`);
    
    const authPackages = ["next-auth@beta", "zod"];
    if (includePasswordHashing) {
      authPackages.push("bcryptjs");
    }
    
    const devPackages = [];
    if (includePasswordHashing) {
      devPackages.push("@types/bcryptjs");
    }
    
    await runCommand(`pnpm add ${authPackages.join(' ')}`, fullPath);
    if (devPackages.length > 0) {
      await runCommand(`pnpm add -D ${devPackages.join(' ')}`, fullPath);
    }
    
    console.error(`[STEP 1/7] ✅ Completed: ${step1}`);

    // Step 2: Create NextAuth.js configuration
    const step2 = "Creating NextAuth.js configuration...";
    steps.push(step2);
    console.error(`[STEP 2/7] ${step2}`);
    
    // Create main auth.ts configuration
    const authConfigTemplate = createAuthConfigTemplate(includeOAuthProviders, projectState.hasDrizzle);
    await fs.writeFile(path.join(fullPath, "auth.ts"), authConfigTemplate);
    
    console.error(`[STEP 2/7] ✅ Completed: ${step2}`);

    // Step 3: Create versioned API route handlers
    const step3 = "Setting up NextAuth.js versioned API route handlers...";
    steps.push(step3);
    console.error(`[STEP 3/7] ${step3}`);
    
    // Create versioned NextAuth API route
    const apiV1AuthDir = path.join(fullPath, "app", "api", "v1", "auth", "[...nextauth]");
    await fs.ensureDir(apiV1AuthDir);
    
    const nextAuthRouteTemplate = createApiRouteTemplate();
    await fs.writeFile(path.join(apiV1AuthDir, "route.ts"), nextAuthRouteTemplate);
    
    // Create additional auth-related API endpoints
    const apiV1UserDir = path.join(fullPath, "app", "api", "v1", "user");
    await fs.ensureDir(apiV1UserDir);
    
    if (includeUserManagement && projectState.hasDrizzle) {
      // Create user profile endpoint
      const userProfileDir = path.join(apiV1UserDir, "profile");
      await fs.ensureDir(userProfileDir);
      const userProfileTemplate = createUserProfileApiTemplate();
      await fs.writeFile(path.join(userProfileDir, "route.ts"), userProfileTemplate);
      
      // Create user management endpoints
      const userManagementTemplate = createUserManagementApiTemplate();
      await fs.writeFile(path.join(apiV1UserDir, "route.ts"), userManagementTemplate);
    }
    
    console.error(`[STEP 3/7] ✅ Completed: ${step3}`);

    // Step 4: Create password hashing utilities (if enabled)
    const step4 = includePasswordHashing 
      ? "Creating password hashing utilities with bcrypt..."
      : "Skipping password hashing utilities...";
    steps.push(step4);
    console.error(`[STEP 4/7] ${step4}`);
    
    const libAuthDir = path.join(fullPath, "libs", "auth");
    await fs.ensureDir(libAuthDir);
    
    if (includePasswordHashing) {
      const passwordTemplate = createPasswordHashingTemplate();
      await fs.writeFile(path.join(libAuthDir, "password.ts"), passwordTemplate);
    }
    
    // Create auth helper utilities
    const authHelpersTemplate = createAuthHelpersTemplate();
    await fs.writeFile(path.join(libAuthDir, "helpers.ts"), authHelpersTemplate);
    
    console.error(`[STEP 4/7] ✅ Completed: ${step4}`);

    // Step 5: Create validation schemas
    const step5 = "Setting up authentication validation schemas...";
    steps.push(step5);
    console.error(`[STEP 5/7] ${step5}`);
    
    const validationSchemaTemplate = createAuthValidationTemplate();
    const validationsDir = path.join(fullPath, "validations");
    await fs.ensureDir(validationsDir);
    await fs.writeFile(path.join(validationsDir, "auth.ts"), validationSchemaTemplate);
    
    console.error(`[STEP 5/7] ✅ Completed: ${step5}`);

    // Step 6: Create user management system (if enabled and database available)
    const step6 = (includeUserManagement && projectState.hasDrizzle) 
      ? "Creating user management system with database integration..."
      : includeUserManagement 
        ? "Creating basic user management (database integration disabled)..."
        : "Skipping user management system...";
    steps.push(step6);
    console.error(`[STEP 6/7] ${step6}`);
    
    if (includeUserManagement) {
      if (projectState.hasDrizzle) {
        // Create user model if it doesn't exist
        const userModelTemplate = createUserModelTemplate();
        const modelsDir = path.join(fullPath, "models");
        await fs.ensureDir(modelsDir);
        const userModelPath = path.join(modelsDir, "user.ts");
        
        if (!await fs.pathExists(userModelPath)) {
          await fs.writeFile(userModelPath, userModelTemplate);
        }
        
        // Create user queries
        const userQueriesTemplate = createUserQueriesTemplate();
        const libDbDir = path.join(fullPath, "libs", "db");
        await fs.ensureDir(libDbDir);
        await fs.writeFile(path.join(libDbDir, "user-queries.ts"), userQueriesTemplate);
      }
      
      // Create authentication actions
      const authActionsTemplate = createAuthActionsTemplate(projectState.hasDrizzle, includePasswordHashing);
      const actionsDir = path.join(fullPath, "actions");
      await fs.ensureDir(actionsDir);
      await fs.writeFile(path.join(actionsDir, "auth.ts"), authActionsTemplate);
      
      // Create dashboard actions with proper data fetching patterns
      const dashboardActionsTemplate = createDashboardActionsTemplate();
      await fs.writeFile(path.join(actionsDir, "dashboard.ts"), dashboardActionsTemplate);
    }
    
    console.error(`[STEP 6/7] ✅ Completed: ${step6}`);

    // Step 7: Create authentication components
    const step7 = "Creating authentication UI components...";
    steps.push(step7);
    console.error(`[STEP 7/7] ${step7}`);
    
    const authComponentsDir = path.join(fullPath, "components", "auth");
    await fs.ensureDir(authComponentsDir);
    
    // Create sign-in form
    const signinFormTemplate = createSignInFormTemplate();
    await fs.writeFile(path.join(authComponentsDir, "signin-form.tsx"), signinFormTemplate);
    
    // Create signup form
    const signupFormTemplate = createSignupFormTemplate();
    await fs.writeFile(path.join(authComponentsDir, "signup-form.tsx"), signupFormTemplate);
    
    // Create auth components
    const authButtonTemplate = createAuthButtonTemplate();
    await fs.writeFile(path.join(authComponentsDir, "auth-button.tsx"), authButtonTemplate);
    
    // Create auth components index
    const authIndexTemplate = `export { SignInForm } from './signin-form.js';\nexport { SignupForm } from './signup-form.js';\nexport { AuthButton } from './auth-button.js';\n`;
    await fs.writeFile(path.join(authComponentsDir, "index.ts"), authIndexTemplate);
    
    console.error(`[STEP 7/7] ✅ Completed: ${step7}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] NextAuth.js authentication setup completed in ${totalTime}s`);

    return `🎉 NextAuth.js authentication setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🔐 **NextAuth.js Configuration:**\n- **Authentication Provider**: ${includeOAuthProviders ? 'Credentials + OAuth providers' : 'Credentials provider'}\n- **Password Security**: ${includePasswordHashing ? 'bcrypt password hashing enabled' : 'Basic authentication (no password hashing)'}\n- **User Management**: ${includeUserManagement ? 'Full CRUD operations enabled' : 'Basic authentication only'}\n- **Database Integration**: ${projectState.hasDrizzle ? 'Connected to your Drizzle setup' : 'No database integration'}\n- **Type Safety**: Full TypeScript integration with Zod validation\n\n📁 **Files Created:**\n- \`auth.ts\` - NextAuth.js configuration\n- \`app/api/v1/auth/[...nextauth]/route.ts\` - Versioned NextAuth API route handler${includeUserManagement && projectState.hasDrizzle ? '\n- `app/api/v1/user/route.ts` - User management API endpoints\n- `app/api/v1/user/profile/route.ts` - User profile API endpoints' : ''}\n${includePasswordHashing ? '- `libs/auth/password.ts` - bcrypt password hashing\n' : ''}- \`libs/auth/helpers.ts\` - Authentication helper utilities\n- \`validations/auth.ts\` - Zod validation schemas${includeUserManagement && projectState.hasDrizzle ? '\n- `libs/db/user-queries.ts` - Database user operations' : ''}${includeUserManagement ? '\n- `actions/auth.ts` - Authentication server actions\n- `actions/dashboard.ts` - Dashboard data fetching actions' : ''}\n- \`components/auth/\` - Sign-in, signup forms and auth button\n\n🔒 **Security Features:**\n- **NextAuth.js**: Industry-standard authentication library${includePasswordHashing ? '\n- **Password Hashing**: bcrypt with salt for secure password storage' : ''}\n- **Session Management**: Automatic token refresh and CSRF protection\n- **Input Validation**: Zod schemas prevent invalid data\n- **Type Safety**: Full TypeScript coverage\n\n💻 **Usage Examples:**\n\n### Server-Side Authentication\n\`\`\`typescript\nimport { auth } from '@/auth';\n\n// Get current user in server components/actions\nconst session = await auth();\nif (!session?.user) {\n  redirect('/signin');\n}\n\`\`\`\n\n### Server Components with Data Fetching\n\`\`\`typescript\n// app/dashboard/page.tsx\nimport { getUserDashboardData } from '@/actions/dashboard';\n\nasync function DashboardPage() {\n  const data = await getUserDashboardData();\n  \n  return (\n    <div className=\"space-y-6\">\n      <h1>Welcome, {data.user.name}</h1>\n      <div className=\"grid gap-4\">\n        <p>Account created: {Math.floor(data.stats.accountAge)} days ago</p>\n      </div>\n    </div>\n  );\n}\n\nexport default DashboardPage;\n\`\`\`\n\n### Versioned API Endpoints\n\`\`\`typescript\n// GET /api/v1/user - Get current user\nfetch('/api/v1/user')\n\n// GET /api/v1/user/profile - Get user profile\nfetch('/api/v1/user/profile')\n\n// PUT /api/v1/user/profile - Update profile\nfetch('/api/v1/user/profile', {\n  method: 'PUT',\n  body: JSON.stringify({ name: 'New Name' })\n})\n\`\`\`\n\n### Client-Side Components\n\`\`\`typescript\nimport { SignInForm, SignupForm, AuthButton } from '@/components/auth';\n\n// Use in your pages\n<SignInForm />\n<SignupForm />\n<AuthButton />\n\`\`\`\n\n${includePasswordHashing ? '### Password Operations\n```typescript\nimport { hashPassword, verifyPassword } from \'@/libs/auth/password\';\n\nconst hashedPassword = await hashPassword(password);\nconst isValid = await verifyPassword(password, hashedPassword);\n```\n\n' : ''}🚀 **Integration Status:**${projectState.hasDrizzle ? '\n- ✅ **Database**: Connected to your Drizzle setup' : '\n- 🔧 **Database**: Run `setup_drizzle_orm` for persistent user storage'}${projectState.hasEnvironmentVars ? '\n- ✅ **Environment**: AUTH_SECRET ready for configuration' : '\n- 🔧 **Environment**: Run `setup_environment_vars` to add AUTH_SECRET'}\n- 🔒 **Routes**: Run \`setup_protected_routes\` to add middleware protection\n\n💡 **Next steps:**\n1. **Configure AUTH_SECRET**: ${projectState.hasEnvironmentVars ? 'Update your .env with a secure 32+ character secret (run `npx auth secret`)' : 'Run `setup_environment_vars` first'}\n2. **Protect routes**: Run \`setup_protected_routes\` to add middleware protection\n3. **Create auth pages**: Add /signin and /signup pages using the generated components\n4. **Database setup**: ${projectState.hasDrizzle ? 'Run `pnpm db:generate` and `pnpm db:migrate` to create user tables' : 'Run `setup_drizzle_orm` for user persistence'}\n\n⚠️  **Important Notes:**\n- Set a strong AUTH_SECRET using \`npx auth secret\` command\n- NextAuth.js handles CSRF protection and session management automatically\n- User data is ${projectState.hasDrizzle ? 'persisted in your database' : 'not persisted without database setup'}\n- Password hashing uses bcrypt with automatic salt generation\n\n📚 **Documentation:** Check https://authjs.dev for comprehensive NextAuth.js documentation.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have pnpm installed\n- Check that the project directory is writable\n- Verify Next.js project exists (run create_nextjs_base first)\n- For database integration, ensure Drizzle is set up (run setup_drizzle_orm first)`);
  }
}

function createAuthConfigTemplate(includeOAuthProviders: boolean, hasDatabase: boolean): string {
  const oauthProviders = includeOAuthProviders ? `
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  GitHub({
    clientId: process.env.GITHUB_ID!,
    clientSecret: process.env.GITHUB_SECRET!,
  }),` : '';
  
  const databaseConfig = hasDatabase ? `
  adapter: DrizzleAdapter(db, {
    usersTable: userTable,
    accountsTable: accountTable,
    sessionsTable: sessionTable,
    verificationTokensTable: verificationTokenTable,
  }),
  session: { strategy: "database" },` : `
  session: { strategy: "jwt" },`;
  
  const imports = includeOAuthProviders ? `import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";` : '';
  const dbImports = hasDatabase ? `import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/libs/db";
import { userTable, accountTable, sessionTable, verificationTokenTable } from "@/models/user";` : '';
  
  return `/**
 * @fileoverview NextAuth.js Configuration
 * @description Main NextAuth.js configuration with credentials provider and database integration
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
${imports}
${dbImports}
${hasDatabase ? 'import { getUserByEmail } from "@/libs/db/user-queries";' : ''}
${hasDatabase ? 'import { verifyPassword } from "@/libs/auth/password";' : ''}
import { loginSchema } from "@/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);
        
        if (!validatedFields.success) {
          return null;
        }
        
        const { email, password } = validatedFields.data;
        
        ${hasDatabase ? `try {
          const user = await getUserByEmail(email);
          if (!user || !user.passwordHash) {
            return null;
          }
          
          const isValidPassword = await verifyPassword(password, user.passwordHash);
          if (!isValidPassword) {
            return null;
          }
          
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }` : `// Demo authentication without database
        if (email === "demo@example.com" && password === "demo123") {
          return {
            id: "1",
            email: email,
            name: "Demo User",
          };
        }
        return null;`}
      },
    }),${oauthProviders}
  ],${databaseConfig}
  basePath: "/api/v1/auth",
  pages: {
    signIn: "/signin",
    signUp: "/signup",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
});
`;
}

function createApiRouteTemplate(): string {
  return `/**
 * @fileoverview NextAuth.js Versioned API Route Handler
 * @description API route handler for NextAuth.js authentication at /api/v1/auth
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
`;
}

function createAuthHelpersTemplate(): string {
  return `/**
 * @fileoverview Authentication Helper Utilities
 * @description Helper functions for NextAuth.js authentication
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Get current user session
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

/**
 * Require user to be authenticated (for server components/actions)
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/signin');
  }
  return session.user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session?.user;
}
`;
}

function createSignInFormTemplate(): string {
  return `/**
 * @fileoverview Sign In Form Component
 * @description Reusable sign-in form with NextAuth.js integration
 */

'use client';

import { useFormState } from 'react-dom';
import { signInAction } from '@/actions/auth.js';

export function SignInForm() {
  const [state, formAction] = useFormState(signInAction, {});

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Sign In</h1>
        <p className="text-muted-foreground">
          Enter your email and password to sign in to your account
        </p>
      </div>
      
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {state.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          Sign In
        </button>
      </form>
      
      <div className="text-center text-sm">
        Don't have an account?{' '}
        <a href="/signup" className="underline">
          Sign up
        </a>
      </div>
    </div>
  );
}
`;
}

function createAuthButtonTemplate(): string {
  return `/**
 * @fileoverview Auth Button Component
 * @description Sign in/out button with session management
 */

import { auth } from '@/auth';
import { signOutAction } from '@/actions/auth.js';

export async function AuthButton() {
  const session = await auth();
  
  if (session?.user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {session.user.email}
        </span>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
          >
            Sign Out
          </button>
        </form>
      </div>
    );
  }
  
  return (
    <a
      href="/signin"
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
    >
      Sign In
    </a>
  );
}
`;
}

function createUserProfileApiTemplate(): string {
  return `/**
 * @fileoverview User Profile API Route
 * @description API endpoints for user profile management at /api/v1/user/profile
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserById, updateUser } from "@/libs/db/user-queries";
import { updateProfileSchema } from "@/validations/auth";

// GET /api/v1/user/profile - Get current user profile
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(parseInt(session.user.id));
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Return user without password hash
    const { passwordHash, ...publicUser } = user;
    return Response.json({ user: publicUser });
  } catch (error) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/v1/user/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const updatedUser = await updateUser(parseInt(session.user.id), validatedData);
    if (!updatedUser) {
      return Response.json({ error: "Failed to update user" }, { status: 500 });
    }

    return Response.json({ user: updatedUser });
  } catch (error) {
    if (error.name === 'ZodError') {
      return Response.json({ error: "Invalid input data" }, { status: 400 });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
`;
}

function createUserManagementApiTemplate(): string {
  return `/**
 * @fileoverview User Management API Route
 * @description API endpoints for user management at /api/v1/user
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserById } from "@/libs/db/user-queries";

// GET /api/v1/user - Get current user data
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserById(parseInt(session.user.id));
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Return user without password hash
    const { passwordHash, ...publicUser } = user;
    return Response.json({ 
      user: publicUser,
      version: "v1"
    });
  } catch (error) {
    return Response.json({ 
      error: "Internal server error",
      version: "v1"
    }, { status: 500 });
  }
}

// DELETE /api/v1/user - Delete current user account
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Add user deletion logic here
    // const deleted = await deleteUser(parseInt(session.user.id));
    
    return Response.json({ 
      message: "Account deletion requested",
      version: "v1"
    });
  } catch (error) {
    return Response.json({ 
      error: "Internal server error",
      version: "v1"
    }, { status: 500 });
  }
}
`;
}

function createDashboardActionsTemplate(): string {
  return `/**
 * @fileoverview Dashboard Server Actions
 * @description Server actions for dashboard data fetching using proper separation of concerns
 */

"use server";

import { auth } from "@/auth";
import { getUserById } from "@/libs/db/user-queries";
import { redirect } from "next/navigation";

export async function getUserDashboardData() {
  const session = await auth();
  if (!session?.user) {
    redirect('/signin');
  }
  
  try {
    const user = await getUserById(parseInt(session.user.id));
    if (!user) {
      throw new Error('User not found');
    }
    
    // Return dashboard data without exposing sensitive information
    const { passwordHash, ...publicUser } = user;
    
    return {
      user: publicUser,
      stats: {
        totalSessions: 1,
        lastLogin: user.updatedAt,
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      }
    };
  } catch (error) {
    throw new Error('Failed to fetch dashboard data');
  }
}

export async function updateUserProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect('/signin');
  }
  
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  
  // Add validation logic here
  if (!name || !email) {
    throw new Error('Name and email are required');
  }
  
  try {
    const updatedUser = await updateUser(parseInt(session.user.id), { name, email });
    return updatedUser;
  } catch (error) {
    throw new Error('Failed to update profile');
  }
}
`;
}

function createJwtSessionTemplate(): string {
  return `/**
 * @fileoverview JWT Session Management
 * @description Handles JWT token creation, verification, and user session management
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const secretKey = process.env.AUTH_SECRET;
if (!secretKey) {
  throw new Error('AUTH_SECRET environment variable is required');
}

const key = new TextEncoder().encode(secretKey);
const COOKIE_NAME = 'session';
const COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  value: '',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export interface SessionPayload {
  userId: string;
  email: string;
  name?: string;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

/**
 * Create a JWT token with user data
 */
export async function createSession(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
  
  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    
    return payload as SessionPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    ...COOKIE_OPTIONS,
    value: token,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
}

/**
 * Get session token from cookies
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  return sessionCookie?.value || null;
}

/**
 * Get current user from session
 */
export async function getUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;
  
  const session = await verifySession(token);
  if (!session) return null;
  
  return {
    id: session.userId,
    email: session.email,
    name: session.name,
  };
}

/**
 * Clear session cookie (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    ...COOKIE_OPTIONS,
    value: '',
    expires: new Date(0),
  });
}

/**
 * Require user to be authenticated (for server components/actions)
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Update session with new user data
 */
export async function updateSession(userData: Partial<User>): Promise<void> {
  const currentUser = await getUser();
  if (!currentUser) return;
  
  const newSessionData: SessionPayload = {
    userId: currentUser.id,
    email: userData.email || currentUser.email,
    name: userData.name || currentUser.name,
  };
  
  const token = await createSession(newSessionData);
  await setSessionCookie(token);
}
`;
}

function createPasswordHashingTemplate(): string {
  return `/**
 * @fileoverview Password Hashing Utilities
 * @description Secure password hashing and verification using bcrypt
 */

import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Check if password meets security requirements
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
`;
}

function createAuthMiddlewareTemplate(): string {
  return `/**
 * @fileoverview Authentication Middleware
 * @description Middleware utilities for protecting server actions and validating users
 */

import { z } from 'zod';
import { getUser } from './session.js';
import { redirect } from 'next/navigation';

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any;
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

/**
 * Validate form data with Zod schema
 */
export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<ActionState & T> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    
    if (!result.success) {
      return { 
        error: result.error.issues[0]?.message || 'Validation failed'
      };
    }

    try {
      return await action(result.data, formData);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>
) => Promise<T>;

/**
 * Validate form data and require authenticated user
 */
export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData): Promise<ActionState & T> => {
    const user = await getUser();
    if (!user) {
      redirect('/login');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    
    if (!result.success) {
      return { 
        error: result.error.issues[0]?.message || 'Validation failed'
      };
    }

    try {
      return await action(result.data, formData, user);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };
}
`;
}

function createAuthValidationTemplate(): string {
  return `/**
 * @fileoverview Authentication Validation Schemas
 * @description Zod schemas for authentication forms and data validation
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
});

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
`;
}

function createUserModelTemplate(): string {
  return `/**
 * @fileoverview User Database Model
 * @description User table definition for authentication system
 */

import { pgTable, serial, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

export const userTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(userTable);
export const selectUserSchema = createSelectSchema(userTable);

// Omit sensitive fields for public user type
export const publicUserSchema = selectUserSchema.omit({
  passwordHash: true,
});

export type User = typeof userTable.$inferSelect;
export type NewUser = typeof userTable.$inferInsert;
export type PublicUser = typeof publicUserSchema._type;
`;
}

function createUserQueriesTemplate(): string {
  return `/**
 * @fileoverview User Database Queries
 * @description Database operations for NextAuth.js user management
 */

import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { userTable, type User, type NewUser, type PublicUser } from '../../models/user.js';

/**
 * Create a new user
 */
export async function createUser(userData: NewUser): Promise<PublicUser> {
  const [user] = await db
    .insert(userTable)
    .values({
      ...userData,
      updatedAt: new Date(),
    })
    .returning();
  
  if (!user) {
    throw new Error('Failed to create user');
  }
  
  // Return user without password hash
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1);
  
  return user || null;
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | null> {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1);
  
  return user || null;
}

/**
 * Get public user data by ID (no password hash)
 */
export async function getPublicUserById(id: number): Promise<PublicUser | null> {
  const user = await getUserById(id);
  if (!user) return null;
  
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Update user data
 */
export async function updateUser(id: number, userData: Partial<NewUser>): Promise<PublicUser> {
  const [user] = await db
    .update(userTable)
    .set({
      ...userData,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, id))
    .returning();
  
  if (!user) {
    throw new Error('Failed to update user');
  }
  
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

/**
 * Update user password
 */
export async function updateUserPassword(id: number, passwordHash: string): Promise<void> {
  await db
    .update(userTable)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, id));
}

/**
 * Delete user
 */
export async function deleteUser(id: number): Promise<void> {
  await db
    .delete(userTable)
    .where(eq(userTable.id, id));
}

/**
 * Update email verification status
 */
export async function updateEmailVerified(id: number, emailVerified: Date | null = new Date()): Promise<void> {
  await db
    .update(userTable)
    .set({
      emailVerified,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, id));
}
`;
}

function createAuthActionsTemplate(hasDatabase: boolean, hasPasswordHashing: boolean): string {
  const passwordImport = hasPasswordHashing ? "import { hashPassword, verifyPassword } from '@/libs/auth/password';" : "";
  const userQueriesImport = hasDatabase ? "import { createUser, getUserByEmail } from '@/libs/db/user-queries';" : "";
  
  return `/**
 * @fileoverview Authentication Server Actions
 * @description Server actions for login, signup, and user management
 */

import { createSession, setSessionCookie, clearSession } from '@/libs/auth/session';
import { validatedAction, validatedActionWithUser } from '@/libs/auth/middleware';
import { loginSchema, signupSchema } from '@/validations/auth';
import { redirect } from 'next/navigation';
${passwordImport}
${userQueriesImport}

/**
 * Login action
 */
export const loginAction = validatedAction(loginSchema, async (data) => {
  const { email, password } = data;
  
  ${hasDatabase ? `
  try {
    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return { error: 'Invalid email or password' };
    }
    
    ${hasPasswordHashing ? `
    // Verify password
    if (!user.passwordHash) {
      return { error: 'Account not properly configured' };
    }
    
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return { error: 'Invalid email or password' };
    }
    ` : `
    // Basic password check (no hashing - not recommended for production)
    if (password !== 'admin') { // Replace with your logic
      return { error: 'Invalid email or password' };
    }
    `}
    
    // Create session
    const token = await createSession({
      userId: user.id.toString(),
      email: user.email,
      name: user.name || undefined,
    });
    
    await setSessionCookie(token);
    
    return { success: 'Logged in successfully' };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'An unexpected error occurred' };
  }
  ` : `
  // Demo login without database
  // Replace this with your actual authentication logic
  if (email === 'demo@example.com' && password === 'demo123') {
    const token = await createSession({
      userId: '1',
      email: email,
      name: 'Demo User',
    });
    
    await setSessionCookie(token);
    return { success: 'Logged in successfully' };
  }
  
  return { error: 'Invalid email or password' };
  `}
});

/**
 * Signup action
 */
export const signupAction = validatedAction(signupSchema, async (data) => {
  const { name, email, password } = data;
  
  ${hasDatabase ? `
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return { error: 'User with this email already exists' };
    }
    
    ${hasPasswordHashing ? `
    // Hash password
    const passwordHash = await hashPassword(password);
    ` : `
    // Store password as plain text (not recommended for production)
    const passwordHash = password;
    `}
    
    // Create user
    const user = await createUser({
      name,
      email,
      passwordHash,
      emailVerified: false,
    });
    
    // Create session
    const token = await createSession({
      userId: user.id.toString(),
      email: user.email,
      name: user.name || undefined,
    });
    
    await setSessionCookie(token);
    
    return { success: 'Account created successfully' };
  } catch (error) {
    console.error('Signup error:', error);
    return { error: 'Failed to create account' };
  }
  ` : `
  // Demo signup without database
  // Replace this with your actual user creation logic
  try {
    const token = await createSession({
      userId: Date.now().toString(),
      email: email,
      name: name,
    });
    
    await setSessionCookie(token);
    return { success: 'Account created successfully' };
  } catch (error) {
    console.error('Signup error:', error);
    return { error: 'Failed to create account' };
  }
  `}
});

/**
 * Logout action
 */
export async function logoutAction() {
  await clearSession();
  redirect('/');
}
`;
}

function createLoginFormTemplate(): string {
  return `/**
 * @fileoverview Login Form Component
 * @description Reusable login form with validation and error handling
 */

'use client';

import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { loginAction } from '@/actions/auth.js';

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push('/dashboard');
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Login</h1>
        <p className="text-muted-foreground">
          Enter your email and password to login to your account
        </p>
      </div>
      
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {state.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {state.error}
          </div>
        )}

        {state.success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            {state.success}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          Login
        </button>
      </form>
      
      <div className="text-center text-sm">
        Don't have an account?{' '}
        <a href="/signup" className="underline">
          Sign up
        </a>
      </div>
    </div>
  );
}
`;
}

function createSignupFormTemplate(): string {
  return `/**
 * @fileoverview Signup Form Component
 * @description Reusable signup form with validation and error handling
 */

'use client';

import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signupAction } from '@/actions/auth.js';

export function SignupForm() {
  const [state, formAction] = useFormState(signupAction, {});
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push('/dashboard');
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Create Account</h1>
        <p className="text-muted-foreground">
          Enter your information to create an account
        </p>
      </div>
      
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your name"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {state.error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {state.error}
          </div>
        )}

        {state.success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
            {state.success}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
        >
          Create Account
        </button>
      </form>
      
      <div className="text-center text-sm">
        Already have an account?{' '}
        <a href="/login" className="underline">
          Login
        </a>
      </div>
    </div>
  );
}
`;
}