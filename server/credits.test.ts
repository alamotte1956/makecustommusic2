import { describe, it, expect } from "vitest";
import { getPlanLimits, getLicenseType } from "./credits";
import { PLAN_LIMITS } from "../drizzle/schema";

describe("Credits Module", () => {
  describe("getPlanLimits", () => {
    it("returns correct limits for free plan", () => {
      const limits = getPlanLimits("free");
      expect(limits).toEqual(PLAN_LIMITS.free);
      expect(limits.monthlyCredits).toBe(2);
      expect(limits.dailySongLimit).toBe(2);
      expect(limits.dailySheetMusicLimit).toBe(1);
      expect(limits.audioQuality).toBe("128kbps");
    });

    it("returns correct limits for creator plan", () => {
      const limits = getPlanLimits("creator");
      expect(limits).toEqual(PLAN_LIMITS.creator);
      expect(limits.monthlyCredits).toBe(250);
      expect(limits.dailySongLimit).toBe(30);
      expect(limits.audioQuality).toBe("192kbps");
    });

    it("returns correct limits for professional plan", () => {
      const limits = getPlanLimits("professional");
      expect(limits).toEqual(PLAN_LIMITS.professional);
      expect(limits.monthlyCredits).toBe(1000);
      expect(limits.dailySongLimit).toBe(-1);
    });

    it("returns correct limits for studio plan", () => {
      const limits = getPlanLimits("studio");
      expect(limits).toEqual(PLAN_LIMITS.studio);
      expect(limits.monthlyCredits).toBe(5000);
      expect(limits.dailySongLimit).toBe(-1); // unlimited
    });
  });

  describe("getLicenseType", () => {
    it("returns personal for free plan", () => {
      expect(getLicenseType("free")).toBe("personal");
    });

    it("returns commercial_social for creator plan", () => {
      expect(getLicenseType("creator")).toBe("commercial_social");
    });

    it("returns commercial_full for professional plan", () => {
      expect(getLicenseType("professional")).toBe("commercial_full");
    });

    it("returns commercial_sync for studio plan", () => {
      expect(getLicenseType("studio")).toBe("commercial_sync");
    });
  });

  describe("PLAN_LIMITS structure", () => {
    it("all plans have required fields", () => {
      const requiredFields = [
        "monthlyCredits", "dailySongLimit",
        "dailySheetMusicLimit", "dailyChordLimit",
        "commercialUse", "audioQuality",
      ];

      for (const plan of ["free", "creator", "professional", "studio"] as const) {
        const limits = PLAN_LIMITS[plan];
        for (const field of requiredFields) {
          expect(limits).toHaveProperty(field);
        }
      }
    });

    it("plans scale up in monthly credits", () => {
      expect(PLAN_LIMITS.free.monthlyCredits).toBeLessThan(PLAN_LIMITS.creator.monthlyCredits);
      expect(PLAN_LIMITS.creator.monthlyCredits).toBeLessThan(PLAN_LIMITS.professional.monthlyCredits);
      expect(PLAN_LIMITS.professional.monthlyCredits).toBeLessThan(PLAN_LIMITS.studio.monthlyCredits);
    });

    it("free plan has no commercial use", () => {
      expect(PLAN_LIMITS.free.commercialUse).toBe(false);
    });

    it("paid plans have commercial use", () => {
      expect(PLAN_LIMITS.creator.commercialUse).toBeTruthy();
      expect(PLAN_LIMITS.professional.commercialUse).toBeTruthy();
      expect(PLAN_LIMITS.studio.commercialUse).toBeTruthy();
    });

    it("free plan has lower audio quality", () => {
      expect(PLAN_LIMITS.free.audioQuality).toBe("128kbps");
    });

    it("paid plans have higher audio quality", () => {
      expect(PLAN_LIMITS.creator.audioQuality).toBe("192kbps");
      expect(PLAN_LIMITS.professional.audioQuality).toBe("192kbps");
      expect(PLAN_LIMITS.studio.audioQuality).toBe("192kbps");
    });
  });
});
