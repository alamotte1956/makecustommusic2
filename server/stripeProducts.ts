/**
 * Stripe Products & Prices Configuration
 * 
 * Two subscription tiers: Pro and Premier (matching Suno pricing).
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
    name: "Pro",
    description: "500 songs/month, commercial use rights, personas & advanced editing, stem separation, 8 min audio uploads, priority queue",
    prices: {
      monthly: 800,    // $8/mo
      annual: 7200,    // $72/yr ($6/mo — saves $24/yr)
    },
    metadata: {
      plan_tier: "creator",
      monthly_credits: "500",
    },
  },
  professional: {
    id: "professional",
    name: "Premier",
    description: "2,000 songs/month, access to Studio, all Pro features, 10,000 credits, early access to new features",
    prices: {
      monthly: 2400,   // $24/mo
      annual: 21600,   // $216/yr ($18/mo — saves $72/yr)
    },
    metadata: {
      plan_tier: "professional",
      monthly_credits: "2000",
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
