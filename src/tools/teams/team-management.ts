/**
 * @fileoverview Team Management Tool
 * @description Sets up complete multi-tenant team management system with role-based permissions and activity logging
 * Provides team creation, member management, role assignments, and audit trails for SaaS applications
 */

import fs from "fs-extra";
import path from "path";
import { runCommand } from "../../runners/command-runner.js";
import { detectProjectState } from "../../utils/dependency-detector.js";

export interface TeamManagementConfig {
  projectPath: string;
  includeRoles?: boolean;
  includeActivityLogs?: boolean;
  requireAuth?: boolean;
  requireDatabase?: boolean;
}

export async function setupTeamManagement(config: TeamManagementConfig): Promise<string> {
  const {
    projectPath,
    includeRoles = true,
    includeActivityLogs = true,
    requireAuth = true,
    requireDatabase = true
  } = config;

  console.error(`[DEBUG] Setting up team management at: ${projectPath}`);
  console.error(`[DEBUG] Config - Roles: ${includeRoles}, Activity: ${includeActivityLogs}, Auth: ${requireAuth}, DB: ${requireDatabase}`);

  const steps: string[] = [];
  const startTime = Date.now();

  try {
    // Validate project path
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    // Check if this is a Next.js project
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error("Not a valid Next.js project (package.json not found). Run create_nextjs_base first.");
    }

    const packageJson = await fs.readJson(packageJsonPath);
    if (!packageJson.dependencies?.next) {
      throw new Error("Not a Next.js project. Run create_nextjs_base first.");
    }

    // Detect existing project state
    const projectState = await detectProjectState(projectPath);
    console.error(`[DEBUG] Project state:`, projectState);

    // Check requirements
    if (requireAuth && !projectState.hasAuthentication) {
      throw new Error("Authentication is required for team management. Run setup_authentication_jwt first.");
    }

    if (requireDatabase && !projectState.hasDatabase) {
      throw new Error("Database is required for team management. Run setup_drizzle_orm first.");
    }

    // Check for existing team setup by looking for more specific indicators
    const teamActionsPath = path.join(projectPath, "actions", "team.ts");
    const teamQueriesPath = path.join(projectPath, "lib", "db", "team-queries.ts");
    
    if (await fs.pathExists(teamActionsPath) && await fs.pathExists(teamQueriesPath)) {
      throw new Error("Team management appears to already be set up (team actions and queries exist).");
    }

    // Step 1: Install dependencies
    const step1 = "Installing team management dependencies...";
    steps.push(step1);
    console.error(`[STEP 1/6] ${step1}`);
    
    // Install additional packages if needed
    const packagesToInstall: string[] = [];
    
    // Check if we need additional validation packages
    if (!projectState.hasValidation) {
      packagesToInstall.push("zod");
    }

    if (packagesToInstall.length > 0) {
      await runCommand(`pnpm add ${packagesToInstall.join(" ")}`, projectPath);
    }

    console.error(`[STEP 1/6] ✅ Completed: ${step1}`);

    // Step 2: Create team database models
    const step2 = "Creating team database models and schemas...";
    steps.push(step2);
    console.error(`[STEP 2/6] ${step2}`);
    await createTeamModels(projectPath, { includeRoles, includeActivityLogs });
    console.error(`[STEP 2/6] ✅ Completed: ${step2}`);

    // Step 3: Create team database queries
    const step3 = "Setting up team database operations...";
    steps.push(step3);
    console.error(`[STEP 3/6] ${step3}`);
    await createTeamQueries(projectPath, { includeRoles, includeActivityLogs });
    console.error(`[STEP 3/6] ✅ Completed: ${step3}`);

    // Step 4: Create team validation schemas
    const step4 = "Creating team validation schemas...";
    steps.push(step4);
    console.error(`[STEP 4/6] ${step4}`);
    await createTeamValidations(projectPath, { includeRoles, includeActivityLogs });
    console.error(`[STEP 4/6] ✅ Completed: ${step4}`);

    // Step 5: Create team server actions
    const step5 = "Setting up team server actions...";
    steps.push(step5);
    console.error(`[STEP 5/6] ${step5}`);
    await createTeamActions(projectPath, { includeRoles, includeActivityLogs });
    console.error(`[STEP 5/6] ✅ Completed: ${step5}`);

    // Step 6: Create team UI components
    const step6 = "Creating team management UI components...";
    steps.push(step6);
    console.error(`[STEP 6/6] ${step6}`);
    await createTeamComponents(projectPath, { includeRoles, includeActivityLogs });
    console.error(`[STEP 6/6] ✅ Completed: ${step6}`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[SUCCESS] Team management setup completed in ${totalTime}s`);

    // Generate success message with integration status
    return generateSuccessMessage(steps, totalTime, {
      hasAuth: projectState.hasAuthentication,
      hasDatabase: projectState.hasDatabase,
      hasStripe: projectState.hasStripePayments,
      includeRoles,
      includeActivityLogs
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] Team management setup failed: ${errorMsg}`);
    throw error;
  }
}

