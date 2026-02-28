import { describe, expect, it, vi } from "vitest";
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

describe("songs router", () => {
  describe("songs.engines", () => {
    it("returns available engines (public)", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.engines();
      expect(result).toHaveProperty("free", true);
      expect(result).toHaveProperty("suno");
      expect(typeof result.suno).toBe("boolean");
    });

    it("free engine is always available", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.engines();
      expect(result.free).toBe(true);
    });
  });

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

    it("validates keywords max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({ keywords: "a".repeat(501) })
      ).rejects.toThrow();
    });

    it("accepts valid engine values", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Valid engine should pass input validation and attempt generation
      // It may succeed or fail (LLM call), but should NOT throw a Zod error
      try {
        await caller.songs.generate({ keywords: "test", engine: "free" });
      } catch (e: any) {
        // Should not be a Zod validation error
        expect(e.message).not.toMatch(/invalid_enum_value/i);
      }
    }, 60000);

    it("rejects invalid engine values", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({ keywords: "test", engine: "invalid" as any })
      ).rejects.toThrow();
    });

    it("accepts optional genre, mood, vocalType, and duration", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Valid optional fields should pass input validation
      try {
        await caller.songs.generate({
          keywords: "test music",
          engine: "free",
          genre: "Jazz",
          mood: "Happy",
          vocalType: "male",
          duration: 60,
        });
      } catch (e: any) {
        // Should not be a Zod validation error
        expect(e.message).not.toMatch(/invalid_type/i);
        expect(e.message).not.toMatch(/invalid_enum_value/i);
      }
    }, 60000);

    it("validates duration range (min 15)", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({ keywords: "test", duration: 5 })
      ).rejects.toThrow();
    });

    it("validates duration range (max 240)", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({ keywords: "test", duration: 500 })
      ).rejects.toThrow();
    });

    it("accepts Suno custom mode fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Input validation should accept custom mode fields
      const promise = caller.songs.generate({
        keywords: "custom song",
        engine: "suno",
        sunoMode: "custom",
        customTitle: "My Custom Song",
        customLyrics: "[Verse 1]\nHello world\n[Chorus]\nLa la la",
        customStyle: "pop, female vocals, upbeat",
        duration: 60,
      });

      // Should not throw a Zod validation error (may throw Suno API error)
      await expect(promise).rejects.not.toThrow(/invalid_type/i);
    });

    it("validates customLyrics max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          engine: "suno",
          sunoMode: "custom",
          customLyrics: "a".repeat(5001),
          customStyle: "pop",
        })
      ).rejects.toThrow();
    });

    it("validates vocalType enum values", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          vocalType: "soprano" as any,
        })
      ).rejects.toThrow();
    });

    it("validates sunoMode enum values", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          engine: "suno",
          sunoMode: "advanced" as any,
        })
      ).rejects.toThrow();
    });
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

      const result = await caller.songs.getShared({ shareToken: "nonexistent-token-xyz" });
      expect(result).toBeNull();
    });

    it("does not require authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      // Should not throw auth error, just return null
      const result = await caller.songs.getShared({ shareToken: "test-token" });
      expect(result).toBeNull();
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

  describe("albums.addSong", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.addSong({ albumId: 1, songId: 1 })
      ).rejects.toThrow();
    });
  });

  describe("albums.removeSong", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.removeSong({ albumId: 1, songId: 1 })
      ).rejects.toThrow();
    });
  });
});
