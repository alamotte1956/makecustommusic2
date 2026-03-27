import { getDb } from "./db";
import { eq, and, gte, sql } from "drizzle-orm";
import {
  creditBalances,
  creditTransactions,
  userSubscriptions,
  PLAN_LIMITS,
  type PlanName,
  type LicenseType,
} from "../drizzle/schema";

// ─── Plan helpers ───────────────────────────────────────────────────────────

export function getPlanLimits(plan: PlanName) {
  return PLAN_LIMITS[plan];
}

export function getLicenseType(plan: PlanName): LicenseType {
  switch (plan) {
    case "free": return "personal";
    case "creator": return "commercial_social";
    case "professional": return "commercial_full";
    case "studio": return "commercial_full";
    default: return "personal";
  }
}

// ─── Subscription helpers ───────────────────────────────────────────────────

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);
  return sub ?? null;
}

export async function getUserPlan(userId: number): Promise<PlanName> {
  const sub = await getUserSubscription(userId);
  if (!sub || sub.status === "canceled" || sub.status === "incomplete") return "free";
  return sub.plan as PlanName;
}

export async function upsertSubscription(
  userId: number,
  data: {
    plan: PlanName;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    stripePriceId?: string;
    status?: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
    billingCycle?: "monthly" | "annual";
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  }
) {
  const existing = await getUserSubscription(userId);
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (existing) {
    await db
      .update(userSubscriptions)
      .set({
        plan: data.plan,
        ...(data.stripeCustomerId && { stripeCustomerId: data.stripeCustomerId }),
        ...(data.stripeSubscriptionId && { stripeSubscriptionId: data.stripeSubscriptionId }),
        ...(data.stripePriceId && { stripePriceId: data.stripePriceId }),
        ...(data.status && { status: data.status }),
        ...(data.billingCycle && { billingCycle: data.billingCycle }),
        ...(data.currentPeriodStart && { currentPeriodStart: data.currentPeriodStart }),
        ...(data.currentPeriodEnd && { currentPeriodEnd: data.currentPeriodEnd }),
      })
      .where(eq(userSubscriptions.userId, userId));
  } else {
    await db.insert(userSubscriptions).values({
      userId,
      plan: data.plan,
      stripeCustomerId: data.stripeCustomerId ?? null,
      stripeSubscriptionId: data.stripeSubscriptionId ?? null,
      stripePriceId: data.stripePriceId ?? null,
      status: data.status ?? "active",
      billingCycle: data.billingCycle ?? "monthly",
      currentPeriodStart: data.currentPeriodStart ?? new Date(),
      currentPeriodEnd: data.currentPeriodEnd ?? null,
    });
  }
}

// ─── Credit balance helpers ─────────────────────────────────────────────────

export async function getCreditBalance(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [balance] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (!balance) {
    // Auto-create balance for new users
    const plan = await getUserPlan(userId);
    const limits = getPlanLimits(plan);
    await db.insert(creditBalances).values({
      userId,
      monthlyCredits: limits.monthlyCredits,
      bonusCredits: 0,
      purchasedCredits: 0,
      lastRefillAt: new Date(),
    });
    return {
      userId,
      monthlyCredits: limits.monthlyCredits,
      bonusCredits: 0,
      purchasedCredits: 0,
      totalCredits: limits.monthlyCredits,
    };
  }

  return {
    userId: balance.userId,
    monthlyCredits: balance.monthlyCredits,
    bonusCredits: balance.bonusCredits,
    purchasedCredits: balance.purchasedCredits,
    totalCredits: balance.monthlyCredits + balance.bonusCredits + balance.purchasedCredits,
  };
}

export async function refillMonthlyCredits(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);

  const [existing] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(creditBalances)
      .set({
        monthlyCredits: limits.monthlyCredits,
        lastRefillAt: new Date(),
      })
      .where(eq(creditBalances.userId, userId));
  } else {
    await db.insert(creditBalances).values({
      userId,
      monthlyCredits: limits.monthlyCredits,
      bonusCredits: 0,
      purchasedCredits: 0,
      lastRefillAt: new Date(),
    });
  }

  // Log the refill transaction
  await logTransaction(userId, limits.monthlyCredits, "subscription_refill", `Monthly credit refill for ${plan} plan`, limits.monthlyCredits);
}