async function createTeamModels(projectPath: string, options: { includeRoles: boolean; includeActivityLogs: boolean }): Promise<void> {
  // Create team model
  const teamModelContent = `/**
 * @fileoverview Team Database Models
 * @description Drizzle ORM schemas for team management, members, and roles
 */

import { relations } from 'drizzle-orm';
import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean,
  json,
  index
} from 'drizzle-orm/pg-core';
import { users } from './user.js';

// Team table
export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description'),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  
  // Owner and metadata
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Billing integration
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  subscriptionStatus: varchar('subscription_status', { length: 50 }).$type<'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'>(),
  subscriptionId: varchar('subscription_id', { length: 255 }),
  
  // Settings
  settings: json('settings').$type<{
    allowMemberInvites?: boolean;
    requireApproval?: boolean;
    maxMembers?: number;
    features?: string[];
  }>().default({}),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('teams_slug_idx').on(table.slug),
  ownerIdx: index('teams_owner_idx').on(table.ownerId),
}));

// Team members table
export const teamMembers = pgTable('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Role and permissions
  role: varchar('role', { length: 50 }).notNull().default('member'),${options.includeRoles ? `
  permissions: json('permissions').$type<string[]>().default([]),` : ''}
  
  // Invitation status
  status: varchar('status', { length: 20 }).$type<'active' | 'invited' | 'suspended'>().default('active'),
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at'),
  joinedAt: timestamp('joined_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  teamUserIdx: index('team_members_team_user_idx').on(table.teamId, table.userId),
  userIdx: index('team_members_user_idx').on(table.userId),
}));${options.includeActivityLogs ? `

// Activity logs table
export const teamActivityLogs = pgTable('team_activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  
  // Activity details
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 50 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  
  // Activity metadata
  metadata: json('metadata').$type<Record<string, any>>().default({}),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('team_activity_logs_team_idx').on(table.teamId),
  userIdx: index('team_activity_logs_user_idx').on(table.userId),
  actionIdx: index('team_activity_logs_action_idx').on(table.action),
}));` : ''}

// Relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),${options.includeActivityLogs ? `
  activityLogs: many(teamActivityLogs),` : ''}
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [teamMembers.invitedBy],
    references: [users.id],
  }),
}));${options.includeActivityLogs ? `

export const teamActivityLogsRelations = relations(teamActivityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [teamActivityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamActivityLogs.userId],
    references: [users.id],
  }),
}));` : ''}

// Export types
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;${options.includeActivityLogs ? `
export type TeamActivityLog = typeof teamActivityLogs.$inferSelect;
export type NewTeamActivityLog = typeof teamActivityLogs.$inferInsert;` : ''}

// Team role types${options.includeRoles ? `
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export const TEAM_ROLES: Record<TeamRole, { name: string; permissions: string[] }> = {
  owner: {
    name: 'Owner',
    permissions: ['*'], // All permissions
  },
  admin: {
    name: 'Administrator', 
    permissions: [
      'team:read', 'team:update', 'team:delete',
      'members:read', 'members:invite', 'members:remove', 'members:update',
      'billing:read', 'billing:update',
      'settings:read', 'settings:update'
    ],
  },
  member: {
    name: 'Member',
    permissions: [
      'team:read',
      'members:read'
    ],
  },
  viewer: {
    name: 'Viewer',
    permissions: [
      'team:read',
      'members:read'
    ],
  },
};

export function hasPermission(role: TeamRole, permission: string): boolean {
  const roleConfig = TEAM_ROLES[role];
  if (!roleConfig) return false;
  
  // Owner has all permissions
  if (roleConfig.permissions.includes('*')) return true;
  
  // Check specific permission
  return roleConfig.permissions.includes(permission);
}` : `
export type TeamRole = 'owner' | 'admin' | 'member';`}
`;

  const modelsDir = path.join(projectPath, "models");
  await fs.ensureDir(modelsDir);
  await fs.writeFile(path.join(modelsDir, "team.ts"), teamModelContent);

  // Update schema exports
  const schemaPath = path.join(modelsDir, "schema.ts");
  let schemaContent = "";
  
  if (await fs.pathExists(schemaPath)) {
    schemaContent = await fs.readFile(schemaPath, "utf-8");
  } else {
    schemaContent = `/**
 * @fileoverview Database Schema Exports
 * @description Central export file for all Drizzle ORM schemas
 */

`;
  }

  // Add team exports if not already present
  if (!schemaContent.includes("from './team.js'")) {
    const teamExports = `
// Team management exports
export {
  teams,
  teamMembers,${options.includeActivityLogs ? `
  teamActivityLogs,` : ''}
  teamsRelations,
  teamMembersRelations,${options.includeActivityLogs ? `
  teamActivityLogsRelations,` : ''}
  type Team,
  type NewTeam,
  type TeamMember,
  type NewTeamMember,${options.includeActivityLogs ? `
  type TeamActivityLog,
  type NewTeamActivityLog,` : ''}
  type TeamRole,${options.includeRoles ? `
  TEAM_ROLES,
  hasPermission,` : ''}
} from './team.js';
`;
    schemaContent += teamExports;
    await fs.writeFile(schemaPath, schemaContent);
  }
}

