import { describe, it, expect, vi } from "vitest";

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

    // Creator: 125 credits
    expect(parseInt(STRIPE_PLANS.creator.metadata.monthly_credits)).toBe(PLAN_LIMITS.creator.monthlyCredits);
    // Professional: 500 credits
    expect(parseInt(STRIPE_PLANS.professional.metadata.monthly_credits)).toBe(PLAN_LIMITS.professional.monthlyCredits);
    // Studio: 2500 credits
    expect(parseInt(STRIPE_PLANS.studio.metadata.monthly_credits)).toBe(PLAN_LIMITS.studio.monthlyCredits);
  });
});
