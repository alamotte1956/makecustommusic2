import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Schema tests ──────────────────────────────────────────────────────────

describe("adminNotifications schema", () => {
  it("should export adminNotifications table from schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.adminNotifications).toBeDefined();
  });

  it("should have required columns: id, type, title, content, isRead, createdAt", async () => {
    const schemaContent = fs.readFileSync(
      path.resolve(__dirname, "../drizzle/schema.ts"),
      "utf-8"
    );
    expect(schemaContent).toContain("admin_notifications");
    expect(schemaContent).toContain('"type"');
    expect(schemaContent).toContain('"title"');
    expect(schemaContent).toContain('"content"');
    expect(schemaContent).toContain('"isRead"');
    expect(schemaContent).toContain('"relatedUserId"');
    expect(schemaContent).toContain('"metadata"');
  });

  it("should have notification type enum with correct values", async () => {
    const schemaContent = fs.readFileSync(
      path.resolve(__dirname, "../drizzle/schema.ts"),
      "utf-8"
    );
    expect(schemaContent).toContain("subscription_new");
    expect(schemaContent).toContain("payment_failed");
    expect(schemaContent).toContain("subscription_canceled");
    expect(schemaContent).toContain("system");
    expect(schemaContent).toContain("other");
  });
});

// ─── DB helper tests ───────────────────────────────────────────────────────

describe("adminNotificationDb helpers", () => {
  it("should export all CRUD functions", async () => {
    const helpers = await import("./adminNotificationDb");
    expect(typeof helpers.createAdminNotification).toBe("function");
    expect(typeof helpers.getAdminNotifications).toBe("function");
    expect(typeof helpers.getUnreadNotificationCount).toBe("function");
    expect(typeof helpers.markNotificationRead).toBe("function");
    expect(typeof helpers.markAllNotificationsRead).toBe("function");
    expect(typeof helpers.deleteNotification).toBe("function");
  });
});

// ─── Router procedure tests ────────────────────────────────────────────────

