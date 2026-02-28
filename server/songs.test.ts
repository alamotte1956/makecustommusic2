import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("engines router", () => {
  it("returns engine availability (free always true)", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.engines.available();
    expect(result).toBeTruthy();
    expect(result.free).toBe(true);
    expect(typeof result.suno).toBe("boolean");
    expect(typeof result.musicgen).toBe("boolean");
  });
});

describe("songs router", () => {
  describe("songs.list", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.songs.list()).rejects.toThrow();
    });

    it("returns songs for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("songs.generate", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({ keywords: "happy jazz" })
      ).rejects.toThrow();
    });

    it("validates empty keywords", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({ keywords: "" })
      ).rejects.toThrow();
    });

    it("accepts genre, mood, duration, and engine presets and generates a song", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.generate({
        keywords: "test composition",
        genre: "Jazz",
        mood: "Happy",
        vocalType: "none",
        duration: 30,
        engine: "free",
      });

      expect(result).toBeTruthy();
      expect(result?.title).toBeTruthy();
      expect(result?.abcNotation).toBeTruthy();
      expect(result?.genre).toBeTruthy();
      expect(result?.vocalType).toBe("none");
      expect(result?.engine).toBe("free");
    }, 30000);

    it("generates a song with female vocals", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.generate({
        keywords: "love ballad",
        vocalType: "female",
        engine: "free",
      });

      expect(result).toBeTruthy();
      expect(result?.title).toBeTruthy();
      expect(result?.vocalType).toBe("female");
    }, 30000);

    it("rejects invalid vocal type", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          // @ts-expect-error testing invalid input
          vocalType: "invalid",
        })
      ).rejects.toThrow();
    });

    it("rejects invalid engine", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          // @ts-expect-error testing invalid input
          engine: "invalid_engine",
        })
      ).rejects.toThrow();
    });

    it("rejects duration below minimum", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          duration: 3,
        })
      ).rejects.toThrow();
    });

    it("rejects duration above maximum", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          duration: 500,
        })
      ).rejects.toThrow();
    });

    it("defaults vocalType to none and engine to free when not provided", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.generate({ keywords: "simple test" });
      expect(result).toBeTruthy();
      expect(result?.vocalType).toBe("none");
      expect(result?.engine).toBe("free");
    }, 30000);
  });

  describe("songs.getById", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.getById({ id: 1 })
      ).rejects.toThrow();
    });

    it("returns null for non-existent song", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.getById({ id: 999999 });
      expect(result).toBeNull();
    });
  });

  describe("songs.delete", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.delete({ id: 1 })
      ).rejects.toThrow();
    });
  });

  describe("songs.createShareLink", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.createShareLink({ songId: 1 })
      ).rejects.toThrow();
    });

    it("throws for non-existent song", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.createShareLink({ songId: 999999 })
      ).rejects.toThrow("Song not found");
    });
  });

  describe("songs.getShared", () => {
    it("returns null for non-existent share token", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.getShared({ shareToken: "nonexistent-token" });
      expect(result).toBeNull();
    });

    it("does not require authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      // Should not throw auth error, just return null for missing token
      const result = await caller.songs.getShared({ shareToken: "test-token-123" });
      expect(result).toBeNull();
    });

    it("validates empty share token", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.getShared({ shareToken: "" })
      ).rejects.toThrow();
    });
  });
});

describe("albums router", () => {
  describe("albums.list", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.albums.list()).rejects.toThrow();
    });

    it("returns albums for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.albums.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("albums.create", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.create({ title: "Test Album" })
      ).rejects.toThrow();
    });

    it("validates empty title", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.create({ title: "" })
      ).rejects.toThrow();
    });

    it("creates an album with valid title", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.albums.create({
        title: "My Test Album",
        description: "A test album",
        coverColor: "#6366f1",
      });

      expect(result).toBeTruthy();
      expect(result?.title).toBe("My Test Album");
      expect(result?.description).toBe("A test album");
    });
  });

  describe("albums.getById", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.getById({ id: 1 })
      ).rejects.toThrow();
    });

    it("returns null for non-existent album", async () => {
      const { ctx } = createAuthContext(99);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.albums.getById({ id: 999999 });
      expect(result).toBeNull();
    });
  });

  describe("albums.delete", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.delete({ id: 1 })
      ).rejects.toThrow();
    });
  });

  describe("albums.update", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.update({ id: 1, title: "Updated" })
      ).rejects.toThrow();
    });
  });
});
