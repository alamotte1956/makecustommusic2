import express from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { upsertSubscription, getUserSubscription, refillMonthlyCredits, addBonusCredits } from "./credits";
import { getPlanFromMetadata } from "./stripeProducts";
import { getDb, getStemSeparationById, updateStemSeparationStatus, updateStemSeparationStems, getSongById } from "./db";
import { eq } from "drizzle-orm";
import { users, userSubscriptions } from "../drizzle/schema";
import type { PlanName } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { createAdminNotification } from "./adminNotificationDb";
import { sendAdminEmail } from "./emailNotification";
import { getPreferenceForType } from "./adminPreferencesDb";
import { submitStemSeparation, waitForStemSeparation, downloadAndStoreStem } from "./sunoApi";

function getStripe(): Stripe {
  const key = ENV.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

// Find user ID from Stripe customer ID
async function findUserByStripeCustomerId(stripeCustomerId: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [sub] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return sub?.userId ?? null;
}

// Find user ID from email
async function findUserByEmail(email: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user?.id ?? null;
}

export function registerStripeWebhookRoute(app: express.Express) {
  // CRITICAL: This route must be registered BEFORE express.json() middleware
  // The raw body is needed for Stripe signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"];
      const webhookSecret = ENV.STRIPE_WEBHOOK_SECRET;

      if (!sig || !webhookSecret) {
        console.error("[Stripe Webhook] Missing signature or webhook secret");
        return res.status(400).json({ error: "Missing signature or webhook secret" });
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      try {
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
            break;

          case "customer.subscription.created":
          case "customer.subscription.updated":
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
            break;

          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
            break;

          case "invoice.paid":
            await handleInvoicePaid(event.data.object as Stripe.Invoice);
            break;

          case "invoice.payment_failed":
            await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
            break;

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
      } catch (err: any) {
        console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
        res.status(500).json({ error: "Webhook handler error" });
      }
    }
  );
}

// ─── Event Handlers ────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id
    ? parseInt(session.client_reference_id, 10)
    : session.metadata?.user_id
      ? parseInt(session.metadata.user_id, 10)
      : null;

  if (!userId) {
    // Try to find user by email
    const email = session.customer_email || session.metadata?.customer_email;
    if (email) {
      const foundUserId = await findUserByEmail(email);
      if (foundUserId) {
        return processCheckout(foundUserId, session);
      }
    }
    console.error("[Stripe Webhook] checkout.session.completed: No user ID found", session.id);
    return;
  }

  await processCheckout(userId, session);
}

