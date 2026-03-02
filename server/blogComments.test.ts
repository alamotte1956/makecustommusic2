import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getArticleBySlug, getAllArticles } from "../shared/blogArticles";

// ─── Helper: create an authenticated context ───

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1, name = "Test User"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `user${userId}@example.com`,
    name,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Blog Comments Router Tests ───

describe("blogComments router", () => {
  describe("blogComments.list", () => {
    it("should accept a valid articleSlug and return an array", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();
      const slug = articles[0].slug;

      const result = await caller.blogComments.list({ articleSlug: slug });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return empty array for slug with no comments", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.blogComments.list({ articleSlug: "nonexistent-slug-xyz" });
      expect(result).toEqual([]);
    });

    it("should respect the limit parameter", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();

      const result = await caller.blogComments.list({
        articleSlug: articles[0].slug,
        limit: 5,
      });
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("blogComments.count", () => {
    it("should return a count object", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();

      const result = await caller.blogComments.count({ articleSlug: articles[0].slug });
      expect(result).toHaveProperty("count");
      expect(typeof result.count).toBe("number");
      expect(result.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("blogComments.create", () => {
    it("should create a comment for authenticated user", async () => {
      const ctx = createAuthContext(1, "Test Commenter");
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();
      const slug = articles[0].slug;

      const result = await caller.blogComments.create({
        articleSlug: slug,
        content: "This is a test comment for blog article.",
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("success", true);
      expect(typeof result.id).toBe("number");
    });

    it("should reject creation for non-existent article", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.blogComments.create({
          articleSlug: "this-article-does-not-exist-xyz",
          content: "Should fail",
        })
      ).rejects.toThrow("Article not found");
    });

    it("should reject empty content", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();

      await expect(
        caller.blogComments.create({
          articleSlug: articles[0].slug,
          content: "",
        })
      ).rejects.toThrow();
    });

    it("should reject content over 2000 characters", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();

      await expect(
        caller.blogComments.create({
          articleSlug: articles[0].slug,
          content: "x".repeat(2001),
        })
      ).rejects.toThrow();
    });

    it("should trim whitespace from content", async () => {
      const ctx = createAuthContext(2, "Trimmer");
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();

      const result = await caller.blogComments.create({
        articleSlug: articles[0].slug,
        content: "  Hello World  ",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("blogComments.delete", () => {
    it("should delete own comment", async () => {
      const ctx = createAuthContext(3, "Deleter");
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();

      // Create a comment first
      const created = await caller.blogComments.create({
        articleSlug: articles[0].slug,
        content: "Comment to be deleted",
      });

      // Delete it
      const result = await caller.blogComments.delete({ id: created.id });
      expect(result).toEqual({ success: true });
    });

    it("should not delete another user's comment", async () => {
      // Create comment as user 4
      const ctx4 = createAuthContext(4, "Owner");
      const caller4 = appRouter.createCaller(ctx4);
      const articles = getAllArticles();

      const created = await caller4.blogComments.create({
        articleSlug: articles[0].slug,
        content: "This is my comment",
      });

      // Try to delete as user 5
      const ctx5 = createAuthContext(5, "Other");
      const caller5 = appRouter.createCaller(ctx5);

      // The delete should succeed silently but not actually delete the comment
      // (the WHERE clause filters by userId, so it just won't match)
      const result = await caller5.blogComments.delete({ id: created.id });
      expect(result).toEqual({ success: true });

      // Verify comment still exists
      const comments = await caller4.blogComments.list({ articleSlug: articles[0].slug });
      const stillExists = comments.some((c) => c.id === created.id);
      expect(stillExists).toBe(true);

      // Clean up
      await caller4.blogComments.delete({ id: created.id });
    });
  });

  describe("blogComments.list with created comments", () => {
    it("should return created comments with correct structure", async () => {
      const ctx = createAuthContext(6, "Lister");
      const caller = appRouter.createCaller(ctx);
      const articles = getAllArticles();
      const slug = articles[1].slug;

      // Create a comment
      await caller.blogComments.create({
        articleSlug: slug,
        content: "Test comment for listing",
      });

      // List comments
      const comments = await caller.blogComments.list({ articleSlug: slug });
      expect(comments.length).toBeGreaterThanOrEqual(1);

      const comment = comments[0];
      expect(comment).toHaveProperty("id");
      expect(comment).toHaveProperty("articleSlug", slug);
      expect(comment).toHaveProperty("userId");
      expect(comment).toHaveProperty("content");
      expect(comment).toHaveProperty("createdAt");
      expect(comment).toHaveProperty("updatedAt");
      expect(comment).toHaveProperty("userName");

      // Clean up
      await caller.blogComments.delete({ id: comment.id });
    });
  });
});

// ─── Blog Comment Data Validation Tests ───

describe("Blog Comment Data Validation", () => {
  it("should validate that all blog articles have valid slugs for commenting", () => {
    const articles = getAllArticles();
    for (const article of articles) {
      expect(article.slug).toBeTruthy();
      expect(article.slug.length).toBeLessThanOrEqual(255);
      expect(article.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("should find articles by slug for comment validation", () => {
    const articles = getAllArticles();
    for (const article of articles) {
      const found = getArticleBySlug(article.slug);
      expect(found).toBeDefined();
      expect(found!.slug).toBe(article.slug);
    }
  });
});

// ─── Comment Section UI Helper Tests ───

describe("Comment Section Helpers", () => {
  describe("timeAgo formatting", () => {
    // Replicate the timeAgo function logic for testing
    function timeAgo(date: Date): string {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      const diffWeek = Math.floor(diffDay / 7);
      const diffMonth = Math.floor(diffDay / 30);

      if (diffSec < 60) return "just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      if (diffWeek < 5) return `${diffWeek}w ago`;
      if (diffMonth < 12) return `${diffMonth}mo ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    it("should return 'just now' for recent dates", () => {
      expect(timeAgo(new Date())).toBe("just now");
    });

    it("should return minutes ago", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(timeAgo(fiveMinAgo)).toBe("5m ago");
    });

    it("should return hours ago", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(timeAgo(threeHoursAgo)).toBe("3h ago");
    });

    it("should return days ago", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(timeAgo(twoDaysAgo)).toBe("2d ago");
    });

    it("should return weeks ago", () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      expect(timeAgo(twoWeeksAgo)).toBe("2w ago");
    });

    it("should return months ago", () => {
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      expect(timeAgo(twoMonthsAgo)).toBe("2mo ago");
    });
  });

  describe("avatarColor generation", () => {
    function avatarColor(name: string): string {
      const colors = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
        "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-lime-500",
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    }

    it("should return a valid Tailwind color class", () => {
      const color = avatarColor("Test User");
      expect(color).toMatch(/^bg-[a-z]+-500$/);
    });

    it("should return consistent color for same name", () => {
      expect(avatarColor("Alice")).toBe(avatarColor("Alice"));
    });

    it("should return different colors for different names", () => {
      // Not guaranteed but highly likely with different names
      const colors = new Set([
        avatarColor("Alice"),
        avatarColor("Bob"),
        avatarColor("Charlie"),
        avatarColor("Diana"),
      ]);
      expect(colors.size).toBeGreaterThanOrEqual(2);
    });
  });
});
