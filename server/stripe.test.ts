import { describe, it, expect, vi } from "vitest";

// ─── stripeProducts.ts tests ────────────────────────────────────────────────

describe("stripeProducts", () => {
  it("should export two subscription plans (creator and professional)", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS).toHaveProperty("creator");
    expect(STRIPE_PLANS).toHaveProperty("professional");
    expect(Object.keys(STRIPE_PLANS)).toHaveLength(2);
  });

  it("should not have free or studio plans", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS).not.toHaveProperty("free");
    expect(STRIPE_PLANS).not.toHaveProperty("studio");
  });

  it("each plan should have valid prices", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    for (const plan of Object.values(STRIPE_PLANS)) {
      expect(plan.prices.monthly).toBeGreaterThan(0);
      expect(plan.prices.annual).toBeGreaterThan(0);
      // Annual should be cheaper per month than monthly
      expect(plan.prices.annual / 12).toBeLessThan(plan.prices.monthly);
    }
  });

  it("each plan should have metadata with plan_tier and monthly_credits", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
      expect(plan.metadata.plan_tier).toBe(key);
      expect(parseInt(plan.metadata.monthly_credits)).toBeGreaterThan(0);
    }
  });

  it("creator (Pro) plan base price should be $22.11/mo (tax-inclusive total $24)", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.creator.prices.monthly).toBe(2211);
    expect(STRIPE_PLANS.creator.totals.monthly).toBe(2400);
  });

  it("professional (Premier) plan base price should be $45.15/mo (tax-inclusive total $49)", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.professional.prices.monthly).toBe(4515);
    expect(STRIPE_PLANS.professional.totals.monthly).toBe(4900);
  });

  it("annual prices should be even dollar totals", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.creator.totals.annual).toBe(23000);     // $230
    expect(STRIPE_PLANS.professional.totals.annual).toBe(47000); // $470
  });

  it("tax rate should be 8.53% (MN Hennepin County)", async () => {
    const { TAX_RATE, TAX_JURISDICTION } = await import("./stripeProducts");
    expect(TAX_RATE).toBe(0.0853);
    expect(TAX_JURISDICTION).toBe("MN Hennepin County");
  });

  it("stem separation should cost $5 total (tax-inclusive)", async () => {
    const { STEM_SEPARATION_PRODUCT } = await import("./stripeProducts");
    expect(STEM_SEPARATION_PRODUCT.totalPrice).toBe(500);
    expect(STEM_SEPARATION_PRODUCT.basePrice).toBe(461);
  });

  describe("getPlanFromMetadata", () => {
    it("should return plan ID from valid metadata", async () => {
      const { getPlanFromMetadata } = await import("./stripeProducts");
      expect(getPlanFromMetadata({ plan_tier: "creator" })).toBe("creator");
      expect(getPlanFromMetadata({ plan_tier: "professional" })).toBe("professional");
    });

    it("should return null for invalid metadata", async () => {
      const { getPlanFromMetadata } = await import("./stripeProducts");
      expect(getPlanFromMetadata({ plan_tier: "invalid" })).toBeNull();
      expect(getPlanFromMetadata({})).toBeNull();
      expect(getPlanFromMetadata({ other: "value" })).toBeNull();
    });

    it("should not match free or studio plan", async () => {
      const { getPlanFromMetadata } = await import("./stripeProducts");
      expect(getPlanFromMetadata({ plan_tier: "free" })).toBeNull();
      expect(getPlanFromMetadata({ plan_tier: "studio" })).toBeNull();
    });
  });
});

// ─── Stripe webhook handler tests (unit tests with mocks) ──────────────────

describe("stripeWebhook", () => {
  it("should export registerStripeWebhookRoute function", async () => {
    const { registerStripeWebhookRoute } = await import("./stripeWebhook");
    expect(typeof registerStripeWebhookRoute).toBe("function");
  });

  it("registerStripeWebhookRoute should register a POST route on /api/stripe/webhook", async () => {
    const { registerStripeWebhookRoute } = await import("./stripeWebhook");
    const mockPost = vi.fn();
    const mockApp = { post: mockPost } as any;
    registerStripeWebhookRoute(mockApp);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost.mock.calls[0][0]).toBe("/api/stripe/webhook");
  });
});

// ─── ENV configuration tests ────────────────────────────────────────────────

describe("ENV Stripe configuration", () => {
  it("should include STRIPE_SECRET_KEY in ENV", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV).toHaveProperty("STRIPE_SECRET_KEY");
  });

  it("should include STRIPE_WEBHOOK_SECRET in ENV", async () => {
    const { ENV } = await import("./_core/env");
    expect(ENV).toHaveProperty("STRIPE_WEBHOOK_SECRET");
  });
});

// ─── Integration with credits system ────────────────────────────────────────

describe("Stripe-credits integration", () => {
  it("plan prices should align with PLAN_LIMITS monthly credits", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    const { PLAN_LIMITS } = await import("../drizzle/schema");

    // Pro: 20 credits
    expect(parseInt(STRIPE_PLANS.creator.metadata.monthly_credits)).toBe(PLAN_LIMITS.creator.monthlyCredits);
    // Premier: 50 credits
    expect(parseInt(STRIPE_PLANS.professional.metadata.monthly_credits)).toBe(PLAN_LIMITS.professional.monthlyCredits);
  });
});
