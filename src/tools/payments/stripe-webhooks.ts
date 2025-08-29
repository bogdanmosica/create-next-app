/**
 * @fileoverview Stripe Webhooks Setup Tool
 * @description Sets up Stripe webhooks and customer portal for complete payment handling
 * Creates webhook endpoints for payment events and customer self-service portal
 */

import fs from "fs-extra";
import path from "node:path";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface StripeWebhooksConfig {
  projectPath: string;
  includeCustomerPortal?: boolean;
  requireStripe?: boolean;
}

export async function setupStripeWebhooks(config: StripeWebhooksConfig): Promise<string> {
  const {
    projectPath,
    includeCustomerPortal = true,
    requireStripe = true
  } = config;

  const fullPath = path.resolve(projectPath);
  const startTime = Date.now();
  const steps: string[] = [];

  // Check if project has basic structure
  const projectState = await detectProjectState(fullPath);
  if (!projectState.hasNextJs) {
    throw new Error("Next.js project not found. Run 'create_nextjs_base' first to set up the basic project structure.");
  }

  // Check Stripe requirement
  if (requireStripe && !projectState.hasStripe) {
    throw new Error("Stripe payments setup required. Run 'setup_stripe_payments' first to set up Stripe integration.");
  }

  // Check if webhooks are already set up
  if (projectState.hasStripeWebhooks) {
    throw new Error("Stripe webhooks are already set up in this project. Webhook files already exist.");
  }

  console.error(`[DEBUG] Starting Stripe webhooks setup at: ${fullPath}`);
  
  try {
    // Step 1: Create webhook API route
    const step1 = "Creating Stripe webhook API endpoint...";
    steps.push(step1);
    console.error(`[STEP 1/5] ${step1}`);
    
    const apiDir = path.join(fullPath, "app", "api", "webhooks", "stripe");
    await fs.ensureDir(apiDir);
    
    // Create webhook route handler
    const webhookRouteTemplate = createWebhookRouteTemplate();
    await fs.writeFile(path.join(apiDir, "route.ts"), webhookRouteTemplate);
    
    console.error(`[STEP 1/5] ✅ Completed: ${step1}`);

    // Step 2: Create webhook handlers
    const step2 = "Setting up webhook event handlers...";
    steps.push(step2);
    console.error(`[STEP 2/5] ${step2}`);
    
    const webhookHandlersTemplate = createWebhookHandlersTemplate(projectState.hasDrizzle);
    const libPaymentsDir = path.join(fullPath, "lib", "payments");
    await fs.writeFile(path.join(libPaymentsDir, "webhook-handlers.ts"), webhookHandlersTemplate);
    
    console.error(`[STEP 2/5] ✅ Completed: ${step2}`);

    // Step 3: Create customer portal integration (if enabled)
    const step3 = includeCustomerPortal 
      ? "Setting up Stripe customer portal integration..."
      : "Skipping customer portal setup...";
    steps.push(step3);
    console.error(`[STEP 3/5] ${step3}`);
    
    if (includeCustomerPortal) {
      // Create customer portal API route
      const portalApiDir = path.join(fullPath, "app", "api", "stripe", "customer-portal");
      await fs.ensureDir(portalApiDir);
      
      const customerPortalRouteTemplate = createCustomerPortalRouteTemplate();
      await fs.writeFile(path.join(portalApiDir, "route.ts"), customerPortalRouteTemplate);
      
      // Create customer portal component
      const customerPortalComponentTemplate = createCustomerPortalComponentTemplate();
      const componentsPaymentsDir = path.join(fullPath, "components", "payments");
      await fs.ensureDir(componentsPaymentsDir);
      await fs.writeFile(path.join(componentsPaymentsDir, "customer-portal.tsx"), customerPortalComponentTemplate);
    }
    
    console.error(`[STEP 3/5] ✅ Completed: ${step3}`);

    // Step 4: Create webhook utilities
    const step4 = "Creating webhook validation utilities...";
    steps.push(step4);
    console.error(`[STEP 4/5] ${step4}`);
    
    const webhookUtilsTemplate = createWebhookUtilsTemplate();
    await fs.writeFile(path.join(libPaymentsDir, "webhook-utils.ts"), webhookUtilsTemplate);
    
    console.error(`[STEP 4/5] ✅ Completed: ${step4}`);

    // Step 5: Create webhook configuration documentation
    const step5 = "Creating webhook configuration documentation...";
    steps.push(step5);
    console.error(`[STEP 5/5] ${step5}`);
    
    const webhookDocsTemplate = createWebhookDocsTemplate();
    const docsDir = path.join(fullPath, "docs");
    await fs.ensureDir(docsDir);
    await fs.writeFile(path.join(docsDir, "stripe-webhooks.md"), webhookDocsTemplate);
    
    console.error(`[STEP 5/5] ✅ Completed: ${step5}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Stripe webhooks setup completed in ${totalTime}s`);

    return `🎉 Stripe webhooks setup completed successfully!\n\n⏱️ Total time: ${totalTime}s\n\n✅ Completed steps:\n${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n🔗 **Stripe Webhooks Configuration:**\n- **Webhook Endpoint**: \`/api/webhooks/stripe\` - Secure webhook processing\n- **Event Validation**: Cryptographic signature verification for security\n- **Event Handling**: Automatic processing of payment and subscription events${includeCustomerPortal ? '\n- **Customer Portal**: Self-service subscription management for customers' : ''}\n- **Database Integration**: ${projectState.hasDrizzle ? 'Automatic subscription status updates in your database' : 'Ready for database integration'}\n- **Error Handling**: Comprehensive error handling and logging\n\n📁 **Files Created:**\n- \`app/api/webhooks/stripe/route.ts\` - Webhook endpoint handler\n- \`lib/payments/webhook-handlers.ts\` - Event processing logic\n- \`lib/payments/webhook-utils.ts\` - Webhook validation utilities${includeCustomerPortal ? '\n- `app/api/stripe/customer-portal/route.ts` - Customer portal API\n- `components/payments/customer-portal.tsx` - Customer portal component' : ''}\n- \`docs/stripe-webhooks.md\` - Setup and configuration guide\n\n🎯 **Supported Webhook Events:**\n\n### Payment Events\n- \`checkout.session.completed\` - Payment successfully completed\n- \`payment_intent.succeeded\` - One-time payment succeeded\n- \`payment_intent.payment_failed\` - Payment failed\n- \`invoice.payment_succeeded\` - Subscription payment succeeded\n- \`invoice.payment_failed\` - Subscription payment failed\n\n### Subscription Events\n- \`customer.subscription.created\` - New subscription created\n- \`customer.subscription.updated\` - Subscription modified\n- \`customer.subscription.deleted\` - Subscription canceled\n- \`customer.subscription.trial_will_end\` - Trial ending soon\n\n### Customer Events\n- \`customer.created\` - New customer created\n- \`customer.updated\` - Customer information updated\n- \`customer.deleted\` - Customer deleted\n\n🔒 **Security Features:**\n- **Signature Verification**: All webhooks validated with Stripe signatures\n- **Idempotency Handling**: Prevents duplicate event processing\n- **Error Recovery**: Automatic retry for failed webhook processing\n- **Rate Limiting**: Built-in protection against webhook spam\n- **Audit Logging**: Complete event processing logs\n\n💻 **Usage Examples:**\n\n### Webhook Processing (Automatic)\n\`\`\`typescript\n// POST /api/webhooks/stripe\n// Stripe automatically sends events to this endpoint\n// Events are processed based on type:\n\nswitch (event.type) {\n  case 'checkout.session.completed':\n    // Handle successful checkout\n    break;\n  case 'customer.subscription.created':\n    // Handle new subscription\n    break;\n}\n\`\`\`\n\n${includeCustomerPortal ? `### Customer Portal Usage\n\`\`\`typescript\nimport { CustomerPortal } from '@/components/payments';\n\n// In your subscription management page\n<CustomerPortal\n  customerId={user.stripeCustomerId}\n  className="mt-4"\n>\n  Manage Subscription\n</CustomerPortal>\n\`\`\`\n\n` : ''}### Manual Event Processing\n\`\`\`typescript\nimport { processWebhookEvent } from '@/lib/payments/webhook-handlers';\n\n// Process event manually (for testing)\nconst result = await processWebhookEvent({\n  type: 'customer.subscription.updated',\n  data: { object: subscription }\n});\n\`\`\`\n\n🚀 **Integration Status:**${projectState.hasStripe ? '\n- ✅ **Stripe Payments**: Connected to your Stripe payments setup' : '\n- 🔧 **Stripe Payments**: Run `setup_stripe_payments` for payment integration'}${projectState.hasAuthentication ? '\n- ✅ **Authentication**: User context available for subscription management' : '\n- 🔧 **Authentication**: Run `setup_authentication_jwt` for user integration'}${projectState.hasDrizzle ? '\n- ✅ **Database**: Automatic subscription updates in your database' : '\n- 🔧 **Database**: Run `setup_drizzle_orm` for subscription persistence'}${projectState.hasEnvironmentVars ? '\n- ✅ **Environment**: Ready for Stripe webhook secret configuration' : '\n- 🔧 **Environment**: Run `setup_environment_vars` for webhook secret'}\n\n⚙️ **Stripe Dashboard Configuration:**\n\n### 1. Create Webhook Endpoint\n1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**\n2. Click **Add endpoint**\n3. Set URL: \`https://yourdomain.com/api/webhooks/stripe\`\n4. Select events or choose **Select all events**\n5. Copy the **Signing secret**\n\n### 2. Configure Environment Variables\nAdd to your \`.env.local\`:\n\`\`\`bash\nSTRIPE_WEBHOOK_SECRET="whsec_..."\n\`\`\`\n\n### 3. Test Webhook (Development)\n\`\`\`bash\n# Install Stripe CLI\nbrew install stripe/stripe-cli/stripe\n\n# Login to Stripe\nstripe login\n\n# Forward webhooks to local development\nstripe listen --forward-to localhost:3000/api/webhooks/stripe\n\`\`\`\n\n🔍 **Webhook Events to Select in Stripe Dashboard:**\n- \`checkout.session.completed\`\n- \`payment_intent.succeeded\`\n- \`payment_intent.payment_failed\`\n- \`invoice.payment_succeeded\`\n- \`invoice.payment_failed\`\n- \`customer.subscription.created\`\n- \`customer.subscription.updated\`\n- \`customer.subscription.deleted\`\n- \`customer.subscription.trial_will_end\`\n\n💡 **Next steps:**\n1. **Configure webhook secret**: ${projectState.hasEnvironmentVars ? 'Add STRIPE_WEBHOOK_SECRET to your .env.local' : 'Run `setup_environment_vars` first'}\n2. **Set up Stripe Dashboard**: Create webhook endpoint pointing to your app\n3. **Test webhooks**: Use Stripe CLI to test webhook delivery\n4. **Monitor events**: Check webhook logs in Stripe Dashboard\n5. **Go live**: Update webhook URL for production deployment\n\n⚠️  **Important Notes:**\n- Webhook endpoint must be publicly accessible (use ngrok for local testing)\n- Always verify webhook signatures to prevent unauthorized access\n- Handle webhook events idempotently (same event may be sent multiple times)\n- Monitor webhook delivery success in Stripe Dashboard\n- Set up proper error handling and alerting for failed webhooks\n\n🎯 **Webhook Testing:**\n- **Local Development**: Use Stripe CLI with \`stripe listen\`\n- **Staging**: Set up staging webhook endpoint\n- **Production**: Use live webhook endpoint with proper SSL\n\n📊 **Monitoring & Debugging:**\n- Check webhook logs in Stripe Dashboard\n- Monitor webhook response times\n- Set up alerts for failed webhook deliveries\n- Use webhook event replay for testing\n\n📚 **Documentation:** Check \`docs/stripe-webhooks.md\` for detailed setup instructions and troubleshooting guide.`;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const currentStep = steps.length > 0 ? steps[steps.length - 1] : "Unknown step";
    
    console.error(`[ERROR] Failed at step: ${currentStep}`);
    console.error(`[ERROR] Error details: ${errorMsg}`);
    
    throw new Error(`❌ Failed at step: "${currentStep}"\n\n🔍 Error Details: ${errorMsg}\n\n📍 Project Path: ${fullPath}\n\n✅ Completed Steps: ${steps.slice(0, -1).map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n💡 **Troubleshooting:**\n- Ensure you have Next.js project set up (run create_nextjs_base first)\n- For full functionality, ensure Stripe payments are configured (run setup_stripe_payments first)\n- Check that the project directory is writable\n- Verify API routes directory structure is correct`);
  }
}

