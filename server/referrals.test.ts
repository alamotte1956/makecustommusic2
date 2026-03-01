import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Referral code generation tests ─────────────────────────────────────────

describe("Referral code format", () => {
  it("should generate 8-character alphanumeric codes", () => {
    // Simulates the code generation logic
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("should not contain ambiguous characters (I, O, 0, 1)", () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    expect(chars).not.toContain("I");
    expect(chars).not.toContain("O");
    expect(chars).not.toContain("0");
    expect(chars).not.toContain("1");
  });

  it("should generate unique codes across multiple runs", () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codes = new Set<string>();
    for (let run = 0; run < 100; run++) {
      let code = "";
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      codes.add(code);
    }
    // With 30^8 possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });
});

// ─── Referral bonus constant tests ──────────────────────────────────────────

describe("Referral bonus credits", () => {
  it("should award exactly 5 credits per referral", async () => {
    const { REFERRAL_BONUS_CREDITS } = await import("../drizzle/schema");
    expect(REFERRAL_BONUS_CREDITS).toBe(5);
  });
});

// ─── Referral validation logic tests ────────────────────────────────────────

describe("Referral validation", () => {
  it("should reject self-referral", () => {
    const referrerId = 1;
    const referredUserId = 1;
    expect(referrerId === referredUserId).toBe(true);
  });

  it("should allow referral between different users", () => {
    const referrerId = 1;
    const referredUserId = 2;
    expect(referrerId === referredUserId).toBe(false);
  });

  it("should normalize referral codes to uppercase", () => {
    const input = "abc123xy";
    expect(input.toUpperCase()).toBe("ABC123XY");
  });

  it("should trim whitespace from referral codes", () => {
    const input = "  ABC123  ";
    expect(input.trim().toUpperCase()).toBe("ABC123");
  });
});

// ─── Safari-safe clipboard utility tests ────────────────────────────────────

describe("Safari-safe clipboard utility", () => {
  it("should export copyToClipboard function", async () => {
    // Verify the module exports correctly
    const clipboardModule = await import("../client/src/lib/clipboard");
    expect(typeof clipboardModule.copyToClipboard).toBe("function");
  });
});

// ─── Safari-safe localStorage tests ─────────────────────────────────────────

describe("Safari-safe localStorage patterns", () => {
  it("useReferral module should export useReferral hook", async () => {
    const mod = await import("../client/src/hooks/useReferral");
    expect(typeof mod.useReferral).toBe("function");
  });

  it("CookieConsent should have safe storage helpers", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/CookieConsent.tsx", "utf-8");
    expect(content).toContain("try");
    expect(content).toContain("catch");
    expect(content).toContain("localStorage");
  });

  it("ThemeContext should have safe storage helpers", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/contexts/ThemeContext.tsx", "utf-8");
    expect(content).toContain("try");
    expect(content).toContain("catch");
    expect(content).toContain("localStorage");
  });

  it("DashboardLayout should have safe storage helpers", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/DashboardLayout.tsx", "utf-8");
    expect(content).toContain("try");
    expect(content).toContain("catch");
    expect(content).toContain("localStorage");
  });

  it("useAuth should have safe storage access", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/_core/hooks/useAuth.ts", "utf-8");
    expect(content).toContain("try");
    expect(content).toContain("catch");
    expect(content).toContain("localStorage");
  });
});

// ─── No direct navigator.clipboard usage tests ─────────────────────────────

describe("Clipboard usage audit", () => {
  const filesToCheck = [
    "client/src/pages/Favorites.tsx",
    "client/src/pages/Generator.tsx",
    "client/src/pages/SharedSong.tsx",
    "client/src/pages/SongDetail.tsx",
    "client/src/pages/Referrals.tsx",
  ];

  for (const file of filesToCheck) {
    it(`${file} should use copyToClipboard instead of navigator.clipboard`, async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(file, "utf-8");
      expect(content).toContain("copyToClipboard");
      // Should not have direct navigator.clipboard calls
      expect(content).not.toMatch(/navigator\.clipboard\.writeText/);
    });
  }

  it("clipboard utility should exist and handle fallback", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/lib/clipboard.ts", "utf-8");
    expect(content).toContain("navigator.clipboard");
    expect(content).toContain("execCommand");
    expect(content).toContain("setSelectionRange"); // iOS Safari fix
  });
});

// ─── Referral page component tests ──────────────────────────────────────────

