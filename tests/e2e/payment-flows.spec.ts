/**
 * @fileoverview Payment Integration E2E Tests with Stripe Test Mode
 * @description Tests payment workflows in generated applications using browser automation
 * Constitutional compliance: Payment system behavior validation for Build-First Testing
 */

import { test, expect, Page, Browser, chromium } from '@playwright/test';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, ChildProcess } from 'child_process';
import { createServer, Server } from 'http';

interface PaymentTestProject {
  name: string;
  path: string;
  devServer?: ChildProcess;
  mockStripeServer?: Server;
  url?: string;
  stripePort?: number;
}

class PaymentFlowTestRunner {
  private testProjects: PaymentTestProject[] = [];
  private browser: Browser | null = null;
  private baseTestDir: string;
  private baseStripePort = 4000;

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-payment-e2e-tests-${Date.now()}`);
  }

  async setup() {
    await fs.ensureDir(this.baseTestDir);
    this.browser = await chromium.launch({ headless: true });
  }

  async teardown() {
    // Stop all servers
    for (const project of this.testProjects) {
      if (project.devServer) {
        project.devServer.kill('SIGTERM');
      }
      if (project.mockStripeServer) {
        project.mockStripeServer.close();
      }
    }

    if (this.browser) {
      await this.browser.close();
    }

    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }
  }

  /**
   * Create mock Stripe server for E2E testing
   */
  async createMockStripeServer(port: number): Promise<Server> {
    return new Promise((resolve) => {
      const server = createServer((req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const url = new URL(req.url || '', `http://localhost:${port}`);

