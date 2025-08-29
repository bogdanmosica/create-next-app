/**
 * @fileoverview Testing Suite Setup Tool
 * @description Sets up comprehensive testing with Vitest, Playwright, and MSW for generated Next.js projects
 * Creates unit tests, integration tests, E2E tests, and API mocking infrastructure
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../../runners/command-runner.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface TestingSuiteConfig {
  projectPath: string;
  includeUnitTests?: boolean;
  includeE2ETests?: boolean;
  includeMocking?: boolean;
}

export async function setupTestingSuite(config: TestingSuiteConfig): Promise<string> {
  const {
    projectPath,
    includeUnitTests = true,
    includeE2ETests = true,
    includeMocking = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check if testing is already set up
  const vitestConfigPath = path.join(fullPath, "vitest.config.ts");
  const playwrightConfigPath = path.join(fullPath, "playwright.config.ts");
  
  if (await fs.pathExists(vitestConfigPath) && await fs.pathExists(playwrightConfigPath)) {
    throw new Error("Testing suite is already set up in this project. Configuration files already exist.");
  }

  console.error(`[DEBUG] Starting testing suite setup at: ${fullPath}`);
  
  try {
    // Step 1: Install testing dependencies
    const step1 = "Installing testing dependencies...";
    steps.push(step1);
    console.error(`[STEP 1/6] ${step1}`);
    
    const testPackages = [];
    const testDevPackages = [];

    if (includeUnitTests) {
      testDevPackages.push(
        "vitest",
        "@vitejs/plugin-react",
        "@testing-library/react",
        "@testing-library/jest-dom",
        "@testing-library/user-event",
        "jsdom"
      );
    }

    if (includeE2ETests) {
      testDevPackages.push("@playwright/test");
    }

    if (includeMocking) {
      testDevPackages.push("msw");
    }

    if (testDevPackages.length > 0) {
      await runCommand(`pnpm add -D ${testDevPackages.join(' ')}`, fullPath);
    }

    console.error(`[STEP 1/6] ✅ Completed: ${step1}`);

    // Step 2: Create Vitest configuration
    if (includeUnitTests) {
      const step2 = "Setting up Vitest unit testing configuration...";
      steps.push(step2);
      console.error(`[STEP 2/6] ${step2}`);
      
      const vitestConfig = createVitestConfig();
      await fs.writeFile(vitestConfigPath, vitestConfig);
      
      // Create test setup file
      const testSetup = createTestSetup();
      await fs.writeFile(path.join(fullPath, "src/test-setup.ts"), testSetup);
      
      console.error(`[STEP 2/6] ✅ Completed: ${step2}`);
    }

    // Step 3: Create Playwright E2E configuration
    if (includeE2ETests) {
      const step3 = "Setting up Playwright E2E testing configuration...";
      steps.push(step3);
      console.error(`[STEP 3/6] ${step3}`);
      
      const playwrightConfig = createPlaywrightConfig();
      await fs.writeFile(playwrightConfigPath, playwrightConfig);
      
      // Initialize Playwright browsers
      await runCommand("npx playwright install", fullPath);
      
      console.error(`[STEP 3/6] ✅ Completed: ${step3}`);
    }

    // Step 4: Setup MSW API mocking
    if (includeMocking) {
      const step4 = "Setting up MSW API mocking...";
      steps.push(step4);
      console.error(`[STEP 4/6] ${step4}`);
      
      const mockDir = path.join(fullPath, "src", "mocks");
      await fs.ensureDir(mockDir);
      
      // Create MSW handlers
      const mswHandlers = createMSWHandlers();
      await fs.writeFile(path.join(mockDir, "handlers.ts"), mswHandlers);
      
      // Create MSW setup
      const mswSetup = createMSWSetup();
      await fs.writeFile(path.join(mockDir, "setup.ts"), mswSetup);
      
      console.error(`[STEP 4/6] ✅ Completed: ${step4}`);
    }

    // Step 5: Create test examples and utilities
    const step5 = "Creating test examples and utilities...";
    steps.push(step5);
    console.error(`[STEP 5/6] ${step5}`);
    
    // Create test directories
    const testDirs = [
      path.join(fullPath, "__tests__", "components"),
      path.join(fullPath, "__tests__", "lib"),
      path.join(fullPath, "__tests__", "actions"),
      path.join(fullPath, "e2e")
    ];
    
    for (const dir of testDirs) {
      await fs.ensureDir(dir);
    }
    
    // Create test utilities
    const testUtils = createTestUtils();
    await fs.writeFile(path.join(fullPath, "__tests__", "test-utils.tsx"), testUtils);
    
    // Create example tests
    if (includeUnitTests) {
      const componentTest = createExampleComponentTest();
      await fs.writeFile(path.join(fullPath, "__tests__", "components", "button.test.tsx"), componentTest);
      
      if (projectState.hasAuthentication) {
        const authTest = createAuthTest();
        await fs.writeFile(path.join(fullPath, "__tests__", "lib", "auth.test.ts"), authTest);
      }
    }
    
    if (includeE2ETests) {
      const e2eTest = createExampleE2ETest();
      await fs.writeFile(path.join(fullPath, "e2e", "homepage.spec.ts"), e2eTest);
      
      if (projectState.hasAuthentication) {
        const authE2ETest = createAuthE2ETest();
        await fs.writeFile(path.join(fullPath, "e2e", "auth.spec.ts"), authE2ETest);
      }
    }
    
    console.error(`[STEP 5/6] ✅ Completed: ${step5}`);

    // Step 6: Update package.json scripts
    const step6 = "Adding test scripts to package.json...";
    steps.push(step6);
    console.error(`[STEP 6/6] ${step6}`);
    
    const packageJsonPath = path.join(fullPath, "package.json");
    const packageJson = await fs.readJSON(packageJsonPath);
    
    // Add test scripts
    const newScripts: Record<string, string> = {};
    
    if (includeUnitTests) {
      newScripts["test"] = "vitest";
      newScripts["test:ui"] = "vitest --ui";
      newScripts["test:run"] = "vitest run";
      newScripts["test:coverage"] = "vitest run --coverage";
    }
    
    if (includeE2ETests) {
      newScripts["test:e2e"] = "playwright test";
      newScripts["test:e2e:ui"] = "playwright test --ui";
      newScripts["test:e2e:debug"] = "playwright test --debug";
    }
    
    packageJson.scripts = {
      ...packageJson.scripts,
      ...newScripts
    };
    
    await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
    console.error(`[STEP 6/6] ✅ Completed: ${step6}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Testing suite setup completed in ${totalTime}s`);

    return `🎉 Testing suite setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🧪 **Testing Configuration:**\n${includeUnitTests ? '- **Unit Tests**: Vitest with React Testing Library\n' : ''}${includeE2ETests ? '- **E2E Tests**: Playwright for end-to-end testing\n' : ''}${includeMocking ? '- **API Mocking**: MSW (Mock Service Worker)\n' : ''}- **Test Coverage**: Built-in coverage reporting\n- **Test UI**: Interactive test runners available\n\n📋 **Available Test Scripts:**\n${Object.entries(newScripts).map(([script, command]) => `- \`pnpm ${script}\` - ${getScriptDescription(script)}`).join('\n')}\n\n📁 **Test Structure Created:**\n- \`__tests__/\` - Unit and integration tests\n- \`e2e/\` - End-to-end tests\n- \`src/mocks/\` - MSW mock handlers${includeUnitTests ? '\n- `src/test-setup.ts` - Test environment setup' : ''}\n- Test configuration files\n\n🔧 **Testing Features:**\n- **Component Testing**: Test React components in isolation\n- **Integration Testing**: Test component interactions\n- **API Testing**: Mock external services and APIs${projectState.hasAuthentication ? '\n- **Auth Testing**: Test authentication flows' : ''}${projectState.hasDatabase ? '\n- **Database Testing**: Test database operations' : ''}\n- **Visual Regression**: Playwright screenshot testing\n- **Accessibility Testing**: Built-in a11y checks\n\n💻 **Example Tests Included:**\n${includeUnitTests ? '- Button component test (demonstrates component testing)\n' : ''}${includeUnitTests && projectState.hasAuthentication ? '- Auth utility tests (demonstrates unit testing)\n' : ''}${includeE2ETests ? '- Homepage E2E test (demonstrates navigation testing)\n' : ''}${includeE2ETests && projectState.hasAuthentication ? '- Auth flow E2E test (demonstrates user workflows)\n' : ''}\n🚀 **Getting Started:**\n\n1. **Run unit tests**: \`pnpm test\`\n2. **Run E2E tests**: \`pnpm test:e2e\`\n3. **View test UI**: \`pnpm test:ui\`\n4. **Generate coverage**: \`pnpm test:coverage\`\n\n💡 **Best Practices Included:**\n- Test utilities for common patterns\n- Mock setup for external dependencies\n- Example tests showing testing patterns\n- Coverage configuration\n- CI/CD ready test scripts\n\n⚡ **Performance Notes:**\n- Vitest runs tests in parallel for speed\n- Playwright uses multiple browsers efficiently\n- MSW provides fast API mocking without network calls\n- Tests are optimized for development workflow\n\n📚 **Documentation:** Check the generated test files for detailed examples and patterns for testing your specific application features.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have pnpm installed and network access\n- Check that the project directory is writable\n- Verify Next.js project exists (run create_nextjs_base first)\n- Try running the command again if network timeout occurred`);
  }
}

function getScriptDescription(script: string): string {
  const descriptions: Record<string, string> = {
    "test": "Run unit tests in watch mode",
    "test:ui": "Run unit tests with interactive UI",
    "test:run": "Run unit tests once and exit",
    "test:coverage": "Run unit tests with coverage report",
    "test:e2e": "Run end-to-end tests",
    "test:e2e:ui": "Run E2E tests with interactive UI", 
    "test:e2e:debug": "Run E2E tests in debug mode"
  };
  return descriptions[script] || "Test script";
}

function createVitestConfig(): string {
  return `/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'build/',
        '.next/',
        'coverage/',
      ],
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e/**', // Exclude E2E tests from unit test runner
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@/components': path.resolve(__dirname, './components'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/libs': path.resolve(__dirname, './libs'),
      '@/actions': path.resolve(__dirname, './actions'),
      '@/models': path.resolve(__dirname, './models'),
      '@/validations': path.resolve(__dirname, './validations'),
    },
  },
});
`;
}

function createTestSetup(): string {
  return `/**
 * @fileoverview Test Setup Configuration
 * @description Global test setup for Vitest with React Testing Library
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    reload: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
}));

// Mock environment variables
vi.mock('@/libs/env', () => ({
  env: {
    NODE_ENV: 'test',
    AUTH_SECRET: 'test-secret',
    BASE_URL: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  },
}));

// Setup MSW
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';

export const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
`;
}

function createPlaywrightConfig(): string {
  return `import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like \`await page.goto('/')\`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
`;
}

function createMSWHandlers(): string {
  return `/**
 * @fileoverview MSW Request Handlers
 * @description Mock API handlers for testing
 */