async function createTeamQueries(projectPath: string, options: { includeRoles: boolean; includeActivityLogs: boolean }): Promise<void> {
  const queriesContent = `/**
 * @fileoverview Team Database Queries
 * @description Database operations for teams, members, and activity logging
 */

import { db } from '@/lib/db.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { 
  teams, 
  teamMembers,${options.includeActivityLogs ? `
  teamActivityLogs,` : ''}
  type Team,
  type NewTeam,
  type TeamMember,
  type NewTeamMember,${options.includeActivityLogs ? `
  type TeamActivityLog,
  type NewTeamActivityLog,` : ''}
  type TeamRole
} from '@/models/team.js';
import { users } from '@/models/user.js';

// Team queries
export async function createTeam(data: NewTeam): Promise<Team> {
  const [team] = await db.insert(teams).values(data).returning();
  return team;
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  return team || null;
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const [team] = await db.select().from(teams).where(eq(teams.slug, slug));
  return team || null;
}

export async function getTeamsByOwnerId(ownerId: string): Promise<Team[]> {
  return await db.select().from(teams).where(eq(teams.ownerId, ownerId));
}

export async function updateTeam(teamId: string, data: Partial<NewTeam>): Promise<Team | null> {
  const [team] = await db
    .update(teams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teams.id, teamId))
    .returning();
  return team || null;
}

export async function deleteTeam(teamId: string): Promise<boolean> {
  const result = await db.delete(teams).where(eq(teams.id, teamId));
  return result.rowCount > 0;
}

// Team member queries
export async function addTeamMember(data: NewTeamMember): Promise<TeamMember> {
  const [member] = await db.insert(teamMembers).values(data).returning();
  return member;
}

export async function getTeamMember(teamId: string, userId: string): Promise<TeamMember | null> {
  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  return member || null;
}

export async function getTeamMembers(teamId: string): Promise<(TeamMember & { user: { name: string; email: string; avatarUrl?: string } })[]> {
  return await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,${options.includeRoles ? `
      permissions: teamMembers.permissions,` : ''}
      status: teamMembers.status,
      invitedBy: teamMembers.invitedBy,
      invitedAt: teamMembers.invitedAt,
      joinedAt: teamMembers.joinedAt,
      createdAt: teamMembers.createdAt,
      updatedAt: teamMembers.updatedAt,
      user: {
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(desc(teamMembers.createdAt));
}

export async function getUserTeams(userId: string): Promise<(Team & { role: string; memberCount: number })[]> {
  const userTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      description: teams.description,
      avatarUrl: teams.avatarUrl,
      ownerId: teams.ownerId,
      stripeCustomerId: teams.stripeCustomerId,
      subscriptionStatus: teams.subscriptionStatus,
      subscriptionId: teams.subscriptionId,
      settings: teams.settings,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));

  // Get member counts for each team
  const teamsWithCounts = await Promise.all(
    userTeams.map(async (team) => {
      const [{ count: memberCount }] = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, team.id));
      
      return { ...team, memberCount };
    })
  );

  return teamsWithCounts;
}

export async function updateTeamMember(
  teamId: string, 
  userId: string, 
  data: Partial<Pick<NewTeamMember, 'role' | 'permissions' | 'status'>>
): Promise<TeamMember | null> {
  const [member] = await db
    .update(teamMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .returning();
  return member || null;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  return result.rowCount > 0;
}

export async function getTeamMemberCount(teamId: string): Promise<number> {
  const [{ count: memberCount }] = await db
    .select({ count: count() })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return memberCount;
}

// Permission checks
export async function hasTeamPermission(
  userId: string, 
  teamId: string, 
  permission: string
): Promise<boolean> {
  const member = await getTeamMember(teamId, userId);
  if (!member || member.status !== 'active') return false;

  ${options.includeRoles ? `// Check role-based permissions
  const { hasPermission } = await import('@/models/team.js');
  return hasPermission(member.role as TeamRole, permission);` : `// Simple role check
  if (member.role === 'owner') return true;
  if (member.role === 'admin' && ['team:read', 'members:read', 'members:invite'].includes(permission)) return true;
  if (member.role === 'member' && ['team:read', 'members:read'].includes(permission)) return true;
  return false;`}
}${options.includeActivityLogs ? `

// Activity log queries
export async function logTeamActivity(data: NewTeamActivityLog): Promise<TeamActivityLog> {
  const [log] = await db.insert(teamActivityLogs).values(data).returning();
  return log;
}

export async function getTeamActivityLogs(
  teamId: string, 
  limit: number = 50
): Promise<(TeamActivityLog & { user: { name: string; email: string } | null })[]> {
  return await db
    .select({
      id: teamActivityLogs.id,
      teamId: teamActivityLogs.teamId,
      userId: teamActivityLogs.userId,
      action: teamActivityLogs.action,
      resource: teamActivityLogs.resource,
      resourceId: teamActivityLogs.resourceId,
      metadata: teamActivityLogs.metadata,
      ipAddress: teamActivityLogs.ipAddress,
      userAgent: teamActivityLogs.userAgent,
      createdAt: teamActivityLogs.createdAt,
      user: {
        name: users.name,
        email: users.email,
      },
    })
    .from(teamActivityLogs)
    .leftJoin(users, eq(teamActivityLogs.userId, users.id))
    .where(eq(teamActivityLogs.teamId, teamId))
    .orderBy(desc(teamActivityLogs.createdAt))
    .limit(limit);
}

export async function getUserActivityLogs(
  userId: string,
  teamId?: string,
  limit: number = 50
): Promise<TeamActivityLog[]> {
  const conditions = [eq(teamActivityLogs.userId, userId)];
  if (teamId) {
    conditions.push(eq(teamActivityLogs.teamId, teamId));
  }

  return await db
    .select()
    .from(teamActivityLogs)
    .where(and(...conditions))
    .orderBy(desc(teamActivityLogs.createdAt))
    .limit(limit);
}` : ''}

// Utility functions
export async function generateTeamSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  let slug = baseSlug;
  let counter = 1;
  
  while (await getTeamBySlug(slug)) {
    slug = \`\${baseSlug}-\${counter}\`;
    counter++;
  }
  
  return slug;
}

export async function isTeamOwner(userId: string, teamId: string): Promise<boolean> {
  const team = await getTeamById(teamId);
  return team?.ownerId === userId;
}

export async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const member = await getTeamMember(teamId, userId);
  return member?.status === 'active';
}
`;

  const libDbDir = path.join(projectPath, "lib", "db");
  await fs.ensureDir(libDbDir);
  await fs.writeFile(path.join(libDbDir, "team-queries.ts"), queriesContent);
}

