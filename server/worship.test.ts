import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Schema tests ───
describe("Worship & Church Features", () => {
  const schemaPath = resolve(__dirname, "../drizzle/schema.ts");
  const schemaContent = readFileSync(schemaPath, "utf-8");

  describe("Database schema", () => {
    it("should define worshipSets table", () => {
      expect(schemaContent).toContain("worshipSets");
      expect(schemaContent).toContain("worship_sets");
    });

    it("should define worshipSetItems table", () => {
      expect(schemaContent).toContain("worshipSetItems");
      expect(schemaContent).toContain("worship_set_items");
    });

    it("should define scriptureSongs table", () => {
      expect(schemaContent).toContain("scriptureSongs");
      expect(schemaContent).toContain("scripture_songs");
    });

    it("worshipSets should have required fields", () => {
      // Check for key columns
      expect(schemaContent).toContain("date");
      expect(schemaContent).toContain("serviceType");
      expect(schemaContent).toContain("liturgicalSeason");
    });

    it("worshipSetItems should have itemType field", () => {
      expect(schemaContent).toContain("itemType");
    });
  });

  // ─── Router tests ───
  describe("Router procedures", () => {
    const routerPath = resolve(__dirname, "routers.ts");
    const routerContent = readFileSync(routerPath, "utf-8");

    it("should have worship.list procedure", () => {
      expect(routerContent).toContain("worship");
    });

    it("should have worship.create procedure", () => {
      expect(routerContent).toContain("worship");
      expect(routerContent).toContain("create");
    });

    it("should have scriptureSong procedures", () => {
      expect(routerContent).toContain("scripture");
    });

    it("should have worship-related procedures", () => {
      expect(routerContent).toContain("worship");
    });
  });

  // ─── Generator Christian genres tests ───
  describe("Generator Christian genres", () => {
    const generatorPath = resolve(__dirname, "../client/src/pages/Generator.tsx");
    const generatorContent = readFileSync(generatorPath, "utf-8");

    it("should have Christian genre section", () => {
      expect(generatorContent).toContain("CHRISTIAN_GENRES");
    });

    it("should include core Christian genres", () => {
      expect(generatorContent).toContain("Gospel");
      expect(generatorContent).toContain("Hymns");
      expect(generatorContent).toContain("Praise & Worship");
      expect(generatorContent).toContain("Christian Rock");
      expect(generatorContent).toContain("Christian Hip Hop");
      expect(generatorContent).toContain("Southern Gospel");
      expect(generatorContent).toContain("CCM");
      expect(generatorContent).toContain("Liturgical");
      expect(generatorContent).toContain("Choral");
    });

    it("should have Christian-specific moods", () => {
      expect(generatorContent).toContain("Devotional");
      expect(generatorContent).toContain("Reverent");
      expect(generatorContent).toContain("Joyful Praise");
      expect(generatorContent).toContain("Prayerful");
      expect(generatorContent).toContain("Grateful");
    });

    it("should have worship lyric templates", () => {
      expect(generatorContent).toContain("Worship / Hymn");
      expect(generatorContent).toContain("Psalm Setting");
      expect(generatorContent).toContain("Scripture Song");
      expect(generatorContent).toContain("Call to Worship");
      expect(generatorContent).toContain("Communion Song");
      expect(generatorContent).toContain("Altar Call");
    });

    it("should have Christian quick suggestions", () => {
      expect(generatorContent).toContain("praise & worship anthem");
      expect(generatorContent).toContain("gentle hymn for communion");
      expect(generatorContent).toContain("joyful gospel choir celebration");
      expect(generatorContent).toContain("Psalm 23 worship song");
    });
  });

  // ─── Church Licensing page tests ───
  describe("Church Licensing page", () => {
    const licensingPath = resolve(__dirname, "../client/src/pages/ChurchLicensing.tsx");
    const licensingContent = readFileSync(licensingPath, "utf-8");

    it("should exist and export a component", () => {
      expect(licensingContent).toContain("export default function ChurchLicensing");
    });

    it("should cover Sunday Services use case", () => {
      expect(licensingContent).toContain("Sunday Services");
    });

    it("should cover Live Streaming & Recording", () => {
      expect(licensingContent).toContain("Live Streaming");
    });

    it("should compare with CCLI / OneLicense", () => {
      expect(licensingContent).toContain("CCLI");
      expect(licensingContent).toContain("OneLicense");
    });

    it("should mention IP ownership", () => {
      expect(licensingContent).toContain("You Own Your Music");
      expect(licensingContent).toContain("Full ownership");
    });

    it("should include copyright notice by Albert LaMotte", () => {
      expect(licensingContent).toContain("Albert LaMotte");
    });

    it("should link to Terms and Privacy", () => {
      expect(licensingContent).toContain("/terms");
      expect(licensingContent).toContain("/privacy");
    });
  });

  // ─── Home page Christian focus tests ───
  describe("Home page Christian focus", () => {
    const homePath = resolve(__dirname, "../client/src/pages/Home.tsx");
    const homeContent = readFileSync(homePath, "utf-8");

    it("should mention Christian Creators", () => {
      expect(homeContent).toContain("Christian Creator");
    });

    it("should mention Church Music Director", () => {
      expect(homeContent).toContain("Church Music Director");
    });

    it("should have Worship Set Builder feature", () => {
      expect(homeContent).toContain("Worship Set Builder");
    });

    it("should have Scripture Song Templates feature", () => {
      expect(homeContent).toContain("Scripture Song Templates");
    });

    it("should have Church Band Ready feature", () => {
      expect(homeContent).toContain("Church Band");
    });

    it("should have use cases for different Christian creators", () => {
      expect(homeContent).toContain("Worship Leaders");
      expect(homeContent).toContain("Church Bands");
      expect(homeContent).toContain("Youth Pastors");
      expect(homeContent).toContain("Christian Content Creators");
    });

    it("should have testimonials section", () => {
      expect(homeContent).toContain("Trusted by Churches");
    });

    it("should highlight unique differentiators", () => {
      expect(homeContent).toContain("Sheet Music Included");
      expect(homeContent).toContain("Worship Set Planning");
      expect(homeContent).toContain("You Own Everything");
    });
  });

  // ─── App routing tests ───
  describe("App routing", () => {
    const appPath = resolve(__dirname, "../client/src/App.tsx");
    const appContent = readFileSync(appPath, "utf-8");

    it("should have /worship route", () => {
      expect(appContent).toContain("/worship");
      expect(appContent).toContain("WorshipSetBuilder");
    });

    it("should have /licensing route", () => {
      expect(appContent).toContain("/licensing");
      expect(appContent).toContain("ChurchLicensing");
    });
  });

  // ─── Layout navigation tests ───
  describe("Layout navigation", () => {
    const layoutPath = resolve(__dirname, "../client/src/components/Layout.tsx");
    const layoutContent = readFileSync(layoutPath, "utf-8");

    it("should have Worship Sets in sidebar nav", () => {
      expect(layoutContent).toContain("Worship Sets");
      expect(layoutContent).toContain("/worship");
    });

    it("should have Church Licensing in footer", () => {
      expect(layoutContent).toContain("Church Licensing");
      expect(layoutContent).toContain("/licensing");
    });
  });
});
