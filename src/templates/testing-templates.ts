/**
 * @fileoverview Testing Configuration Templates
 * @description Templates for Vitest, Playwright, and testing utilities setup
 * Includes configuration files, test utilities, and example tests
 */

export const vitestConfigTemplate = `/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});`;

export const vitestSetupTemplate = `import "@testing-library/jest-dom";
import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server";

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());`;

export const testUtilsTemplate = `import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render, userEvent };`;

export const mswHandlersTemplate = `import { http, HttpResponse } from "msw";

export const handlers = [
  // Auth endpoints
  http.post("/api/auth/login", () => {
    return HttpResponse.json({
      user: {
        id: "1",
        email: "test@example.com",
        name: "Test User",
      },
      token: "mock-jwt-token",
    });
  }),

  http.post("/api/auth/register", () => {
    return HttpResponse.json({
      user: {
        id: "2",
        email: "new@example.com",
        name: "New User",
      },
      token: "mock-jwt-token",
    });
  }),

  // API endpoints
  http.get("/api/user", () => {
    return HttpResponse.json({
      id: "1",
      email: "test@example.com",
      name: "Test User",
    });
  }),
];`;

export const mswServerTemplate = `import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);`;

export const playwrightConfigTemplate = `import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like \`await page.goto('/')\`. */
    baseURL: "http://127.0.0.1:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

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
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});`;

export const sampleUnitTestTemplate = `import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "@/tests/test-utils";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole("button", { name: "Click me" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeDisabled();
  });
});`;

export const sampleE2ETestTemplate = `import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should allow user to login", async ({ page }) => {
    await page.goto("/login");

    // Fill in the login form
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "password123");
    await page.click('[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    
    // Should display user info
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test("should allow user to register", async ({ page }) => {
    await page.goto("/register");

    // Fill in the registration form
    await page.fill('[name="name"]', "New User");
    await page.fill('[name="email"]', "newuser@example.com");
    await page.fill('[name="password"]', "password123");
    await page.fill('[name="confirmPassword"]', "password123");
    await page.click('[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    
    // Should display welcome message
    await expect(page.locator("text=Welcome, New User")).toBeVisible();
  });

  test("should handle login errors", async ({ page }) => {
    await page.goto("/login");

    // Fill in invalid credentials
    await page.fill('[name="email"]', "invalid@example.com");
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('[type="submit"]');

    // Should display error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator("text=Invalid credentials")).toBeVisible();
  });
});`;