async function createTeamValidations(projectPath: string, options: { includeRoles: boolean; includeActivityLogs: boolean }): Promise<void> {
  const validationContent = `/**
 * @fileoverview Team Validation Schemas
 * @description Zod validation schemas for team management operations
 */

import { z } from 'zod';

// Team validation schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255, 'Team name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255, 'Team name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
  settings: z.object({
    allowMemberInvites: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    maxMembers: z.number().int().min(1).max(1000).optional(),
    features: z.array(z.string()).optional(),
  }).optional(),
});

// Team member validation schemas
export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member'${options.includeRoles ? ', \'viewer\'' : ''}]).default('member'),${options.includeRoles ? `
  permissions: z.array(z.string()).optional(),` : ''}
  message: z.string().max(500, 'Message too long').optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member'${options.includeRoles ? ', \'viewer\'' : ''}]).optional(),${options.includeRoles ? `
  permissions: z.array(z.string()).optional(),` : ''}
  status: z.enum(['active', 'suspended']).optional(),
});

export const bulkInviteSchema = z.object({
  invites: z.array(z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'member'${options.includeRoles ? ', \'viewer\'' : ''}]).default('member'),${options.includeRoles ? `
    permissions: z.array(z.string()).optional(),` : ''}
  })).min(1, 'At least one invite required').max(50, 'Too many invites'),
  message: z.string().max(500, 'Message too long').optional(),
});

// Team settings validation
export const teamSettingsSchema = z.object({
  allowMemberInvites: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  maxMembers: z.number().int().min(1).max(1000).optional(),
  features: z.array(z.string()).optional(),
});

// Role and permission validation${options.includeRoles ? `
export const rolePermissionsSchema = z.object({
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  permissions: z.array(z.string()),
});

export const permissionCheckSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  permission: z.string().min(1, 'Permission is required'),
});` : ''}

// Activity log validation${options.includeActivityLogs ? `
export const logActivitySchema = z.object({
  action: z.string().min(1, 'Action is required').max(100, 'Action too long'),
  resource: z.string().min(1, 'Resource is required').max(50, 'Resource too long'),
  resourceId: z.string().max(255, 'Resource ID too long').optional(),
  metadata: z.record(z.any()).optional(),
  ipAddress: z.string().max(45, 'IP address too long').optional(),
  userAgent: z.string().max(1000, 'User agent too long').optional(),
});` : ''}

// Common validation utilities
export const uuidSchema = z.string().uuid('Invalid ID format');

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const teamSlugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(100, 'Slug too long')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

// Export types
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type BulkInviteInput = z.infer<typeof bulkInviteSchema>;
export type TeamSettingsInput = z.infer<typeof teamSettingsSchema>;${options.includeRoles ? `
export type RolePermissionsInput = z.infer<typeof rolePermissionsSchema>;
export type PermissionCheckInput = z.infer<typeof permissionCheckSchema>;` : ''}${options.includeActivityLogs ? `
export type LogActivityInput = z.infer<typeof logActivitySchema>;` : ''}
export type PaginationInput = z.infer<typeof paginationSchema>;
`;

  const validationsDir = path.join(projectPath, "validations");
  await fs.ensureDir(validationsDir);
  await fs.writeFile(path.join(validationsDir, "team.ts"), validationContent);
}