        // Mock Stripe endpoints that frontend would call
        if (req.method === 'POST' && url.pathname === '/create-payment-intent') {
          this.handleMockPaymentIntent(req, res);
        } else if (req.method === 'POST' && url.pathname === '/create-checkout-session') {
          this.handleMockCheckoutSession(req, res);
        } else if (req.method === 'POST' && url.pathname === '/create-subscription') {
          this.handleMockSubscription(req, res);
        } else if (url.pathname === '/success') {
          this.handlePaymentSuccess(req, res);
        } else if (url.pathname === '/cancel') {
          this.handlePaymentCancel(req, res);
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      });

      server.listen(port, () => {
        resolve(server);
      });
    });
  }

  private handleMockPaymentIntent(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const response = {
        clientSecret: `pi_test_${Date.now()}_secret_test`,
        paymentIntentId: `pi_test_${Date.now()}`,
        status: 'requires_payment_method'
      };

      res.writeHead(200);
      res.end(JSON.stringify(response));
    });
  }

  private handleMockCheckoutSession(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const response = {
        url: `http://localhost:${req.socket.localPort}/mock-checkout`,
        sessionId: `cs_test_${Date.now()}`
      };

      res.writeHead(200);
      res.end(JSON.stringify(response));
    });
  }

  private handleMockSubscription(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const response = {
        subscriptionId: `sub_test_${Date.now()}`,
        clientSecret: `sub_test_${Date.now()}_secret`,
        status: 'active'
      };

      res.writeHead(200);
      res.end(JSON.stringify(response));
    });
  }

  private handlePaymentSuccess(req: any, res: any) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <h1>Payment Successful!</h1>
          <p data-testid="payment-success">Thank you for your payment.</p>
          <a href="/" data-testid="return-home">Return to Home</a>
        </body>
      </html>
    `);
  }

  private handlePaymentCancel(req: any, res: any) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <h1>Payment Cancelled</h1>
          <p data-testid="payment-cancelled">Your payment was cancelled.</p>
          <a href="/" data-testid="return-home">Return to Home</a>
        </body>
      </html>
    `);
  }

  /**
   * Generate project with payment features
   */
  async generatePaymentProject(name: string): Promise<PaymentTestProject> {
    const projectPath = path.join(this.baseTestDir, name);
    await fs.ensureDir(projectPath);

    const orchestrator = new TransactionalOrchestrator({
      projectPath,
      projectName: name,
      resumeTransaction: false,
      enableRollback: true
    });

    // Generate project with payment features
    await orchestrator.createFullApp({
      core: true,
      database: true,
      authentication: true,
      payments: true, // Enable Stripe payments
      teamManagement: false,
      devExperience: false,
      internationalization: false
    });

    const stripePort = this.baseStripePort++;

    // Set up test environment with mock Stripe
    const envPath = path.join(projectPath, '.env');
    const envContent = `
DATABASE_URL="sqlite:test-payments.db"
AUTH_SECRET="test-secret-key"
STRIPE_SECRET_KEY="sk_test_mock"
STRIPE_PUBLISHABLE_KEY="pk_test_mock"
STRIPE_WEBHOOK_SECRET="whsec_test"
BASE_URL="http://localhost:3000"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_mock"
`.trim();

    await fs.writeFile(envPath, envContent);

    // Create mock Stripe server
    const mockStripeServer = await this.createMockStripeServer(stripePort);

    const project: PaymentTestProject = {
      name,
      path: projectPath,
      mockStripeServer,
      stripePort
    };

    this.testProjects.push(project);
    return project;
  }

  async startDevServer(project: PaymentTestProject, port: number = 3000): Promise<string> {
    return new Promise((resolve, reject) => {
      // Install dependencies
      const installProcess = spawn('pnpm', ['install'], {
        cwd: project.path,
        stdio: 'pipe'
      });

      installProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Failed to install dependencies'));
          return;
        }

        // Start dev server
        const devServer = spawn('pnpm', ['dev'], {
          cwd: project.path,
          stdio: 'pipe',
          env: { ...process.env, PORT: port.toString() }
        });

        let output = '';

        devServer.stdout?.on('data', (data) => {
          output += data.toString();
          if (output.includes('Local:') || output.includes('localhost') || output.includes('Ready')) {
            project.devServer = devServer;
            project.url = `http://localhost:${port}`;
            resolve(project.url);
          }
        });

        devServer.stderr?.on('data', (data) => {
          const error = data.toString();
          if (error.includes('Error') && !output.includes('Local:')) {
            reject(new Error(`Dev server failed: ${error}`));
          }
        });

        setTimeout(() => {
          if (!project.url) {
            devServer.kill();
            reject(new Error('Dev server startup timeout'));
          }
        }, 60000);
      });
    });
  }

  async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }
    return await this.browser.newPage();
  }

  /**
   * Helper to find and interact with payment buttons
   */
  async findPaymentButton(page: Page): Promise<any> {
    const paymentSelectors = [
      '[data-testid*="payment"], [data-testid*="buy"]',
      'button:has-text("Buy"), button:has-text("Purchase"), button:has-text("Pay")',
      'a[href*="checkout"], a[href*="payment"]',
      '.payment-button, .buy-button, .checkout-button'
    ];

    for (const selector of paymentSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        return element.first();
      }
    }

    return null;
  }

  /**
   * Helper to simulate payment form interaction
   */
  async fillPaymentForm(page: Page): Promise<boolean> {
    try {
      // Look for Stripe Elements or payment form
      const cardSelectors = [
        '[data-testid*="card"]',
        'iframe[name*="stripe"], iframe[src*="stripe"]',
        'input[placeholder*="card"], input[name*="card"]'
      ];

      let cardFound = false;

      // Check for Stripe iframe (most common)
      const stripeFrame = page.frameLocator('iframe[name*="stripe"], iframe[src*="stripe"]').first();
      if (await stripeFrame.locator('input').count() > 0) {
        // Simulate card number input in Stripe iframe
        await stripeFrame.locator('input').first().fill('4242424242424242');
        cardFound = true;
      }

      // Check for direct card input
      if (!cardFound) {
        for (const selector of cardSelectors) {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            await element.first().fill('4242424242424242');
            cardFound = true;
            break;
          }
        }
      }

      // Fill expiry and CVC if present
      const expiryInput = page.locator('input[placeholder*="expiry"], input[name*="expiry"]');
      if (await expiryInput.count() > 0) {
        await expiryInput.first().fill('12/25');
      }

      const cvcInput = page.locator('input[placeholder*="cvc"], input[name*="cvc"]');
      if (await cvcInput.count() > 0) {
        await cvcInput.first().fill('123');
      }

      return cardFound;

    } catch (error) {
      console.error('Payment form fill error:', error);
      return false;
    }
  }
}

let testRunner: PaymentFlowTestRunner;

