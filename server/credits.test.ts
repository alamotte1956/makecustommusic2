import { describe, it, expect } from "vitest";
import { getPlanLimits, getLicenseType } from "./credits";
import { PLAN_LIMITS } from "../drizzle/schema";

describe("Credits Module", () => {
  describe("getPlanLimits", () => {
    it("returns correct limits for free (no plan) tier", () => {
      const limits = getPlanLimits("free");
      expect(limits).toEqual(PLAN_LIMITS.free);
      expect(limits.monthlyCredits).toBe(0);
      expect(limits.dailySongLimit).toBe(0);
      expect(limits.audioQuality).toBe("128kbps");
    });

    it("returns correct limits for creator plan", () => {
      const limits = getPlanLimits("creator");
      expect(limits).toEqual(PLAN_LIMITS.creator);
      expect(limits.monthlyCredits).toBe(50);
      expect(limits.dailySongLimit).toBe(15);
      expect(limits.audioQuality).toBe("192kbps");
    });

    it("returns correct limits for professional plan", () => {
      const limits = getPlanLimits("professional");
      expect(limits).toEqual(PLAN_LIMITS.professional);
      expect(limits.monthlyCredits).toBe(100);
      expect(limits.dailySongLimit).toBe(30);
    });
  });

  describe("getLicenseType", () => {
    it("returns personal for free (no plan) tier", () => {
      expect(getLicenseType("free")).toBe("personal");
    });

    it("returns commercial_social for creator plan", () => {
      expect(getLicenseType("creator")).toBe("commercial_social");
    });

    it("returns commercial_full for professional plan", () => {
      expect(getLicenseType("professional")).toBe("commercial_full");
    });
  });

  describe("PLAN_LIMITS structure", () => {
    it("has exactly three tiers (free, creator, professional)", () => {
      expect(Object.keys(PLAN_LIMITS)).toEqual(["free", "creator", "professional"]);
    });

    it("all plans have required fields", () => {
      const requiredFields = [
        "monthlyCredits", "dailySongLimit",
        "dailySheetMusicLimit", "dailyChordLimit",
        "commercialUse", "audioQuality",
      ];

      for (const plan of ["free", "creator", "professional"] as const) {
        const limits = PLAN_LIMITS[plan];
        for (const field of requiredFields) {
          expect(limits).toHaveProperty(field);
        }
      }
    });

    it("plans scale up in monthly credits", () => {
      expect(PLAN_LIMITS.free.monthlyCredits).toBeLessThan(PLAN_LIMITS.creator.monthlyCredits);
      expect(PLAN_LIMITS.creator.monthlyCredits).toBeLessThan(PLAN_LIMITS.professional.monthlyCredits);
    });

    it("free tier has no commercial use", () => {
      expect(PLAN_LIMITS.free.commercialUse).toBe(false);
    });

    it("paid plans have commercial use", () => {
      expect(PLAN_LIMITS.creator.commercialUse).toBeTruthy();
      expect(PLAN_LIMITS.professional.commercialUse).toBeTruthy();
    });

    it("free tier has lower audio quality", () => {
      expect(PLAN_LIMITS.free.audioQuality).toBe("128kbps");
    });

    it("paid plans have higher audio quality", () => {
      expect(PLAN_LIMITS.creator.audioQuality).toBe("192kbps");
      expect(PLAN_LIMITS.professional.audioQuality).toBe("192kbps");
    });
  });
});
