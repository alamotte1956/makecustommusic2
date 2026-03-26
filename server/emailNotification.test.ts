import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const EMAIL_HELPER_PATH = path.resolve(__dirname, "emailNotification.ts");
const emailContent = fs.readFileSync(EMAIL_HELPER_PATH, "utf-8");

const WEBHOOK_PATH = path.resolve(__dirname, "stripeWebhook.ts");
const webhookContent = fs.readFileSync(WEBHOOK_PATH, "utf-8");

describe("Email Notification Helper", () => {
  it("imports Resend from the resend package", () => {
    expect(emailContent).toContain('import { Resend } from "resend"');
  });

  it("reads RESEND_API_KEY from ENV", () => {
    expect(emailContent).toContain("ENV.RESEND_API_KEY");
  });

  it("sends email to the correct admin address", () => {
    expect(emailContent).toContain("support@createchristianmusic.com");
  });

  it("sends from the makecustommusic.com domain", () => {
    expect(emailContent).toContain("makecustommusic.com");
  });

  it("exports sendAdminEmail function", () => {
    expect(emailContent).toContain("export async function sendAdminEmail");
  });

  it("supports payment_failed notification type", () => {
    expect(emailContent).toContain("payment_failed");
  });

  it("supports subscription_canceled notification type", () => {
    expect(emailContent).toContain("subscription_canceled");
  });

  it("supports subscription_new notification type", () => {
    expect(emailContent).toContain("subscription_new");
  });

  it("returns false instead of throwing when Resend is not configured", () => {
    expect(emailContent).toContain("return false");
  });

  it("wraps email sending in try-catch for graceful error handling", () => {
    expect(emailContent).toContain("try {");
    expect(emailContent).toContain("catch (err)");
  });

  it("generates styled HTML email with color-coded badges", () => {
    expect(emailContent).toContain("#ef4444"); // red for payment_failed
    expect(emailContent).toContain("#f59e0b"); // amber for subscription_canceled
    expect(emailContent).toContain("#22c55e"); // green for subscription_new
  });

  it("includes a link to the admin dashboard in the email", () => {
    expect(emailContent).toContain("makecustommusic.com/admin");
  });

  it("escapes HTML in the email body to prevent XSS", () => {
    expect(emailContent).toContain("escapeHtml");
  });

  it("prefixes email subject with [MakeCustomMusic]", () => {
    expect(emailContent).toContain("[MakeCustomMusic]");
  });
});

describe("Stripe Webhook Email Integration", () => {
  it("imports sendAdminEmail in stripeWebhook.ts", () => {
    expect(webhookContent).toContain('import { sendAdminEmail } from "./emailNotification"');
  });

  it("sends email for new subscription events", () => {
    const subSection = webhookContent.slice(
      webhookContent.indexOf("handleSubscriptionUpdated")
    );
    expect(subSection).toContain('sendAdminEmail({ subject: notifTitle, body: notifContent, type: "subscription_new" })');
  });

  it("sends email for subscription cancellation events", () => {
    const deletedSection = webhookContent.slice(
      webhookContent.indexOf("handleSubscriptionDeleted")
    );
    expect(deletedSection).toContain('sendAdminEmail({ subject: notifTitle, body: notifContent, type: "subscription_canceled" })');
  });

  it("sends email for payment failure events", () => {
    const failedSection = webhookContent.slice(
      webhookContent.indexOf("handleInvoicePaymentFailed")
    );
    expect(failedSection).toContain('sendAdminEmail({ subject: notifTitle, body: notifContent, type: "payment_failed" })');
  });

  it("calls sendAdminEmail before createAdminNotification in each handler", () => {
    // Check in the subscription updated handler
    const subUpdatedSection = webhookContent.slice(
      webhookContent.indexOf("async function handleSubscriptionUpdated"),
      webhookContent.indexOf("async function handleSubscriptionDeleted")
    );
    const emailIdx1 = subUpdatedSection.indexOf("sendAdminEmail");
    const dbIdx1 = subUpdatedSection.indexOf("createAdminNotification");
    expect(emailIdx1).toBeGreaterThan(-1);
    expect(emailIdx1).toBeLessThan(dbIdx1);

    // Check in the payment failed handler
    const failedSection = webhookContent.slice(
      webhookContent.indexOf("async function handleInvoicePaymentFailed")
    );
    const emailIdx2 = failedSection.indexOf("sendAdminEmail");
    const dbIdx2 = failedSection.indexOf("createAdminNotification");
    expect(emailIdx2).toBeGreaterThan(-1);
    expect(emailIdx2).toBeLessThan(dbIdx2);
  });
});
