/**
 * Stripe Products & Prices Configuration
 * 
 * Two subscription tiers: Creator and Professional.
 * Competitively priced below major competitors (AIVA Pro $49/mo, Soundraw $50/mo).
 * Each new subscription includes 2 free bonus credits.
 * 
 * Price IDs will be created dynamically on first use if they don't exist,
 * or you can hardcode them after creating products in the Stripe Dashboard.
 */

export type StripePlanId = "creator" | "professional";
export type StripeBillingCycle = "monthly" | "annual";

export interface StripePlan {
  id: StripePlanId;
  name: string;
  description: string;
  prices: {
    monthly: number; // in cents
    annual: number;  // in cents (total annual)
  };
  metadata: {
    plan_tier: string;
    monthly_credits: string;
  };
}

// ─── Subscription Plans (recurring) ─────────────────────────────────────────

export const STRIPE_PLANS: Record<StripePlanId, StripePlan> = {
  creator: {
    id: "creator",
    name: "Creator",
    description: "50 songs/month, unlimited sheet music, 192kbps MP3, commercial use for social media, 2 free bonus credits",
    prices: {
      monthly: 1999,   // $19.99/mo
      annual: 19200,   // $192/yr ($16/mo — 20% savings)
    },
    metadata: {
      plan_tier: "creator",
      monthly_credits: "50",
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "100 songs/month, unlimited sheet music, 192kbps MP3, full commercial rights, stem separation, MIDI export, 2 free bonus credits",
    prices: {
      monthly: 3499,   // $34.99/mo
      annual: 33600,   // $336/yr ($28/mo — 20% savings)
    },
    metadata: {
      plan_tier: "professional",
      monthly_credits: "100",
    },
  },
};

// Helper to get plan from Stripe metadata
export function getPlanFromMetadata(metadata: Record<string, string>): StripePlanId | null {
  const tier = metadata?.plan_tier;
  if (tier && tier in STRIPE_PLANS) {
    return tier as StripePlanId;
  }
  return null;
}
