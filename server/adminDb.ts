import { getDb } from "./db";
import { eq, sql, desc, and, gte, count } from "drizzle-orm";
import {
  users,
  songs,
  userSubscriptions,
  creditBalances,
  creditTransactions,
} from "../drizzle/schema";

// ─── Admin: Get all users with subscription and credit info ─────────────────

export interface AdminUserRow {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  createdAt: Date;
  lastSignedIn: Date;
  plan: string | null;
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  monthlyCredits: number;
  bonusCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  songCount: number;
}

export async function getAdminUserList(
  limit = 100,
  offset = 0,
  search?: string
): Promise<{ users: AdminUserRow[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Build the WHERE clause for search
  const searchCondition = search
    ? sql`(${users.name} LIKE ${`%${search}%`} OR ${users.email} LIKE ${`%${search}%`} OR CAST(${users.id} AS CHAR) = ${search})`
    : sql`1=1`;

  // Get total count
  const [countResult] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(users)
    .where(searchCondition);

  const total = countResult?.total ?? 0;

  // Get users with joined data
  const rows = await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      plan: userSubscriptions.plan,
      subscriptionStatus: userSubscriptions.status,
      stripeCustomerId: userSubscriptions.stripeCustomerId,
      monthlyCredits: sql<number>`COALESCE(${creditBalances.monthlyCredits}, 0)`,
      bonusCredits: sql<number>`COALESCE(${creditBalances.bonusCredits}, 0)`,
      purchasedCredits: sql<number>`COALESCE(${creditBalances.purchasedCredits}, 0)`,
    })
    .from(users)
    .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
    .leftJoin(creditBalances, eq(users.id, creditBalances.userId))
    .where(searchCondition)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  // Get song counts per user in a separate query for efficiency
  const userIds = rows.map((r) => r.id);
  let songCounts: Record<number, number> = {};

  if (userIds.length > 0) {
    const songCountRows = await db
      .select({
        userId: songs.userId,
        count: sql<number>`COUNT(*)`,
      })
      .from(songs)
      .where(sql`${songs.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(songs.userId);

    songCounts = Object.fromEntries(
      songCountRows.map((r) => [r.userId, r.count])
    );
  }

  const result: AdminUserRow[] = rows.map((row) => ({
    id: row.id,
    openId: row.openId,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    lastSignedIn: row.lastSignedIn,
    plan: row.plan,
    subscriptionStatus: row.subscriptionStatus,
    stripeCustomerId: row.stripeCustomerId,
    monthlyCredits: row.monthlyCredits,
    bonusCredits: row.bonusCredits,
    purchasedCredits: row.purchasedCredits,
    totalCredits: row.monthlyCredits + row.bonusCredits + row.purchasedCredits,
    songCount: songCounts[row.id] ?? 0,
  }));

  return { users: result, total };
}

// ─── Admin: Get user details with full transaction history ──────────────────

export interface AdminUserDetail extends AdminUserRow {
  billingCycle: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
  recentTransactions: {
    id: number;
    amount: number;
    type: string;
    description: string | null;
    balanceAfter: number;
    createdAt: Date;
  }[];
}

export async function getAdminUserDetail(userId: number): Promise<AdminUserDetail | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db
    .select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      plan: userSubscriptions.plan,
      subscriptionStatus: userSubscriptions.status,
      stripeCustomerId: userSubscriptions.stripeCustomerId,
      stripeSubscriptionId: userSubscriptions.stripeSubscriptionId,
      billingCycle: userSubscriptions.billingCycle,
      currentPeriodStart: userSubscriptions.currentPeriodStart,
      currentPeriodEnd: userSubscriptions.currentPeriodEnd,
      monthlyCredits: sql<number>`COALESCE(${creditBalances.monthlyCredits}, 0)`,
      bonusCredits: sql<number>`COALESCE(${creditBalances.bonusCredits}, 0)`,
      purchasedCredits: sql<number>`COALESCE(${creditBalances.purchasedCredits}, 0)`,
    })
    .from(users)
    .leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
    .leftJoin(creditBalances, eq(users.id, creditBalances.userId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  // Get song count
  const [songCountResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(songs)
    .where(eq(songs.userId, userId));

  // Get recent transactions
  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(100);

  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    lastSignedIn: user.lastSignedIn,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
    billingCycle: user.billingCycle,
    currentPeriodStart: user.currentPeriodStart,
    currentPeriodEnd: user.currentPeriodEnd,
    monthlyCredits: user.monthlyCredits,
    bonusCredits: user.bonusCredits,
    purchasedCredits: user.purchasedCredits,
    totalCredits: user.monthlyCredits + user.bonusCredits + user.purchasedCredits,
    songCount: songCountResult?.count ?? 0,
    recentTransactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt,
    })),
  };
}

// ─── Admin: Site-wide statistics ────────────────────────────────────────────

export interface AdminSiteStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalSongs: number;
  songsToday: number;
  songsThisWeek: number;
  songsThisMonth: number;
  activeSubscribers: number;
  creatorSubscribers: number;
  professionalSubscribers: number;
  totalCreditsInCirculation: number;
}

export async function getAdminSiteStats(): Promise<AdminSiteStats> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // User counts
  const [[totalUsersResult], [newUsersTodayResult], [newUsersWeekResult], [newUsersMonthResult]] =
    await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(users),
      db.select({ count: sql<number>`COUNT(*)` }).from(users).where(gte(users.createdAt, todayStart)),
      db.select({ count: sql<number>`COUNT(*)` }).from(users).where(gte(users.createdAt, weekStart)),
      db.select({ count: sql<number>`COUNT(*)` }).from(users).where(gte(users.createdAt, monthStart)),
    ]);

  // Song counts
  const [[totalSongsResult], [songsTodayResult], [songsWeekResult], [songsMonthResult]] =
    await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(songs),
      db.select({ count: sql<number>`COUNT(*)` }).from(songs).where(gte(songs.createdAt, todayStart)),
      db.select({ count: sql<number>`COUNT(*)` }).from(songs).where(gte(songs.createdAt, weekStart)),
      db.select({ count: sql<number>`COUNT(*)` }).from(songs).where(gte(songs.createdAt, monthStart)),
    ]);

  // Subscription counts
  const subscriptionRows = await db
    .select({
      plan: userSubscriptions.plan,
      count: sql<number>`COUNT(*)`,
    })
    .from(userSubscriptions)
    .where(eq(userSubscriptions.status, "active"))
    .groupBy(userSubscriptions.plan);

  const subCounts: Record<string, number> = {};
  for (const row of subscriptionRows) {
    subCounts[row.plan] = row.count;
  }

  // Total credits in circulation
  const [creditsResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${creditBalances.monthlyCredits} + ${creditBalances.bonusCredits} + ${creditBalances.purchasedCredits}), 0)`,
    })
    .from(creditBalances);

  return {
    totalUsers: totalUsersResult?.count ?? 0,
    newUsersToday: newUsersTodayResult?.count ?? 0,
    newUsersThisWeek: newUsersWeekResult?.count ?? 0,
    newUsersThisMonth: newUsersMonthResult?.count ?? 0,
    totalSongs: totalSongsResult?.count ?? 0,
    songsToday: songsTodayResult?.count ?? 0,
    songsThisWeek: songsWeekResult?.count ?? 0,
    songsThisMonth: songsMonthResult?.count ?? 0,
    activeSubscribers: Object.values(subCounts).reduce((a, b) => a + b, 0),
    creatorSubscribers: subCounts["creator"] ?? 0,
    professionalSubscribers: subCounts["professional"] ?? 0,
    totalCreditsInCirculation: creditsResult?.total ?? 0,
  };
}

// ─── Admin: Revenue stats from Stripe ───────────────────────────────────────

export interface AdminRevenueStats {
  totalRevenue: number; // cents
  revenueThisMonth: number; // cents
  revenueLastMonth: number; // cents
  activeSubscriptions: number;
  mrr: number; // monthly recurring revenue in cents
  recentCharges: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    customerEmail: string | null;
    description: string | null;
    created: number; // unix timestamp
  }[];
}

// Note: Revenue stats are fetched via Stripe API in the router, not from DB