export async function deductCredits(
  userId: number,
  amount: number,
  type: "generation" | "tts" | "takes",
  description: string,
  relatedSongId?: number
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const balance = await getCreditBalance(userId);

  if (balance.totalCredits < amount) {
    return {
      success: false,
      remaining: balance.totalCredits,
      error: `Insufficient credits. You need ${amount} but have ${balance.totalCredits}. Upgrade your plan or purchase more credits.`,
    };
  }

  // Deduct from monthly first, then bonus, then purchased
  let remaining = amount;
  let newMonthly = balance.monthlyCredits;
  let newBonus = balance.bonusCredits;
  let newPurchased = balance.purchasedCredits;

  if (remaining > 0 && newMonthly > 0) {
    const deduct = Math.min(remaining, newMonthly);
    newMonthly -= deduct;
    remaining -= deduct;
  }
  if (remaining > 0 && newBonus > 0) {
    const deduct = Math.min(remaining, newBonus);
    newBonus -= deduct;
    remaining -= deduct;
  }
  if (remaining > 0 && newPurchased > 0) {
    const deduct = Math.min(remaining, newPurchased);
    newPurchased -= deduct;
    remaining -= deduct;
  }

  await db
    .update(creditBalances)
    .set({
      monthlyCredits: newMonthly,
      bonusCredits: newBonus,
      purchasedCredits: newPurchased,
    })
    .where(eq(creditBalances.userId, userId));

  const totalAfter = newMonthly + newBonus + newPurchased;
  await logTransaction(userId, -amount, type, description, totalAfter, relatedSongId);

  return { success: true, remaining: totalAfter };
}

export async function addPurchasedCredits(userId: number, amount: number, description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(creditBalances)
      .set({
        purchasedCredits: sql`${creditBalances.purchasedCredits} + ${amount}`,
      })
      .where(eq(creditBalances.userId, userId));
  } else {
    await db.insert(creditBalances).values({
      userId,
      monthlyCredits: 0,
      bonusCredits: 0,
      purchasedCredits: amount,
      lastRefillAt: new Date(),
    });
  }

  const balance = await getCreditBalance(userId);
  await logTransaction(userId, amount, "purchase", description, balance.totalCredits);
}

export async function addBonusCredits(userId: number, amount: number, description: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [existing] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(creditBalances)
      .set({
        bonusCredits: sql`${creditBalances.bonusCredits} + ${amount}`,
      })
      .where(eq(creditBalances.userId, userId));
  } else {
    await db.insert(creditBalances).values({
      userId,
      monthlyCredits: 0,
      bonusCredits: amount,
      purchasedCredits: 0,
      lastRefillAt: new Date(),
    });
  }

  const balance = await getCreditBalance(userId);
  await logTransaction(userId, amount, "bonus", description, balance.totalCredits);
}

// ─── Transaction log ────────────────────────────────────────────────────────

async function logTransaction(
  userId: number,
  amount: number,
  type: "subscription_refill" | "purchase" | "bonus" | "generation" | "tts" | "takes" | "refund" | "admin" | "bonus_song" | "bonus_sheet",
  description: string,
  balanceAfter: number,
  relatedSongId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(creditTransactions).values({
    userId,
    amount,
    type,
    description,
    balanceAfter,
    relatedSongId: relatedSongId ?? null,
  });
}

export async function getTransactionHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.userId, userId))
    .orderBy(sql`${creditTransactions.createdAt} DESC`)
    .limit(limit);
}

// ─── Monthly bonus tracking ─────────────────────────────────────────────────

/**
 * Get the start of the current billing period for monthly bonus tracking.
 * Uses the subscription's currentPeriodStart if available, otherwise
 * falls back to the first day of the current calendar month.
 */
