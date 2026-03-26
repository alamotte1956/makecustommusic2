/**
 * Stripe Products & Prices Configuration
 * 
 * All prices are tax-inclusive: the displayed total includes
 * MN Hennepin County sales tax (8.53%). Base prices are calculated
 * so that base + 8.53% tax = a clean, even dollar total.
 * 
 * Price IDs will be created dynamically on first use if they don't exist,
 * or you can hardcode them after creating products in the Stripe Dashboard.
 */

// ─── Tax Configuration ────────────────────────────────────────────────────────
export const TAX_RATE = 0.0853; // MN Hennepin County sales tax
export const TAX_JURISDICTION = "MN Hennepin County";

/**
 * Calculate base price in cents from a tax-inclusive total.
 * base = total / (1 + taxRate)
 */
export function getBasePriceCents(totalCents: number): number {
  return Math.round(totalCents / (1 + TAX_RATE));
}

/**
 * Calculate tax amount in cents from a tax-inclusive total.
 */
export function getTaxCents(totalCents: number): number {
  return totalCents - getBasePriceCents(totalCents);
}

/**
 * Format a price breakdown string for display.
 */
export function formatPriceBreakdown(totalCents: number): {
  total: string;
  base: string;
  tax: string;
  taxRate: string;
} {
  const baseCents = getBasePriceCents(totalCents);
  const taxCents = totalCents - baseCents;
  return {
    total: `$${(totalCents / 100).toFixed(2)}`,
    base: `$${(baseCents / 100).toFixed(2)}`,
    tax: `$${(taxCents / 100).toFixed(2)}`,
    taxRate: `${(TAX_RATE * 100).toFixed(2)}%`,
  };
}

// ─── Subscription Plans ───────────────────────────────────────────────────────

export type StripePlanId = "creator" | "professional";
export type StripeBillingCycle = "monthly" | "annual";

export interface StripePlan {
  id: StripePlanId;
  name: string;
  description: string;
  prices: {
    monthly: number; // in cents (BASE price, before tax)
    annual: number;  // in cents (BASE price, total annual, before tax)
  };
  /** Tax-inclusive totals that customers see */
  totals: {
    monthly: number; // in cents
    annual: number;  // in cents
  };
  metadata: {
    plan_tier: string;
    monthly_credits: string;
  };
}

export const STRIPE_PLANS: Record<StripePlanId, StripePlan> = {
  creator: {
    id: "creator",
    name: "Pro",
    description: "200 songs or sheet music PDFs/month, commercial use rights, stem separation",
    prices: {
      monthly: 1751,   // $17.51 base → $19.00 with 8.53% tax
      annual: 16770,   // $167.70 base → $182.00 with 8.53% tax
    },
    totals: {
      monthly: 1900,   // $19/mo (tax-inclusive, even dollar)
      annual: 18200,   // $182/yr (tax-inclusive, even dollar, ~$15/mo effective)
    },
    metadata: {
      plan_tier: "creator",
      monthly_credits: "200",
    },
  },
  professional: {
    id: "professional",
    name: "Premier",
    description: "450 songs or sheet music PDFs/month, all Pro features, early access to new features",
    prices: {
      monthly: 3593,   // $35.93 base → $39.00 with 8.53% tax
      annual: 34461,   // $344.61 base → $374.00 with 8.53% tax
    },
    totals: {
      monthly: 3900,   // $39/mo (tax-inclusive, even dollar)
      annual: 37400,   // $374/yr (tax-inclusive, even dollar, ~$31/mo effective)
    },
    metadata: {
      plan_tier: "professional",
      monthly_credits: "450",
    },
  },
};

// ─── One-Time Products ────────────────────────────────────────────────────────

export interface StripeOneTimeProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;   // in cents (before tax)
  totalPrice: number;  // in cents (tax-inclusive, what customer pays)
  metadata: Record<string, string>;
}

export const STEM_SEPARATION_PRODUCT: StripeOneTimeProduct = {
  id: "stem_separation",
  name: "Stem Separation",
  description: "Separate your song into individual stems: vocals, drums, bass, guitar, keyboard, strings, brass, woodwinds, percussion, synth, and more",
  basePrice: 461,    // $4.61 base
  totalPrice: 500,   // $5.00 total (tax-inclusive, even dollar)
  metadata: {
    product_type: "stem_separation",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getPlanFromMetadata(metadata: Record<string, string>): StripePlanId | null {
  const tier = metadata?.plan_tier;
  if (tier && tier in STRIPE_PLANS) {
    return tier as StripePlanId;
  }
  return null;
}
