import { describe, it, expect } from "vitest";
import { getPlanLimits, getLicenseType } from "./credits";
import { PLAN_LIMITS } from "../drizzle/schema";

describe("Credits Module", () => {
  describe("getPlanLimits", () => {
    it("returns correct limits for free plan", () => {
      const limits = getPlanLimits("free");
      expect(limits).toEqual(PLAN_LIMITS.free);
      expect(limits.monthlyCredits).toBe(5);
      expect(limits.dailySongLimit).toBe(3);
      expect(limits.dailyTtsLimit).toBe(2);
      expect(limits.takesPerSong).toBe(1);
      expect(limits.stemDownloads).toBe(false);
    });

    it("returns correct limits for creator plan", () => {
      const limits = getPlanLimits("creator");
      expect(limits).toEqual(PLAN_LIMITS.creator);
      expect(limits.monthlyCredits).toBe(250);
      expect(limits.dailySongLimit).toBe(30);
      expect(limits.takesPerSong).toBe(2);
      expect(limits.stemDownloads).toBe("partial");
    });

    it("returns correct limits for professional plan", () => {
      const limits = getPlanLimits("professional");
      expect(limits).toEqual(PLAN_LIMITS.professional);
      expect(limits.monthlyCredits).toBe(1000);
      expect(limits.dailySongLimit).toBe(-1);
      expect(limits.takesPerSong).toBe(3);
    });

    it("returns correct limits for studio plan", () => {
      const limits = getPlanLimits("studio");
      expect(limits).toEqual(PLAN_LIMITS.studio);
      expect(limits.monthlyCredits).toBe(5000);
      expect(limits.dailySongLimit).toBe(-1); // unlimited
      expect(limits.takesPerSong).toBe(3);
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
        "monthlyCredits", "dailySongLimit", "dailyTtsLimit",
        "dailySheetMusicLimit", "dailyChordLimit", "takesPerSong",
        "stemDownloads", "vocalMixing",
        "commercialUse", "addOnCreditsPerDollar",
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

    it("free plan has no add-on credits", () => {
      expect(PLAN_LIMITS.free.addOnCreditsPerDollar).toBe(0);
    });

    it("studio plan has best add-on rate", () => {
      expect(PLAN_LIMITS.studio.addOnCreditsPerDollar).toBeGreaterThan(PLAN_LIMITS.creator.addOnCreditsPerDollar);
    });
  });
});