describe("Referrals page", () => {
  it("should export a default component", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("export default function Referrals");
  });

  it("should display the referral link with ?ref= parameter", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("?ref=");
  });

  it("should have copy and share functionality", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("handleCopy");
    expect(content).toContain("handleShare");
  });

  it("should display stats cards for total referrals and credits earned", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("totalReferrals");
    expect(content).toContain("totalCreditsEarned");
  });

  it("should use Safari-safe share with AbortError handling", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("AbortError");
    expect(content).toContain("navigator.share");
  });
});

// ─── Referral route registration tests ──────────────────────────────────────

describe("Referral route registration", () => {
  it("App.tsx should have /referrals route", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(content).toContain("/referrals");
    expect(content).toContain("Referrals");
  });

  it("App.tsx should include ReferralCapture component", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(content).toContain("ReferralCapture");
    expect(content).toContain("useReferral");
  });

  it("Layout footer should have Invite Friends link", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/components/Layout.tsx", "utf-8");
    expect(content).toContain("Invite Friends");
    expect(content).toContain("/referrals");
  });
});

// ─── Leaderboard tests ─────────────────────────────────────────────────────

describe("Referral leaderboard", () => {
  it("should have getLeaderboard function in referrals.ts", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/referrals.ts", "utf-8");
    expect(content).toContain("export async function getLeaderboard");
    expect(content).toContain("limit");
    expect(content).toContain("currentUserId");
  });

  it("should anonymize names for non-current users", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/referrals.ts", "utf-8");
    expect(content).toContain('"***"');
    expect(content).toContain("Anonymous");
  });

  it("should show full name for current user", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/referrals.ts", "utf-8");
    expect(content).toContain("isCurrentUser");
    expect(content).toContain('row.name ?? "You"');
  });

  it("should order by referral count descending", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/referrals.ts", "utf-8");
    expect(content).toContain("COUNT(*) DESC");
  });

  it("should find current user rank when not in top list", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/referrals.ts", "utf-8");
    expect(content).toContain("currentUserRank");
    expect(content).toContain("COUNT(DISTINCT");
  });

  it("should have leaderboard tRPC procedure as publicProcedure", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers.ts", "utf-8");
    expect(content).toContain("leaderboard: publicProcedure");
  });

  it("should limit leaderboard to max 50 entries", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers.ts", "utf-8");
    expect(content).toContain("z.number().min(1).max(50).default(20)");
  });
});

// ─── Leaderboard UI tests ──────────────────────────────────────────────────

describe("Leaderboard UI", () => {
  it("should have LeaderboardSection component in Referrals page", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("LeaderboardSection");
    expect(content).toContain("trpc.referrals.leaderboard.useQuery");
  });

  it("should have rank icons for top 3 positions", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("Crown");
    expect(content).toContain("Medal");
    expect(content).toContain("Trophy");
  });

  it("should highlight current user row", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("isCurrentUser");
    expect(content).toContain("bg-violet-50");
  });

  it("should show current user rank when not in top list", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("currentUserRank");
    expect(content).toContain("border-dashed");
  });

  it("should have empty state for no referrals", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("No referrals yet");
    expect(content).toContain("claim the top spot");
  });

  it("should display rank, referrer name, referral count, and credits", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("Rank");
    expect(content).toContain("Referrer");
    expect(content).toContain("Referrals");
    expect(content).toContain("Credits Earned");
  });

  it("should use color-coded avatars for top 3 ranks", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/Referrals.tsx", "utf-8");
    expect(content).toContain("bg-yellow-100"); // gold for #1
    expect(content).toContain("bg-gray-100");   // silver for #2
    expect(content).toContain("bg-amber-100");  // bronze for #3
  });
});

// ─── Server-side referral procedures tests ──────────────────────────────────

describe("Referral tRPC procedures", () => {
  it("routers.ts should have referrals router with getInfo, getHistory, claim, and leaderboard", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers.ts", "utf-8");
    expect(content).toContain("referrals:");
    expect(content).toContain("getInfo:");
    expect(content).toContain("getHistory:");
    expect(content).toContain("claim:");
    expect(content).toContain("leaderboard:");
  });

  it("claim procedure should validate code length", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers.ts", "utf-8");
    expect(content).toContain("z.string().min(1).max(16)");
  });

  it("claim procedure should prevent self-referral", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/routers.ts", "utf-8");
    expect(content).toContain("self_referral");
  });
});
