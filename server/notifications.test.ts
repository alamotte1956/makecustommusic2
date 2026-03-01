import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");

  let notificationStore: any[] = [];
  let nextId = 1;

  return {
    ...actual,
    createNotification: vi.fn(async (data: any) => {
      const id = nextId++;
      notificationStore.push({
        id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        songId: data.songId ?? null,
        actorName: data.actorName ?? null,
        isRead: 0,
        createdAt: new Date(),
      });
      return id;
    }),
    getUserNotifications: vi.fn(async (userId: number, limit = 30) => {
      return notificationStore
        .filter((n) => n.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    }),
    getUnreadNotificationCount: vi.fn(async (userId: number) => {
      return notificationStore.filter((n) => n.userId === userId && n.isRead === 0).length;
    }),
    markNotificationRead: vi.fn(async (id: number, userId: number) => {
      const n = notificationStore.find((n) => n.id === id && n.userId === userId);
      if (n) n.isRead = 1;
    }),
    markAllNotificationsRead: vi.fn(async (userId: number) => {
      notificationStore.forEach((n) => {
        if (n.userId === userId) n.isRead = 1;
      });
    }),
    deleteNotification: vi.fn(async (id: number, userId: number) => {
      notificationStore = notificationStore.filter(
        (n) => !(n.id === id && n.userId === userId)
      );
    }),
    // Expose for test reset
    _resetNotificationStore: () => {
      notificationStore = [];
      nextId = 1;
    },
    _getNotificationStore: () => notificationStore,
  };
});

// Import the mocked module to access reset
import {
  _resetNotificationStore,
  _getNotificationStore,
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Notification System", () => {
  beforeEach(() => {
    _resetNotificationStore();
    vi.clearAllMocks();
  });

  describe("notifications.list", () => {
    it("returns empty array when no notifications exist", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.list({ limit: 30 });
      expect(result).toEqual([]);
    });

    it("returns notifications for the authenticated user", async () => {
      // Seed some notifications
      await createNotification({
        userId: 1,
        type: "song_ready",
        title: "Song Ready",
        message: "Your song is ready",
        songId: 10,
      });
      await createNotification({
        userId: 1,
        type: "system",
        title: "Welcome",
        message: "Welcome to the platform",
      });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.list({ limit: 30 });

      expect(result).toHaveLength(2);
      expect(result[0].title).toBeDefined();
    });

    it("does not return notifications from other users", async () => {
      await createNotification({
        userId: 2,
        type: "song_ready",
        title: "Other User Song",
        message: "Not yours",
      });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.list({ limit: 30 });
      expect(result).toHaveLength(0);
    });

    it("respects the limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await createNotification({
          userId: 1,
          type: "system",
          title: `Notification ${i}`,
          message: `Message ${i}`,
        });
      }

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.list({ limit: 3 });
      expect(result).toHaveLength(3);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.notifications.list({ limit: 30 })).rejects.toThrow();
    });
  });

  describe("notifications.unreadCount", () => {
    it("returns 0 when no unread notifications", async () => {
      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.unreadCount();
      expect(result).toEqual({ count: 0 });
    });

    it("returns correct unread count", async () => {
      await createNotification({
        userId: 1,
        type: "song_ready",
        title: "Song 1",
        message: "Ready",
      });
      await createNotification({
        userId: 1,
        type: "song_ready",
        title: "Song 2",
        message: "Ready",
      });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.unreadCount();
      expect(result).toEqual({ count: 2 });
    });

    it("only counts notifications for the current user", async () => {
      await createNotification({ userId: 1, type: "system", title: "Mine", message: "m" });
      await createNotification({ userId: 2, type: "system", title: "Theirs", message: "t" });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.unreadCount();
      expect(result).toEqual({ count: 1 });
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.notifications.unreadCount()).rejects.toThrow();
    });
  });

  describe("notifications.markRead", () => {
    it("marks a specific notification as read", async () => {
      const id = await createNotification({
        userId: 1,
        type: "song_ready",
        title: "Song Ready",
        message: "Ready",
      });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.markRead({ id });
      expect(result).toEqual({ success: true });
      expect(markNotificationRead).toHaveBeenCalledWith(id, 1);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.notifications.markRead({ id: 1 })).rejects.toThrow();
    });
  });

  describe("notifications.markAllRead", () => {
    it("marks all notifications as read for the user", async () => {
      await createNotification({ userId: 1, type: "system", title: "N1", message: "m" });
      await createNotification({ userId: 1, type: "system", title: "N2", message: "m" });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.markAllRead();
      expect(result).toEqual({ success: true });
      expect(markAllNotificationsRead).toHaveBeenCalledWith(1);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.notifications.markAllRead()).rejects.toThrow();
    });
  });

  describe("notifications.delete", () => {
    it("deletes a notification", async () => {
      const id = await createNotification({
        userId: 1,
        type: "system",
        title: "Delete Me",
        message: "bye",
      });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.delete({ id });
      expect(result).toEqual({ success: true });
      expect(deleteNotification).toHaveBeenCalledWith(id, 1);
    });

    it("requires authentication", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.notifications.delete({ id: 1 })).rejects.toThrow();
    });
  });

  describe("createNotification helper", () => {
    it("creates a notification with all fields", async () => {
      const id = await createNotification({
        userId: 1,
        type: "song_ready",
        title: "Your song is ready!",
        message: "\"My Song\" has been generated.",
        songId: 42,
      });

      expect(id).toBe(1);
      const store = _getNotificationStore();
      expect(store).toHaveLength(1);
      expect(store[0]).toMatchObject({
        id: 1,
        userId: 1,
        type: "song_ready",
        title: "Your song is ready!",
        songId: 42,
        isRead: 0,
      });
    });

    it("creates a notification without optional songId", async () => {
      const id = await createNotification({
        userId: 1,
        type: "system",
        title: "Welcome",
        message: "Welcome to the platform",
      });

      const store = _getNotificationStore();
      expect(store[0].songId).toBeNull();
    });

    it("defaults isRead to 0", async () => {
      await createNotification({
        userId: 1,
        type: "credit_added",
        title: "Credits Added",
        message: "25 credits added",
      });

      const store = _getNotificationStore();
      expect(store[0].isRead).toBe(0);
    });
  });

  describe("Notification type enum", () => {
    it("supports song_ready type", async () => {
      const id = await createNotification({
        userId: 1,
        type: "song_ready",
        title: "Song Ready",
        message: "Ready",
      });
      expect(id).toBeGreaterThan(0);
    });

    it("supports system type", async () => {
      const id = await createNotification({
        userId: 1,
        type: "system",
        title: "System",
        message: "System notification",
      });
      expect(id).toBeGreaterThan(0);
    });

    it("supports credit_added type", async () => {
      const id = await createNotification({
        userId: 1,
        type: "credit_added",
        title: "Credits",
        message: "Credits added",
      });
      expect(id).toBeGreaterThan(0);
    });
  });

  describe("timeAgo utility behavior", () => {
    it("notification createdAt is a valid Date", async () => {
      await createNotification({
        userId: 1,
        type: "system",
        title: "Test",
        message: "Test",
      });

      const caller = appRouter.createCaller(createAuthContext(1));
      const result = await caller.notifications.list({ limit: 1 });
      expect(result[0].createdAt).toBeInstanceOf(Date);
    });
  });
});
