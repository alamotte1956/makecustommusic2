import { describe, expect, it } from "vitest";

/**
 * CookieConsent is a pure client-side component with localStorage persistence.
 * These tests verify module resolution, integration in Layout, and content integrity.
 */

describe("CookieConsent – Module Resolution", () => {
  it("exports a default component", async () => {
    const mod = await import("../client/src/components/CookieConsent");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("CookieConsent – Layout Integration", () => {
  it("Layout.tsx imports CookieConsent", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/Layout.tsx",
      "utf-8"
    );
    expect(content).toContain("CookieConsent");
    expect(content).toContain("@/components/CookieConsent");
  });

  it("Layout.tsx renders the CookieConsent component", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/Layout.tsx",
      "utf-8"
    );
    expect(content).toContain("<CookieConsent />");
  });
});

describe("CookieConsent – Content Integrity", () => {
  it("contains privacy-related messaging", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/CookieConsent.tsx",
      "utf-8"
    );
    expect(content).toContain("privacy");
    expect(content).toContain("cookies");
  });

  it("contains Accept and Essential Only buttons", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/CookieConsent.tsx",
      "utf-8"
    );
    expect(content).toContain("Accept All");
    expect(content).toContain("Essential Only");
  });

  it("links to the Privacy Policy page", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/CookieConsent.tsx",
      "utf-8"
    );
    expect(content).toContain("/privacy");
    expect(content).toContain("Privacy Policy");
  });

  it("uses localStorage with the correct key", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/CookieConsent.tsx",
      "utf-8"
    );
    expect(content).toContain("cookie-consent");
    expect(content).toContain("localStorage.getItem");
    expect(content).toContain("localStorage.setItem");
  });

  it("stores accepted or declined as consent values", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/CookieConsent.tsx",
      "utf-8"
    );
    expect(content).toContain('"accepted"');
    expect(content).toContain('"declined"');
  });

  it("has a dismiss/close button with aria-label", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/CookieConsent.tsx",
      "utf-8"
    );
    expect(content).toContain("aria-label");
    expect(content).toContain("Dismiss cookie banner");
  });

  it("includes slide animation classes", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "client/src/components/CookieConsent.tsx",
      "utf-8"
    );
    expect(content).toContain("translate-y-0");
    expect(content).toContain("translate-y-full");
    expect(content).toContain("transition-transform");
  });
});
