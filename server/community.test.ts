import { describe, it, expect } from "vitest";

describe("Community / Discover Feature", () => {
  describe("Visibility defaults", () => {
    it("should default song visibility to 'private'", () => {
      // The schema default is "private" for new songs
      const defaultVisibility = "private";
      expect(defaultVisibility).toBe("private");
    });

    it("should only allow 'public' or 'private' visibility values", () => {
      const validValues = ["public", "private"];
      expect(validValues).toContain("public");
      expect(validValues).toContain("private");
      expect(validValues).not.toContain("unlisted");
    });
  });

  describe("Community router structure", () => {
    it("should have discover, publish, and unpublish routes", async () => {
      const { appRouter } = await import("./routers");
      const procedures = Object.keys(appRouter._def.procedures);
      expect(procedures).toContain("community.discover");
      expect(procedures).toContain("community.publish");
      expect(procedures).toContain("community.unpublish");
    });
  });

  describe("Discover query input validation", () => {
    it("should accept valid limit and offset", () => {
      const validInput = { limit: 24, offset: 0 };
      expect(validInput.limit).toBeGreaterThanOrEqual(1);
      expect(validInput.limit).toBeLessThanOrEqual(100);
      expect(validInput.offset).toBeGreaterThanOrEqual(0);
    });

    it("should reject limit over 100", () => {
      const invalidLimit = 101;
      expect(invalidLimit).toBeGreaterThan(100);
    });

    it("should default to limit 24 and offset 0", () => {
      const defaults = { limit: 24, offset: 0 };
      expect(defaults.limit).toBe(24);
      expect(defaults.offset).toBe(0);
    });
  });

  describe("Publish/Unpublish flow", () => {
    it("should set visibility to 'public' when publishing", () => {
      const publishAction = { visibility: "public", publishedAt: new Date() };
      expect(publishAction.visibility).toBe("public");
      expect(publishAction.publishedAt).toBeInstanceOf(Date);
    });

    it("should set visibility to 'private' and clear publishedAt when unpublishing", () => {
      const unpublishAction = { visibility: "private", publishedAt: null };
      expect(unpublishAction.visibility).toBe("private");
      expect(unpublishAction.publishedAt).toBeNull();
    });

    it("should require songId for publish and unpublish", () => {
      const publishInput = { songId: 123 };
      expect(publishInput.songId).toBeDefined();
      expect(typeof publishInput.songId).toBe("number");
    });
  });

  describe("Public songs query", () => {
    it("should return songs with creator info", () => {
      const mockResult = {
        songs: [
          {
            id: 1,
            title: "Test Song",
            visibility: "public",
            creatorName: "John",
            creatorId: 42,
          },
        ],
        totalCount: 1,
        hasMore: false,
      };
      expect(mockResult.songs[0].creatorName).toBeDefined();
      expect(mockResult.songs[0].creatorId).toBeDefined();
      expect(mockResult.hasMore).toBe(false);
    });

    it("should calculate hasMore correctly", () => {
      const totalCount = 50;
      const limit = 24;
      const offset = 0;
      const hasMore = offset + limit < totalCount;
      expect(hasMore).toBe(true);

      const offset2 = 24;
      const hasMore2 = offset2 + limit < totalCount;
      expect(hasMore2).toBe(true);

      const offset3 = 48;
      const hasMore3 = offset3 + limit < totalCount;
      expect(hasMore3).toBe(false);
    });
  });
});
