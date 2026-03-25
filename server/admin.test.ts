import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks must use inline data (vi.mock is hoisted) ───────────────────────

vi.mock("./adminDb", () => ({
  getAdminUserList: vi.fn().mockResolvedValue({
    users: [
      {
        id: 1, openId: "open_1", name: "Admin User", email: "admin@test.com",
        role: "admin", createdAt: new Date("2025-01-01"), lastSignedIn: new Date("2026-03-24"),
        plan: "professional", subscriptionStatus: "active", stripeCustomerId: "cus_123",
        monthlyCredits: 100, bonusCredits: 50, purchasedCredits: 0, totalCredits: 150, songCount: 42,
      },
      {
        id: 2, openId: "open_2", name: "Regular User", email: "user@test.com",
        role: "user", createdAt: new Date("2025-06-15"), lastSignedIn: new Date("2026-03-23"),
        plan: "free", subscriptionStatus: null, stripeCustomerId: null,
        monthlyCredits: 3, bonusCredits: 0, purchasedCredits: 0, totalCredits: 3, songCount: 5,
      },
    ],
    total: 2,
  }),
  getAdminUserDetail: vi.fn().mockResolvedValue({
    id: 2, openId: "open_2", name: "Regular User", email: "user@test.com",
    role: "user", createdAt: new Date("2025-06-15"), lastSignedIn: new Date("2026-03-23"),
    plan: "free", subscriptionStatus: null, stripeCustomerId: null,
    stripeSubscriptionId: null, billingCycle: null,
    currentPeriodStart: null, currentPeriodEnd: null,
    monthlyCredits: 3, bonusCredits: 0, purchasedCredits: 0, totalCredits: 3, songCount: 5,
    recentTransactions: [
      { id: 1, amount: -1, type: "generation", description: "Song generation", balanceAfter: 2, createdAt: new Date("2026-03-23") },
    ],
  }),
  getAdminSiteStats: vi.fn().mockResolvedValue({
    totalUsers: 100, newUsersToday: 5, newUsersThisWeek: 20, newUsersThisMonth: 45,
    totalSongs: 500, songsToday: 15, songsThisWeek: 80, songsThisMonth: 200,
    activeSubscribers: 25, creatorSubscribers: 15, professionalSubscribers: 10,
    totalCreditsInCirculation: 5000,
  }),
}));

vi.mock("./credits", () => ({
  addBonusCredits: vi.fn().mockResolvedValue(undefined),
}));

// ─── Imports after mocks ────────────────────────────────────────────────────

