import { describe, it, expect } from "vitest";

describe("Resend API Key Validation", () => {
  it("RESEND_API_KEY is set in the environment", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
  });

  it("RESEND_API_KEY starts with 're_' prefix", () => {
    const key = process.env.RESEND_API_KEY ?? "";
    expect(key.startsWith("re_")).toBe(true);
  });

  it("can initialize Resend client without error", async () => {
    const { Resend } = await import("resend");
    const key = process.env.RESEND_API_KEY ?? "";
    expect(() => new Resend(key)).not.toThrow();
  });
});