async function getMonthlyBonusPeriodStart(userId: number): Promise<Date> {
  const sub = await getUserSubscription(userId);
  if (sub?.currentPeriodStart) {
    return sub.currentPeriodStart;
  }
  // Fallback: first day of current calendar month
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getMonthlyBonusUsage(userId: number, bonusType: "bonus_song" | "bonus_sheet"): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const periodStart = await getMonthlyBonusPeriodStart(userId);

  const [result] = await db
    .select({ total: sql<number>`COALESCE(COUNT(*), 0)` })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.type, bonusType),
        gte(creditTransactions.createdAt, periodStart)
      )
    );

  return result?.total ?? 0;
}

export async function checkMonthlyBonus(
  userId: number,
  bonusType: "bonus_song" | "bonus_sheet",
  plan: PlanName
): Promise<{ available: boolean; used: number; limit: number }> {
  const limits = getPlanLimits(plan);
  const bonusLimit = bonusType === "bonus_song" ? limits.monthlyBonusSongs : limits.monthlyBonusSheetMusic;

  if (bonusLimit === 0) return { available: false, used: 0, limit: 0 };

  const used = await getMonthlyBonusUsage(userId, bonusType);
  return {
    available: used < bonusLimit,
    used,
    limit: bonusLimit,
  };
}

export async function useMonthlyBonus(
  userId: number,
  bonusType: "bonus_song" | "bonus_sheet",
  description: string,
  relatedSongId?: number
) {
  const balance = await getCreditBalance(userId);
  await logTransaction(userId, 0, bonusType, description, balance.totalCredits, relatedSongId);
}

// ─── Plan generation gate ──────────────────────────────────────────────────

export function canUserGenerate(plan: PlanName): boolean {
  return PLAN_LIMITS[plan].canGenerate;
}

// ─── Daily limit tracking ───────────────────────────────────────────────────

export async function getDailyUsage(userId: number, type: "generation" | "tts" | "takes"): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)` })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.type, type),
        gte(creditTransactions.createdAt, today)
      )
    );

  return result?.total ?? 0;
}

export async function checkDailyLimit(
  userId: number,
  type: "generation",
  plan: PlanName
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const limits = getPlanLimits(plan);
  const dailyLimit = limits.dailySongLimit as number;

  if (dailyLimit === -1) return { allowed: true, used: 0, limit: -1 };

  const used = await getDailyUsage(userId, type);
  return {
    allowed: used < dailyLimit,
    used,
    limit: dailyLimit,
  };
}

// ─── Usage summary for dashboard ────────────────────────────────────────────

export async function getUsageSummary(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const plan = await getUserPlan(userId);
  const limits = getPlanLimits(plan);
  const balance = await getCreditBalance(userId);
  const sub = await getUserSubscription(userId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [dailyGen] = await db
    .select({ total: sql<number>`COALESCE(COUNT(*), 0)` })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        eq(creditTransactions.type, "generation"),
        gte(creditTransactions.createdAt, today)
      )
    );

  const [monthlyTotal] = await db
    .select({ total: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)` })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        sql`${creditTransactions.amount} < 0`,
        gte(creditTransactions.createdAt, sub?.currentPeriodStart ?? today)
      )
    );

  // Get monthly bonus usage
  const monthlyBonusSongUsed = await getMonthlyBonusUsage(userId, "bonus_song");
  const monthlyBonusSheetUsed = await getMonthlyBonusUsage(userId, "bonus_sheet");

  return {
    plan,
    limits,
    balance,
    subscription: sub,
    canGenerate: canUserGenerate(plan),
    usage: {
      dailySongsGenerated: dailyGen?.total ?? 0,
      monthlyCreditsUsed: monthlyTotal?.total ?? 0,
      monthlyBonusSongsUsed: monthlyBonusSongUsed,
      monthlyBonusSongsRemaining: Math.max(0, (limits.monthlyBonusSongs as number) - monthlyBonusSongUsed),
      monthlyBonusSheetUsed: monthlyBonusSheetUsed,
      monthlyBonusSheetRemaining: Math.max(0, (limits.monthlyBonusSheetMusic as number) - monthlyBonusSheetUsed),
    },
  };
}

