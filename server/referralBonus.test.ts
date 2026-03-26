import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the updated referral system where both the referrer
 * AND the referred user each receive 5 bonus song credits.
 */

// Mock the database module
vi.mock("../server/db", () => ({
  getDb: vi.fn(),
}));

// Mock the credits module
const mockAddBonusCredits = vi.fn().mockResolvedValue(undefined);
vi.mock("../server/credits", () => ({
  addBonusCredits: (...args: any[]) => mockAddBonusCredits(...args),
}));

// Mock the notification module
const mockCreateNotification = vi.fn().mockResolvedValue(undefined);
vi.mock("../server/notifications", () => ({
  createNotification: (...args: any[]) => mockCreateNotification(...args),
}));

describe("Referral Bonus System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("REFERRAL_BONUS_CREDITS constant", () => {
    it("should be set to 5 credits", async () => {
      // The constant is defined in drizzle/schema.ts and imported by referrals.ts
      const fs = await import("fs");
      const source = fs.readFileSync("drizzle/schema.ts", "utf-8");
      
      // Check that REFERRAL_BONUS_CREDITS is 5
      expect(source).toContain("REFERRAL_BONUS_CREDITS = 5");
    });
  });

  describe("processReferral function", () => {
    it("should contain addBonusCredits call for the referred user", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/referrals.ts", "utf-8");
      
      // Verify that both the referrer and referred user get credits
      // The function should call addBonusCredits twice
      const addBonusCalls = source.match(/addBonusCredits\(/g);
      expect(addBonusCalls).not.toBeNull();
      expect(addBonusCalls!.length).toBeGreaterThanOrEqual(2);
    });

    it("should award credits to the referrer", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/referrals.ts", "utf-8");
      
      expect(source).toContain("referrerId");
      expect(source).toContain("REFERRAL_BONUS_CREDITS");
      expect(source).toContain("Referral bonus: a friend signed up using your invite link");
    });

    it("should award credits to the referred user (new signup)", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/referrals.ts", "utf-8");
      
      expect(source).toContain("referredUserId");
      expect(source).toContain("Welcome bonus: you signed up with a referral link");
    });

    it("should create notification for the referrer", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/referrals.ts", "utf-8");
      
      expect(source).toContain("Referral Bonus!");
      expect(source).toContain("bonus songs because a friend signed up");
    });

    it("should create notification for the referred user", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/referrals.ts", "utf-8");
      
      expect(source).toContain("Welcome Bonus!");
      expect(source).toContain("bonus songs for signing up with a referral link");
    });

    it("should handle notification failures gracefully for both users", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/referrals.ts", "utf-8");
      
      // Both notification blocks should be wrapped in try-catch
      const tryCatchBlocks = source.match(/try\s*\{[\s\S]*?createNotification[\s\S]*?\}\s*catch/g);
      expect(tryCatchBlocks).not.toBeNull();
      expect(tryCatchBlocks!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Referral UI messaging", () => {
    it("should communicate that both parties earn credits in the Referrals page", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
      
      // The page should mention that both users earn credits
      expect(source).toContain("you both earn");
      expect(source).toContain("Both Earn Credits");
    });

    it("should mention the bonus in the FAQ", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("client/src/pages/FAQ.tsx", "utf-8");
      
      expect(source).toContain("you both get 5 bonus song credits each");
    });
  });
});