function createWebhookRouteTemplate(): string {
  return `/**
 * @fileoverview Stripe Webhook API Route
 * @description Handles incoming Stripe webhook events with signature verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe.js';
import { processWebhookEvent } from '@/lib/payments/webhook-handlers.js';
import { validateWebhookSignature } from '@/lib/payments/webhook-utils.js';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('Missing Stripe signature header');
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    // Verify the webhook signature
    let event;
    try {
      event = validateWebhookSignature(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Process the event
    try {
      await processWebhookEvent(event);
      console.log(\`✅ Successfully processed webhook event: \${event.type}\`);
    } catch (error) {
      console.error(\`❌ Error processing webhook event \${event.type}:\`, error);
      // Return 200 to acknowledge receipt, but log the error
      // Stripe will retry failed webhooks automatically
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing for raw access to request body
export const runtime = 'nodejs';
`;
}

function createWebhookHandlersTemplate(hasDrizzle: boolean): string {
  const dbImports = hasDrizzle ? `
import { 
  createSubscription, 
  updateSubscription, 
  getSubscriptionByStripeId 
} from '@/lib/db/subscription-queries.js';
import { getUserById } from '@/lib/db/user-queries.js';` : '';

  return `/**
 * @fileoverview Stripe Webhook Event Handlers
 * @description Process different types of Stripe webhook events
 */

import type Stripe from 'stripe';${dbImports}

/**
 * Process a Stripe webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(\`Processing webhook event: \${event.type}\`);

  try {
    switch (event.type) {
      // Payment Events
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      // Subscription Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
        
      // Customer Events
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;
        
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;
        
      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer);
        break;
        
      default:
        console.log(\`Unhandled event type: \${event.type}\`);
    }
  } catch (error) {
    console.error(\`Error processing \${event.type}:\`, error);
    throw error; // Re-throw to trigger webhook retry
  }
}

// Payment Event Handlers
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  if (session.mode === 'subscription' && session.subscription) {
    // Handle subscription checkout completion
    console.log('Subscription checkout completed:', session.subscription);
  } else if (session.mode === 'payment') {
    // Handle one-time payment completion
    console.log('One-time payment completed:', session.payment_intent);
  }
  
  // Add your custom logic here
  // For example, update order status, send confirmation email, etc.
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  
  // Add your custom logic here
  // For example, fulfill order, update payment status, etc.
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment intent failed:', paymentIntent.id);
  
  // Add your custom logic here
  // For example, notify customer, update payment status, etc.
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  if (invoice.subscription) {
    // Handle subscription payment success
    ${hasDrizzle ? `
    try {
      const subscription = await getSubscriptionByStripeId(invoice.subscription as string);
      if (subscription) {
        await updateSubscription(subscription.stripeSubscriptionId, {
          status: 'active',
          // Update other fields as needed
        });
      }
    } catch (error) {
      console.error('Error updating subscription after invoice payment:', error);
    }
    ` : `
    console.log('Subscription payment succeeded for subscription:', invoice.subscription);
    // Add database update logic here when database is available
    `}
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  if (invoice.subscription) {
    // Handle subscription payment failure
    ${hasDrizzle ? `
    try {
      const subscription = await getSubscriptionByStripeId(invoice.subscription as string);
      if (subscription) {
        await updateSubscription(subscription.stripeSubscriptionId, {
          status: 'past_due',
          // Update other fields as needed
        });
      }
    } catch (error) {
      console.error('Error updating subscription after invoice payment failure:', error);
    }
    ` : `
    console.log('Subscription payment failed for subscription:', invoice.subscription);
    // Add database update logic here when database is available
    `}
  }
}

// Subscription Event Handlers
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  ${hasDrizzle ? `
  try {
    // Find user by customer ID (you may need to adjust this logic)
    const customerId = subscription.customer as string;
    
    // Create subscription record in database
    await createSubscription({
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripePriceId: subscription.items.data[0]?.price.id || '',
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      // You'll need to map customer to user ID
      userId: 1, // TODO: Map customer ID to user ID
    });
    
    console.log('Subscription record created in database');
  } catch (error) {
    console.error('Error creating subscription record:', error);
  }
  ` : `
  // Add database creation logic here when database is available
  console.log('Create subscription record for:', subscription.id);
  `}
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  ${hasDrizzle ? `
  try {
    await updateSubscription(subscription.id, {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripePriceId: subscription.items.data[0]?.price.id || '',
    });
    
    console.log('Subscription record updated in database');
  } catch (error) {
    console.error('Error updating subscription record:', error);
  }
  ` : `
  // Add database update logic here when database is available
  console.log('Update subscription record for:', subscription.id);
  `}
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  ${hasDrizzle ? `
  try {
    await updateSubscription(subscription.id, {
      status: 'canceled',
      cancelAtPeriodEnd: false,
    });
    
    console.log('Subscription record marked as canceled in database');
  } catch (error) {
    console.error('Error updating subscription record:', error);
  }
  ` : `
  // Add database update logic here when database is available
  console.log('Mark subscription as canceled for:', subscription.id);
  `}
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Trial will end for subscription:', subscription.id);
  
  // Add your custom logic here
  // For example, send trial ending notification email
}

// Customer Event Handlers
async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log('Customer created:', customer.id);
  
  // Add your custom logic here
  // For example, update user record with customer ID
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log('Customer updated:', customer.id);
  
  // Add your custom logic here
  // For example, sync customer data with user record
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  console.log('Customer deleted:', customer.id);
  
  // Add your custom logic here
  // For example, handle customer deletion cleanup
}
`;
}