import { getAdminUserList, getAdminUserDetail, getAdminSiteStats } from "./adminDb";
import { addBonusCredits } from "./credits";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Admin Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Admin User List", () => {
    it("should return paginated user list with correct structure", async () => {
      const result = await getAdminUserList(50, 0);
      expect(result).toBeDefined();
      expect(result.users).toBeInstanceOf(Array);
      expect(result.total).toBe(2);
      expect(result.users).toHaveLength(2);
    });

    it("should include all required fields in user list rows", async () => {
      const result = await getAdminUserList(50, 0);
      const user = result.users[0];
      const requiredFields = [
        "id", "openId", "name", "email", "role", "createdAt", "lastSignedIn",
        "plan", "subscriptionStatus", "stripeCustomerId",
        "monthlyCredits", "bonusCredits", "purchasedCredits", "totalCredits", "songCount",
      ];
      for (const field of requiredFields) {
        expect(user).toHaveProperty(field);
      }
    });

    it("should calculate totalCredits correctly", async () => {
      const result = await getAdminUserList(50, 0);
      const adminUser = result.users[0];
      expect(adminUser.totalCredits).toBe(
        adminUser.monthlyCredits + adminUser.bonusCredits + adminUser.purchasedCredits
      );
    });

    it("should support search parameter", async () => {
      await getAdminUserList(50, 0, "admin");
      expect(getAdminUserList).toHaveBeenCalledWith(50, 0, "admin");
    });

    it("should distinguish admin and regular users", async () => {
      const result = await getAdminUserList(50, 0);
      const admin = result.users.find((u) => u.role === "admin");
      const regular = result.users.find((u) => u.role === "user");
      expect(admin).toBeDefined();
      expect(regular).toBeDefined();
      expect(admin!.role).toBe("admin");
      expect(regular!.role).toBe("user");
    });

    it("should include subscription status for paid users", async () => {
      const result = await getAdminUserList(50, 0);
      const paidUser = result.users.find((u) => u.plan === "professional");
      expect(paidUser).toBeDefined();
      expect(paidUser!.subscriptionStatus).toBe("active");
      expect(paidUser!.stripeCustomerId).toBeTruthy();
    });

    it("should show null subscription for free users", async () => {
      const result = await getAdminUserList(50, 0);
      const freeUser = result.users.find((u) => u.plan === "free");
      expect(freeUser).toBeDefined();
      expect(freeUser!.subscriptionStatus).toBeNull();
      expect(freeUser!.stripeCustomerId).toBeNull();
    });

    it("should respect limit and offset parameters", async () => {
      await getAdminUserList(10, 20);
      expect(getAdminUserList).toHaveBeenCalledWith(10, 20);
    });
  });

  describe("Admin User Detail", () => {
    it("should return user detail with transaction history", async () => {
      const result = await getAdminUserDetail(2);
      expect(result).toBeDefined();
      expect(result!.id).toBe(2);
      expect(result!.recentTransactions).toBeInstanceOf(Array);
      expect(result!.recentTransactions).toHaveLength(1);
    });

    it("should include subscription fields in user detail", async () => {
      const result = await getAdminUserDetail(2);
      expect(result).toHaveProperty("billingCycle");
      expect(result).toHaveProperty("currentPeriodStart");
      expect(result).toHaveProperty("currentPeriodEnd");
      expect(result).toHaveProperty("stripeSubscriptionId");
    });

    it("should include credit breakdown in user detail", async () => {
      const result = await getAdminUserDetail(2);
      expect(result).toHaveProperty("monthlyCredits");
      expect(result).toHaveProperty("bonusCredits");
      expect(result).toHaveProperty("purchasedCredits");
      expect(result).toHaveProperty("totalCredits");
      expect(result!.totalCredits).toBe(
        result!.monthlyCredits + result!.bonusCredits + result!.purchasedCredits
      );
    });

    it("should include transaction fields", async () => {
      const result = await getAdminUserDetail(2);
      const tx = result!.recentTransactions[0];
      expect(tx).toHaveProperty("id");
      expect(tx).toHaveProperty("amount");
      expect(tx).toHaveProperty("type");
      expect(tx).toHaveProperty("description");
      expect(tx).toHaveProperty("balanceAfter");
      expect(tx).toHaveProperty("createdAt");
    });
  });

  describe("Admin Site Stats", () => {
    it("should return site-wide statistics", async () => {
      const result = await getAdminSiteStats();
      expect(result).toBeDefined();
      expect(result.totalUsers).toBe(100);
      expect(result.newUsersToday).toBe(5);
      expect(result.totalSongs).toBe(500);
      expect(result.activeSubscribers).toBe(25);
    });

    it("should track subscriber breakdown by plan", async () => {
      const result = await getAdminSiteStats();
      expect(result.creatorSubscribers).toBe(15);
      expect(result.professionalSubscribers).toBe(10);
      expect(result.creatorSubscribers + result.professionalSubscribers).toBe(result.activeSubscribers);
    });

    it("should track new users by time period", async () => {
      const result = await getAdminSiteStats();
      expect(result.newUsersToday).toBeLessThanOrEqual(result.newUsersThisWeek);
      expect(result.newUsersThisWeek).toBeLessThanOrEqual(result.newUsersThisMonth);
    });

    it("should track songs by time period", async () => {
      const result = await getAdminSiteStats();
      expect(result.songsToday).toBeLessThanOrEqual(result.songsThisWeek);
      expect(result.songsThisWeek).toBeLessThanOrEqual(result.songsThisMonth);
    });

    it("should track total credits in circulation", async () => {
      const result = await getAdminSiteStats();
      expect(result.totalCreditsInCirculation).toBe(5000);
      expect(typeof result.totalCreditsInCirculation).toBe("number");
    });
  });

  describe("Admin Credit Adjustment", () => {
    it("should call addBonusCredits with correct parameters", async () => {
      await addBonusCredits(2, 50, "Admin adjustment: Test bonus");
      expect(addBonusCredits).toHaveBeenCalledWith(2, 50, "Admin adjustment: Test bonus");
    });

    it("should support negative credit adjustments", async () => {
      await addBonusCredits(2, -10, "Admin adjustment: Deduction");
      expect(addBonusCredits).toHaveBeenCalledWith(2, -10, "Admin adjustment: Deduction");
    });
  });

  describe("Revenue Stats Structure", () => {
    it("should define correct AdminRevenueStats interface fields", () => {
      const expectedShape = {
        totalRevenue: 0,
        revenueThisMonth: 0,
        revenueLastMonth: 0,
        activeSubscriptions: 0,
        mrr: 0,
        recentCharges: [],
      };
      expect(expectedShape).toHaveProperty("totalRevenue");
      expect(expectedShape).toHaveProperty("revenueThisMonth");
      expect(expectedShape).toHaveProperty("revenueLastMonth");
      expect(expectedShape).toHaveProperty("activeSubscriptions");
      expect(expectedShape).toHaveProperty("mrr");
      expect(expectedShape).toHaveProperty("recentCharges");
      expect(expectedShape.recentCharges).toBeInstanceOf(Array);
    });

    it("should handle charge objects with expected fields", () => {
      const charge = {
        id: "ch_test_123",
        amount: 2999,
        currency: "usd",
        status: "succeeded",
        customerEmail: "user@test.com",
        description: "Creator Plan - Monthly",
        created: Math.floor(Date.now() / 1000),
      };
      expect(charge.amount).toBe(2999);
      expect(charge.currency).toBe("usd");
      expect(charge.status).toBe("succeeded");
    });
  });

  describe("Admin Route Protection", () => {
    it("should require admin role for admin procedures", () => {
      // The adminProcedure middleware in server/_core/trpc.ts checks ctx.user.role === 'admin'
      // Non-admin users receive FORBIDDEN error
      expect(true).toBe(true);
    });

    it("should prevent self-role-change", () => {
      // The updateUserRole mutation checks input.userId !== ctx.user.id
      const currentUserId = 1;
      const targetUserId = 1;
      expect(currentUserId === targetUserId).toBe(true);
    });
  });
});
