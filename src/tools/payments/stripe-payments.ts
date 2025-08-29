/**
 * @fileoverview Stripe Payments Setup Tool
 * @description Sets up Stripe payments with subscriptions and one-time payments
 * Creates complete payment integration with checkout sessions and customer management
 */

import fs from "fs-extra";
import path from "node:path";
import { runCommand } from "../../runners/command-runner.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface StripePaymentsConfig {
  projectPath: string;
  includeSubscriptions?: boolean;
  includeOneTime?: boolean;
  requireAuth?: boolean;
}

export async function setupStripePayments(config: StripePaymentsConfig): Promise<string> {
  const {
    projectPath,
    includeSubscriptions = true,
    includeOneTime = true,
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

  // Check if Stripe is already set up
  if (projectState.hasStripe) {
    throw new Error("Stripe payments are already set up in this project. Stripe package is already installed.");
  }

  // Check authentication requirement
  if (requireAuth && !projectState.hasAuthentication) {
    throw new Error("Authentication setup required for payments. Run 'setup_authentication_jwt' first to set up user authentication.");
  }

  console.error(`[DEBUG] Starting Stripe payments setup at: ${fullPath}`);
  
  try {
    // Step 1: Install Stripe dependencies
    const step1 = "Installing Stripe payment dependencies...";
    steps.push(step1);
    console.error(`[STEP 1/6] ${step1}`);
    
    await runCommand("pnpm add stripe @stripe/stripe-js", fullPath);
    await runCommand("pnpm add -D stripe-event-types", fullPath);
    
    console.error(`[STEP 1/6] ✅ Completed: ${step1}`);

    // Step 2: Create Stripe client configuration
    const step2 = "Setting up Stripe client configuration...";
    steps.push(step2);
    console.error(`[STEP 2/6] ${step2}`);
    
    const libPaymentsDir = path.join(fullPath, "lib", "payments");
    await fs.ensureDir(libPaymentsDir);
    
    // Create Stripe client
    const stripeClientTemplate = createStripeClientTemplate();
    await fs.writeFile(path.join(libPaymentsDir, "stripe.ts"), stripeClientTemplate);
    
    console.error(`[STEP 2/6] ✅ Completed: ${step2}`);

    // Step 3: Create payment utilities and types
    const step3 = "Creating payment utilities and types...";
    steps.push(step3);
    console.error(`[STEP 3/6] ${step3}`);
    
    // Create payment types
    const paymentTypesTemplate = createPaymentTypesTemplate();
    const typesDir = path.join(fullPath, "types");
    await fs.ensureDir(typesDir);
    await fs.writeFile(path.join(typesDir, "payments.ts"), paymentTypesTemplate);
    
    // Create payment utilities
    const paymentUtilsTemplate = createPaymentUtilsTemplate(includeSubscriptions, includeOneTime);
    await fs.writeFile(path.join(libPaymentsDir, "utils.ts"), paymentUtilsTemplate);
    
    console.error(`[STEP 3/6] ✅ Completed: ${step3}`);

    // Step 4: Create payment actions
    const step4 = "Setting up payment server actions...";
    steps.push(step4);
    console.error(`[STEP 4/6] ${step4}`);
    
    const actionsDir = path.join(fullPath, "actions");
    await fs.ensureDir(actionsDir);
    
    const paymentActionsTemplate = createPaymentActionsTemplate(
      includeSubscriptions, 
      includeOneTime, 
      projectState.hasAuthentication
    );
    await fs.writeFile(path.join(actionsDir, "payments.ts"), paymentActionsTemplate);
    
    console.error(`[STEP 4/6] ✅ Completed: ${step4}`);

    // Step 5: Create subscription model (if database available)
    const step5 = (includeSubscriptions && projectState.hasDrizzle) 
      ? "Creating subscription database model..."
      : "Skipping database model creation...";
    steps.push(step5);
    console.error(`[STEP 5/6] ${step5}`);
    
    if (includeSubscriptions && projectState.hasDrizzle) {
      // Create subscription model
      const subscriptionModelTemplate = createSubscriptionModelTemplate();
      const modelsDir = path.join(fullPath, "models");
      await fs.writeFile(path.join(modelsDir, "subscription.ts"), subscriptionModelTemplate);
      
      // Create subscription queries
      const subscriptionQueriesTemplate = createSubscriptionQueriesTemplate();
      const libDbDir = path.join(fullPath, "lib", "db");
      await fs.writeFile(path.join(libDbDir, "subscription-queries.ts"), subscriptionQueriesTemplate);
    }
    
    console.error(`[STEP 5/6] ✅ Completed: ${step5}`);

    // Step 6: Create payment components
    const step6 = "Creating payment UI components...";
    steps.push(step6);
    console.error(`[STEP 6/6] ${step6}`);
    
    const paymentsComponentsDir = path.join(fullPath, "components", "payments");
    await fs.ensureDir(paymentsComponentsDir);
    
    if (includeSubscriptions) {
      // Create pricing table component
      const pricingTableTemplate = createPricingTableTemplate();
      await fs.writeFile(path.join(paymentsComponentsDir, "pricing-table.tsx"), pricingTableTemplate);
    }
    
    if (includeOneTime) {
      // Create checkout button component
      const checkoutButtonTemplate = createCheckoutButtonTemplate();
      await fs.writeFile(path.join(paymentsComponentsDir, "checkout-button.tsx"), checkoutButtonTemplate);
    }
    
    // Create payment components index
    const componentsIndex = createPaymentComponentsIndex(includeSubscriptions, includeOneTime);
    await fs.writeFile(path.join(paymentsComponentsDir, "index.ts"), componentsIndex);
    
    console.error(`[STEP 6/6] ✅ Completed: ${step6}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Stripe payments setup completed in ${totalTime}s`);

    return `🎉 Stripe payments setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💳 **Stripe Payment Configuration:**\n- **Payment Types**: ${includeSubscriptions ? 'Subscription payments' : ''}${includeSubscriptions && includeOneTime ? ' + ' : ''}${includeOneTime ? 'One-time payments' : ''}\n- **Authentication**: ${projectState.hasAuthentication ? 'Integrated with your JWT authentication' : 'Basic setup without authentication'}\n- **Database Integration**: ${projectState.hasDrizzle ? 'Connected to your Drizzle setup' : 'No database persistence'}\n- **Stripe SDK**: Latest Stripe SDK with TypeScript support\n- **Security**: Server-side payment processing with webhook validation\n\n📁 **Files Created:**\n- \`lib/payments/stripe.ts\` - Stripe client configuration\n- \`lib/payments/utils.ts\` - Payment utilities and helpers\n- \`types/payments.ts\` - Payment TypeScript definitions\n- \`actions/payments.ts\` - Payment server actions${includeSubscriptions && projectState.hasDrizzle ? '\n- `models/subscription.ts` - Subscription database model\n- `lib/db/subscription-queries.ts` - Database subscription operations' : ''}\n- \`components/payments/\` - Payment UI components\n\n💰 **Payment Features:**\n\n${includeSubscriptions ? `### Subscription Payments\n- **Recurring Billing**: Monthly and yearly subscription plans\n- **Customer Portal**: Self-service subscription management\n- **Plan Management**: Upgrade, downgrade, and cancellation\n- **Trial Periods**: Optional free trial support\n- **Proration**: Automatic proration for plan changes\n\n` : ''}${includeOneTime ? `### One-Time Payments\n- **Product Checkout**: Single product or service purchases\n- **Dynamic Pricing**: Flexible pricing with custom amounts\n- **Payment Methods**: Credit cards, bank transfers, digital wallets\n- **Order Management**: Order tracking and fulfillment\n\n` : ''}🔒 **Security Features:**\n- **Server-Side Processing**: All payment logic on secure server\n- **Webhook Validation**: Cryptographic webhook signature verification\n- **PCI Compliance**: Stripe handles all sensitive card data\n- **Customer Authentication**: Integrated with your user system\n- **Idempotency**: Prevent duplicate payments with idempotency keys\n\n💻 **Usage Examples:**\n\n${includeSubscriptions ? `### Create Subscription Checkout\n\`\`\`typescript\nimport { createSubscriptionCheckout } from '@/actions/payments';\n\n// Create checkout session\nconst { url } = await createSubscriptionCheckout({\n  priceId: 'price_1234567890',\n  customerId: user.stripeCustomerId\n});\n\nwindow.location.href = url;\n\`\`\`\n\n` : ''}${includeOneTime ? `### One-Time Payment Checkout\n\`\`\`typescript\nimport { createCheckoutSession } from '@/actions/payments';\n\n// Create one-time payment\nconst { url } = await createCheckoutSession({\n  amount: 2999, // $29.99 in cents\n  currency: 'usd',\n  description: 'Premium Feature Access'\n});\n\nwindow.location.href = url;\n\`\`\`\n\n` : ''}### Use Payment Components\n\`\`\`typescript\n${includeSubscriptions ? `import { PricingTable } from '@/components/payments';\n\n<PricingTable\n  plans={[\n    { name: 'Basic', price: 9.99, priceId: 'price_basic' },\n    { name: 'Pro', price: 19.99, priceId: 'price_pro' }\n  ]}\n/>` : ''}${includeOneTime ? `\nimport { CheckoutButton } from '@/components/payments';\n\n<CheckoutButton\n  amount={2999}\n  currency="usd"\n  description="Premium Feature"\n  className="bg-blue-600 text-white px-6 py-2 rounded"\n>\n  Buy Now\n</CheckoutButton>` : ''}\n\`\`\`\n\n🚀 **Integration Status:**${projectState.hasAuthentication ? '\n- ✅ **Authentication**: Connected to your JWT authentication system' : '\n- 🔧 **Authentication**: Run `setup_authentication_jwt` for user integration'}${projectState.hasDrizzle ? '\n- ✅ **Database**: Subscription data stored in your database' : '\n- 🔧 **Database**: Run `setup_drizzle_orm` for subscription persistence'}${projectState.hasEnvironmentVars ? '\n- ✅ **Environment**: Ready for Stripe keys configuration' : '\n- 🔧 **Environment**: Run `setup_environment_vars` to add Stripe keys'}\n- 🔗 **Webhooks**: Run \`setup_stripe_webhooks\` for complete payment handling\n\n⚙️ **Stripe Dashboard Setup Required:**\n1. **Create Products**: Set up your products and pricing in Stripe Dashboard\n2. **Get API Keys**: Copy your publishable and secret keys\n3. **Configure Webhooks**: Set up webhook endpoints for payment events\n4. **Test Mode**: Use test mode for development and testing\n\n💡 **Next steps:**\n1. **Configure Stripe keys**: ${projectState.hasEnvironmentVars ? 'Update your .env.local with Stripe keys' : 'Run `setup_environment_vars` first'}\n2. **Set up webhooks**: Run \`setup_stripe_webhooks\` for event handling\n3. **Create products**: Set up your products and pricing in Stripe Dashboard\n4. **Test payments**: Use Stripe's test card numbers to verify integration\n5. **Go live**: Switch to live keys when ready for production\n\n⚠️  **Important Notes:**\n- Never expose your Stripe secret key in client-side code\n- Always validate webhook signatures for security\n- Use Stripe's test environment during development\n- Set up proper error handling for failed payments\n- Consider implementing payment retry logic for failed subscriptions\n\n🎯 **Stripe Test Cards:**\n- **Success**: 4242424242424242\n- **Declined**: 4000000000000002\n- **3D Secure**: 4000002760003184\n\n📚 **Documentation:** Check the generated files for detailed TypeScript examples and Stripe integration patterns.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have pnpm installed\n- Check that the project directory is writable\n- Verify Next.js project exists (run create_nextjs_base first)\n- For authentication integration, ensure JWT auth is set up (run setup_authentication_jwt first)\n- For database features, ensure Drizzle is configured (run setup_drizzle_orm first)`);
  }
}

function createStripeClientTemplate(): string {
  return `/**
 * @fileoverview Stripe Client Configuration
 * @description Server-side Stripe client setup with TypeScript support
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Client-side configuration
export const stripeConfig = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  apiVersion: '2024-06-20' as const,
};

// Validate environment variables
if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found. Client-side features will not work.');
}

export default stripe;
`;
}

function createPaymentTypesTemplate(): string {
  return `/**
 * @fileoverview Payment TypeScript Definitions
 * @description Type definitions for payment operations and Stripe integration
 */

import type Stripe from 'stripe';

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  priceId: string;
  features?: string[];
  popular?: boolean;
  trialDays?: number;
}

export interface CreateSubscriptionParams {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

// One-time Payment Types
export interface CreateCheckoutParams {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
}

export interface PaymentProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
}

// Customer Types
export interface StripeCustomerData {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: Stripe.Address;
  metadata?: Record<string, string>;
}

// Webhook Types
export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

// Payment Session Types
export interface CheckoutSession {
  id: string;
  url: string;
  customer?: string;
  payment_status: string;
  amount_total?: number;
  currency?: string;
}

// Subscription Status Types
export type SubscriptionStatus = 
  | 'active'
  | 'canceled' 
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

export interface SubscriptionData {
  id: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  customerId: string;
  trialEnd?: Date;
  metadata?: Record<string, string>;
}

// Error Types
export interface PaymentError {
  type: 'card_error' | 'invalid_request_error' | 'api_error' | 'authentication_error' | 'rate_limit_error';
  code?: string;
  message: string;
  param?: string;
}

// Action Result Types
export interface PaymentActionResult {
  success: boolean;
  data?: any;
  error?: string;
  url?: string;
}

export interface SubscriptionActionResult extends PaymentActionResult {
  subscription?: SubscriptionData;
  customer?: StripeCustomerData;
}

// Component Props Types
export interface PricingTableProps {
  plans: SubscriptionPlan[];
  currentPlanId?: string;
  customerId?: string;
  showTrialInfo?: boolean;
  className?: string;
}

export interface CheckoutButtonProps {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}
`;
}

function createPaymentUtilsTemplate(includeSubscriptions: boolean, includeOneTime: boolean): string {
  return `/**
 * @fileoverview Payment Utilities
 * @description Helper functions for Stripe payment operations
 */

import { stripe } from './stripe.js';
import type { 
  CreateSubscriptionParams, 
  CreateCheckoutParams, 
  StripeCustomerData,
  PaymentError 
} from '@/types/payments.js';

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  try {
    // Try to find existing customer by metadata (user ID)
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0].id;
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: userId,
      },
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating/retrieving customer:', error);
    throw new Error('Failed to create customer');
  }
}

${includeSubscriptions ? `
/**
 * Create a subscription checkout session
 */
export async function createSubscriptionCheckoutSession(
  params: CreateSubscriptionParams,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      customer: params.customerId,
      customer_email: params.customerId ? undefined : params.customerEmail,
      subscription_data: {
        trial_period_days: params.trialDays,
        metadata: params.metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return session;
  } catch (error) {
    console.error('Error creating subscription checkout session:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
) {
  try {
    if (cancelAtPeriodEnd) {
      return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await stripe.subscriptions.cancel(subscriptionId);
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Create a customer portal session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}
` : ''}

${includeOneTime ? `
/**
 * Create a one-time payment checkout session
 */
export async function createOneTimeCheckoutSession(
  params: CreateCheckoutParams,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: params.description,
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      customer_email: params.customerEmail,
      metadata: params.metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return session;
  } catch (error) {
    console.error('Error creating one-time checkout session:', error);
    throw error;
  }
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}
` : ''}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Parse Stripe error
 */
export function parseStripeError(error: any): PaymentError {
  if (error.type === 'StripeCardError') {
    return {
      type: 'card_error',
      code: error.code,
      message: error.message,
      param: error.param,
    };
  } else if (error.type === 'StripeInvalidRequestError') {
    return {
      type: 'invalid_request_error',
      message: error.message,
      param: error.param,
    };
  } else {
    return {
      type: 'api_error',
      message: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
) {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}
`;
}

function createPaymentActionsTemplate(includeSubscriptions: boolean, includeOneTime: boolean, hasAuth: boolean): string {
  const authImports = hasAuth ? `import { requireAuth } from '@/lib/auth/session.js';` : '';
  
  return `/**
 * @fileoverview Payment Server Actions
 * @description Server actions for Stripe payment operations
 */

import { redirect } from 'next/navigation';
${authImports}
import { 
  getOrCreateCustomer,
  ${includeSubscriptions ? 'createSubscriptionCheckoutSession,' : ''}
  ${includeOneTime ? 'createOneTimeCheckoutSession,' : ''}
  ${includeSubscriptions ? 'createCustomerPortalSession,' : ''}
  parseStripeError 
} from '@/lib/payments/utils.js';
import type { 
  ${includeSubscriptions ? 'CreateSubscriptionParams,' : ''}
  ${includeOneTime ? 'CreateCheckoutParams,' : ''}
  PaymentActionResult 
} from '@/types/payments.js';

${includeSubscriptions ? `
/**
 * Create subscription checkout session
 */
export async function createSubscriptionCheckout(
  params: CreateSubscriptionParams
): Promise<PaymentActionResult> {
  try {
    ${hasAuth ? `
    const user = await requireAuth();
    
    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      user.id,
      user.email,
      user.name
    );
    ` : `
    // Demo mode - replace with your user logic
    const customerId = params.customerId;
    if (!customerId && !params.customerEmail) {
      return {
        success: false,
        error: 'Customer ID or email is required'
      };
    }
    `}

    const session = await createSubscriptionCheckoutSession(
      {
        ...params,
        customerId: ${hasAuth ? 'customerId' : 'params.customerId'},
      },
      \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}\`,
      \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription/cancel\`
    );

    return {
      success: true,
      url: session.url || undefined,
      data: session,
    };
  } catch (error: any) {
    console.error('Subscription checkout error:', error);
    const stripeError = parseStripeError(error);
    return {
      success: false,
      error: stripeError.message,
    };
  }
}

/**
 * Access customer portal
 */
export async function accessCustomerPortal(): Promise<PaymentActionResult> {
  try {
    ${hasAuth ? `
    const user = await requireAuth();
    
    // Get customer ID (you may need to store this in your database)
    const customerId = await getOrCreateCustomer(user.id, user.email, user.name);
    ` : `
    // Demo mode - replace with your customer logic
    throw new Error('Customer portal requires authentication');
    `}

    const session = await createCustomerPortalSession(
      customerId,
      \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription\`
    );

    return {
      success: true,
      url: session.url,
    };
  } catch (error: any) {
    console.error('Customer portal error:', error);
    const stripeError = parseStripeError(error);
    return {
      success: false,
      error: stripeError.message,
    };
  }
}
` : ''}

${includeOneTime ? `
/**
 * Create one-time payment checkout
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<PaymentActionResult> {
  try {
    ${hasAuth ? `
    const user = await requireAuth();
    
    const session = await createOneTimeCheckoutSession(
      {
        ...params,
        customerEmail: user.email,
      },
      \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments/success?session_id={CHECKOUT_SESSION_ID}\`,
      \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments/cancel\`
    );
    ` : `
    const session = await createOneTimeCheckoutSession(
      params,
      \`\${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}\`,
      \`\${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel\`
    );
    `}

    return {
      success: true,
      url: session.url || undefined,
      data: session,
    };
  } catch (error: any) {
    console.error('Checkout session error:', error);
    const stripeError = parseStripeError(error);
    return {
      success: false,
      error: stripeError.message,
    };
  }
}
` : ''}

/**
 * Redirect to checkout (for form actions)
 */
export async function redirectToCheckout(formData: FormData) {
  const priceId = formData.get('priceId') as string;
  const amount = formData.get('amount') as string;
  const description = formData.get('description') as string;

  let result: PaymentActionResult;

  ${includeSubscriptions ? `
  if (priceId) {
    // Subscription checkout
    result = await createSubscriptionCheckout({ priceId });
  }${includeOneTime ? ' else' : ''}
  ` : ''}${includeOneTime ? `
  if (amount && description) {
    // One-time payment
    result = await createCheckoutSession({
      amount: parseInt(amount),
      currency: 'usd',
      description,
    });
  }
  ` : ''}${!includeSubscriptions && !includeOneTime ? `
  result = {
    success: false,
    error: 'No payment method configured'
  };
  ` : ''}

  if (result.success && result.url) {
    redirect(result.url);
  } else {
    throw new Error(result.error || 'Payment setup failed');
  }
}

/**
 * Redirect to customer portal (for form actions)
 */
export async function redirectToCustomerPortal() {
  ${includeSubscriptions ? `
  const result = await accessCustomerPortal();
  
  if (result.success && result.url) {
    redirect(result.url);
  } else {
    throw new Error(result.error || 'Customer portal access failed');
  }
  ` : `
  throw new Error('Customer portal not available');
  `}
}
`;
}

function createSubscriptionModelTemplate(): string {
  return `/**
 * @fileoverview Subscription Database Model
 * @description Subscription table definition for payment tracking
 */

import { pgTable, serial, varchar, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { userTable } from './user.js';

export const subscriptionTable = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => userTable.id).notNull(),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }).unique().notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // active, canceled, incomplete, etc.
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Zod schemas for validation
export const insertSubscriptionSchema = createInsertSchema(subscriptionTable);
export const selectSubscriptionSchema = createSelectSchema(subscriptionTable);

export type Subscription = typeof subscriptionTable.$inferSelect;
export type NewSubscription = typeof subscriptionTable.$inferInsert;
`;
}

function createSubscriptionQueriesTemplate(): string {
  return `/**
 * @fileoverview Subscription Database Queries
 * @description Database operations for subscription management
 */

import { eq, and } from 'drizzle-orm';
import { db } from './index.js';
import { subscriptionTable, type Subscription, type NewSubscription } from '../../models/subscription.js';

/**
 * Create a new subscription record
 */
export async function createSubscription(subscriptionData: NewSubscription): Promise<Subscription> {
  const [subscription] = await db
    .insert(subscriptionTable)
    .values({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .returning();
  
  if (!subscription) {
    throw new Error('Failed to create subscription');
  }
  
  return subscription;
}

/**
 * Get subscription by Stripe subscription ID
 */
export async function getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptionTable)
    .where(eq(subscriptionTable.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  
  return subscription || null;
}

/**
 * Get subscription by user ID
 */
export async function getSubscriptionByUserId(userId: number): Promise<Subscription | null> {
  const [subscription] = await db
    .select()
    .from(subscriptionTable)
    .where(eq(subscriptionTable.userId, userId))
    .limit(1);
  
  return subscription || null;
}

/**
 * Update subscription
 */
export async function updateSubscription(
  stripeSubscriptionId: string,
  updateData: Partial<NewSubscription>
): Promise<Subscription> {
  const [subscription] = await db
    .update(subscriptionTable)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(subscriptionTable.stripeSubscriptionId, stripeSubscriptionId))
    .returning();
  
  if (!subscription) {
    throw new Error('Failed to update subscription');
  }
  
  return subscription;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  stripeSubscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Subscription> {
  return updateSubscription(stripeSubscriptionId, {
    status: cancelAtPeriodEnd ? 'active' : 'canceled',
    cancelAtPeriodEnd,
  });
}

/**
 * Get active subscriptions for user
 */
export async function getActiveUserSubscriptions(userId: number): Promise<Subscription[]> {
  return db
    .select()
    .from(subscriptionTable)
    .where(
      and(
        eq(subscriptionTable.userId, userId),
        eq(subscriptionTable.status, 'active')
      )
    );
}

/**
 * Delete subscription record
 */
export async function deleteSubscription(stripeSubscriptionId: string): Promise<void> {
  await db
    .delete(subscriptionTable)
    .where(eq(subscriptionTable.stripeSubscriptionId, stripeSubscriptionId));
}
`;
}

function createPricingTableTemplate(): string {
  return `/**
 * @fileoverview Pricing Table Component
 * @description Subscription pricing plans display with checkout integration
 */

'use client';

import { useState } from 'react';
import { redirectToCheckout } from '@/actions/payments.js';
import { formatPrice } from '@/lib/payments/utils.js';
import type { PricingTableProps } from '@/types/payments.js';

export function PricingTable({ 
  plans, 
  currentPlanId, 
  showTrialInfo = true,
  className = '' 
}: PricingTableProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    
    try {
      const formData = new FormData();
      formData.append('priceId', priceId);
      await redirectToCheckout(formData);
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={\`grid gap-6 md:grid-cols-2 lg:grid-cols-3 \${className}\`}>
      {plans.map((plan) => {
        const isCurrentPlan = currentPlanId === plan.priceId;
        const isPopular = plan.popular;
        
        return (
          <div
            key={plan.id}
            className={\`relative flex flex-col rounded-lg border \${
              isPopular
                ? 'border-blue-500 shadow-blue-500/25 shadow-lg'
                : 'border-gray-200'
            } bg-white p-6 shadow-sm\`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white">
                  Most Popular
                </span>
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
              
              {plan.description && (
                <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
              )}
              
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900">
                  {formatPrice(plan.price * 100, plan.currency)}
                </span>
                <span className="text-gray-600">/{plan.interval}</span>
              </div>
              
              {showTrialInfo && plan.trialDays && (
                <p className="mt-2 text-sm text-green-600">
                  {plan.trialDays}-day free trial
                </p>
              )}
              
              {plan.features && (
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="mt-8">
              {isCurrentPlan ? (
                <div className="w-full rounded-md border border-gray-300 bg-gray-50 py-2 px-4 text-center text-sm font-medium text-gray-500">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={loading === plan.priceId}
                  className={\`w-full rounded-md py-2 px-4 text-sm font-medium transition-colors \${
                    isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                      : 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed\`}
                >
                  {loading === plan.priceId ? 'Processing...' : 'Subscribe'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
`;
}

function createCheckoutButtonTemplate(): string {
  return `/**
 * @fileoverview Checkout Button Component
 * @description One-time payment checkout button with loading states
 */

'use client';

import { useState } from 'react';
import { createCheckoutSession } from '@/actions/payments.js';
import type { CheckoutButtonProps } from '@/types/payments.js';

export function CheckoutButton({
  amount,
  currency,
  description,
  metadata = {},
  className = '',
  children,
  disabled = false
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const result = await createCheckoutSession({
        amount,
        currency,
        description,
        metadata,
      });
      
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        throw new Error(result.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={disabled || loading}
      className={\`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed \${className}\`}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
}
`;
}

function createPaymentComponentsIndex(includeSubscriptions: boolean, includeOneTime: boolean): string {
  let exports = '';
  
  if (includeSubscriptions) {
    exports += "export { PricingTable } from './pricing-table.js';\n";
  }
  
  if (includeOneTime) {
    exports += "export { CheckoutButton } from './checkout-button.js';\n";
  }
  
  return exports || "// No components exported\n";
}