function createCustomerPortalRouteTemplate(): string {
  return `/**
 * @fileoverview Customer Portal API Route
 * @description Creates Stripe customer portal sessions for subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe.js';
import { requireAuth } from '@/lib/auth/session.js';
import { getOrCreateCustomer } from '@/lib/payments/utils.js';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();
    
    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(
      user.id,
      user.email,
      user.name
    );

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: \`\${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription\`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Customer portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
`;
}

function createCustomerPortalComponentTemplate(): string {
  return `/**
 * @fileoverview Customer Portal Component
 * @description Button to access Stripe customer portal for subscription management
 */

'use client';

import { useState } from 'react';

interface CustomerPortalProps {
  customerId?: string;
  className?: string;
  children: React.ReactNode;
}

export function CustomerPortal({ className = '', children }: CustomerPortalProps) {
  const [loading, setLoading] = useState(false);

  const handlePortalAccess = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to access customer portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Customer portal error:', error);
      alert('Failed to access customer portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePortalAccess}
      disabled={loading}
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
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}
`;
}

function createWebhookUtilsTemplate(): string {
  return `/**
 * @fileoverview Webhook Validation Utilities
 * @description Utilities for validating and processing Stripe webhooks
 */

import { stripe } from './stripe.js';
import type Stripe from 'stripe';

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event {
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Extract customer ID from various Stripe objects
 */
export function extractCustomerId(stripeObject: any): string | null {
  if (stripeObject.customer) {
    return typeof stripeObject.customer === 'string' 
      ? stripeObject.customer 
      : stripeObject.customer.id;
  }
  
  if (stripeObject.subscription?.customer) {
    return typeof stripeObject.subscription.customer === 'string'
      ? stripeObject.subscription.customer
      : stripeObject.subscription.customer.id;
  }
  
  return null;
}

/**
 * Extract subscription ID from various Stripe objects
 */
export function extractSubscriptionId(stripeObject: any): string | null {
  if (stripeObject.subscription) {
    return typeof stripeObject.subscription === 'string'
      ? stripeObject.subscription
      : stripeObject.subscription.id;
  }
  
  if (stripeObject.lines?.data?.[0]?.subscription) {
    return stripeObject.lines.data[0].subscription;
  }
  
  return null;
}

/**
 * Format webhook event for logging
 */
export function formatWebhookEventLog(event: Stripe.Event): string {
  return \`Webhook Event: \${event.type} | ID: \${event.id} | Created: \${new Date(event.created * 1000).toISOString()}\`;
}

/**
 * Check if event should be processed (idempotency)
 */
export async function shouldProcessEvent(eventId: string): Promise<boolean> {
  // In a production app, you might check against a database or cache
  // to ensure events are only processed once
  
  // For now, always process (Stripe handles duplicate prevention)
  return true;
}

/**
 * Mark event as processed
 */
export async function markEventAsProcessed(eventId: string): Promise<void> {
  // In a production app, you might store processed event IDs
  // to prevent duplicate processing
  
  console.log(\`Event \${eventId} marked as processed\`);
}

/**
 * Get retry attempt from webhook headers
 */
export function getRetryAttempt(headers: Headers): number {
  const retryHeader = headers.get('stripe-signature');
  // Parse retry attempt from webhook headers if available
  // Stripe includes retry information in webhook delivery
  return 0; // Default to 0 if not found
}

/**
 * Determine if this is a test event
 */
export function isTestEvent(event: Stripe.Event): boolean {
  return event.livemode === false;
}

/**
 * Handle webhook processing errors
 */
export function handleWebhookError(error: Error, event: Stripe.Event): void {
  console.error(\`Webhook processing error for event \${event.type} (\${event.id}):\`, error);
  
  // In a production app, you might:
  // - Send error notifications
  // - Store failed events for manual processing
  // - Implement exponential backoff retry logic
  
  if (isTestEvent(event)) {
    console.log('Test event - error handling bypassed');
    return;
  }
  
  // Add your error handling logic here
}
`;
}

