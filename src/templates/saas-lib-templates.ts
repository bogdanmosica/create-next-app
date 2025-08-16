/**
 * @fileoverview SaaS Application Templates
 * @description Complete file templates for SaaS functionality including auth, database, and payments
 * Templates are used by creators to generate production-ready SaaS applications
 */

// Auth templates
export const authMiddlewareTemplate = `import { z } from 'zod';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export type ActionState = {
 error?: string;
 success?: string;
 [key: string]: any; // This allows for additional properties
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
 data: z.infer<S>,
 formData: FormData
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
 schema: S,
 action: ValidatedActionFunction<S, T>
) {
 return async (prevState: ActionState, formData: FormData) => {
 const result = schema.safeParse(Object.fromEntries(formData));
 if (!result.success) {
 return { error: result.error.errors[0].message };
 }

 return action(result.data, formData);
 };
}

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
 data: z.infer<S>,
 formData: FormData,
 user: User
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
 schema: S,
 action: ValidatedActionWithUserFunction<S, T>
) {
 return async (prevState: ActionState, formData: FormData) => {
 const user = await getUser();
 if (!user) {
 throw new Error('User is not authenticated');
 }

 const result = schema.safeParse(Object.fromEntries(formData));
 if (!result.success) {
 return { error: result.error.errors[0].message };
 }

 return action(result.data, formData, user);
 };
}`;

export const authSessionTemplate = `import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NewUser } from '@/lib/db/schema';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
 return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
 plainTextPassword: string,
 hashedPassword: string
) {
 return compare(plainTextPassword, hashedPassword);
}

type SessionData = {
 user: { id: number };
 expires: string;
};

export async function signToken(payload: SessionData) {
 return await new SignJWT(payload)
 .setProtectedHeader({ alg: 'HS256' })
 .setIssuedAt()
 .setExpirationTime('1 day from now')
 .sign(key);
}

export async function verifyToken(input: string) {
 const { payload } = await jwtVerify(input, key, {
 algorithms: ['HS256'],
 });
 return payload as SessionData;
}

export async function getSession() {
 const session = (await cookies()).get('session')?.value;
 if (!session) return null;
 return await verifyToken(session);
}

export async function setSession(user: NewUser) {
 const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
 const session: SessionData = {
 user: { id: user.id! },
 expires: expiresInOneDay.toISOString(),
 };
 const encryptedSession = await signToken(session);
 (await cookies()).set('session', encryptedSession, {
 expires: expiresInOneDay,
 httpOnly: true,
 secure: true,
 sameSite: 'lax'
 });
}`;

// DB templates
export const dbDrizzleTemplate = `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
 throw new Error('POSTGRES_URL environment variable is not set');
}

export const client = postgres(process.env.POSTGRES_URL);
export const db = drizzle(client, { schema });`;

export const dbQueriesTemplate = `import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, teamMembers, teams, users } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
 const sessionCookie = (await cookies()).get('session');
 if (!sessionCookie || !sessionCookie.value) {
 return null;
 }

 const sessionData = await verifyToken(sessionCookie.value);
 if (
 !sessionData ||
 !sessionData.user ||
 typeof sessionData.user.id !== 'number'
 ) {
 return null;
 }

 if (new Date(sessionData.expires) < new Date()) {
 return null;
 }

 const user = await db
 .select()
 .from(users)
 .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
 .limit(1);

 if (user.length === 0) {
 return null;
 }

 return user[0];
}

export async function getTeamByStripeCustomerId(customerId: string) {
 const result = await db
 .select()
 .from(teams)
 .where(eq(teams.stripeCustomerId, customerId))
 .limit(1);

 return result.length > 0 ? result[0] : null;
}

export async function updateTeamSubscription(
 teamId: number,
 subscriptionData: {
 stripeSubscriptionId: string | null;
 stripeProductId: string | null;
 planName: string | null;
 subscriptionStatus: string;
 }
) {
 await db
 .update(teams)
 .set({
 ...subscriptionData,
 updatedAt: new Date()
 })
 .where(eq(teams.id, teamId));
}`;

export const dbSchemaTemplate = `import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION'
}

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};`;

