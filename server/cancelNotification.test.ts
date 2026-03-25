import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const WEBHOOK_PATH = path.resolve(__dirname, "stripeWebhook.ts");
const content = fs.readFileSync(WEBHOOK_PATH, "utf-8");

describe("Subscription Cancellation Notification", () => {
  describe("handleSubscriptionDeleted sends cancellation notification", () => {
    const deletedSection = content.slice(
      content.indexOf("handleSubscriptionDeleted")
    );

    it("looks up user details (name and email) before notifying", () => {
      expect(deletedSection).toContain("userName");
      expect(deletedSection).toContain("userEmail");
    });

    it("captures the previous plan before downgrading", () => {
      expect(deletedSection).toContain("previousPlan");
      expect(deletedSection).toContain("existingSub");
    });

    it("includes cancellation reason and feedback from Stripe", () => {
      expect(deletedSection).toContain("cancellation_details");
      expect(deletedSection).toContain("cancelReason");
      expect(deletedSection).toContain("cancelFeedback");
    });

    it("calls notifyOwner with cancellation details", () => {
      expect(deletedSection).toContain("notifyOwner");
      expect(deletedSection).toContain("Subscription Canceled");
    });

    it("persists a subscription_canceled notification to the database", () => {
      expect(deletedSection).toContain("createAdminNotification");
      expect(deletedSection).toContain('"subscription_canceled"');
    });

    it("includes metadata with previousPlan, cancelReason, cancelFeedback, subscriptionId", () => {
      expect(deletedSection).toContain("metadata:");
      expect(deletedSection).toContain("previousPlan");
      expect(deletedSection).toContain("cancelReason");
      expect(deletedSection).toContain("cancelFeedback");
      expect(deletedSection).toContain("subscriptionId");
    });

    it("wraps notification in try-catch to avoid breaking the webhook", () => {
      expect(deletedSection).toContain("try {");
      expect(deletedSection).toContain("catch (err)");
      expect(deletedSection).toContain("Failed to send cancellation notification");
    });

    it("still downgrades the user to free plan", () => {
      expect(deletedSection).toContain('plan: "free"');
      expect(deletedSection).toContain('status: "canceled"');
    });
  });

  describe("notification center UI supports subscription_canceled type", () => {
    const uiContent = fs.readFileSync(
      path.resolve(__dirname, "../client/src/components/AdminNotificationCenter.tsx"),
      "utf-8"
    );

    it("has subscription_canceled in TYPE_CONFIG", () => {
      expect(uiContent).toContain("subscription_canceled");
    });

    it("has a label for subscription_canceled type", () => {
      expect(uiContent).toContain("Subscription Canceled");
    });

    it("includes subscription_canceled in filter buttons", () => {
      // The filter buttons array should include subscription_canceled
      const filterSection = uiContent.slice(
        uiContent.indexOf('"all", "subscription_new"')
      );
      expect(filterSection).toContain("subscription_canceled");
    });
  });

  describe("schema supports subscription_canceled type", () => {
    const schemaContent = fs.readFileSync(
      path.resolve(__dirname, "../drizzle/schema.ts"),
      "utf-8"
    );

    it("includes subscription_canceled in the notification type enum", () => {
      expect(schemaContent).toContain("subscription_canceled");
    });
  });
});
