/**
 * Credit Monitor
 * Periodically checks musicapi.ai API credit balance and sends
 * notifications (email + in-app) when credits fall below threshold.
 */

import { getCredits, isSunoAvailable } from "./sunoApi";
import { sendAdminEmail } from "./emailNotification";
import { notifyOwner } from "./_core/notification";

const LOW_CREDIT_THRESHOLD = 10;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

// Track whether we've already sent a notification for the current low-credit state
// to avoid spamming. Resets when credits go back above threshold.
let lowCreditAlertSent = false;
let lastCheckedCredits: number | null = null;
let lastCheckTime: number | null = null;
let monitorInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Check the current API credit balance and send alerts if below threshold.
 * Returns the current credit count or null if check failed.
 */
export async function checkAndAlertCredits(): Promise<number | null> {
  if (!isSunoAvailable()) {
    console.log("[CreditMonitor] Music API key not configured, skipping credit check");
    return null;
  }

  try {
    const credits = await getCredits();
    lastCheckedCredits = credits;
    lastCheckTime = Date.now();

    console.log(`[CreditMonitor] Current API credits: ${credits}`);

    if (credits < LOW_CREDIT_THRESHOLD && !lowCreditAlertSent) {
      // Credits are low — send notifications
      console.warn(`[CreditMonitor] LOW CREDITS ALERT: ${credits} credits remaining (threshold: ${LOW_CREDIT_THRESHOLD})`);

      const subject = `Low API Credits: ${credits} remaining`;
      const body = [
        `Your MusicAPI.ai credit balance has dropped below ${LOW_CREDIT_THRESHOLD}.`,
        ``,
        `Current balance: ${credits} credits`,
        `Threshold: ${LOW_CREDIT_THRESHOLD} credits`,
        ``,
        `Each music generation uses credits. When credits reach 0, music generation will fail.`,
        ``,
        `To add more credits:`,
        `1. Log in to your musicapi.ai dashboard`,
        `2. Navigate to the billing/credits section`,
        `3. Purchase additional credits`,
        ``,
        `Checked at: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
      ].join("\n");

      // Send email notification
      const emailSent = await sendAdminEmail({
        subject,
        body,
        type: "low_credits",
      });

      // Send in-app notification
      let notifSent = false;
      try {
        notifSent = await notifyOwner({
          title: `⚠️ Low API Credits: ${credits} remaining`,
          content: `Your MusicAPI.ai balance is ${credits} credits (threshold: ${LOW_CREDIT_THRESHOLD}). Music generation may fail soon. Please add more credits at musicapi.ai.`,
        });
      } catch (err) {
        console.warn("[CreditMonitor] Failed to send in-app notification:", err);
      }

      lowCreditAlertSent = true;
      console.log(`[CreditMonitor] Alert sent — email: ${emailSent}, in-app: ${notifSent}`);
    } else if (credits >= LOW_CREDIT_THRESHOLD && lowCreditAlertSent) {
      // Credits are back above threshold — reset alert flag
      lowCreditAlertSent = false;
      console.log(`[CreditMonitor] Credits restored to ${credits}, alert flag reset`);
    }

    return credits;
  } catch (err) {
    console.error("[CreditMonitor] Failed to check credits:", err);
    return null;
  }
}

/**
 * Start the periodic credit monitoring.
 * Runs an immediate check, then checks every hour.
 */
export function startCreditMonitor(): void {
  if (monitorInterval) {
    console.log("[CreditMonitor] Monitor already running");
    return;
  }

  console.log(`[CreditMonitor] Starting credit monitor (threshold: ${LOW_CREDIT_THRESHOLD}, interval: ${CHECK_INTERVAL_MS / 60000}min)`);

  // Run first check after a short delay (let server fully start)
  setTimeout(() => {
    checkAndAlertCredits();
  }, 10000);

  // Then check periodically
  monitorInterval = setInterval(() => {
    checkAndAlertCredits();
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the periodic credit monitoring.
 */
export function stopCreditMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log("[CreditMonitor] Monitor stopped");
  }
}

/**
 * Get the current monitor status for admin dashboard display.
 */
export function getCreditMonitorStatus(): {
  lastCredits: number | null;
  lastCheckTime: number | null;
  threshold: number;
  alertSent: boolean;
  isRunning: boolean;
} {
  return {
    lastCredits: lastCheckedCredits,
    lastCheckTime: lastCheckTime,
    threshold: LOW_CREDIT_THRESHOLD,
    alertSent: lowCreditAlertSent,
    isRunning: monitorInterval !== null,
  };
}
