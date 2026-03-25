import { getDb } from "./db";
import { adminNotifications } from "../drizzle/schema";
import type { InsertAdminNotification } from "../drizzle/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";

// ─── Create ────────────────────────────────────────────────────────────────

export async function createAdminNotification(data: Omit<InsertAdminNotification, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(adminNotifications).values(data).$returningId();
  return result;
}

// ─── List with filters ─────────────────────────────────────────────────────

export async function getAdminNotifications(opts: {
  type?: string;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];
  if (opts.type && opts.type !== "all") {
    conditions.push(eq(adminNotifications.type, opts.type as any));
  }
  if (opts.isRead !== undefined) {
    conditions.push(eq(adminNotifications.isRead, opts.isRead));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const [items, [totalRow]] = await Promise.all([
    db
      .select()
      .from(adminNotifications)
      .where(where)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(adminNotifications)
      .where(where),
  ]);

  return { items, total: totalRow?.total ?? 0 };
}

// ─── Unread count ──────────────────────────────────────────────────────────

export async function getUnreadNotificationCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db
    .select({ count: count() })
    .from(adminNotifications)
    .where(eq(adminNotifications.isRead, false));
  return row?.count ?? 0;
}

// ─── Mark as read ──────────────────────────────────────────────────────────

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(adminNotifications)
    .set({ isRead: true })
    .where(eq(adminNotifications.id, id));
}

export async function markAllNotificationsRead() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(adminNotifications)
    .set({ isRead: true })
    .where(eq(adminNotifications.isRead, false));
}

// ─── Delete ────────────────────────────────────────────────────────────────

export async function deleteNotification(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(adminNotifications)
    .where(eq(adminNotifications.id, id));
}
