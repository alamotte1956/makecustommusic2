/**
 * Stripe Products & Prices Configuration
 * 
 * Two subscription tiers: Creator and Professional.
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
    description: "30 songs/month, unlimited sheet music, 192kbps MP3, commercial use for social media",
    prices: {
      monthly: 1500,   // $15/mo
      annual: 13200,   // $132/yr ($11/mo — 27% savings)
    },
    metadata: {
      plan_tier: "creator",
      monthly_credits: "30",
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "60 songs/month, unlimited sheet music, 192kbps MP3, full commercial rights",
    prices: {
      monthly: 2900,   // $29/mo
      annual: 26400,   // $264/yr ($22/mo — 24% savings)
    },
    metadata: {
      plan_tier: "professional",
      monthly_credits: "60",
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
