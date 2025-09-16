/**
 * @fileoverview Browser E2E Tests for Generated Applications
 * @description Tests generated Next.js applications in actual browser environments
 * Constitutional compliance: Runtime behavior validation for Build-First Testing
 */

import { test, expect, Page, Browser, chromium } from '@playwright/test';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'child_process';

interface TestProject {
  name: string;
  path: string;
  preset: string;
  features?: any;
  devServer?: ChildProcess;
  url?: string;
}

class E2ETestRunner {
  private testProjects: TestProject[] = [];
  private browser: Browser | null = null;
  private baseTestDir: string;

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-e2e-tests-${Date.now()}`);
  }

  async setup() {
    // Ensure test directory exists
    await fs.ensureDir(this.baseTestDir);

    // Launch browser
    this.browser = await chromium.launch({ headless: true });
  }

  async teardown() {
    // Stop all dev servers
    for (const project of this.testProjects) {
      if (project.devServer) {
        project.devServer.kill('SIGTERM');
      }
    }

    // Close browser
    if (this.browser) {
      await this.browser.close();
    }

    // Clean up test directories
    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }
  }

  /**
   * Generate a test project using MCP tools
   */
  async generateProject(name: string, preset: string, features?: any): Promise<TestProject> {
    const projectPath = path.join(this.baseTestDir, name);

    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      projectName: name,
      resumeTransaction: false,
      enableRollback: true
    });

    // Generate project based on preset or custom features
    if (preset !== 'custom') {
      await orchestrator.createFullApp({ preset });
    } else {
      await orchestrator.createFullApp(features);
    }

    const project: TestProject = {
      name,
      path: projectPath,
      preset,
      features
    };

    this.testProjects.push(project);
    return project;
  }

  /**
   * Start development server for a project
   */
  async startDevServer(project: TestProject, port: number = 3000): Promise<string> {
    return new Promise((resolve, reject) => {
      const devServer = spawn('pnpm', ['dev'], {
        cwd: project.path,
        stdio: 'pipe',
        env: { ...process.env, PORT: port.toString() }
      });

      let output = '';

      devServer.stdout?.on('data', (data) => {
        output += data.toString();
        if (output.includes('Local:') || output.includes('localhost')) {
          project.devServer = devServer;
          project.url = `http://localhost:${port}`;
          resolve(project.url);
        }
      });

      devServer.stderr?.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Error') && !output.includes('Local:')) {
          reject(new Error(`Dev server failed to start: ${error}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!project.url) {
          devServer.kill();
          reject(new Error('Dev server startup timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Create a new browser page
   */
  async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call setup() first.');
    }
    return await this.browser.newPage();
  }
}

// Global test runner instance
let testRunner: E2ETestRunner;

test.beforeAll(async () => {
  testRunner = new E2ETestRunner();
  await testRunner.setup();
});

test.afterAll(async () => {
  if (testRunner) {
    await testRunner.teardown();
  }
});

test.describe('Generated Next.js Applications E2E Tests', () => {

  test('Minimal preset - should render homepage correctly', async () => {
    // Generate minimal project
    const project = await testRunner.generateProject('minimal-app', 'minimal');

    // Start dev server
    const url = await testRunner.startDevServer(project, 3001);

    // Create browser page and test
    const page = await testRunner.createPage();

    try {
      await page.goto(url);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check basic Next.js functionality
      await expect(page).toHaveTitle(/Next.js/);

      // Check that shadcn/ui components are working
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        await expect(buttons.first()).toBeVisible();
      }

      // Check for no JavaScript errors in console
      const errors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.push(message.text());
        }
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      expect(errors).toHaveLength(0);

    } finally {
      await page.close();
    }
  });

  test('Blog preset - should have working navigation and content', async () => {
    const project = await testRunner.generateProject('blog-app', 'blog');
    const url = await testRunner.startDevServer(project, 3002);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Check for blog-specific elements
      const navigation = page.locator('nav');
      await expect(navigation).toBeVisible();

      // Check for content sections
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Test navigation if present
      const navLinks = page.locator('nav a');
      if (await navLinks.count() > 0) {
        await navLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Should still be on a valid page
        await expect(page).not.toHaveURL(/404/);
      }

    } finally {
      await page.close();
    }
  });

  test('Dashboard preset - should have protected routes', async () => {
    const project = await testRunner.generateProject('dashboard-app', 'dashboard');
    const url = await testRunner.startDevServer(project, 3003);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Try to access dashboard route (should redirect to auth if protected)
      await page.goto(`${url}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Should either show dashboard or redirect to login
      const currentUrl = page.url();
      const hasAuthRedirect = currentUrl.includes('/auth') || currentUrl.includes('/login');
      const hasDashboard = await page.locator('[data-testid="dashboard"]').count() > 0;

      expect(hasAuthRedirect || hasDashboard).toBe(true);

    } finally {
      await page.close();
    }
  });

  test('Startup preset - should have complete SaaS features', async () => {
    const project = await testRunner.generateProject('startup-app', 'startup');
    const url = await testRunner.startDevServer(project, 3004);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Check for authentication elements
      const authLinks = page.locator('a[href*="auth"], a[href*="login"], a[href*="signup"]');
      if (await authLinks.count() > 0) {
        await expect(authLinks.first()).toBeVisible();
      }

      // Check for pricing/payment elements
      const pricingElements = page.locator('[data-testid*="pricing"], [class*="pricing"], text=/pricing/i');
      if (await pricingElements.count() > 0) {
        await expect(pricingElements.first()).toBeVisible();
      }

      // Test that the app doesn't crash when navigating
      const allLinks = page.locator('a[href^="/"]');
      const linkCount = await allLinks.count();

      if (linkCount > 0) {
        // Test first few internal links
        for (let i = 0; i < Math.min(3, linkCount); i++) {
          const link = allLinks.nth(i);
          const href = await link.getAttribute('href');

          if (href && href.startsWith('/') && !href.includes('#')) {
            await link.click();
            await page.waitForLoadState('networkidle');

            // Should not be on an error page
            const hasError = await page.locator('text=/error/i, text=/404/i, text=/500/i').count();
            expect(hasError).toBe(0);

            // Go back to home
            await page.goto(url);
            await page.waitForLoadState('networkidle');
          }
        }
      }

    } finally {
      await page.close();
    }
  });

  test('Enterprise preset - should handle all features without errors', async () => {
    const project = await testRunner.generateProject('enterprise-app', 'enterprise');
    const url = await testRunner.startDevServer(project, 3005);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Collect console errors
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      // Test internationalization if present
      const langSwitcher = page.locator('[data-testid*="lang"], [class*="language"], select[name*="lang"]');
      if (await langSwitcher.count() > 0) {
        await langSwitcher.first().click();
        await page.waitForTimeout(1000); // Wait for potential language change
      }

      // Test team/organization features if present
      const teamElements = page.locator('[data-testid*="team"], [class*="team"], text=/team/i');
      if (await teamElements.count() > 0) {
        await expect(teamElements.first()).toBeVisible();
      }

      // Ensure no critical errors occurred
      const criticalErrors = consoleErrors.filter(error =>
        error.includes('ReferenceError') ||
        error.includes('TypeError') ||
        error.includes('SyntaxError')
      );

      expect(criticalErrors).toHaveLength(0);

    } finally {
      await page.close();
    }
  });

  test('Custom features - should work with specific feature combinations', async () => {
    const customFeatures = {
      core: true,
      database: true,
      authentication: true,
      payments: false,
      teamManagement: false,
      devExperience: true,
      internationalization: false
    };

    const project = await testRunner.generateProject('custom-app', 'custom', customFeatures);
    const url = await testRunner.startDevServer(project, 3006);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Should have auth since it's enabled
      const authElements = page.locator('[data-testid*="auth"], a[href*="login"]');
      if (await authElements.count() > 0) {
        await expect(authElements.first()).toBeVisible();
      }

      // Should NOT have payment elements since disabled
      const paymentElements = page.locator('[data-testid*="payment"], text=/stripe/i, text=/billing/i');
      expect(await paymentElements.count()).toBe(0);

      // Should NOT have team elements since disabled
      const teamElements = page.locator('[data-testid*="team"], text=/team/i');
      expect(await teamElements.count()).toBe(0);

      // Should NOT have language switcher since i18n disabled
      const langElements = page.locator('[data-testid*="lang"], select[name*="lang"]');
      expect(await langElements.count()).toBe(0);

    } finally {
      await page.close();
    }
  });
});