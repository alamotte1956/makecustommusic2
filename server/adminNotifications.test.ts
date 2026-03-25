import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const WEBHOOK_PATH = path.resolve(__dirname, "stripeWebhook.ts");

describe("Admin Notifications in Stripe Webhook", () => {
  const content = fs.readFileSync(WEBHOOK_PATH, "utf-8");

  describe("notifyOwner integration", () => {
    it("imports notifyOwner from notification module", () => {
      expect(content).toContain('import { notifyOwner }');
      expect(content).toContain("notification");
    });

    it("calls notifyOwner for active subscription events", () => {
      // Should notify when a subscription becomes active
      expect(content).toContain("Notify owner about new/updated subscriptions");
      expect(content).toContain('status === "active"');
      // Should include notifyOwner call inside the active subscription block
      const activeBlock = content.slice(
        content.indexOf("Notify owner about new/updated subscriptions")
      );
      expect(activeBlock).toContain("notifyOwner");
    });

    it("calls notifyOwner for failed payment events", () => {
      // Should notify when a payment fails
      expect(content).toContain("Notify owner about failed payment");
      const failedBlock = content.slice(
        content.indexOf("Notify owner about failed payment")
      );
      expect(failedBlock).toContain("notifyOwner");
    });
  });

  describe("subscription notification content", () => {
    it("includes plan tier in notification title", () => {
      // The notification title should mention the plan
      expect(content).toContain("New Subscription:");
      expect(content).toContain("planTier");
    });

    it("includes user details in notification content", () => {
      // Should look up user name and email for the notification
      expect(content).toContain("userName");
      expect(content).toContain("userEmail");
    });

    it("includes billing cycle in notification content", () => {
      expect(content).toContain("billingLabel");
      expect(content).toContain("Billing:");
    });

    it("includes subscription ID in notification content", () => {
      expect(content).toContain("Subscription ID:");
      expect(content).toContain("subscription.id");
    });
  });

  describe("payment failure notification content", () => {
    it("includes 'Payment Failed' in notification title", () => {
      expect(content).toContain('title: "Payment Failed"');
    });

    it("includes user details in failure notification", () => {
      // The failed payment handler should also look up user info
      const failedSection = content.slice(
        content.indexOf("handleInvoicePaymentFailed")
      );
      expect(failedSection).toContain("userName");
      expect(failedSection).toContain("userEmail");
    });

    it("includes amount due in failure notification", () => {
      expect(content).toContain("amountDue");
      expect(content).toContain("Amount Due:");
    });

    it("includes invoice ID in failure notification", () => {
      expect(content).toContain("Invoice ID:");
      expect(content).toContain("invoice.id");
    });

    it("mentions past_due status in failure notification", () => {
      expect(content).toContain("past_due");
      expect(content).toContain("update their payment method");
    });
  });

  describe("error handling", () => {
    it("wraps subscription notification in try-catch", () => {
      // Notification failures should not break the webhook handler
      const subNotifySection = content.slice(
        content.indexOf("Notify owner about new/updated subscriptions"),
        content.indexOf("async function handleSubscriptionDeleted")
      );
      expect(subNotifySection).toContain("try {");
      expect(subNotifySection).toContain("catch");
      expect(subNotifySection).toContain("Failed to send subscription notification");
    });

    it("wraps payment failure notification in try-catch", () => {
      const failNotifySection = content.slice(
        content.indexOf("Notify owner about failed payment")
      );
      expect(failNotifySection).toContain("try {");
      expect(failNotifySection).toContain("catch");
      expect(failNotifySection).toContain("Failed to send payment failure notification");
    });

    it("uses console.warn for notification errors (not console.error)", () => {
      // Notification failures are non-critical, should use warn
      expect(content).toContain('console.warn("[Stripe Webhook] Failed to send subscription notification:"');
      expect(content).toContain('console.warn("[Stripe Webhook] Failed to send payment failure notification:"');
    });
  });

  describe("notification only fires for relevant events", () => {
    it("only notifies on active subscriptions, not canceled or past_due", () => {
      // The notification should be gated behind status === "active"
      // Use the function definition (async function handleSubscriptionUpdated)
      const fnStart = content.indexOf("async function handleSubscriptionUpdated");
      const fnEnd = content.indexOf("async function handleSubscriptionDeleted");
      const subHandler = content.slice(fnStart, fnEnd);
      // Should have the active check before notifyOwner
      const activeCheckIndex = subHandler.indexOf('status === "active"');
      const notifyIndex = subHandler.indexOf("notifyOwner", activeCheckIndex);
      expect(activeCheckIndex).toBeGreaterThan(-1);
      expect(notifyIndex).toBeGreaterThan(activeCheckIndex);
    });
  });
});
