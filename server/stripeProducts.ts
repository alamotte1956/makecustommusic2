/**
 * Stripe Products & Prices Configuration
 * 
 * Competitively priced against Suno ($10/$30), Udio ($10/$30),
 * Soundraw ($20), and other AI music generators.
 * 
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

// ─── Subscription Plans (recurring) ─────────────────────────────────────────
//
// Competitive positioning:
//   Suno Pro = $10/mo (2,500 credits), Premier = $30/mo
//   Udio Standard = $10/mo (1,200 credits), Pro = $30/mo
//   Soundraw Creator = $20/mo
//
// Our edge: lower entry price, generous credits, annual savings up to 25%

export const STRIPE_PLANS: Record<StripePlanId, StripePlan> = {
  creator: {
    id: "creator",
    name: "Creator",
    description: "250 songs/month, studio mastering, commercial use for social media",
    prices: {
      monthly: 800,    // $8/mo
      annual: 7200,    // $72/yr ($6/mo — 25% savings)
    },
    metadata: {
      plan_tier: "creator",
      monthly_credits: "250",
    },
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "1,000 songs/month, full studio suite, full commercial rights, stems",
    prices: {
      monthly: 1900,   // $19/mo
      annual: 18000,   // $180/yr ($15/mo — 21% savings)
    },
    metadata: {
      plan_tier: "professional",
      monthly_credits: "1000",
    },
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "5,000 songs/month, unlimited features, sync licensing, API access, priority",
    prices: {
      monthly: 3900,   // $39/mo
      annual: 34800,   // $348/yr ($29/mo — 26% savings)
    },
    metadata: {
      plan_tier: "studio",
      monthly_credits: "5000",
    },
  },
};

// ─── One-Time Credit Packs ──────────────────────────────────────────────────
//
// Priced to give better per-song value at higher tiers.
// Starter: $0.12/song, Creator: $0.09/song, Studio: $0.06/song

export const CREDIT_PACKS: Record<CreditPackId, CreditPack> = {
  starter: {
    id: "starter",
    name: "Starter Pack",
    description: "25 additional song credits",
    priceInCents: 299,  // $2.99
    credits: 25,
    metadata: {
      pack_type: "credits",
      credits: "25",
    },
  },
  creator_pack: {
    id: "creator_pack",
    name: "Creator Pack",
    description: "100 additional song credits",
    priceInCents: 899,  // $8.99
    credits: 100,
    metadata: {
      pack_type: "credits",
      credits: "100",
    },
  },
  studio_pack: {
    id: "studio_pack",
    name: "Studio Pack",
    description: "500 additional song credits",
    priceInCents: 2999, // $29.99
    credits: 500,
    metadata: {
      pack_type: "credits",
      credits: "500",
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
