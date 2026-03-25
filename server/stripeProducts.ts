/**
 * Stripe Products & Prices Configuration
 * 
 * Two subscription tiers: Creator and Professional.
 * Pricing aligned with premium competitors (AIVA Pro $49/mo, Soundraw $50/mo).
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
    description: "50 songs/month, unlimited sheet music, 192kbps MP3, commercial use for social media",
    prices: {
      monthly: 2999,   // $29.99/mo
      annual: 28800,   // $288/yr ($24/mo — 20% savings)
    },
    metadata: {
      plan_tier: "creator",
      monthly_credits: "50",
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "100 songs/month, unlimited sheet music, 192kbps MP3, full commercial rights, stem separation, MIDI export",
    prices: {
      monthly: 4999,   // $49.99/mo
      annual: 47900,   // $479/yr ($39.92/mo — 20% savings)
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
