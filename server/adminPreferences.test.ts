import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Admin Notification Preferences", () => {
  describe("Database schema", () => {
    const schemaContent = fs.readFileSync(
      path.resolve(__dirname, "../drizzle/schema.ts"),
      "utf-8"
    );

    it("should define admin_notification_preferences table", () => {
      expect(schemaContent).toContain("admin_notification_preferences");
    });

    it("should have notificationType enum with all three types", () => {
      expect(schemaContent).toContain('"subscription_new"');
      expect(schemaContent).toContain('"payment_failed"');
      expect(schemaContent).toContain('"subscription_canceled"');
    });

    it("should have emailEnabled, inAppEnabled, and pushEnabled boolean columns", () => {
      expect(schemaContent).toContain("emailEnabled");
      expect(schemaContent).toContain("inAppEnabled");
      expect(schemaContent).toContain("pushEnabled");
    });

    it("should export AdminNotificationPreference type", () => {
      expect(schemaContent).toContain("export type AdminNotificationPreference");
    });
  });

  describe("DB helpers (adminPreferencesDb.ts)", () => {
    const dbContent = fs.readFileSync(
      path.resolve(__dirname, "./adminPreferencesDb.ts"),
      "utf-8"
    );

    it("should export getNotificationPreferences function", () => {
      expect(dbContent).toContain("export async function getNotificationPreferences");
    });

    it("should export getPreferenceForType function", () => {
      expect(dbContent).toContain("export async function getPreferenceForType");
    });

    it("should export updateNotificationPreference function", () => {
      expect(dbContent).toContain("export async function updateNotificationPreference");
    });

    it("should define DEFAULT_PREFERENCES with all three types", () => {
      expect(dbContent).toContain("DEFAULT_PREFERENCES");
      expect(dbContent).toContain("subscription_new");
      expect(dbContent).toContain("payment_failed");
      expect(dbContent).toContain("subscription_canceled");
    });

    it("should seed defaults when no preferences exist", () => {
      expect(dbContent).toContain("Seed defaults into DB");
    });
  });

  describe("tRPC procedures (routers.ts)", () => {
    const routersContent = fs.readFileSync(
      path.resolve(__dirname, "./routers.ts"),
      "utf-8"
    );

    it("should have getNotificationPreferences admin procedure", () => {
      expect(routersContent).toContain("getNotificationPreferences: adminProcedure");
    });

    it("should have updateNotificationPreference admin procedure", () => {
      expect(routersContent).toContain("updateNotificationPreference: adminProcedure");
    });

    it("should validate notificationType as enum in update procedure", () => {
      const updateSection = routersContent.slice(
        routersContent.indexOf("updateNotificationPreference: adminProcedure")
      );
      expect(updateSection).toContain('z.enum(["subscription_new", "payment_failed", "subscription_canceled"])');
    });

    it("should accept optional boolean fields for each channel", () => {
      const updateSection = routersContent.slice(
        routersContent.indexOf("updateNotificationPreference: adminProcedure")
      );
      expect(updateSection).toContain("emailEnabled: z.boolean().optional()");
      expect(updateSection).toContain("inAppEnabled: z.boolean().optional()");
      expect(updateSection).toContain("pushEnabled: z.boolean().optional()");
    });
  });

  describe("Webhook integration (stripeWebhook.ts)", () => {
    const webhookContent = fs.readFileSync(
      path.resolve(__dirname, "./stripeWebhook.ts"),
      "utf-8"
    );

    it("should import getPreferenceForType", () => {
      expect(webhookContent).toContain('import { getPreferenceForType } from "./adminPreferencesDb"');
    });

    it("should check preferences before sending subscription_new notifications", () => {
      const subSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionUpdated"),
        webhookContent.indexOf("async function handleSubscriptionDeleted")
      );
      expect(subSection).toContain('getPreferenceForType("subscription_new")');
      expect(subSection).toContain("subNewPref.emailEnabled");
      expect(subSection).toContain("subNewPref.inAppEnabled");
      expect(subSection).toContain("subNewPref.pushEnabled");
    });

    it("should check preferences before sending subscription_canceled notifications", () => {
      const cancelSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionDeleted"),
        webhookContent.indexOf("async function handleInvoicePaid")
      );
      expect(cancelSection).toContain('getPreferenceForType("subscription_canceled")');
      expect(cancelSection).toContain("cancelPref.emailEnabled");
      expect(cancelSection).toContain("cancelPref.inAppEnabled");
      expect(cancelSection).toContain("cancelPref.pushEnabled");
    });

    it("should check preferences before sending payment_failed notifications", () => {
      const failSection = webhookContent.slice(
        webhookContent.indexOf("async function handleInvoicePaymentFailed")
      );
      expect(failSection).toContain('getPreferenceForType("payment_failed")');
      expect(failSection).toContain("failPref.emailEnabled");
      expect(failSection).toContain("failPref.inAppEnabled");
      expect(failSection).toContain("failPref.pushEnabled");
    });

    it("should conditionally call notifyOwner based on pushEnabled", () => {
      // All three handlers should guard notifyOwner with pushEnabled
      const subSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionUpdated"),
        webhookContent.indexOf("async function handleSubscriptionDeleted")
      );
      expect(subSection).toContain("if (subNewPref.pushEnabled)");

      const cancelSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionDeleted"),
        webhookContent.indexOf("async function handleInvoicePaid")
      );
      expect(cancelSection).toContain("if (cancelPref.pushEnabled)");

      const failSection = webhookContent.slice(
        webhookContent.indexOf("async function handleInvoicePaymentFailed")
      );
      expect(failSection).toContain("if (failPref.pushEnabled)");
    });

    it("should conditionally call sendAdminEmail based on emailEnabled", () => {
      const subSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionUpdated"),
        webhookContent.indexOf("async function handleSubscriptionDeleted")
      );
      expect(subSection).toContain("if (subNewPref.emailEnabled)");

      const cancelSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionDeleted"),
        webhookContent.indexOf("async function handleInvoicePaid")
      );
      expect(cancelSection).toContain("if (cancelPref.emailEnabled)");

      const failSection = webhookContent.slice(
        webhookContent.indexOf("async function handleInvoicePaymentFailed")
      );
      expect(failSection).toContain("if (failPref.emailEnabled)");
    });

    it("should conditionally call createAdminNotification based on inAppEnabled", () => {
      const subSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionUpdated"),
        webhookContent.indexOf("async function handleSubscriptionDeleted")
      );
      expect(subSection).toContain("if (subNewPref.inAppEnabled)");

      const cancelSection = webhookContent.slice(
        webhookContent.indexOf("async function handleSubscriptionDeleted"),
        webhookContent.indexOf("async function handleInvoicePaid")
      );
      expect(cancelSection).toContain("if (cancelPref.inAppEnabled)");

      const failSection = webhookContent.slice(
        webhookContent.indexOf("async function handleInvoicePaymentFailed")
      );
      expect(failSection).toContain("if (failPref.inAppEnabled)");
    });
  });

  describe("Admin Settings page", () => {
    const settingsContent = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/AdminSettings.tsx"),
      "utf-8"
    );

    it("should import trpc for API calls", () => {
      expect(settingsContent).toContain("import { trpc }");
    });

    it("should use getNotificationPreferences query", () => {
      expect(settingsContent).toContain("trpc.admin.getNotificationPreferences.useQuery");
    });

    it("should use updateNotificationPreference mutation", () => {
      expect(settingsContent).toContain("trpc.admin.updateNotificationPreference.useMutation");
    });

    it("should display all three notification types", () => {
      expect(settingsContent).toContain("subscription_new");
      expect(settingsContent).toContain("payment_failed");
      expect(settingsContent).toContain("subscription_canceled");
    });

    it("should display all three channels", () => {
      expect(settingsContent).toContain("emailEnabled");
      expect(settingsContent).toContain("inAppEnabled");
      expect(settingsContent).toContain("pushEnabled");
    });

    it("should have toggle switch component", () => {
      expect(settingsContent).toContain("ToggleSwitch");
    });

    it("should have admin role check", () => {
      expect(settingsContent).toContain('user?.role === "admin"');
    });

    it("should have back link to admin dashboard", () => {
      expect(settingsContent).toContain('href="/admin"');
    });
  });

  describe("Admin Dashboard settings link", () => {
    const dashboardContent = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/AdminDashboard.tsx"),
      "utf-8"
    );

    it("should have a link to /admin/settings", () => {
      expect(dashboardContent).toContain('href="/admin/settings"');
    });

    it("should import Settings icon", () => {
      expect(dashboardContent).toContain("Settings");
    });
  });

  describe("App.tsx routing", () => {
    const appContent = fs.readFileSync(
      path.resolve(__dirname, "../client/src/App.tsx"),
      "utf-8"
    );

    it("should have /admin/settings route", () => {
      expect(appContent).toContain('path={"/admin/settings"}');
    });

    it("should lazy import AdminSettings", () => {
      expect(appContent).toContain('lazy(() => import("./pages/AdminSettings"))');
    });
  });
});