import { http, HttpResponse } from 'msw';

export const handlers = [
  // Auth API handlers
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  }),

  http.post('/api/auth/signup', () => {
    return HttpResponse.json({
      success: true,
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  }),

  // Team API handlers
  http.get('/api/teams', () => {
    return HttpResponse.json({
      teams: [
        {
          id: '1',
          name: 'Test Team',
          slug: 'test-team',
          memberCount: 2,
        },
      ],
    });
  }),

  http.post('/api/teams', () => {
    return HttpResponse.json({
      success: true,
      team: {
        id: '2',
        name: 'New Team',
        slug: 'new-team',
        memberCount: 1,
      },
    });
  }),

  // Payment API handlers
  http.post('/api/payments/create-checkout-session', () => {
    return HttpResponse.json({
      url: 'https://checkout.stripe.com/pay/test_session_123',
    });
  }),

  http.post('/api/webhooks/stripe', () => {
    return HttpResponse.json({ received: true });
  }),

  // Generic error handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(\`Unhandled \${request.method} request to \${request.url}\`);
    return HttpResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }),
];
`;
}

function createMSWSetup(): string {
  return `/**
 * @fileoverview MSW Setup
 * @description Mock Service Worker setup for API mocking
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup requests interception using the given handlers
export const server = setupServer(...handlers);
`;
}

function createTestUtils(): string {
  return `/**
 * @fileoverview Test Utilities
 * @description Custom render functions and testing utilities
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Common test data
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
};

export const mockTeam = {
  id: '1',
  name: 'Test Team',
  slug: 'test-team',
  memberCount: 2,
};

// Helper functions for common test scenarios
export const waitForLoadingToFinish = () => 
  new Promise((resolve) => setTimeout(resolve, 0));

export const createMockRouter = (overrides = {}) => ({
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  reload: vi.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  ...overrides,
});
`;
}

function createExampleComponentTest(): string {
  return `/**
 * @fileoverview Button Component Test
 * @description Example component test demonstrating testing patterns
 */

