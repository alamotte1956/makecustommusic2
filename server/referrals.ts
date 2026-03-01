import { getDb } from "./db";
import { eq, sql, desc } from "drizzle-orm";
import { users, referrals, REFERRAL_BONUS_CREDITS } from "../drizzle/schema";
import { addBonusCredits } from "./credits";
import { createNotification } from "./db";

// ─── Generate a unique referral code ─────────────────────────────────────────

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function ensureReferralCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db
    .select({ referralCode: users.referralCode })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.referralCode) return user.referralCode;

  // Generate a unique code with retry
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  await db
    .update(users)
    .set({ referralCode: code })
    .where(eq(users.id, userId));

  return code;
}

// ─── Look up a referrer by their referral code ───────────────────────────────

export async function getUserByReferralCode(code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db
    .select({ id: users.id, name: users.name, referralCode: users.referralCode })
    .from(users)
    .where(eq(users.referralCode, code.toUpperCase()))
    .limit(1);

  return user ?? null;
}

// ─── Track a successful referral and award credits ───────────────────────────

export async function processReferral(
  referrerId: number,
  referredUserId: number,
  referralCode: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Prevent self-referral
  if (referrerId === referredUserId) return false;

  // Check if this referred user already has a referral record
  const [existing] = await db
    .select({ id: referrals.id })
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1);

  if (existing) return false; // Already referred

  // Record the referral
  await db.insert(referrals).values({
    referrerId,
    referredUserId,
    referralCode: referralCode.toUpperCase(),
    creditsAwarded: REFERRAL_BONUS_CREDITS,
  });

  // Mark the referred user
  await db
    .update(users)
    .set({ referredBy: referrerId })
    .where(eq(users.id, referredUserId));

  // Award bonus credits to the referrer
  await addBonusCredits(
    referrerId,
    REFERRAL_BONUS_CREDITS,
    `Referral bonus: a friend signed up using your invite link`
  );

  // Notify the referrer
  try {
    await createNotification({
      userId: referrerId,
      type: "credit_added",
      title: "Referral Bonus!",
      message: `You earned ${REFERRAL_BONUS_CREDITS} bonus credits because a friend signed up with your invite link!`,
    });
  } catch (e) {
    console.warn("[Referral] Failed to create notification:", e);
  }

  return true;
}

// ─── Get referral stats for a user ───────────────────────────────────────────

export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [stats] = await db
    .select({
      totalReferrals: sql<number>`COUNT(*)`,
      totalCreditsEarned: sql<number>`COALESCE(SUM(${referrals.creditsAwarded}), 0)`,
    })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  return {
    totalReferrals: stats?.totalReferrals ?? 0,
    totalCreditsEarned: stats?.totalCreditsEarned ?? 0,
    creditsPerReferral: REFERRAL_BONUS_CREDITS,
  };
}

// ─── Get referral history for a user ─────────────────────────────────────────

export async function getReferralHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      id: referrals.id,
      referredUserId: referrals.referredUserId,
      referredName: users.name,
      creditsAwarded: referrals.creditsAwarded,
      createdAt: referrals.createdAt,
    })
    .from(referrals)
    .leftJoin(users, eq(referrals.referredUserId, users.id))
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt))
    .limit(limit);

  return rows;
}
