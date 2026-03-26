import { Resend } from "resend";
import { ENV } from "./_core/env";

const ADMIN_EMAIL = "support@createchristianmusic.com";
const FROM_EMAIL = "Create Christian Music <notifications@createchristianmusic.com>";

function getResend(): Resend | null {
  if (!ENV.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY is not configured, email notifications disabled");
    return null;
  }
  return new Resend(ENV.RESEND_API_KEY);
}

export type EmailNotificationPayload = {
  subject: string;
  body: string;
  type: "payment_failed" | "subscription_canceled" | "subscription_new" | "low_credits";
};

/**
 * Send a critical admin notification email via Resend.
 * Returns true if sent successfully, false otherwise.
 * Never throws — failures are logged and swallowed to avoid breaking webhook processing.
 */
export async function sendAdminEmail(payload: EmailNotificationPayload): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const typeLabels: Record<string, string> = {
    payment_failed: "🚨 Payment Failed",
    subscription_canceled: "📉 Subscription Canceled",
    subscription_new: "🎉 New Subscription",
    low_credits: "⚠️ Low API Credits",
  };

  const badge = typeLabels[payload.type] ?? payload.type;

  // Build a clean HTML email
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${payload.type === "payment_failed" ? "#fef2f2" : payload.type === "subscription_canceled" ? "#fffbeb" : payload.type === "low_credits" ? "#fefce8" : "#f0fdf4"}; border-left: 4px solid ${payload.type === "payment_failed" ? "#ef4444" : payload.type === "subscription_canceled" ? "#f59e0b" : payload.type === "low_credits" ? "#eab308" : "#22c55e"}; padding: 16px; border-radius: 4px; margin-bottom: 20px;">
        <strong style="font-size: 16px; color: ${payload.type === "payment_failed" ? "#dc2626" : payload.type === "subscription_canceled" ? "#d97706" : payload.type === "low_credits" ? "#ca8a04" : "#16a34a"};">${badge}</strong>
      </div>
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; line-height: 1.6; color: #374151;">${escapeHtml(payload.body)}</pre>
      </div>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
        <p>This is an automated notification from Create Christian Music.</p>
        <p>View your <a href="https://createchristianmusic.com/admin" style="color: #6366f1;">Admin Dashboard</a> for more details.</p>
      </div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `[CreateChristianMusic] ${payload.subject}`,
      html,
    });

    if (error) {
      console.warn("[Email] Failed to send admin notification email:", error);
      return false;
    }

    console.log(`[Email] Admin notification sent: ${payload.subject}`);
    return true;
  } catch (err) {
    console.warn("[Email] Error sending admin notification email:", err);
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