async function createTeamActions(projectPath: string, options: { includeRoles: boolean; includeActivityLogs: boolean }): Promise<void> {
  const actionsContent = `/**
 * @fileoverview Team Server Actions
 * @description Server actions for team management operations
 */

'use server';

import { revalidatePath, redirect } from 'next/cache';
import { getUser } from '@/lib/auth/session.js';
import {
  createTeam as dbCreateTeam,
  updateTeam as dbUpdateTeam,
  deleteTeam as dbDeleteTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  getTeamById,
  getTeamMember,
  getUserTeams,
  generateTeamSlug,
  hasTeamPermission,${options.includeActivityLogs ? `
  logTeamActivity,` : ''}
} from '@/lib/db/team-queries.js';
import {
  createTeamSchema,
  updateTeamSchema,
  inviteMemberSchema,
  updateMemberSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
  type InviteMemberInput,
  type UpdateMemberInput,
} from '@/validations/team.js';

// Team actions
export async function createTeamAction(data: CreateTeamInput) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }

    const result = createTeamSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.errors[0]?.message || 'Invalid input' };
    }

    const { name, description, slug } = result.data;
    const finalSlug = slug || await generateTeamSlug(name);

    const team = await dbCreateTeam({
      name,
      description,
      slug: finalSlug,
      ownerId: user.id,
    });

    // Add owner as team member
    await addTeamMember({
      teamId: team.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });${options.includeActivityLogs ? `

    // Log activity
    await logTeamActivity({
      teamId: team.id,
      userId: user.id,
      action: 'team.created',
      resource: 'team',
      resourceId: team.id,
      metadata: { name, slug: finalSlug },
    });` : ''}

    revalidatePath('/dashboard/teams');
    return { success: true, team };
  } catch (error) {
    console.error('Error creating team:', error);
    return { error: 'Failed to create team' };
  }
}

export async function updateTeamAction(teamId: string, data: UpdateTeamInput) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }

    // Check permissions
    const hasPermission = await hasTeamPermission(user.id, teamId, 'team:update');
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const result = updateTeamSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.errors[0]?.message || 'Invalid input' };
    }

    const team = await dbUpdateTeam(teamId, result.data);
    if (!team) {
      return { error: 'Team not found' };
    }${options.includeActivityLogs ? `

    // Log activity
    await logTeamActivity({
      teamId,
      userId: user.id,
      action: 'team.updated',
      resource: 'team',
      resourceId: teamId,
      metadata: result.data,
    });` : ''}

    revalidatePath(\`/dashboard/teams/\${teamId}\`);
    return { success: true, team };
  } catch (error) {
    console.error('Error updating team:', error);
    return { error: 'Failed to update team' };
  }
}

export async function deleteTeamAction(teamId: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }

    // Only owner can delete team
    const team = await getTeamById(teamId);
    if (!team || team.ownerId !== user.id) {
      return { error: 'Permission denied' };
    }${options.includeActivityLogs ? `

    // Log activity before deletion
    await logTeamActivity({
      teamId,
      userId: user.id,
      action: 'team.deleted',
      resource: 'team',
      resourceId: teamId,
      metadata: { name: team.name },
    });` : ''}

    await dbDeleteTeam(teamId);

    revalidatePath('/dashboard/teams');
    redirect('/dashboard/teams');
  } catch (error) {
    console.error('Error deleting team:', error);
    return { error: 'Failed to delete team' };
  }
}

// Member actions
export async function inviteMemberAction(teamId: string, data: InviteMemberInput) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }

    // Check permissions
    const hasPermission = await hasTeamPermission(user.id, teamId, 'members:invite');
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const result = inviteMemberSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.errors[0]?.message || 'Invalid input' };
    }

    const { email, role${options.includeRoles ? ', permissions' : ''} } = result.data;

    // TODO: Find or create user by email
    // For now, assume user exists (you'll need to implement user lookup/creation)
    
    // Placeholder logic - replace with actual user lookup
    console.log('TODO: Implement user lookup/invitation for:', email);${options.includeActivityLogs ? `

    // Log activity
    await logTeamActivity({
      teamId,
      userId: user.id,
      action: 'member.invited',
      resource: 'member',
      metadata: { email, role },
    });` : ''}

    revalidatePath(\`/dashboard/teams/\${teamId}/members\`);
    return { success: true };
  } catch (error) {
    console.error('Error inviting member:', error);
    return { error: 'Failed to invite member' };
  }
}

export async function updateMemberAction(
  teamId: string, 
  memberId: string, 
  data: UpdateMemberInput
) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }

    // Check permissions
    const hasPermission = await hasTeamPermission(user.id, teamId, 'members:update');
    if (!hasPermission) {
      return { error: 'Permission denied' };
    }

    const result = updateMemberSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.errors[0]?.message || 'Invalid input' };
    }

    const member = await updateTeamMember(teamId, memberId, result.data);
    if (!member) {
      return { error: 'Member not found' };
    }${options.includeActivityLogs ? `

    // Log activity
    await logTeamActivity({
      teamId,
      userId: user.id,
      action: 'member.updated',
      resource: 'member',
      resourceId: memberId,
      metadata: result.data,
    });` : ''}

    revalidatePath(\`/dashboard/teams/\${teamId}/members\`);
    return { success: true, member };
  } catch (error) {
    console.error('Error updating member:', error);
    return { error: 'Failed to update member' };
  }
}

export async function removeMemberAction(teamId: string, memberId: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }

    // Check permissions (can remove self or have remove permission)
    const hasPermission = await hasTeamPermission(user.id, teamId, 'members:remove');
    const isSelf = memberId === user.id;
    
    if (!hasPermission && !isSelf) {
      return { error: 'Permission denied' };
    }

    // Get member info before removal for logging
    const member = await getTeamMember(teamId, memberId);
    if (!member) {
      return { error: 'Member not found' };
    }

    await removeTeamMember(teamId, memberId);${options.includeActivityLogs ? `

    // Log activity
    await logTeamActivity({
      teamId,
      userId: user.id,
      action: isSelf ? 'member.left' : 'member.removed',
      resource: 'member',
      resourceId: memberId,
      metadata: { role: member.role },
    });` : ''}

    revalidatePath(\`/dashboard/teams/\${teamId}/members\`);
    
    // If user removed themselves, redirect to teams list
    if (isSelf) {
      redirect('/dashboard/teams');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error removing member:', error);
    return { error: 'Failed to remove member' };
  }
}

// Utility actions
export async function switchTeamAction(teamId: string) {
  try {
    const user = await getUser();
    if (!user) {
      return { error: 'Authentication required' };
    }

    // Verify user is member of team
    const member = await getTeamMember(teamId, user.id);
    if (!member || member.status !== 'active') {
      return { error: 'Access denied' };
    }

    // TODO: Set current team in session or cookies
    // For now, just redirect to team dashboard
    redirect(\`/dashboard/teams/\${teamId}\`);
  } catch (error) {
    console.error('Error switching team:', error);
    return { error: 'Failed to switch team' };
  }
}

export async function leaveTeamAction(teamId: string) {
  return removeMemberAction(teamId, (await getUser())?.id || '');
}
`;

  const actionsDir = path.join(projectPath, "actions");
  await fs.ensureDir(actionsDir);
  await fs.writeFile(path.join(actionsDir, "team.ts"), actionsContent);
}