async function processCheckout(userId: number, session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  // Handle stem separation one-time payment
  if (session.mode === "payment" && session.metadata?.product_type === "stem_separation") {
    const stemSeparationId = session.metadata?.stem_separation_id
      ? parseInt(session.metadata.stem_separation_id, 10)
      : null;
    const songId = session.metadata?.song_id
      ? parseInt(session.metadata.song_id, 10)
      : null;

    if (stemSeparationId && songId) {
      console.log(`[Stripe Webhook] Stem separation payment completed for user ${userId}, song ${songId}, stem ${stemSeparationId}`);

      // Update payment intent ID
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

      await updateStemSeparationStems(stemSeparationId, {
        stripePaymentIntentId: paymentIntentId || undefined,
        status: "processing",
      });

      // Trigger stem separation in background (don't block webhook response)
      processStemSeparation(stemSeparationId, songId, userId).catch((err: any) => {
        console.error(`[Stem Separation] Background processing failed:`, err);
      });
    } else {
      console.error(`[Stripe Webhook] Stem separation checkout missing metadata: stemId=${stemSeparationId}, songId=${songId}`);
    }
    return;
  }

  if (session.mode === "subscription") {
    // Subscription checkout — the subscription.created/updated webhook will handle the details
    // Just link the Stripe customer ID to the user
    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

    console.log(`[Stripe Webhook] Subscription checkout completed for user ${userId}, subscription: ${subscriptionId}`);

    // The actual plan activation happens in handleSubscriptionUpdated
    // But we ensure the customer ID is linked
    if (customerId) {
      const existing = await getUserSubscription(userId);
      if (!existing || !existing.stripeCustomerId) {
        await upsertSubscription(userId, {
          plan: existing?.plan as PlanName ?? "free",
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId ?? undefined,
        });
      }
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  let userId = await findUserByStripeCustomerId(customerId);

  // If not found by customer ID, try metadata
  if (!userId && subscription.metadata?.user_id) {
    userId = parseInt(subscription.metadata.user_id, 10);
  }

  if (!userId) {
    console.error(`[Stripe Webhook] subscription.updated: No user found for customer ${customerId}`);
    return;
  }

  // Get plan tier from the subscription's product metadata
  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  const productMetadata = (item?.price?.product as Stripe.Product)?.metadata ?? {};
  let planTier = getPlanFromMetadata(productMetadata) ?? getPlanFromMetadata(subscription.metadata ?? {});

  // Fallback: if no metadata, infer plan from price amount
  if (!planTier && item?.price?.unit_amount) {
    const amount = item.price.unit_amount;
    const interval = item.price.recurring?.interval;
    // Match against known plan prices (monthly and annual)
    if (interval === "month") {
      if (amount >= 2500) planTier = "professional";
      else if (amount >= 1000) planTier = "creator";
    } else if (interval === "year") {
      if (amount >= 20000) planTier = "professional";
      else if (amount >= 10000) planTier = "creator";
    }
    if (planTier) {
      console.log(`[Stripe Webhook] Inferred plan tier '${planTier}' from price amount ${amount} (${interval})`);
    }
  }

  // Fallback: if still no plan tier, try to infer from product name
  if (!planTier) {
    const productName = ((item?.price?.product as Stripe.Product)?.name ?? "").toLowerCase();
    if (productName.includes("professional") || productName.includes("pro")) planTier = "professional";
    else if (productName.includes("creator")) planTier = "creator";
    if (planTier) {
      console.log(`[Stripe Webhook] Inferred plan tier '${planTier}' from product name '${productName}'`);
    }
  }

  if (!planTier) {
    console.error(`[Stripe Webhook] subscription.updated: No plan tier found for subscription ${subscription.id}. Price: ${priceId}, Amount: ${item?.price?.unit_amount}`);
    return;
  }

  // Map Stripe subscription status to our status
  const statusMap: Record<string, "active" | "canceled" | "past_due" | "trialing" | "incomplete"> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    incomplete: "incomplete",
    trialing: "trialing",
    incomplete_expired: "canceled",
    unpaid: "past_due",
    paused: "canceled",
  };

  const status = statusMap[subscription.status] ?? "active";
  const billingCycle = item?.price?.recurring?.interval === "year" ? "annual" as const : "monthly" as const;

  await upsertSubscription(userId, {
    plan: planTier,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status,
    billingCycle,
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
  });

  console.log(`[Stripe Webhook] Updated subscription for user ${userId}: plan=${planTier}, status=${status}`);

  // Award 2 free bonus credits for new active subscriptions
  if (status === "active") {
    try {
      // Check if this is a new subscription (not a renewal) by checking if user had no prior active subscription
      const existingSub = await getUserSubscription(userId);
      const isNewSubscription = !existingSub || existingSub.status !== "active" || existingSub.stripeSubscriptionId !== subscription.id;
      if (isNewSubscription) {
        await addBonusCredits(userId, 2, "Welcome bonus: 2 free credits with new subscription");
        console.log(`[Stripe Webhook] Awarded 2 free bonus credits to user ${userId} for new ${planTier} subscription`);
      }
    } catch (err) {
      console.warn("[Stripe Webhook] Failed to award bonus credits:", err);
    }

    // Notify owner about new/updated subscriptions
    try {
      const db = await getDb();
      let userName = "Unknown";
      let userEmail = "Unknown";
      if (db) {
        const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (u) {
          userName = u.name ?? "Unknown";
          userEmail = u.email ?? "Unknown";
        }
      }
      const billingLabel = billingCycle === "annual" ? "yearly" : "monthly";
      const notifTitle = `New Subscription: ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} Plan`;
      const notifContent = `A user has subscribed to the ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} plan.\n\nUser: ${userName}\nEmail: ${userEmail}\nBilling: ${billingLabel}\nSubscription ID: ${subscription.id}`;
      const subNewPref = await getPreferenceForType("subscription_new");
      if (subNewPref.pushEnabled) {
        await notifyOwner({ title: notifTitle, content: notifContent });
      }
      if (subNewPref.emailEnabled) {
        await sendAdminEmail({ subject: notifTitle, body: notifContent, type: "subscription_new" });
      }
      if (subNewPref.inAppEnabled) {
        await createAdminNotification({
          type: "subscription_new",
          title: notifTitle,
          content: notifContent,
          relatedUserId: userId,
          metadata: { planTier, billingCycle: billingLabel, subscriptionId: subscription.id },
        });
      }
    } catch (err) {
      console.warn("[Stripe Webhook] Failed to send subscription notification:", err);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;

  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) {
    console.error(`[Stripe Webhook] subscription.deleted: No user found for customer ${customerId}`);
    return;
  }

  // Get the user's current plan before downgrading
  const existingSub = await getUserSubscription(userId);
  const previousPlan = existingSub?.plan ?? "unknown";

  // Downgrade to free plan
  await upsertSubscription(userId, {
    plan: "free",
    status: "canceled",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });

  console.log(`[Stripe Webhook] Subscription canceled for user ${userId}, downgraded to free`);

  // Notify owner about subscription cancellation
  try {
    const db = await getDb();
    let userName = "Unknown";
    let userEmail = "Unknown";
    if (db) {
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (u) {
        userName = u.name ?? "Unknown";
        userEmail = u.email ?? "Unknown";
      }
    }
    const cancelReason = (subscription as any).cancellation_details?.reason ?? "not provided";
    const cancelFeedback = (subscription as any).cancellation_details?.feedback ?? "none";
    const notifTitle = `Subscription Canceled: ${previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1)} Plan`;
    const notifContent = `A user has canceled their subscription.\n\nUser: ${userName}\nEmail: ${userEmail}\nPrevious Plan: ${previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1)}\nCancellation Reason: ${cancelReason}\nFeedback: ${cancelFeedback}\nSubscription ID: ${subscription.id}`;
    const cancelPref = await getPreferenceForType("subscription_canceled");
    if (cancelPref.pushEnabled) {
      await notifyOwner({ title: notifTitle, content: notifContent });
    }
    if (cancelPref.emailEnabled) {
      await sendAdminEmail({ subject: notifTitle, body: notifContent, type: "subscription_canceled" });
    }
    if (cancelPref.inAppEnabled) {
      await createAdminNotification({
        type: "subscription_canceled",
        title: notifTitle,
        content: notifContent,
        relatedUserId: userId,
        metadata: { previousPlan, cancelReason, cancelFeedback, subscriptionId: subscription.id },
      });
    }
  } catch (err) {
    console.warn("[Stripe Webhook] Failed to send cancellation notification:", err);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) {
    console.log(`[Stripe Webhook] invoice.paid: No user found for customer ${customerId}`);
    return;
  }

  // If this is a subscription renewal invoice, refill monthly credits
  if ((invoice as any).subscription) {
    await refillMonthlyCredits(userId);
    console.log(`[Stripe Webhook] Refilled monthly credits for user ${userId} (invoice paid)`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) return;

  // Update subscription status to past_due
  const existing = await getUserSubscription(userId);
  if (existing) {
    await upsertSubscription(userId, {
      plan: existing.plan as PlanName,
      status: "past_due",
      stripeCustomerId: customerId,
    });
    console.log(`[Stripe Webhook] Payment failed for user ${userId}, status set to past_due`);
  }

  // Notify owner about failed payment
  try {
    const db = await getDb();
    let userName = "Unknown";
    let userEmail = "Unknown";
    if (db) {
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (u) {
        userName = u.name ?? "Unknown";
        userEmail = u.email ?? "Unknown";
      }
    }
    const amountDue = (invoice as any).amount_due
      ? `$${((invoice as any).amount_due / 100).toFixed(2)}`
      : "Unknown";
    const notifTitle = "Payment Failed";
    const notifContent = `A payment has failed for a subscriber.\n\nUser: ${userName}\nEmail: ${userEmail}\nAmount Due: ${amountDue}\nInvoice ID: ${invoice.id}\n\nThe user's subscription status has been set to past_due. They may need to update their payment method.`;
    const failPref = await getPreferenceForType("payment_failed");
    if (failPref.pushEnabled) {
      await notifyOwner({ title: notifTitle, content: notifContent });
    }
    if (failPref.emailEnabled) {
      await sendAdminEmail({ subject: notifTitle, body: notifContent, type: "payment_failed" });
    }
    if (failPref.inAppEnabled) {
      await createAdminNotification({
        type: "payment_failed",
        title: notifTitle,
        content: notifContent,
        relatedUserId: userId,
        metadata: { amountDue, invoiceId: invoice.id, customerId },
      });
    }
  } catch (err) {
    console.warn("[Stripe Webhook] Failed to send payment failure notification:", err);
  }
}


// ─── Stem Separation Background Processing ──────────────────────────────────

async function processStemSeparation(stemSeparationId: number, songId: number, userId: number) {
  try {
    console.log(`[Stem Separation] Starting processing for stem ${stemSeparationId}, song ${songId}`);

    // Get the song to find its Suno task/audio IDs
    const song = await getSongById(songId);
    if (!song) {
      throw new Error(`Song ${songId} not found`);
    }

    // We need the Suno task ID and audio ID to submit stem separation
    const sunoTaskId = song.sunoTaskId;
    const sunoAudioId = song.sunoAudioId;

    if (!sunoTaskId || !sunoAudioId) {
      throw new Error(`Song ${songId} does not have Suno task/audio IDs. Stem separation requires songs generated via Suno.`);
    }

    // Submit stem separation to Suno API (split_stem gives all stems)
    const separationTaskId = await submitStemSeparation(sunoTaskId, sunoAudioId, "split_stem");
    console.log(`[Stem Separation] Submitted to Suno, separation task: ${separationTaskId}`);

    await updateStemSeparationStems(stemSeparationId, {
      sunoSeparationTaskId: separationTaskId,
    });

    // Wait for completion (up to 10 minutes)
    const result = await waitForStemSeparation(separationTaskId);
    console.log(`[Stem Separation] Suno completed for stem ${stemSeparationId}`);

    // Download each available stem and store in S3
    const stemUrls: Record<string, string | null> = {};
    const stemTypes = [
      { key: "vocalUrl", url: result.vocalUrl, type: "vocals" },
      { key: "instrumentalUrl", url: result.instrumentalUrl, type: "instrumental" },
      { key: "backingVocalsUrl", url: result.backingVocalsUrl, type: "backing-vocals" },
      { key: "drumsUrl", url: result.drumsUrl, type: "drums" },
      { key: "bassUrl", url: result.bassUrl, type: "bass" },
      { key: "guitarUrl", url: result.guitarUrl, type: "guitar" },
      { key: "keyboardUrl", url: result.keyboardUrl, type: "keyboard" },
      { key: "percussionUrl", url: result.percussionUrl, type: "percussion" },
      { key: "stringsUrl", url: result.stringsUrl, type: "strings" },
      { key: "synthUrl", url: result.synthUrl, type: "synth" },
      { key: "fxUrl", url: result.fxUrl, type: "fx" },
      { key: "brassUrl", url: result.brassUrl, type: "brass" },
      { key: "woodwindsUrl", url: result.woodwindsUrl, type: "woodwinds" },
    ];

    for (const stem of stemTypes) {
      if (stem.url) {
        try {
          const stored = await downloadAndStoreStem(stem.url, userId, stem.type);
          stemUrls[stem.key] = stored.url;
          console.log(`[Stem Separation] Stored ${stem.type} stem for song ${songId}`);
        } catch (err: any) {
          console.warn(`[Stem Separation] Failed to download ${stem.type} stem:`, err.message);
          stemUrls[stem.key] = null;
        }
      } else {
        stemUrls[stem.key] = null;
      }
    }

    // Update the stem separation record with all URLs
    await updateStemSeparationStems(stemSeparationId, {
      ...stemUrls,
      status: "completed",
      completedAt: new Date(),
    });

    console.log(`[Stem Separation] Completed for stem ${stemSeparationId}, song ${songId}`);

    // Notify the owner
    try {
      await notifyOwner({
        title: "Stem Separation Completed",
        content: `Stem separation for song ID ${songId} has been completed successfully.`,
      });
    } catch {
      // Non-critical
    }
  } catch (err: any) {
    console.error(`[Stem Separation] Failed for stem ${stemSeparationId}:`, err.message);

    // Mark as failed
    try {
      await updateStemSeparationStatus(stemSeparationId, "failed");
    } catch {
      // Non-critical
    }
  }
}
