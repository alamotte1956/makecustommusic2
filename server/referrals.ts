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

  // Award bonus credits to the referred user (new signup)
  await addBonusCredits(
    referredUserId,
    REFERRAL_BONUS_CREDITS,
    `Welcome bonus: you signed up with a referral link and earned ${REFERRAL_BONUS_CREDITS} free songs!`
  );

  // Notify the referrer
  try {
    await createNotification({
      userId: referrerId,
      type: "credit_added",
      title: "Referral Bonus!",
      message: `You earned ${REFERRAL_BONUS_CREDITS} bonus songs because a friend signed up with your invite link!`,
    });
  } catch (e) {
    console.warn("[Referral] Failed to create referrer notification:", e);
  }

  // Notify the referred user
  try {
    await createNotification({
      userId: referredUserId,
      type: "credit_added",
      title: "Welcome Bonus!",
      message: `You earned ${REFERRAL_BONUS_CREDITS} bonus songs for signing up with a referral link! Start creating music now.`,
    });
  } catch (e) {
    console.warn("[Referral] Failed to create referred user notification:", e);
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

// ─── Get referral leaderboard ────────────────────────────────────────────────

export async function getLeaderboard(limit = 20, currentUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      userId: referrals.referrerId,
      name: users.name,
      totalReferrals: sql<number>`COUNT(*)`,
      totalCreditsEarned: sql<number>`COALESCE(SUM(${referrals.creditsAwarded}), 0)`,
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.referrerId, users.id))
    .groupBy(referrals.referrerId, users.name)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);

  // Anonymize names: show first letter + asterisks for privacy
  const leaderboard = rows.map((row, index) => {
    const displayName = row.name
      ? row.name.charAt(0) + "***" + (row.name.includes(" ") ? " " + row.name.split(" ").pop()?.charAt(0) + "***" : "")
      : "Anonymous";
    return {
      rank: index + 1,
      userId: row.userId,
      displayName: currentUserId && row.userId === currentUserId ? (row.name ?? "You") : displayName,
      totalReferrals: row.totalReferrals,
      totalCreditsEarned: row.totalCreditsEarned,
      isCurrentUser: currentUserId ? row.userId === currentUserId : false,
    };
  });

  // If the current user is not in the top list, find their rank
  let currentUserRank = null;
  if (currentUserId && !leaderboard.some((r) => r.isCurrentUser)) {
    const [userStats] = await db
      .select({
        totalReferrals: sql<number>`COUNT(*)`,
        totalCreditsEarned: sql<number>`COALESCE(SUM(${referrals.creditsAwarded}), 0)`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, currentUserId));

    if (userStats && userStats.totalReferrals > 0) {
      // Count how many users have more referrals
      const [rankResult] = await db
        .select({ rank: sql<number>`COUNT(DISTINCT ${referrals.referrerId}) + 1` })
        .from(referrals)
        .where(
          sql`${referrals.referrerId} IN (
            SELECT r2.referrer_id FROM ${referrals} r2
            GROUP BY r2.referrer_id
            HAVING COUNT(*) > ${userStats.totalReferrals}
          )`
        );

      const [currentUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, currentUserId))
        .limit(1);

      currentUserRank = {
        rank: rankResult?.rank ?? 0,
        userId: currentUserId,
        displayName: currentUser?.name ?? "You",
        totalReferrals: userStats.totalReferrals,
        totalCreditsEarned: userStats.totalCreditsEarned,
        isCurrentUser: true,
      };
    }
  }

  return { leaderboard, currentUserRank };
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
