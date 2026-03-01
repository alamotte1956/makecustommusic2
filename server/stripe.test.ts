import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── stripeProducts.ts tests ────────────────────────────────────────────────

describe("stripeProducts", () => {
  it("should export all three subscription plans", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS).toHaveProperty("creator");
    expect(STRIPE_PLANS).toHaveProperty("professional");
    expect(STRIPE_PLANS).toHaveProperty("studio");
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

  it("creator plan should cost $8/mo", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.creator.prices.monthly).toBe(800);
  });

  it("professional plan should cost $19/mo", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.professional.prices.monthly).toBe(1900);
  });

  it("studio plan should cost $39/mo", async () => {
    const { STRIPE_PLANS } = await import("./stripeProducts");
    expect(STRIPE_PLANS.studio.prices.monthly).toBe(3900);
  });

  it("should export all three credit packs", async () => {
    const { CREDIT_PACKS } = await import("./stripeProducts");
    expect(CREDIT_PACKS).toHaveProperty("starter");
    expect(CREDIT_PACKS).toHaveProperty("creator_pack");
    expect(CREDIT_PACKS).toHaveProperty("studio_pack");
  });

  it("credit packs should have valid prices and credits", async () => {
    const { CREDIT_PACKS } = await import("./stripeProducts");
    for (const pack of Object.values(CREDIT_PACKS)) {
      expect(pack.priceInCents).toBeGreaterThan(0);
      expect(pack.credits).toBeGreaterThan(0);
      expect(pack.metadata.pack_type).toBe("credits");
      expect(parseInt(pack.metadata.credits)).toBe(pack.credits);
    }
  });

  it("starter pack should be 25 credits for $2.99", async () => {
    const { CREDIT_PACKS } = await import("./stripeProducts");
    expect(CREDIT_PACKS.starter.credits).toBe(25);
    expect(CREDIT_PACKS.starter.priceInCents).toBe(299);
  });

  it("creator pack should be 100 credits for $8.99", async () => {
    const { CREDIT_PACKS } = await import("./stripeProducts");
    expect(CREDIT_PACKS.creator_pack.credits).toBe(100);
    expect(CREDIT_PACKS.creator_pack.priceInCents).toBe(899);
  });

  it("studio pack should be 500 credits for $29.99", async () => {
    const { CREDIT_PACKS } = await import("./stripeProducts");
    expect(CREDIT_PACKS.studio_pack.credits).toBe(500);
    expect(CREDIT_PACKS.studio_pack.priceInCents).toBe(2999);
  });

  it("larger packs should have better per-credit pricing", async () => {
    const { CREDIT_PACKS } = await import("./stripeProducts");
    const starterRate = CREDIT_PACKS.starter.priceInCents / CREDIT_PACKS.starter.credits;
    const creatorRate = CREDIT_PACKS.creator_pack.priceInCents / CREDIT_PACKS.creator_pack.credits;
    const studioRate = CREDIT_PACKS.studio_pack.priceInCents / CREDIT_PACKS.studio_pack.credits;
    expect(creatorRate).toBeLessThan(starterRate);
    expect(studioRate).toBeLessThan(creatorRate);
  });

  describe("getPlanFromMetadata", () => {
    it("should return plan ID from valid metadata", async () => {
      const { getPlanFromMetadata } = await import("./stripeProducts");
      expect(getPlanFromMetadata({ plan_tier: "creator" })).toBe("creator");
      expect(getPlanFromMetadata({ plan_tier: "professional" })).toBe("professional");
      expect(getPlanFromMetadata({ plan_tier: "studio" })).toBe("studio");
    });

    it("should return null for invalid metadata", async () => {
      const { getPlanFromMetadata } = await import("./stripeProducts");
      expect(getPlanFromMetadata({ plan_tier: "invalid" })).toBeNull();
      expect(getPlanFromMetadata({})).toBeNull();
      expect(getPlanFromMetadata({ other: "value" })).toBeNull();
    });

    it("should not match free plan", async () => {
      const { getPlanFromMetadata } = await import("./stripeProducts");
      expect(getPlanFromMetadata({ plan_tier: "free" })).toBeNull();
    });
  });

  describe("getCreditPackFromMetadata", () => {
    it("should return credit pack from valid metadata", async () => {
      const { getCreditPackFromMetadata } = await import("./stripeProducts");
      const pack = getCreditPackFromMetadata({ pack_type: "credits", credits: "25" });
      expect(pack).not.toBeNull();
      expect(pack?.id).toBe("starter");
      expect(pack?.credits).toBe(25);
    });

    it("should return null for invalid metadata", async () => {
      const { getCreditPackFromMetadata } = await import("./stripeProducts");
      expect(getCreditPackFromMetadata({ pack_type: "other", credits: "10" })).toBeNull();
      expect(getCreditPackFromMetadata({})).toBeNull();
      expect(getCreditPackFromMetadata({ pack_type: "credits", credits: "999" })).toBeNull();
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

    // Creator: 250 credits
    expect(parseInt(STRIPE_PLANS.creator.metadata.monthly_credits)).toBe(PLAN_LIMITS.creator.monthlyCredits);
    // Professional: 1000 credits
    expect(parseInt(STRIPE_PLANS.professional.metadata.monthly_credits)).toBe(PLAN_LIMITS.professional.monthlyCredits);
    // Studio: 5000 credits
    expect(parseInt(STRIPE_PLANS.studio.metadata.monthly_credits)).toBe(PLAN_LIMITS.studio.monthlyCredits);
  });

  it("credit pack credits should match metadata", async () => {
    const { CREDIT_PACKS } = await import("./stripeProducts");
    for (const pack of Object.values(CREDIT_PACKS)) {
      expect(parseInt(pack.metadata.credits)).toBe(pack.credits);
    }
  });
});