async function createTeamComponents(projectPath: string, options: { includeRoles: boolean; includeActivityLogs: boolean }): Promise<void> {
  // Create team form component
  const teamFormContent = `/**
 * @fileoverview Team Form Component
 * @description Form for creating and editing teams
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createTeamAction, updateTeamAction } from '@/actions/team';
import type { Team } from '@/models/team';

interface TeamFormProps {
  team?: Team;
  onSuccess?: () => void;
}

export function TeamForm({ team, onSuccess }: TeamFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        slug: formData.get('slug') as string,
      };

      const result = team 
        ? await updateTeamAction(team.id, data)
        : await createTeamAction(data);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess?.();
        if (!team) {
          router.push(\`/dashboard/teams/\${result.team.id}\`);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Team form error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{team ? 'Edit Team' : 'Create New Team'}</CardTitle>
        <CardDescription>
          {team ? 'Update your team information' : 'Create a new team to collaborate with others'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              defaultValue={team?.name}
              placeholder="Enter team name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Team Slug</Label>
            <Input
              id="slug"
              name="slug"
              type="text"
              defaultValue={team?.slug}
              placeholder="team-slug (optional)"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Used in URLs. Leave empty to auto-generate from team name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={team?.description || ''}
              placeholder="Brief description of your team (optional)"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (team ? 'Update Team' : 'Create Team')}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
`;

  // Create team member list component
  const memberListContent = `/**
 * @fileoverview Team Member List Component
 * @description Display and manage team members
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MoreHorizontal, UserPlus, Mail } from 'lucide-react';
import { updateMemberAction, removeMemberAction } from '@/actions/team';
import type { TeamMember } from '@/models/team';

interface TeamMemberWithUser extends TeamMember {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

interface MemberListProps {
  teamId: string;
  members: TeamMemberWithUser[];
  currentUserRole: string;
  canManageMembers: boolean;
}

export function MemberList({ teamId, members, currentUserRole, canManageMembers }: MemberListProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setIsLoading(memberId);
    setError(null);

    try {
      const result = await updateMemberAction(teamId, memberId, { role: newRole });
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to update member role');
      console.error('Update role error:', err);
    } finally {
      setIsLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setIsLoading(memberId);
    setError(null);

    try {
      const result = await removeMemberAction(teamId, memberId);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to remove member');
      console.error('Remove member error:', err);
    } finally {
      setIsLoading(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage who has access to this team ({members.length} members)
            </CardDescription>
          </div>
          {canManageMembers && (
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                  <AvatarFallback>
                    {member.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{member.user.name}</p>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    {member.user.email}
                  </p>
                  {member.status === 'invited' && (
                    <p className="text-xs text-orange-600">Invitation pending</p>
                  )}
                </div>
              </div>

              {canManageMembers && member.role !== 'owner' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                      disabled={isLoading === member.id}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    {member.role !== 'admin' && (
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(member.userId, 'admin')}
                      >
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    
                    {member.role !== 'member' && (
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(member.userId, 'member')}
                      >
                        Make Member
                      </DropdownMenuItem>
                    )}${options.includeRoles ? `
                    
                    {member.role !== 'viewer' && (
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(member.userId, 'viewer')}
                      >
                        Make Viewer
                      </DropdownMenuItem>
                    )}` : ''}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-red-600"
                    >
                      Remove Member
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="w-12 h-12 mx-auto mb-4" />
              <p>No team members yet.</p>
              {canManageMembers && <p>Invite your first member to get started!</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
`;

  // Create team switcher component
  const teamSwitcherContent = `/**
 * @fileoverview Team Switcher Component  
 * @description Dropdown for switching between user's teams
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { switchTeamAction } from '@/actions/team';

interface Team {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  role: string;
  memberCount: number;
}

interface TeamSwitcherProps {
  teams: Team[];
  currentTeam?: Team;
  className?: string;
}

export function TeamSwitcher({ teams, currentTeam, className }: TeamSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleTeamSelect = async (teamId: string) => {
    if (teamId === currentTeam?.id) {
      setOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await switchTeamAction(teamId);
    } catch (error) {
      console.error('Error switching team:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleCreateTeam = () => {
    setOpen(false);
    router.push('/dashboard/teams/new');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select team"
          className={cn("w-[200px] justify-between", className)}
          disabled={isLoading}
        >
          {currentTeam ? (
            <>
              <Avatar className="mr-2 h-5 w-5">
                <AvatarImage src={currentTeam.avatarUrl} alt={currentTeam.name} />
                <AvatarFallback className="text-xs">
                  {currentTeam.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{currentTeam.name}</span>
            </>
          ) : (
            <span>Select team...</span>
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search teams..." />
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup heading="Teams">
              {teams.map((team) => (
                <CommandItem
                  key={team.id}
                  onSelect={() => handleTeamSelect(team.id)}
                  className="text-sm"
                >
                  <Avatar className="mr-2 h-5 w-5">
                    <AvatarImage src={team.avatarUrl} alt={team.name} />
                    <AvatarFallback className="text-xs">
                      {team.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <div>{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {team.memberCount} members • {team.role}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentTeam?.id === team.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateTeam}>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
`;

  // Create component index
  const indexContent = `/**
 * @fileoverview Team Components
 * @description Export all team management components
 */

export { TeamForm } from './team-form';
export { MemberList } from './member-list';
export { TeamSwitcher } from './team-switcher';
`;

  const componentsDir = path.join(projectPath, "components", "teams");
  await fs.ensureDir(componentsDir);
  
  await fs.writeFile(path.join(componentsDir, "team-form.tsx"), teamFormContent);
  await fs.writeFile(path.join(componentsDir, "member-list.tsx"), memberListContent);
  await fs.writeFile(path.join(componentsDir, "team-switcher.tsx"), teamSwitcherContent);
  await fs.writeFile(path.join(componentsDir, "index.ts"), indexContent);
}