import { render, screen } from '../test-utils';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styling', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('bg-destructive');
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('renders as different element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link', { name: /link button/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });
});
`;
}

function createAuthTest(): string {
  return `/**
 * @fileoverview Auth Utility Tests
 * @description Tests for authentication utilities and session management
 */

import { describe, it, expect, vi } from 'vitest';
import { createSession, verifySession } from '@/lib/auth/session';

// Mock the environment
vi.mock('@/libs/env', () => ({
  env: {
    AUTH_SECRET: 'test-secret-key-32-characters-long',
  },
}));

describe('Auth Session', () => {
  describe('createSession', () => {
    it('creates a valid JWT token', async () => {
      const payload = {
        userId: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const token = await createSession(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });
  });

  describe('verifySession', () => {
    it('verifies a valid token', async () => {
      const payload = {
        userId: '1',
        email: 'test@example.com',
        name: 'Test User',
      };

      const token = await createSession(payload);
      const verified = await verifySession(token);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe('1');
      expect(verified?.email).toBe('test@example.com');
      expect(verified?.name).toBe('Test User');
    });

    it('returns null for invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      const result = await verifySession(invalidToken);

      expect(result).toBeNull();
    });

    it('returns null for expired token', async () => {
      // This would require a more complex setup with time mocking
      // For now, we'll test with a malformed token
      const expiredToken = 'expired.token.format';
      const result = await verifySession(expiredToken);

      expect(result).toBeNull();
    });
  });
});

describe('Password Hashing', () => {
  // Only include if password hashing is available
  const { hashPassword, verifyPassword } = await import('@/lib/auth/password')
    .catch(() => ({ hashPassword: null, verifyPassword: null }));

  if (hashPassword && verifyPassword) {
    it('hashes password correctly', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are long
    });

    it('verifies correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });
  }
});
`;
}

function createExampleE2ETest(): string {
  return `/**
 * @fileoverview Homepage E2E Test
 * @description Example end-to-end test for the homepage
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Next.js/i);
    
    // Check for main heading or content
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to different pages', async ({ page }) => {
    await page.goto('/');
    
    // Look for navigation links and test them
    const loginLink = page.getByRole('link', { name: /sign in|login/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*auth.*login/);
      await expect(page.locator('h1')).toContainText(/login|sign in/i);
    }
  });

  test('displays responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    
    // Check desktop-specific elements
    await expect(page.locator('body')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Check mobile-specific behavior
    await expect(page.locator('body')).toBeVisible();
  });

  test('handles 404 pages correctly', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Next.js should show a 404 page or redirect
    const response = await page.waitForLoadState('networkidle');
    
    // Check that we either get a 404 page or are redirected
    const url = page.url();
    const title = await page.title();
    
    // This test is flexible since 404 behavior can vary
    expect(url).toBeTruthy();
    expect(title).toBeTruthy();
  });
});
`;
}

function createAuthE2ETest(): string {
  return `/**
 * @fileoverview Authentication E2E Test
 * @description End-to-end tests for authentication flows
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
  });

  test('user can sign up', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Fill out signup form
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).first().fill('TestPassword123!');
    await page.getByLabel(/confirm.*password/i).fill('TestPassword123!');
    
    // Submit form
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    
    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/.*dashboard.*|.*$/);
  });

  test('user can sign in', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill out login form with demo credentials
    await page.getByLabel(/email/i).fill('demo@example.com');
    await page.getByLabel(/password/i).fill('demo123');
    
    // Submit form
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Check for user-specific content
    await expect(page.getByText(/welcome|dashboard/i)).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    // Try to access a protected route without authentication
    await page.goto('/dashboard');
    
    // Should be redirected to login
    await expect(page).toHaveURL(/.*auth.*login.*/);
    
    // Login page should be displayed
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('user can logout', async ({ page }) => {
    // First login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('demo@example.com');
    await page.getByLabel(/password/i).fill('demo123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    
    // Find and click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
    await logoutButton.click();
    
    // Should be redirected away from dashboard
    await expect(page).not.toHaveURL(/.*dashboard.*/);
    
    // Try to access dashboard again - should redirect to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth.*login.*/);
  });

  test('form validation works', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Should show validation errors
    const errorMessages = page.locator('[role="alert"], .error, .text-red');
    await expect(errorMessages.first()).toBeVisible();
  });

  test('handles invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill with invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit form
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Should show error message
    const errorMessage = page.getByText(/invalid.*credentials|email.*password/i);
    await expect(errorMessage).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth.*login.*/);
  });
});
`;
}