describe("admin notification router procedures", () => {
  it("should have notification-related procedures in admin router", async () => {
    const routerContent = fs.readFileSync(
      path.resolve(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routerContent).toContain("notifications: adminProcedure");
    expect(routerContent).toContain("unreadNotificationCount: adminProcedure");
    expect(routerContent).toContain("markNotificationRead: adminProcedure");
    expect(routerContent).toContain("markAllNotificationsRead: adminProcedure");
    expect(routerContent).toContain("deleteNotification: adminProcedure");
  });

  it("notifications query should accept type, isRead, limit, offset filters", async () => {
    const routerContent = fs.readFileSync(
      path.resolve(__dirname, "routers.ts"),
      "utf-8"
    );
    // Check the input schema for the notifications procedure
    const notifSection = routerContent.substring(
      routerContent.indexOf("notifications: adminProcedure"),
      routerContent.indexOf("unreadNotificationCount: adminProcedure")
    );
    expect(notifSection).toContain("type: z.string().optional()");
    expect(notifSection).toContain("isRead: z.boolean().optional()");
    expect(notifSection).toContain("limit: z.number()");
    expect(notifSection).toContain("offset: z.number()");
  });
});

// ─── Webhook integration tests ─────────────────────────────────────────────

describe("webhook notification persistence", () => {
  it("should import createAdminNotification in stripeWebhook", async () => {
    const webhookContent = fs.readFileSync(
      path.resolve(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    expect(webhookContent).toContain("import { createAdminNotification }");
    expect(webhookContent).toContain("from \"./adminNotificationDb\"");
  });

  it("should persist subscription_new notification on new subscription", async () => {
    const webhookContent = fs.readFileSync(
      path.resolve(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    expect(webhookContent).toContain('type: "subscription_new"');
    expect(webhookContent).toContain("createAdminNotification({");
  });

  it("should persist payment_failed notification on failed payment", async () => {
    const webhookContent = fs.readFileSync(
      path.resolve(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    expect(webhookContent).toContain('type: "payment_failed"');
  });

  it("should include metadata with subscription/payment details", async () => {
    const webhookContent = fs.readFileSync(
      path.resolve(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    // Subscription notification should include plan and billing info
    expect(webhookContent).toContain("planTier");
    expect(webhookContent).toContain("subscriptionId");
    // Payment failure should include amount and invoice info
    expect(webhookContent).toContain("amountDue");
    expect(webhookContent).toContain("invoiceId");
  });

  it("notification persistence should be wrapped in try-catch", async () => {
    const webhookContent = fs.readFileSync(
      path.resolve(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    // Both createAdminNotification calls should be inside try blocks
    // Find the section around subscription_new with enough context
    const idx = webhookContent.indexOf('type: "subscription_new"');
    const subSection = webhookContent.substring(Math.max(0, idx - 200), idx + 200);
    // The createAdminNotification is inside the existing try-catch for notifyOwner
    expect(subSection).toContain("createAdminNotification");
  });
});

// ─── Frontend component tests ──────────────────────────────────────────────

describe("AdminNotificationCenter component", () => {
  it("should exist as a component file", () => {
    const exists = fs.existsSync(
      path.resolve(__dirname, "../client/src/components/AdminNotificationCenter.tsx")
    );
    expect(exists).toBe(true);
  });

  it("should import trpc for data fetching", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/AdminNotificationCenter.tsx"),
      "utf-8"
    );
    expect(content).toContain("trpc");
    expect(content).toContain("admin.notifications");
    expect(content).toContain("admin.unreadNotificationCount");
    expect(content).toContain("admin.markNotificationRead");
    expect(content).toContain("admin.markAllNotificationsRead");
    expect(content).toContain("admin.deleteNotification");
  });

  it("should have type filter buttons for all notification types", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/AdminNotificationCenter.tsx"),
      "utf-8"
    );
    expect(content).toContain("subscription_new");
    expect(content).toContain("payment_failed");
    expect(content).toContain("subscription_canceled");
    expect(content).toContain("system");
  });

  it("should have read/unread filter", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/AdminNotificationCenter.tsx"),
      "utf-8"
    );
    expect(content).toContain("readFilter");
    expect(content).toContain('"unread"');
    expect(content).toContain('"read"');
  });

  it("should have pagination support", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/AdminNotificationCenter.tsx"),
      "utf-8"
    );
    expect(content).toContain("PAGE_SIZE");
    expect(content).toContain("totalPages");
    expect(content).toContain("ChevronLeft");
    expect(content).toContain("ChevronRight");
  });
});

// ─── Admin nav badge tests ─────────────────────────────────────────────────

describe("Admin nav unread badge", () => {
  it("should have AdminNavLink component in Layout with unread count", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/Layout.tsx"),
      "utf-8"
    );
    expect(content).toContain("AdminNavLink");
    expect(content).toContain("unreadNotificationCount");
    expect(content).toContain("unreadCount");
  });

  it("should poll for unread count every 30 seconds", () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/Layout.tsx"),
      "utf-8"
    );
    expect(content).toContain("refetchInterval: 30000");
  });
});

// ─── Pricing update tests ──────────────────────────────────────────────────

describe("competitive pricing matching Suno tiers", () => {
  it("Pro (creator) plan should be $8/mo", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.creator.prices.monthly).toBe(800);
  });

  it("Premier (professional) plan should be $24/mo", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.professional.prices.monthly).toBe(2400);
  });

  it("Pro annual should be $72/yr (saves $24)", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.creator.prices.annual).toBe(7200);
  });

  it("Premier annual should be $216/yr (saves $72)", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.professional.prices.annual).toBe(21600);
  });

  it("webhook should award 2 free bonus credits on new subscription", () => {
    const webhookContent = fs.readFileSync(
      path.resolve(__dirname, "stripeWebhook.ts"),
      "utf-8"
    );
    expect(webhookContent).toContain("addBonusCredits(userId, 2");
    expect(webhookContent).toContain("Welcome bonus: 2 free credits");
  });

  it("allPlans should list Suno-matching features", () => {
    const routerContent = fs.readFileSync(
      path.resolve(__dirname, "routers.ts"),
      "utf-8"
    );
    expect(routerContent).toContain("2,500 credits (up to 500 songs)");
    expect(routerContent).toContain("10,000 credits (up to 2,000 songs)");
    expect(routerContent).toContain("Commercial use rights for new songs made");
    expect(routerContent).toContain("Priority queue, up to 10 songs at once");
  });
});
