/**
 * @fileoverview Enhanced Project Structure Templates
 * @description Templates for creating a well-organized Next.js project with libs, models, validations, and implementation patterns
 * Inspired by Next.js Boilerplate best practices but adapted for JWT auth, Biome, and Drizzle setup
 */

// === LIBS TEMPLATES ===

export const envLibTemplate = `import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const Env = createEnv({
  server: {
    // Database
    POSTGRES_URL: z.string().url(),
    
    // Authentication
    AUTH_SECRET: z.string().min(32),
    
    // Payments
    STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
    
    // App Configuration
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  
  client: {
    // Public app configuration
    NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  },
  
  shared: {
    // Shared between client and server
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },
  
  runtimeEnv: {
    // Server
    POSTGRES_URL: process.env.POSTGRES_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    
    // Client
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
});

export type EnvType = typeof Env;
`;

export const dbLibTemplate = `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@/models/schema';
import { Env } from './env';

declare global {
  var __db: NodePgDatabase<typeof schema> | undefined;
}

let db: NodePgDatabase<typeof schema>;

if (process.env.NODE_ENV === 'production') {
  db = drizzle(new Pool({ connectionString: Env.POSTGRES_URL }), { schema });
} else {
  if (!global.__db) {
    global.__db = drizzle(new Pool({ connectionString: Env.POSTGRES_URL }), { schema });
  }
  db = global.__db;
}

export { db };
export type Database = typeof db;
`;

export const loggerLibTemplate = `type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  teamId?: string;
  requestId?: string;
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? \` - \${JSON.stringify(context)}\` : '';
    return \`[\${timestamp}] [\${level.toUpperCase()}] \${message}\${contextStr}\`;
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context;
    console.error(this.formatMessage('error', message, errorContext));
  }
}

export const logger = new Logger();
export type { LogLevel, LogContext };
`;

export const utilsLibTemplate = `/**
 * Common utility functions
 */

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100); // Stripe amounts are in cents
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).substring(2, 15);
  return prefix ? \`\${prefix}_\${id}\` : id;
}

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') // collapse dashes
    .replace(/^-+/, '') // trim - from start of text
    .replace(/-+$/, ''); // trim - from end of text
}
`;

// === MODELS TEMPLATES ===

export const userModelTemplate = `import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';
import { teamMembers, teams } from './team';
import { activityLogs } from './activity-log';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => \`user_\${Math.random().toString(36).substring(2, 15)}\`),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  name: varchar('name', { length: 100 }),
  avatar: text('avatar'),
  emailVerified: boolean('email_verified').default(false),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;

export const teamModelTemplate = `import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, varchar, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './user';
import { activityLogs } from './activity-log';

export const memberRoleEnum = pgEnum('member_role', ['owner', 'admin', 'member']);

export const teams = pgTable('teams', {
  id: text('id').primaryKey().$defaultFn(() => \`team_\${Math.random().toString(36).substring(2, 15)}\`),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 50 }).default('inactive'),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const teamMembers = pgTable('team_members', {
  id: text('id').primaryKey().$defaultFn(() => \`tm_\${Math.random().toString(36).substring(2, 15)}\`),
  teamId: text('team_id').references(() => teams.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  role: memberRoleEnum('role').default('member').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  activityLogs: many(activityLogs),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type MemberRole = typeof memberRoleEnum.enumValues[number];
`;

export const activityLogModelTemplate = `import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, varchar, json } from 'drizzle-orm/pg-core';
import { users } from './user';
import { teams } from './team';

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey().$defaultFn(() => \`log_\${Math.random().toString(36).substring(2, 15)}\`),
  userId: text('user_id').references(() => users.id).notNull(),
  teamId: text('team_id').references(() => teams.id),
  action: varchar('action', { length: 100 }).notNull(),
  description: text('description').notNull(),
  metadata: json('metadata'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
  team: one(teams, { fields: [activityLogs.teamId], references: [teams.id] }),
}));

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
`;

export const schemaIndexTemplate = `/**
 * @fileoverview Database Schema Index
 * @description Exports all database tables and relations for Drizzle ORM
 */

// Export all tables
export * from './user';
export * from './team';
export * from './activity-log';

// Re-export for convenience
import { users, usersRelations } from './user';
import { teams, teamMembers, teamsRelations, teamMembersRelations } from './team';
import { activityLogs, activityLogsRelations } from './activity-log';

// Import types for composite types
import { User, NewUser } from './user';
import { Team, NewTeam, TeamMember, NewTeamMember } from './team';

export const schema = {
  // Tables
  users,
  teams,
  teamMembers,
  activityLogs,
  
  // Relations
  usersRelations,
  teamsRelations,
  teamMembersRelations,
  activityLogsRelations,
};

// Composite types
export type TeamDataWithMembers = Team & {
  members: (TeamMember & { user: Pick<User, 'id' | 'name' | 'email'> })[];
};
`;

// === VALIDATIONS TEMPLATES ===

export const authValidationTemplate = `import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
});

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  email: z.string().email('Please enter a valid email address'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
`;

export const teamValidationTemplate = `import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Team name can only contain letters, numbers, spaces, hyphens, and underscores'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'Slug can only contain lowercase letters, numbers, hyphens, and underscores')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with hyphens'),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(50, 'Team name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Team name can only contain letters, numbers, spaces, hyphens, and underscores')
    .optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9_-]+$/, 'Slug can only contain lowercase letters, numbers, hyphens, and underscores')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), 'Slug cannot start or end with hyphens')
    .optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'admin', 'member'], {
    message: 'Role must be owner, admin, or member',
  }),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
  role: z.enum(['owner', 'admin', 'member'], {
    message: 'Role must be owner, admin, or member',
  }),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
`;

export const validationIndexTemplate = `/**
 * @fileoverview Validation Schemas Index
 * @description Exports all Zod validation schemas for the application
 */

// Export all validation schemas
export * from './auth';
export * from './team';

// Re-export for convenience
export {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
  type SignUpInput,
  type SignInInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from './auth';

export {
  createTeamSchema,
  updateTeamSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
} from './team';
`;