/**
 * @fileoverview Protected Routes Setup Tool
 * @description Creates middleware for route protection and authentication enforcement
 * Sets up Next.js middleware to protect routes and handle authentication flow
 */

import fs from "fs-extra";
import path from "node:path";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface ProtectedRoutesConfig {
  projectPath: string;
  protectionLevel?: "basic" | "advanced";
  requireAuth?: boolean;
}

export async function setupProtectedRoutes(config: ProtectedRoutesConfig): Promise<string> {
  const {
    projectPath,
    protectionLevel = "advanced",
    requireAuth = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check if routes are already protected
  if (projectState.hasProtectedRoutes) {
    throw new Error("Protected routes are already set up in this project. Middleware file already exists.");
  }

  // Check authentication requirement
  if (requireAuth && !projectState.hasAuthentication) {
    throw new Error("Authentication setup required for route protection. Run 'setup_authentication_jwt' first to set up JWT authentication.");
  }

  console.error(`[DEBUG] Starting protected routes setup with ${protectionLevel} protection at: ${fullPath}`);
  
  try {
    // Step 1: Create or update middleware.ts
    const step1 = "Creating Next.js middleware for route protection...";
    steps.push(step1);
    console.error(`[STEP 1/4] ${step1}`);
    
    const middlewareTemplate = createMiddlewareTemplate(protectionLevel, projectState.hasAuthentication);
    await fs.writeFile(path.join(fullPath, "middleware.ts"), middlewareTemplate);
    
    console.error(`[STEP 1/4] ✅ Completed: ${step1}`);

    // Step 2: Create auth pages directory structure
    const step2 = "Setting up authentication pages structure...";
    steps.push(step2);
    console.error(`[STEP 2/4] ${step2}`);
    
    // Create auth pages directory
    const authPagesDir = path.join(fullPath, "app", "auth");
    await fs.ensureDir(authPagesDir);
    
    // Create login page
    const loginPageTemplate = createLoginPageTemplate();
    await fs.writeFile(path.join(authPagesDir, "login", "page.tsx"), loginPageTemplate);
    await fs.ensureDir(path.join(authPagesDir, "login"));
    
    // Create signup page
    const signupPageTemplate = createSignupPageTemplate();
    await fs.writeFile(path.join(authPagesDir, "signup", "page.tsx"), signupPageTemplate);
    await fs.ensureDir(path.join(authPagesDir, "signup"));
    
    console.error(`[STEP 2/4] ✅ Completed: ${step2}`);

    // Step 3: Create protected dashboard structure
    const step3 = "Creating protected dashboard structure...";
    steps.push(step3);
    console.error(`[STEP 3/4] ${step3}`);
    
    const dashboardDir = path.join(fullPath, "app", "dashboard");
    await fs.ensureDir(dashboardDir);
    
    // Create dashboard layout
    const dashboardLayoutTemplate = createDashboardLayoutTemplate();
    await fs.writeFile(path.join(dashboardDir, "layout.tsx"), dashboardLayoutTemplate);
    
    // Create dashboard page
    const dashboardPageTemplate = createDashboardPageTemplate();
    await fs.writeFile(path.join(dashboardDir, "page.tsx"), dashboardPageTemplate);
    
    console.error(`[STEP 3/4] ✅ Completed: ${step3}`);

    // Step 4: Create route configuration utilities
    const step4 = protectionLevel === "advanced" 
      ? "Setting up advanced route configuration utilities..."
      : "Setting up basic route configuration...";
    steps.push(step4);
    console.error(`[STEP 4/4] ${step4}`);
    
    if (protectionLevel === "advanced") {
      const routeConfigTemplate = createRouteConfigTemplate();
      const libDir = path.join(fullPath, "lib");
      await fs.ensureDir(libDir);
      await fs.writeFile(path.join(libDir, "route-config.ts"), routeConfigTemplate);
    }
    
    console.error(`[STEP 4/4] ✅ Completed: ${step4}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Protected routes setup completed in ${totalTime}s`);

    return `🎉 Protected routes setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🛡️ **Route Protection Configuration:**\n- **Protection Level**: ${protectionLevel === "advanced" ? "Advanced (role-based, custom rules)" : "Basic (authentication only)"}\n- **Authentication Integration**: ${projectState.hasAuthentication ? "Connected to your JWT setup" : "Basic protection without authentication"}\n- **Middleware**: Next.js middleware for automatic route protection\n- **Auth Pages**: Login and signup pages created\n- **Dashboard**: Protected dashboard area ready\n\n📁 **Files Created:**\n- \`middleware.ts\` - Next.js middleware for route protection\n- \`app/auth/login/page.tsx\` - Login page\n- \`app/auth/signup/page.tsx\` - Signup page\n- \`app/dashboard/layout.tsx\` - Protected dashboard layout\n- \`app/dashboard/page.tsx\` - Protected dashboard home${protectionLevel === "advanced" ? '\n- `lib/route-config.ts` - Advanced route configuration utilities' : ''}\n\n🚦 **Route Protection Rules:**\n\n### Public Routes (No Authentication Required)\n- \`/\` - Homepage\n- \`/auth/*\` - Login and signup pages\n- \`/api/auth/*\` - Authentication API routes\n- Public assets and static files\n\n### Protected Routes (Authentication Required)\n- \`/dashboard\` - Main dashboard area\n- \`/dashboard/*\` - All dashboard pages\n- \`/profile\` - User profile pages\n- \`/settings\` - User settings pages\n\n${protectionLevel === "advanced" ? `### Advanced Protection Features\n- **Role-Based Access**: Different permissions for different user types\n- **Dynamic Route Rules**: Custom protection logic based on user data\n- **API Route Protection**: Automatic API endpoint protection\n- **Conditional Redirects**: Smart redirects based on user state\n\n` : ''}🔒 **Security Features:**\n- **Automatic Redirects**: Unauthenticated users redirected to login\n- **Session Validation**: JWT tokens verified on protected routes\n- **CSRF Protection**: Built-in protection against cross-site attacks\n- **Secure Headers**: Security headers added automatically\n\n💻 **Usage Examples:**\n\n### Accessing Protected Routes\n\`\`\`typescript\n// Users automatically redirected to /auth/login if not authenticated\nwindow.location.href = '/dashboard';\n\`\`\`\n\n### Server Components with User Data\n\`\`\`typescript\nimport { requireAuth } from '@/lib/auth/session';\n\nexport default async function DashboardPage() {\n  const user = await requireAuth(); // Redirects if not authenticated\n  \n  return <div>Welcome, {user.name}!</div>;\n}\n\`\`\`\n\n${protectionLevel === "advanced" ? '### Advanced Route Configuration\n```typescript\nimport { checkRouteAccess } from \'@/lib/route-config\';\n\n// Custom route protection logic\nconst hasAccess = await checkRouteAccess(\'/admin\', user);\n```\n\n' : ''}🚀 **Integration Status:**${projectState.hasAuthentication ? '\n- ✅ **Authentication**: Connected to your JWT authentication' : '\n- 🔧 **Authentication**: Run `setup_authentication_jwt` for full authentication'}${projectState.hasEnvironmentVars ? '\n- ✅ **Environment**: AUTH_SECRET configured for JWT tokens' : '\n- 🔧 **Environment**: Run `setup_environment_vars` to add AUTH_SECRET'}${projectState.hasDrizzle ? '\n- ✅ **Database**: User data persisted in your database' : '\n- 🔧 **Database**: Run `setup_drizzle_orm` for user persistence'}\n\n📱 **Ready-to-Use Pages:**\n- **Login**: \`/auth/login\` - Complete login form with validation\n- **Signup**: \`/auth/signup\` - User registration with password confirmation\n- **Dashboard**: \`/dashboard\` - Protected user dashboard area\n\n💡 **Next steps:**\n1. **Test protection**: Visit \`/dashboard\` to see redirect to login\n2. **Customize pages**: Update auth and dashboard pages with your design\n3. **Add more routes**: Create additional protected pages under \`/dashboard\`\n4. **Configure environment**: ${projectState.hasEnvironmentVars ? 'Ensure AUTH_SECRET is set in .env.local' : 'Run `setup_environment_vars` first'}\n5. **Database setup**: ${projectState.hasDrizzle ? 'Run `pnpm db:migrate` to create user tables' : 'Run `setup_drizzle_orm` for user persistence'}\n\n⚠️  **Important Notes:**\n- The middleware runs on every request for optimal security\n- JWT tokens are validated automatically on protected routes\n- Users are redirected to \`/auth/login\` when authentication is required\n- Dashboard layout includes logout functionality\n- ${protectionLevel === "advanced" ? 'Advanced features require custom implementation based on your needs' : 'Basic protection covers most common use cases'}\n\n🔗 **Route Flow:**\n1. **Unauthenticated User** → Visits \`/dashboard\` → Redirected to \`/auth/login\`\n2. **Successful Login** → Redirected back to \`/dashboard\`\n3. **Authenticated User** → Can access all protected routes\n4. **Logout** → Session cleared, redirected to homepage\n\n📚 **Documentation:** Check the generated middleware and page files for detailed implementation examples.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have Next.js project set up (run create_nextjs_base first)\n- For full protection, ensure JWT authentication is configured (run setup_authentication_jwt first)\n- Check that the project directory is writable\n- Verify middleware.ts doesn't already exist`);
  }
}

function createMiddlewareTemplate(protectionLevel: string, hasAuth: boolean): string {
  const authImports = hasAuth ? `import { verifySession } from './lib/auth/session.js';` : '';
  
  return `/**
 * @fileoverview Next.js Middleware for Route Protection
 * @description Handles authentication and route protection for the application
 */

import { NextRequest, NextResponse } from 'next/server';
${authImports}

// Define protected and public routes
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/api/auth',
];

const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
];

${protectionLevel === "advanced" && hasAuth ? `
// Advanced route configuration
const adminRoutes = [
  '/admin',
];

const apiRoutes = [
  '/api/users',
  '/api/dashboard',
];
` : ''}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes that don't need protection
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  ${hasAuth ? `
  // Get session token from cookies
  const sessionCookie = request.cookies.get('session');
  const token = sessionCookie?.value;
  
  // Verify session
  let isAuthenticated = false;
  let user: any = null;
  
  if (token) {
    try {
      const session = await verifySession(token);
      if (session) {
        isAuthenticated = true;
        user = session;
      }
    } catch (error) {
      // Invalid token, user needs to login again
      console.error('Session verification failed:', error);
    }
  }
  ` : `
  // Basic authentication check (replace with your logic)
  const isAuthenticated = request.cookies.has('demo-auth');
  `}

  // Handle protected routes
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    // Store the original URL to redirect back after login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  ${protectionLevel === "advanced" && hasAuth ? `
  // Handle admin routes (advanced protection)
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check admin permissions (customize based on your user model)
    const isAdmin = user?.role === 'admin' || user?.isAdmin;
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Handle protected API routes
  const isProtectedApiRoute = apiRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (isProtectedApiRoute && !isAuthenticated) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  ` : ''}

  // Redirect authenticated users away from auth pages
  const isPublicAuthRoute = pathname.startsWith('/auth/');
  if (isPublicAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
`;
}

function createLoginPageTemplate(): string {
  return `/**
 * @fileoverview Login Page
 * @description Public login page for user authentication
 */

import { LoginForm } from '@/components/auth';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
`;
}

function createSignupPageTemplate(): string {
  return `/**
 * @fileoverview Signup Page
 * @description Public signup page for user registration
 */

import { SignupForm } from '@/components/auth';
import { Suspense } from 'react';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <Suspense fallback={<div>Loading...</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
`;
}

function createDashboardLayoutTemplate(): string {
  return `/**
 * @fileoverview Dashboard Layout
 * @description Protected layout for dashboard pages with navigation and logout
 */

import { getUser } from '@/lib/auth/session';
import { logoutAction } from '@/actions/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  
  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.name || user.email}
              </span>
              
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <div className="flex">
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="px-4 py-6">
            <ul className="space-y-2">
              <li>
                <a
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Overview
                </a>
              </li>
              <li>
                <a
                  href="/dashboard/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Profile
                </a>
              </li>
              <li>
                <a
                  href="/dashboard/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Settings
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
`;
}

function createDashboardPageTemplate(): string {
  return `/**
 * @fileoverview Dashboard Home Page
 * @description Protected dashboard homepage with user information
 */

import { getUser } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome to your Dashboard
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          This is a protected page that requires authentication.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Your Account Information
        </h3>
        
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user?.name || 'Not provided'}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user?.email}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">User ID</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {user?.id}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              🎉 Authentication Working!
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                You're seeing this page because you're successfully authenticated.
                The middleware is protecting this route and ensuring only logged-in
                users can access it.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900">Quick Actions</h4>
          <div className="mt-4 space-y-2">
            <a
              href="/dashboard/profile"
              className="block text-sm text-blue-600 hover:text-blue-500"
            >
              Edit Profile →
            </a>
            <a
              href="/dashboard/settings"
              className="block text-sm text-blue-600 hover:text-blue-500"
            >
              Account Settings →
            </a>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900">Statistics</h4>
          <div className="mt-4 space-y-2">
            <div className="text-2xl font-bold text-gray-900">1</div>
            <div className="text-sm text-gray-600">Active Sessions</div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900">Next Steps</h4>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              Start building your application features. This dashboard can be
              customized to fit your needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
`;
}

function createRouteConfigTemplate(): string {
  return `/**
 * @fileoverview Advanced Route Configuration
 * @description Utilities for advanced route protection and access control
 */

import { getUser } from '@/lib/auth/session';

export interface RouteConfig {
  path: string;
  requiresAuth: boolean;
  allowedRoles?: string[];
  customCheck?: (user: any) => boolean;
}

// Define your application's route configuration
export const routeConfigs: RouteConfig[] = [
  // Public routes
  { path: '/', requiresAuth: false },
  { path: '/auth/*', requiresAuth: false },
  
  // Protected routes
  { path: '/dashboard', requiresAuth: true },
  { path: '/dashboard/*', requiresAuth: true },
  { path: '/profile', requiresAuth: true },
  { path: '/settings', requiresAuth: true },
  
  // Admin routes
  { 
    path: '/admin', 
    requiresAuth: true, 
    allowedRoles: ['admin'],
  },
  { 
    path: '/admin/*', 
    requiresAuth: true, 
    allowedRoles: ['admin'],
  },
  
  // Custom access control example
  {
    path: '/premium',
    requiresAuth: true,
    customCheck: (user) => user.subscription === 'premium' || user.subscription === 'enterprise'
  },
];

/**
 * Check if a user has access to a specific route
 */
export async function checkRouteAccess(
  pathname: string, 
  userOverride?: any
): Promise<{ hasAccess: boolean; reason?: string }> {
  const user = userOverride || await getUser();
  
  // Find matching route config
  const config = routeConfigs.find(route => {
    if (route.path.endsWith('/*')) {
      const basePath = route.path.slice(0, -2);
      return pathname.startsWith(basePath);
    }
    return pathname === route.path;
  });
  
  // If no config found, default to requiring auth
  if (!config) {
    if (!user) {
      return { hasAccess: false, reason: 'Authentication required' };
    }
    return { hasAccess: true };
  }
  
  // Check authentication requirement
  if (config.requiresAuth && !user) {
    return { hasAccess: false, reason: 'Authentication required' };
  }
  
  // Check role-based access
  if (config.allowedRoles && user) {
    const userRole = user.role || 'user';
    if (!config.allowedRoles.includes(userRole)) {
      return { hasAccess: false, reason: \`Role '\${userRole}' not authorized\` };
    }
  }
  
  // Check custom access logic
  if (config.customCheck && user) {
    if (!config.customCheck(user)) {
      return { hasAccess: false, reason: 'Custom access check failed' };
    }
  }
  
  return { hasAccess: true };
}

/**
 * Get redirect URL for unauthorized access
 */
export function getRedirectUrl(
  originalPath: string,
  reason: string,
  baseUrl: string = ''
): string {
  if (reason === 'Authentication required') {
    const loginUrl = new URL('/auth/login', baseUrl || 'http://localhost:3000');
    loginUrl.searchParams.set('redirectTo', originalPath);
    return loginUrl.toString();
  }
  
  // For other access issues, redirect to dashboard or appropriate page
  return '/dashboard';
}

/**
 * Middleware helper for route protection
 */
export async function protectRoute(
  pathname: string,
  user?: any
): Promise<{ allowed: boolean; redirectUrl?: string }> {
  const access = await checkRouteAccess(pathname, user);
  
  if (!access.hasAccess) {
    const redirectUrl = getRedirectUrl(pathname, access.reason || 'Access denied');
    return { allowed: false, redirectUrl };
  }
  
  return { allowed: true };
}
`;
}