// ─── Chart data for usage dashboard ────────────────────────────────────────

export async function getDailyUsageChart(userId: number, days: number = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get daily aggregated usage (debits only)
  const rows = await db
    .select({
      day: sql<string>`DATE(${creditTransactions.createdAt})`,
      type: creditTransactions.type,
      totalUsed: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        sql`${creditTransactions.amount} < 0`,
        gte(creditTransactions.createdAt, startDate)
      )
    )
    .groupBy(sql`DATE(${creditTransactions.createdAt})`, creditTransactions.type)
    .orderBy(sql`DATE(${creditTransactions.createdAt}) ASC`);

  // Get daily credits added (refills, purchases, bonuses)
  const addedRows = await db
    .select({
      day: sql<string>`DATE(${creditTransactions.createdAt})`,
      type: creditTransactions.type,
      totalAdded: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`,
    })
    .from(creditTransactions)
    .where(
      and(
        eq(creditTransactions.userId, userId),
        sql`${creditTransactions.amount} > 0`,
        gte(creditTransactions.createdAt, startDate)
      )
    )
    .groupBy(sql`DATE(${creditTransactions.createdAt})`, creditTransactions.type)
    .orderBy(sql`DATE(${creditTransactions.createdAt}) ASC`);

  // Build a complete date range with zero-filled days
  const chartData: Array<{
    date: string;
    generation: number;
    tts: number;
    takes: number;
    total: number;
    added: number;
    songCount: number;
  }> = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    const dayUsage = rows.filter((r) => r.day === dateStr);
    const dayAdded = addedRows.filter((r) => r.day === dateStr);

    const generation = dayUsage.find((r) => r.type === "generation")?.totalUsed ?? 0;
    const tts = dayUsage.find((r) => r.type === "tts")?.totalUsed ?? 0;
    const takes = dayUsage.find((r) => r.type === "takes")?.totalUsed ?? 0;
    const songCount = dayUsage.find((r) => r.type === "generation")?.count ?? 0;
    const added = dayAdded.reduce((sum, r) => sum + (r.totalAdded ?? 0), 0);

    chartData.push({
      date: dateStr,
      generation,
      tts,
      takes,
      total: generation + tts + takes,
      added,
      songCount,
    });
  }

  // Weekly aggregation
  const weeklyData: Array<{
    week: string;
    generation: number;
    tts: number;
    takes: number;
    total: number;
    songCount: number;
  }> = [];

  for (let i = 0; i < chartData.length; i += 7) {
    const weekSlice = chartData.slice(i, i + 7);
    const weekStart = weekSlice[0].date;
    weeklyData.push({
      week: weekStart,
      generation: weekSlice.reduce((s, d) => s + d.generation, 0),
      tts: weekSlice.reduce((s, d) => s + d.tts, 0),
      takes: weekSlice.reduce((s, d) => s + d.takes, 0),
      total: weekSlice.reduce((s, d) => s + d.total, 0),
      songCount: weekSlice.reduce((s, d) => s + d.songCount, 0),
    });
  }

  return { daily: chartData, weekly: weeklyData };
}


// ─── Credit refund (on generation failure) ──────────────────────────────────

export async function refundCredits(
  userId: number,
  amount: number,
  description: string,
  relatedSongId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Add back to monthly credits first (most likely source)
  const [balance] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId))
    .limit(1);

  if (balance) {
    await db
      .update(creditBalances)
      .set({
        monthlyCredits: sql`${creditBalances.monthlyCredits} + ${amount}`,
      })
      .where(eq(creditBalances.userId, userId));
  }

  const newBalance = await getCreditBalance(userId);
  await logTransaction(userId, amount, "refund", description, newBalance.totalCredits, relatedSongId);
  console.log(`[Credits] Refunded ${amount} credit(s) to user #${userId}: ${description}`);
}