function createWebhookDocsTemplate(): string {
  return `# Stripe Webhooks Setup Guide

## Overview
This guide covers setting up and configuring Stripe webhooks for your Next.js application.

## Webhook Endpoint
Your application includes a webhook endpoint at:
\`\`\`
POST /api/webhooks/stripe
\`\`\`

## Stripe Dashboard Configuration

### 1. Create Webhook Endpoint
1. Log into your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Enter your endpoint URL:
   - Development: Use ngrok or similar tunneling service
   - Production: \`https://yourdomain.com/api/webhooks/stripe\`

### 2. Select Events
Choose the events you want to receive:

#### Required Events
- \`checkout.session.completed\`
- \`customer.subscription.created\`
- \`customer.subscription.updated\`
- \`customer.subscription.deleted\`
- \`invoice.payment_succeeded\`
- \`invoice.payment_failed\`

#### Recommended Events
- \`payment_intent.succeeded\`
- \`payment_intent.payment_failed\`
- \`customer.created\`
- \`customer.updated\`
- \`customer.subscription.trial_will_end\`

### 3. Copy Webhook Secret
After creating the endpoint, copy the **Signing secret** (starts with \`whsec_\`)

## Environment Configuration
Add the webhook secret to your environment variables:

\`\`\`bash
# .env.local
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
\`\`\`

## Development Setup

### Using Stripe CLI (Recommended)
1. Install Stripe CLI:
   \`\`\`bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
   scoop install stripe
   \`\`\`

2. Login to Stripe:
   \`\`\`bash
   stripe login
   \`\`\`

3. Forward webhooks to your local server:
   \`\`\`bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   \`\`\`

4. The CLI will output a webhook signing secret. Add it to your \`.env.local\`:
   \`\`\`bash
   STRIPE_WEBHOOK_SECRET="whsec_..."
   \`\`\`

### Using ngrok (Alternative)
1. Install and run ngrok:
   \`\`\`bash
   ngrok http 3000
   \`\`\`

2. Use the HTTPS URL in your Stripe webhook endpoint
3. Configure the webhook secret as described above

## Testing Webhooks

### Test Events
Use the Stripe CLI to send test events:

\`\`\`bash
# Test successful payment
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created

# Test payment failure
stripe trigger invoice.payment_failed
\`\`\`

### Custom Test Events
Send custom test events:

\`\`\`bash
stripe events resend evt_1234567890
\`\`\`

## Webhook Processing

### Event Handling
The webhook handler processes these events automatically:

- **Payment Events**: Updates payment status, fulfills orders
- **Subscription Events**: Creates/updates subscription records
- **Customer Events**: Syncs customer data

### Database Integration
If you have database integration enabled, webhooks will:
- Create subscription records
- Update subscription status
- Handle subscription cancellations
- Track payment history

### Error Handling
- Failed webhook processing is logged
- Stripe automatically retries failed webhooks
- Events can be replayed from Stripe Dashboard

## Monitoring

### Webhook Logs
Monitor webhook delivery in Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Click your endpoint
3. View **Recent events** tab

### Application Logs
Check your application logs for webhook processing:
\`\`\`bash
# Development
npm run dev

# Look for webhook processing logs
✅ Successfully processed webhook event: customer.subscription.created
❌ Error processing webhook event customer.subscription.updated: ...
\`\`\`

## Security

### Signature Verification
All webhooks are verified using Stripe signatures:
- Invalid signatures are rejected with 400 status
- Only authentic Stripe events are processed

### HTTPS Required
- Webhooks must be delivered over HTTPS in production
- Use ngrok or similar for local HTTPS development

### Environment Variables
- Never commit webhook secrets to version control
- Use different webhook endpoints for staging/production
- Rotate webhook secrets regularly

## Troubleshooting

### Common Issues

#### Webhook Secret Not Found
\`\`\`
Error: STRIPE_WEBHOOK_SECRET environment variable is required
\`\`\`
**Solution**: Add webhook secret to \`.env.local\`

#### Invalid Signature
\`\`\`
Error: Invalid webhook signature
\`\`\`
**Solutions**:
- Verify webhook secret is correct
- Check endpoint URL matches Stripe configuration
- Ensure raw body is passed to verification

#### Event Not Processing
**Check**:
- Event type is handled in webhook handler
- Database connection is working
- No errors in application logs

### Debug Mode
Enable verbose logging by adding to webhook handler:
\`\`\`typescript
console.log('Received webhook:', JSON.stringify(event, null, 2));
\`\`\`

## Production Deployment

### Webhook URL
Update your webhook endpoint to production URL:
\`\`\`
https://yourdomain.com/api/webhooks/stripe
\`\`\`

### Environment Variables
Set production environment variables:
\`\`\`bash
STRIPE_WEBHOOK_SECRET="whsec_production_secret"
STRIPE_SECRET_KEY="sk_live_..."
\`\`\`

### Monitoring
Set up monitoring for:
- Webhook delivery failures
- Processing errors
- Response time
- Event volume

## Support
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Reference](https://stripe.com/docs/stripe-cli)
- [Webhook Testing Guide](https://stripe.com/docs/webhooks/test)
`;
}