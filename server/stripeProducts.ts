/**
 * Stripe Products & Prices Configuration
 * 
 * Defines all subscription plans and one-time credit packs.
 * Price IDs will be created dynamically on first use if they don't exist,
 * or you can hardcode them after creating products in the Stripe Dashboard.
 */

export type StripePlanId = "creator" | "professional" | "studio";
export type StripeBillingCycle = "monthly" | "annual";
export type CreditPackId = "starter" | "creator_pack" | "studio_pack";

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

export interface CreditPack {
  id: CreditPackId;
  name: string;
  description: string;
  priceInCents: number;
  credits: number;
  metadata: {
    pack_type: string;
    credits: string;
  };
}

// Subscription plans (recurring)
export const STRIPE_PLANS: Record<StripePlanId, StripePlan> = {
  creator: {
    id: "creator",
    name: "Creator Plan",
    description: "100 songs/month, studio mastering, commercial use for social media",
    prices: {
      monthly: 900,  // $9/mo
      annual: 8400,   // $84/yr ($7/mo)
    },
    metadata: {
      plan_tier: "creator",
      monthly_credits: "100",
    },
  },
  professional: {
    id: "professional",
    name: "Professional Plan",
    description: "500 songs/month, full studio suite, full commercial rights",
    prices: {
      monthly: 2200,  // $22/mo
      annual: 21600,   // $216/yr ($18/mo)
    },
    metadata: {
      plan_tier: "professional",
      monthly_credits: "500",
    },
  },
  studio: {
    id: "studio",
    name: "Studio Plan",
    description: "2,000 songs/month, unlimited everything, sync licensing, API access",
    prices: {
      monthly: 4900,  // $49/mo
      annual: 46800,   // $468/yr (~$39/mo)
    },
    metadata: {
      plan_tier: "studio",
      monthly_credits: "2000",
    },
  },
};

// One-time credit packs
export const CREDIT_PACKS: Record<CreditPackId, CreditPack> = {
  starter: {
    id: "starter",
    name: "Starter Pack",
    description: "10 additional song credits",
    priceInCents: 200, // $2
    credits: 10,
    metadata: {
      pack_type: "credits",
      credits: "10",
    },
  },
  creator_pack: {
    id: "creator_pack",
    name: "Creator Pack",
    description: "50 additional song credits",
    priceInCents: 800, // $8
    credits: 50,
    metadata: {
      pack_type: "credits",
      credits: "50",
    },
  },
  studio_pack: {
    id: "studio_pack",
    name: "Studio Pack",
    description: "200 additional song credits",
    priceInCents: 2500, // $25
    credits: 200,
    metadata: {
      pack_type: "credits",
      credits: "200",
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

// Helper to get credit pack from metadata
export function getCreditPackFromMetadata(metadata: Record<string, string>): CreditPack | null {
  const packType = metadata?.pack_type;
  const credits = metadata?.credits;
  if (packType === "credits" && credits) {
    const pack = Object.values(CREDIT_PACKS).find(p => p.metadata.credits === credits);
    return pack ?? null;
  }
  return null;
}
