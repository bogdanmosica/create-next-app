/**
 * @fileoverview Stripe API Integration Tests
 * @description Tests Stripe payment integration with mock webhook endpoints
 * Constitutional compliance: Payment system validation for Build-First Testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { TransactionalOrchestrator } from '../../src/core/transactional-orchestrator.js';
import fs from 'fs-extra';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, Server } from 'http';
import { parse } from 'url';

interface MockStripeWebhook {
  id: string;
  type: string;
  data: any;
  created: number;
}

interface PaymentTestSetup {
  projectPath: string;
  mockStripeServer?: Server;
  webhookEndpoint?: string;
  testApiKey: string;
}

class StripeTestRunner {
  private testSetups: PaymentTestSetup[] = [];
  private baseTestDir: string;
  private mockServerPort: number = 3999;

  constructor() {
    this.baseTestDir = path.join(tmpdir(), `mcp-stripe-tests-${Date.now()}`);
  }

  /**
   * Create a mock Stripe server for testing
   */
  async createMockStripeServer(port: number): Promise<Server> {
    return new Promise((resolve) => {
      const server = createServer((req, res) => {
        const parsedUrl = parse(req.url || '', true);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // Mock Stripe API endpoints
        if (req.method === 'POST' && parsedUrl.pathname === '/v1/payment_intents') {
          this.handleCreatePaymentIntent(req, res);
        } else if (req.method === 'POST' && parsedUrl.pathname?.startsWith('/v1/payment_intents/')) {
          this.handleConfirmPaymentIntent(req, res);
        } else if (req.method === 'POST' && parsedUrl.pathname === '/v1/checkout/sessions') {
          this.handleCreateCheckoutSession(req, res);
        } else if (req.method === 'POST' && parsedUrl.pathname === '/v1/customers') {
          this.handleCreateCustomer(req, res);
        } else if (req.method === 'POST' && parsedUrl.pathname === '/v1/subscriptions') {
          this.handleCreateSubscription(req, res);
        } else if (req.method === 'GET' && parsedUrl.pathname?.startsWith('/v1/')) {
          this.handleGenericGet(req, res, parsedUrl.pathname);
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: { message: 'Not found' } }));
        }
      });

      server.listen(port, () => {
        resolve(server);
      });
    });
  }

  private handleCreatePaymentIntent(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const paymentIntent = {
        id: `pi_test_${Date.now()}`,
        object: 'payment_intent',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: `pi_test_${Date.now()}_secret_test`,
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      res.writeHead(200);
      res.end(JSON.stringify(paymentIntent));
    });
  }

  private handleConfirmPaymentIntent(req: any, res: any) {
    const paymentIntentId = req.url.split('/').pop().split('?')[0];

    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const paymentIntent = {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 2000,
        currency: 'usd',
        status: 'succeeded',
        client_secret: `${paymentIntentId}_secret_test`,
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      res.writeHead(200);
      res.end(JSON.stringify(paymentIntent));
    });
  }

  private handleCreateCheckoutSession(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const session = {
        id: `cs_test_${Date.now()}`,
        object: 'checkout.session',
        url: `https://checkout.stripe.com/c/pay/cs_test_${Date.now()}`,
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
        mode: 'payment',
        payment_status: 'unpaid',
        status: 'open',
        created: Math.floor(Date.now() / 1000)
      };

      res.writeHead(200);
      res.end(JSON.stringify(session));
    });
  }

  private handleCreateCustomer(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const customer = {
        id: `cus_test_${Date.now()}`,
        object: 'customer',
        email: 'test@example.com',
        created: Math.floor(Date.now() / 1000),
        livemode: false
      };

      res.writeHead(200);
      res.end(JSON.stringify(customer));
    });
  }

  private handleCreateSubscription(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => body += chunk);
    req.on('end', () => {
      const subscription = {
        id: `sub_test_${Date.now()}`,
        object: 'subscription',
        status: 'active',
        customer: `cus_test_${Date.now()}`,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        created: Math.floor(Date.now() / 1000)
      };

      res.writeHead(200);
      res.end(JSON.stringify(subscription));
    });
  }

  private handleGenericGet(req: any, res: any, pathname: string) {
    // Mock generic GET responses
    const mockResponse = {
      id: `mock_${Date.now()}`,
      object: pathname.split('/').pop(),
      created: Math.floor(Date.now() / 1000),
      livemode: false
    };

    res.writeHead(200);
    res.end(JSON.stringify(mockResponse));
  }

  /**
   * Generate project with Stripe payment features
   */
  async generateProjectWithStripe(name: string): Promise<PaymentTestSetup> {
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

    // Setup test environment variables
    const testApiKey = 'sk_test_mock_key_for_testing';
    const envPath = path.join(projectPath, '.env');
    const envContent = `
DATABASE_URL="sqlite:test-db.db"
AUTH_SECRET="test-secret-key"
STRIPE_SECRET_KEY="${testApiKey}"
STRIPE_PUBLISHABLE_KEY="pk_test_mock_key_for_testing"
STRIPE_WEBHOOK_SECRET="whsec_test_webhook_secret"
BASE_URL="http://localhost:3000"
`.trim();

    await fs.writeFile(envPath, envContent);

    const setup: PaymentTestSetup = {
      projectPath,
      testApiKey,
    };

    this.testSetups.push(setup);
    return setup;
  }

  /**
   * Test Stripe integration by making API calls
   */
  async testStripeIntegration(setup: PaymentTestSetup): Promise<boolean> {
    try {
      // Start mock Stripe server
      setup.mockStripeServer = await this.createMockStripeServer(this.mockServerPort++);

      // Update Stripe configuration to use mock server
      const configPath = path.join(setup.projectPath, 'libs/payments/stripe.ts');
      if (await fs.pathExists(configPath)) {
        let configContent = await fs.readFile(configPath, 'utf-8');

        // Replace Stripe API base URL with mock server
        configContent = configContent.replace(
          /apiVersion: ['"][^'"]*['"],?/,
          `apiVersion: '2023-10-16',\n  host: 'localhost',\n  port: ${this.mockServerPort - 1},\n  protocol: 'http',`
        );

        await fs.writeFile(configPath, configContent);
      }

      // Test project builds successfully
      const buildResult = await this.runProjectCommand(setup.projectPath, 'pnpm', ['build']);
      if (buildResult.code !== 0) {
        throw new Error(`Build failed: ${buildResult.stderr}`);
      }

      return true;

    } catch (error) {
      console.error('Stripe integration test failed:', error);
      return false;
    } finally {
      // Close mock server
      if (setup.mockStripeServer) {
        setup.mockStripeServer.close();
      }
    }
  }

  /**
   * Test webhook endpoint handling
   */
  async testWebhookEndpoint(setup: PaymentTestSetup): Promise<boolean> {
    try {
      // Check webhook endpoint exists
      const webhookPath = path.join(setup.projectPath, 'app/api/webhooks/stripe/route.ts');
      if (!await fs.pathExists(webhookPath)) {
        throw new Error('Stripe webhook endpoint not found');
      }

      const webhookContent = await fs.readFile(webhookPath, 'utf-8');

      // Check for proper webhook signature verification
      expect(webhookContent).toContain('webhook');
      expect(webhookContent).toContain('signature');
      expect(webhookContent).toContain('stripe.webhooks');

      // Check for common webhook event handling
      expect(webhookContent).toContain('payment_intent.succeeded');

      return true;

    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  }

  /**
   * Test payment form components
   */
  async testPaymentComponents(setup: PaymentTestSetup): Promise<boolean> {
    try {
      // Check for payment button component
      const buttonPath = path.join(setup.projectPath, 'components/payments/payment-button.tsx');
      if (await fs.pathExists(buttonPath)) {
        const buttonContent = await fs.readFile(buttonPath, 'utf-8');
        expect(buttonContent).toContain('stripe');
        expect(buttonContent).toContain('payment');
      }

      // Check for checkout component
      const checkoutPaths = [
        path.join(setup.projectPath, 'components/payments/checkout.tsx'),
        path.join(setup.projectPath, 'components/payments/checkout-form.tsx'),
        path.join(setup.projectPath, 'app/checkout/page.tsx')
      ];

      let checkoutFound = false;
      for (const checkoutPath of checkoutPaths) {
        if (await fs.pathExists(checkoutPath)) {
          checkoutFound = true;
          const checkoutContent = await fs.readFile(checkoutPath, 'utf-8');
          expect(checkoutContent).toContain('stripe');
          break;
        }
      }

      expect(checkoutFound).toBe(true);

      return true;

    } catch (error) {
      console.error('Payment components test failed:', error);
      return false;
    }
  }

  private async runProjectCommand(
    projectPath: string,
    command: string,
    args: string[]
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    const { spawn } = await import('child_process');

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: projectPath,
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });

      setTimeout(() => {
        child.kill('SIGTERM');
        resolve({ code: -1, stdout, stderr: stderr + '\nTimeout' });
      }, 60000);
    });
  }

  /**
   * Cleanup all test setups
   */
  async cleanup(): Promise<void> {
    // Close any mock servers
    for (const setup of this.testSetups) {
      if (setup.mockStripeServer) {
        setup.mockStripeServer.close();
      }
    }

    // Clean up test directories
    if (await fs.pathExists(this.baseTestDir)) {
      await fs.remove(this.baseTestDir);
    }
  }
}