export const dbSeedTemplate = `import { stripe } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';

async function createStripeProducts() {
 console.log('Creating Stripe products and prices...');

 const baseProduct = await stripe.products.create({
 name: 'Base',
 description: 'Base subscription plan',
 });

 await stripe.prices.create({
 product: baseProduct.id,
 unit_amount: 800, // $8 in cents
 currency: 'usd',
 recurring: {
 interval: 'month',
 trial_period_days: 7,
 }
 });

 const plusProduct = await stripe.products.create({
 name: 'Plus',
 description: 'Plus subscription plan',
 });

 await stripe.prices.create({
 product: plusProduct.id,
 unit_amount: 1200, // $12 in cents
 currency: 'usd',
 recurring: {
 interval: 'month',
 trial_period_days: 7,
 }
 });

 console.log('Stripe products and prices created successfully.');
}

async function seed() {
 const email = 'test@test.com';
 const password = 'admin123';
 const passwordHash = await hashPassword(password);

 const [user] = await db
 .insert(users)
 .values([{
 email: email,
 passwordHash: passwordHash,
 role: "owner",
 }])
 .returning();

 console.log('Initial user created.');

 const [team] = await db
 .insert(teams)
 .values({
 name: 'Test Team',
 })
 .returning();

 await db.insert(teamMembers).values({
 teamId: team.id,
 userId: user.id,
 role: 'owner',
 });

 await createStripeProducts();
}

seed().catch(console.error);`;

export const dbSetupTemplate = `import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

const execAsync = promisify(exec);

function question(query: string): Promise<string> {
 const rl = readline.createInterface({
 input: process.stdin,
 output: process.stdout,
 });

 return new Promise((resolve) => 
 rl.question(query, (ans) => {
 rl.close();
 resolve(ans);
 })
 );
}

async function checkStripeCLI() {
 console.log(
 'Step 1: Checking if Stripe CLI is installed and authenticated...'
 );
 try {
 await execAsync('stripe --version');
 console.log('Stripe CLI is installed.');

 try {
 await execAsync('stripe config --list');
 console.log('Stripe CLI is authenticated.');
 } catch (error) {
 console.log(
 'Stripe CLI is not authenticated or the authentication has expired.'
 );
 console.log('Please run: stripe login');
 const answer = await question(
 'Have you completed the authentication? (y/n): '
 );
 if (answer.toLowerCase() !== 'y') {
 console.log(
 'Please authenticate with Stripe CLI and run this script again.'
 );
 process.exit(1);
 }

 try {
 await execAsync('stripe config --list');
 console.log('Stripe CLI authentication confirmed.');
 } catch (error) {
 console.error(
 'Failed to verify Stripe CLI authentication. Please try again.'
 );
 process.exit(1);
 }
 }
 } catch (error) {
 console.error(
 'Stripe CLI is not installed. Please visit https://stripe.com/docs/stripe-cli and install it first.'
 );
 process.exit(1);
 }
}

checkStripeCLI().catch(console.error);`;

// Payments templates
export const paymentsActionsTemplate = `'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, team) => {
 const priceId = formData.get('priceId') as string;
 await createCheckoutSession({ team: team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
 const portalSession = await createCustomerPortalSession(team);
 redirect(portalSession.url);
});`;

export const paymentsStripeTemplate = `import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { Team } from '@/lib/db/schema';
import {
 getTeamByStripeCustomerId,
 getUser,
 updateTeamSubscription
} from '@/lib/db/queries';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
 apiVersion: '2025-04-30.basil'
});

export async function createCheckoutSession({
 team,
 priceId
}: {
 team: Team | null;
 priceId: string;
}) {
 const user = await getUser();

 if (!team || !user) {
 redirect(\`/sign-up?redirect=checkout&priceId=\${priceId}\`);
 }

 const session = await stripe.checkout.sessions.create({
 payment_method_types: ['card'],
 line_items: [
 {
 price: priceId,
 quantity: 1
 }
 ],
 mode: 'subscription',
 success_url: \`\${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}\`,
 cancel_url: \`\${process.env.BASE_URL}/pricing\`,
 customer: team.stripeCustomerId || undefined,
 client_reference_id: user.id.toString(),
 allow_promotion_codes: true,
 subscription_data: {
 trial_period_days: 14
 }
 });

 redirect(session.url!);
}

export async function createCustomerPortalSession(team: Team) {
 if (!team.stripeCustomerId || !team.stripeProductId) {
 redirect('/pricing');
 }

 let configuration: Stripe.BillingPortal.Configuration;
 const configurations = await stripe.billingPortal.configurations.list();

 if (configurations.data.length > 0) {
 configuration = configurations.data[0];
 } else {
 configuration = await stripe.billingPortal.configurations.create({
 business_profile: {
 headline: 'Manage your subscription',
 },
 features: {
 subscription_update: {
 enabled: true,
 default_allowed_updates: ['price'],
 proration_behavior: 'create_prorations',
 },
 },
 });
 }

 const portalSession = await stripe.billingPortal.sessions.create({
 customer: team.stripeCustomerId,
 return_url: \`\${process.env.BASE_URL}/pricing\`,
 configuration: configuration.id,
 });

 return portalSession;
}`;