test.beforeAll(async () => {
  testRunner = new PaymentFlowTestRunner();
  await testRunner.setup();
});

test.afterAll(async () => {
  if (testRunner) {
    await testRunner.teardown();
  }
});

test.describe('Payment Integration E2E Tests', () => {

  test('Should have payment buttons or pricing pages', async () => {
    const project = await testRunner.generatePaymentProject('payment-buttons');
    const url = await testRunner.startDevServer(project, 3200);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Look for payment-related elements
      const paymentButton = await testRunner.findPaymentButton(page);
      const hasPricing = await page.locator('text=/pricing|price|buy|purchase/i').count() > 0;
      const hasCheckout = await page.locator('a[href*="checkout"], text=/checkout/i').count() > 0;

      // Should have at least some payment-related UI
      expect(paymentButton !== null || hasPricing || hasCheckout).toBe(true);

    } finally {
      await page.close();
    }
  });

  test('Should navigate to checkout or payment flow', async () => {
    const project = await testRunner.generatePaymentProject('checkout-flow');
    const url = await testRunner.startDevServer(project, 3201);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Try to find and click payment button
      const paymentButton = await testRunner.findPaymentButton(page);

      if (paymentButton) {
        await paymentButton.click();
        await page.waitForTimeout(2000);

        // Should navigate to some payment page
        const currentUrl = page.url();
        const isOnPaymentPage = currentUrl.includes('checkout') ||
                               currentUrl.includes('payment') ||
                               currentUrl.includes('buy');

        // Or should show payment form elements
        const hasPaymentForm = await page.locator('input[placeholder*="card"], iframe[name*="stripe"]').count() > 0;

        expect(isOnPaymentPage || hasPaymentForm).toBe(true);
      } else {
        // If no payment button found, try direct checkout URLs
        const checkoutUrls = [
          `${url}/checkout`,
          `${url}/payment`,
          `${url}/buy`,
          `${url}/pricing`
        ];

        let checkoutFound = false;
        for (const checkoutUrl of checkoutUrls) {
          await page.goto(checkoutUrl);
          await page.waitForLoadState('networkidle');

          const has404 = await page.locator('text=/404|not found/i').count() > 0;
          const hasPaymentElements = await page.locator('text=/payment|stripe|card/i').count() > 0;

          if (!has404 && hasPaymentElements) {
            checkoutFound = true;
            break;
          }
        }

        expect(checkoutFound).toBe(true);
      }

    } finally {
      await page.close();
    }
  });

  test('Should handle payment form interaction', async () => {
    const project = await testRunner.generatePaymentProject('payment-form');
    const url = await testRunner.startDevServer(project, 3202);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Navigate to checkout
      const paymentButton = await testRunner.findPaymentButton(page);
      if (paymentButton) {
        await paymentButton.click();
        await page.waitForTimeout(2000);
      } else {
        // Try direct checkout URLs
        const checkoutUrls = [`${url}/checkout`, `${url}/payment`];
        for (const checkoutUrl of checkoutUrls) {
          await page.goto(checkoutUrl);
          await page.waitForLoadState('networkidle');

          const hasPaymentForm = await page.locator('input, iframe').count() > 0;
          if (hasPaymentForm) break;
        }
      }

      // Try to interact with payment form
      const formFilled = await testRunner.fillPaymentForm(page);

      if (formFilled) {
        // Look for submit button
        const submitSelectors = [
          'button[type="submit"]',
          'button:has-text("Pay"), button:has-text("Complete"), button:has-text("Purchase")',
          '[data-testid*="submit"], [data-testid*="pay"]'
        ];

        let submitFound = false;
        for (const selector of submitSelectors) {
          const submitButton = page.locator(selector);
          if (await submitButton.count() > 0) {
            // Don't actually submit (would need real Stripe), just verify button exists
            expect(submitButton).toBeDefined();
            submitFound = true;
            break;
          }
        }

        expect(submitFound).toBe(true);
      } else {
        // If no payment form, at least ensure payment-related elements exist
        const hasPaymentElements = await page.locator('text=/stripe|payment|card|checkout/i').count() > 0;
        expect(hasPaymentElements).toBe(true);
      }

    } finally {
      await page.close();
    }
  });

  test('Should support subscription payment flows', async () => {
    const project = await testRunner.generatePaymentProject('subscription-flow');
    const url = await testRunner.startDevServer(project, 3203);
    const page = await testRunner.createPage();

    try {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Look for subscription-related elements
      const subscriptionSelectors = [
        'text=/subscription|subscribe|monthly|yearly|billing/i',
        '[data-testid*="subscription"], [data-testid*="billing"]',
        'a[href*="subscription"], a[href*="billing"]'
      ];

      let subscriptionFound = false;
      for (const selector of subscriptionSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0) {
          subscriptionFound = true;

          // Try to click subscription element
          const clickable = element.first();
          if (await clickable.getAttribute('href') || await clickable.evaluate(el => el.tagName === 'BUTTON')) {
            await clickable.click();
            await page.waitForTimeout(1000);
          }
          break;
        }
      }

      // Check subscription-specific URLs
      if (!subscriptionFound) {
        const subscriptionUrls = [
          `${url}/subscription`,
          `${url}/billing`,
          `${url}/pricing`,
          `${url}/dashboard/billing`
        ];

        for (const subUrl of subscriptionUrls) {
          await page.goto(subUrl);
          await page.waitForLoadState('networkidle');

          const has404 = await page.locator('text=/404|not found/i').count() > 0;
          const hasSubContent = await page.locator('text=/subscription|billing|plan/i').count() > 0;

          if (!has404 && hasSubContent) {
            subscriptionFound = true;
            break;
          }
        }
      }

      expect(subscriptionFound).toBe(true);

    } finally {
      await page.close();
    }
  });

  test('Should handle payment success/cancel flows', async () => {
    const project = await testRunner.generatePaymentProject('payment-result');
    const url = await testRunner.startDevServer(project, 3204);
    const page = await testRunner.createPage();

    try {
      // Test success page
      const successUrls = [
        `${url}/success`,
        `${url}/payment/success`,
        `${url}/checkout/success`
      ];

      let successPageFound = false;
      for (const successUrl of successUrls) {
        await page.goto(successUrl);
        await page.waitForLoadState('networkidle');

        const has404 = await page.locator('text=/404|not found/i').count() > 0;
        const hasSuccessContent = await page.locator('text=/success|thank you|completed/i').count() > 0;

        if (!has404 && hasSuccessContent) {
          successPageFound = true;
          break;
        }
      }

      // Test cancel page
      const cancelUrls = [
        `${url}/cancel`,
        `${url}/payment/cancel`,
        `${url}/checkout/cancel`
      ];

      let cancelPageFound = false;
      for (const cancelUrl of cancelUrls) {
        await page.goto(cancelUrl);
        await page.waitForLoadState('networkidle');

        const has404 = await page.locator('text=/404|not found/i').count() > 0;
        const hasCancelContent = await page.locator('text=/cancel|cancelled|failed/i').count() > 0;

        if (!has404 && hasCancelContent) {
          cancelPageFound = true;
          break;
        }
      }

      // At least one result page should exist
      expect(successPageFound || cancelPageFound).toBe(true);

    } finally {
      await page.close();
    }
  });

  test('Should not crash during payment interactions', async () => {
    const project = await testRunner.generatePaymentProject('payment-stability');
    const url = await testRunner.startDevServer(project, 3205);
    const page = await testRunner.createPage();

    try {
      // Monitor console errors
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Navigate through payment-related pages
      const testUrls = [
        url,
        `${url}/pricing`,
        `${url}/checkout`,
        `${url}/payment`,
        `${url}/subscription`,
        `${url}/billing`
      ];

      for (const testUrl of testUrls) {
        await page.goto(testUrl);
        await page.waitForLoadState('networkidle');

        // Click various elements that might exist
        const interactiveElements = page.locator('button, a, [role="button"]');
        const count = await interactiveElements.count();

        if (count > 0) {
          // Click first few elements to test interactions
          for (let i = 0; i < Math.min(3, count); i++) {
            try {
              const element = interactiveElements.nth(i);
              const isVisible = await element.isVisible();

              if (isVisible) {
                await element.click();
                await page.waitForTimeout(500);
              }
            } catch (error) {
              // Some clicks might fail, that's ok
            }
          }
        }
      }

      // Filter out non-critical errors
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

});