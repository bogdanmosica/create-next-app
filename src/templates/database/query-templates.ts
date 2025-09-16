/**
 * @fileoverview Database Query Templates
 * @description Templates for database query functions
 */

export const dbQueriesTemplate = `import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from './drizzle';
import { users, teams, teamMembers, activityLogs } from '@/models/schema';
import type { User, Team, TeamDataWithMembers, NewUser } from '@/models/schema';

export async function getUser(): Promise<User | null> {
  // This would typically get user from session
  // Implementation depends on your auth setup
  return null;
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  
  return result[0] || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  
  return result[0] || null;
}

export async function createUser(userData: NewUser): Promise<User> {
  const result = await db
    .insert(users)
    .values(userData)
    .returning();
  
  return result[0];
}

export async function getTeamForUser(userId: string): Promise<TeamDataWithMembers | null> {
  const result = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      logo: teams.logo,
      plan: teams.plan,
      stripeCustomerId: teams.stripeCustomerId,
      stripeSubscriptionId: teams.stripeSubscriptionId,
      billingCycleStart: teams.billingCycleStart,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      deletedAt: teams.deletedAt,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(
      and(
        eq(teamMembers.userId, userId),
        isNull(teams.deletedAt)
      )
    )
    .limit(1);

  if (!result[0]) return null;

  const team = result[0];
  
  // Get all team members
  const members = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(
      and(
        eq(teamMembers.teamId, team.id),
        isNull(users.deletedAt)
      )
    );

  return {
    ...team,
    teamMembers: members,
  };
}

export async function logActivity(
  userId: string,
  action: string,
  entity?: string,
  entityId?: string,
  metadata?: any,
  teamId?: string
): Promise<void> {
  await db
    .insert(activityLogs)
    .values({
      userId,
      teamId,
      action,
      entity,
      entityId,
      metadata,
    });
}

export async function getActivityLogs(
  teamId: string,
  limit = 50
): Promise<Array<{
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: any;
  timestamp: Date;
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>;
}>> {
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entity: activityLogs.entity,
      entityId: activityLogs.entityId,
      metadata: activityLogs.metadata,
      timestamp: activityLogs.timestamp,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      },
    })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.teamId, teamId))
    .orderBy(desc(activityLogs.timestamp))
    .limit(limit);
}
`;

export const userQueriesTemplate = `// User queries are included in the main queries template`;

export const teamQueriesTemplate = `// Team queries are included in the main queries template`;
