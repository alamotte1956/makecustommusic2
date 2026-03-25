import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { adminNotificationPreferences } from "../drizzle/schema";

export type NotificationType = "subscription_new" | "payment_failed" | "subscription_canceled";

export type NotificationPreference = {
  notificationType: NotificationType;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
};

// Default preferences — all channels enabled except push
const DEFAULT_PREFERENCES: NotificationPreference[] = [
  { notificationType: "subscription_new", emailEnabled: true, inAppEnabled: true, pushEnabled: false },
  { notificationType: "payment_failed", emailEnabled: true, inAppEnabled: true, pushEnabled: false },
  { notificationType: "subscription_canceled", emailEnabled: true, inAppEnabled: true, pushEnabled: false },
];

/**
 * Get all notification preferences. If none exist in DB, returns defaults.
 */
export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const db = await getDb();
  if (!db) return DEFAULT_PREFERENCES;

  const rows = await db.select().from(adminNotificationPreferences);

  if (rows.length === 0) {
    // Seed defaults into DB
    for (const pref of DEFAULT_PREFERENCES) {
      await db.insert(adminNotificationPreferences).values(pref);
    }
    return DEFAULT_PREFERENCES;
  }

  // Merge with defaults in case new types were added
  const existingTypes = new Set(rows.map((r) => r.notificationType));
  const result: NotificationPreference[] = rows.map((r) => ({
    notificationType: r.notificationType as NotificationType,
    emailEnabled: r.emailEnabled,
    inAppEnabled: r.inAppEnabled,
    pushEnabled: r.pushEnabled,
  }));

  for (const def of DEFAULT_PREFERENCES) {
    if (!existingTypes.has(def.notificationType)) {
      await db.insert(adminNotificationPreferences).values(def);
      result.push(def);
    }
  }

  return result;
}

/**
 * Get preference for a specific notification type.
 */
export async function getPreferenceForType(type: NotificationType): Promise<NotificationPreference> {
  const db = await getDb();
  if (!db) return DEFAULT_PREFERENCES.find((d) => d.notificationType === type) ?? DEFAULT_PREFERENCES[0];

  const [row] = await db
    .select()
    .from(adminNotificationPreferences)
    .where(eq(adminNotificationPreferences.notificationType, type))
    .limit(1);

  if (!row) {
    // Return default and seed it
    const def = DEFAULT_PREFERENCES.find((d) => d.notificationType === type) ?? DEFAULT_PREFERENCES[0];
    await db.insert(adminNotificationPreferences).values(def);
    return def;
  }

  return {
    notificationType: row.notificationType as NotificationType,
    emailEnabled: row.emailEnabled,
    inAppEnabled: row.inAppEnabled,
    pushEnabled: row.pushEnabled,
  };
}

/**
 * Update a specific notification preference.
 */
export async function updateNotificationPreference(
  type: NotificationType,
  updates: { emailEnabled?: boolean; inAppEnabled?: boolean; pushEnabled?: boolean }
): Promise<NotificationPreference> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if row exists
  const [existing] = await db
    .select()
    .from(adminNotificationPreferences)
    .where(eq(adminNotificationPreferences.notificationType, type))
    .limit(1);

  if (!existing) {
    // Create with defaults + updates
    const def = DEFAULT_PREFERENCES.find((d) => d.notificationType === type) ?? DEFAULT_PREFERENCES[0];
    const merged = { ...def, ...updates, notificationType: type };
    await db.insert(adminNotificationPreferences).values(merged);
    return merged;
  }

  // Update existing
  await db
    .update(adminNotificationPreferences)
    .set(updates)
    .where(eq(adminNotificationPreferences.notificationType, type));

  return {
    notificationType: type,
    emailEnabled: updates.emailEnabled ?? existing.emailEnabled,
    inAppEnabled: updates.inAppEnabled ?? existing.inAppEnabled,
    pushEnabled: updates.pushEnabled ?? existing.pushEnabled,
  };
}