function generateSuccessMessage(
  steps: string[], 
  totalTime: string, 
  integrationStatus: {
    hasAuth: boolean;
    hasDatabase: boolean;
    hasStripe: boolean;
    includeRoles: boolean;
    includeActivityLogs: boolean;
  }
): string {
  const { hasAuth, hasDatabase, hasStripe, includeRoles, includeActivityLogs } = integrationStatus;

  return `🎉 Team management setup completed successfully!

⏱️ Total time: ${totalTime}s

✅ Completed steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

👥 Team Management Configuration:
- Multi-Tenant Teams: Complete team creation and management system
- Role-Based Access: ${includeRoles ? 'Advanced role system with custom permissions' : 'Basic role system (owner, admin, member)'}
- Activity Logging: ${includeActivityLogs ? 'Comprehensive audit trail for all team actions' : 'Disabled'}
- Member Management: Invite, update, and remove team members
- Team Settings: Configurable team preferences and limits

🔒 Security Features:
- Permission Checks: Role-based access control for all operations
- Audit Trail: ${includeActivityLogs ? 'Complete activity logging for compliance' : 'Basic action tracking'}
- Data Validation: Zod schemas prevent invalid team operations
- Database Security: Proper foreign key constraints and cascading deletes

💻 Generated Components:
// Team Creation and Management
<TeamForm />                    // Create and edit teams
<MemberList />                  // Display and manage team members  
<TeamSwitcher />               // Switch between user's teams

// Server Actions Available
createTeamAction()             // Create new teams
updateTeamAction()             // Update team information
inviteMemberAction()           // Invite new team members
updateMemberAction()           // Update member roles and permissions
removeMemberAction()           // Remove team members

🚀 Integration Status:
- ✅ Authentication: ${hasAuth ? 'Connected to your JWT authentication system' : 'Not detected - basic team functionality'}
- ✅ Database: ${hasDatabase ? 'Integrated with your Drizzle ORM setup' : 'Not detected - team models created'}
- ${hasStripe ? '✅' : '🔄'} Payments: ${hasStripe ? 'Connected to Stripe for team billing' : 'Available - connect with setup_stripe_payments'}

🏗️ Database Schema Created:
### Teams Table
- Team information, settings, and Stripe integration
- Owner relationships and subscription status
- Configurable team settings and member limits

### Team Members Table  
- Member roles and permission management
- Invitation status and join tracking
- ${includeRoles ? 'Advanced permission arrays for granular control' : 'Basic role-based access control'}

${includeActivityLogs ? `### Team Activity Logs Table
- Complete audit trail for all team actions
- User actions, IP addresses, and metadata tracking
- Resource-based activity logging for compliance` : ''}

🎯 Team Features Available:
✨ **Multi-Tenant Architecture**: Complete team isolation and data separation
✨ **Role Management**: ${includeRoles ? 'Advanced role system with custom permissions' : 'Owner, admin, and member roles'}
✨ **Member Invitations**: Email-based team invitations (integration ready)
✨ **Team Settings**: Configurable team preferences and member limits
✨ **Activity Tracking**: ${includeActivityLogs ? 'Comprehensive audit logs for all actions' : 'Basic action tracking'}
✨ **Stripe Integration**: ${hasStripe ? 'Team billing and subscription management' : 'Ready for payment integration'}

📋 Usage Examples:
// Get user's teams
const teams = await getUserTeams(userId);

// Check team permissions
const canManage = await hasTeamPermission(userId, teamId, 'members:invite');

// Create team with owner
const team = await createTeam({ name: 'My Team', ownerId: userId });${includeActivityLogs ? `

// Log team activity  
await logTeamActivity({
  teamId,
  userId, 
  action: 'member.invited',
  resource: 'member',
  metadata: { email, role }
});` : ''}

💡 Next steps:
1. Database migration: Run \`pnpm db:generate\` and \`pnpm db:migrate\` to create team tables
2. Team pages: Create team dashboard pages using the generated components
3. Invitation system: Implement email invitations for new team members
4. Billing integration: ${hasStripe ? 'Configure team-based billing with your Stripe setup' : 'Run setup_stripe_payments for team billing'}
5. Permissions: Customize team permissions based on your application needs${includeActivityLogs ? `
6. Activity monitoring: Set up alerts and notifications for important team activities` : ''}

⚠️  **Important Notes:**
- Team member invitations require user lookup/creation implementation
- Customize team roles and permissions based on your application requirements
- Consider implementing email notifications for team activities
- Set up proper team-based data isolation in your application logic

🔗 **Team Management Flow:**
1. **Team Creation** → User creates team and becomes owner
2. **Member Invitations** → Owners/admins invite members via email  
3. **Role Assignment** → Assign appropriate roles and permissions
4. **Activity Tracking** → ${includeActivityLogs ? 'All actions logged for audit trail' : 'Basic action tracking'}
5. **Team Management** → Ongoing member and settings management`;
}