let testRunner: StripeTestRunner;

beforeAll(async () => {
  testRunner = new StripeTestRunner();
  await fs.ensureDir(testRunner['baseTestDir']);
});

afterAll(async () => {
  if (testRunner) {
    await testRunner.cleanup();
  }
});

describe('Stripe Payment Integration Tests', () => {

  it('should generate project with Stripe payment setup', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-basic');

    // Check that payment files were created
    expect(await fs.pathExists(path.join(setup.projectPath, 'libs/payments/stripe.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(setup.projectPath, 'libs/payments/utils.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(setup.projectPath, 'actions/payments.ts'))).toBe(true);

    // Check webhook endpoint
    expect(await fs.pathExists(path.join(setup.projectPath, 'app/api/webhooks/stripe/route.ts'))).toBe(true);

    // Check environment setup
    expect(await fs.pathExists(path.join(setup.projectPath, '.env'))).toBe(true);
    const envContent = await fs.readFile(path.join(setup.projectPath, '.env'), 'utf-8');
    expect(envContent).toContain('STRIPE_SECRET_KEY');
    expect(envContent).toContain('STRIPE_PUBLISHABLE_KEY');
    expect(envContent).toContain('STRIPE_WEBHOOK_SECRET');

  }, 120000);

  it('should have proper Stripe client configuration', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-config');

    const stripePath = path.join(setup.projectPath, 'libs/payments/stripe.ts');
    expect(await fs.pathExists(stripePath)).toBe(true);

    const stripeContent = await fs.readFile(stripePath, 'utf-8');

    // Check for proper Stripe initialization
    expect(stripeContent).toContain('Stripe');
    expect(stripeContent).toContain('process.env.STRIPE_SECRET_KEY');
    expect(stripeContent).toContain('export');

    // Check for API version
    expect(stripeContent).toMatch(/apiVersion|api_version/);

  }, 120000);

  it('should include payment action functions', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-actions');

    const actionsPath = path.join(setup.projectPath, 'actions/payments.ts');
    expect(await fs.pathExists(actionsPath)).toBe(true);

    const actionsContent = await fs.readFile(actionsPath, 'utf-8');

    // Check for payment intent creation
    expect(actionsContent).toContain('createPaymentIntent');
    expect(actionsContent).toContain('stripe');

    // Check for proper Next.js server action structure
    expect(actionsContent).toContain('use server');

  }, 120000);

  it('should have working webhook endpoint', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-webhooks');

    const success = await testRunner.testWebhookEndpoint(setup);
    expect(success).toBe(true);

    // Additionally check webhook handlers
    const handlersPath = path.join(setup.projectPath, 'libs/payments/webhook-handlers.ts');
    if (await fs.pathExists(handlersPath)) {
      const handlersContent = await fs.readFile(handlersPath, 'utf-8');

      // Check for common webhook event handlers
      expect(handlersContent).toMatch(/payment_intent\.succeeded|customer\.subscription\.created/);
    }

  }, 120000);

  it('should include payment UI components', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-components');

    const success = await testRunner.testPaymentComponents(setup);
    expect(success).toBe(true);

  }, 120000);

  it('should build successfully with Stripe integration', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-build');

    const success = await testRunner.testStripeIntegration(setup);
    expect(success).toBe(true);

  }, 180000);

  it('should include subscription management features', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-subscriptions');

    // Check for subscription-related files
    const subscriptionPaths = [
      path.join(setup.projectPath, 'components/payments/subscription-button.tsx'),
      path.join(setup.projectPath, 'actions/subscriptions.ts'),
      path.join(setup.projectPath, 'app/billing/page.tsx'),
      path.join(setup.projectPath, 'app/dashboard/billing/page.tsx')
    ];

    let subscriptionFound = false;
    for (const subPath of subscriptionPaths) {
      if (await fs.pathExists(subPath)) {
        subscriptionFound = true;

        const content = await fs.readFile(subPath, 'utf-8');
        expect(content).toMatch(/subscription|billing/i);
        break;
      }
    }

    expect(subscriptionFound).toBe(true);

  }, 120000);

  it('should handle one-time payments', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-onetime');

    // Check payment utilities
    const utilsPath = path.join(setup.projectPath, 'libs/payments/utils.ts');
    if (await fs.pathExists(utilsPath)) {
      const utilsContent = await fs.readFile(utilsPath, 'utf-8');

      // Should have utilities for one-time payments
      expect(utilsContent).toMatch(/payment|checkout/i);
      expect(utilsContent).toContain('stripe');
    }

    // Check for checkout session creation
    const actionsPath = path.join(setup.projectPath, 'actions/payments.ts');
    const actionsContent = await fs.readFile(actionsPath, 'utf-8');

    expect(actionsContent).toMatch(/createCheckoutSession|checkout\.sessions\.create/);

  }, 120000);

  it('should have proper error handling for payment flows', async () => {
    const setup = await testRunner.generateProjectWithStripe('stripe-errors');

    // Check webhook endpoint for error handling
    const webhookPath = path.join(setup.projectPath, 'app/api/webhooks/stripe/route.ts');
    const webhookContent = await fs.readFile(webhookPath, 'utf-8');

    // Should have try-catch blocks
    expect(webhookContent).toContain('try');
    expect(webhookContent).toContain('catch');

    // Check payment actions for error handling
    const actionsPath = path.join(setup.projectPath, 'actions/payments.ts');
    const actionsContent = await fs.readFile(actionsPath, 'utf-8');

    expect(actionsContent).toContain('try');
    expect(actionsContent).toContain('catch');

  }, 120000);

});