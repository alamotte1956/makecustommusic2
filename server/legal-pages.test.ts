import { describe, expect, it } from "vitest";

/**
 * Legal pages (Privacy Policy & Terms of Service) are pure static React
 * components with no backend dependencies.  These tests verify the page
 * modules can be resolved and that the route configuration is correct.
 */

describe("Legal Pages – Module Resolution", () => {
  it("Privacy page module exports a default component", async () => {
    // Verify the module can be imported (catches typos / broken imports)
    const mod = await import("../client/src/pages/Privacy");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("Terms page module exports a default component", async () => {
    const mod = await import("../client/src/pages/Terms");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("Legal Pages – Route Registration", () => {
  it("App.tsx contains /privacy route", async () => {
    const fs = await import("fs");
    const appContent = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(appContent).toContain('"/privacy"');
    expect(appContent).toContain("Privacy");
  });

  it("App.tsx contains /terms route", async () => {
    const fs = await import("fs");
    const appContent = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(appContent).toContain('"/terms"');
    expect(appContent).toContain("Terms");
  });
});

describe("Legal Pages – Footer Links", () => {
  it("Layout footer contains links to both legal pages", async () => {
    const fs = await import("fs");
    const layoutContent = fs.readFileSync(
      "client/src/components/Layout.tsx",
      "utf-8"
    );
    expect(layoutContent).toContain("/privacy");
    expect(layoutContent).toContain("/terms");
    expect(layoutContent).toContain("Privacy Policy");
    expect(layoutContent).toContain("Terms of Service");
  });
});

describe("Legal Pages – Content Integrity", () => {
  it("Privacy page contains required sections", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Privacy.tsx", "utf-8");
    const requiredSections = [
      "Information We Collect",
      "How We Use Your Information",
      "Third-Party Services",
      "Cookies",
      "Data Retention",
      "Data Security",
      "Your Rights",
      "Children",
      "Changes to This Policy",
      "Contact Us",
    ];
    for (const section of requiredSections) {
      expect(content).toContain(section);
    }
  });

  it("Terms page contains required sections", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Terms.tsx", "utf-8");
    const requiredSections = [
      "Eligibility",
      "Your Account",
      "Service Description",
      "Subscription Plans",
      "Intellectual Property",
      "Acceptable Use",
      "Disclaimers",
      "Limitation of Liability",
      "Indemnification",
      "Termination",
      "Governing Law",
      "Changes to These Terms",
      "Contact Us",
    ];
    for (const section of requiredSections) {
      expect(content).toContain(section);
    }
  });

  it("Privacy page cross-links to Terms", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Privacy.tsx", "utf-8");
    expect(content).toContain("/terms");
    expect(content).toContain("Terms of Service");
  });

  it("Terms page cross-links to Privacy", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Terms.tsx", "utf-8");
    expect(content).toContain("/privacy");
    expect(content).toContain("Privacy Policy");
  });
});
