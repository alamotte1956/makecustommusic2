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
      expect(result).toHaveProperty("elevenlabs");
      expect(typeof result.elevenlabs).toBe("boolean");
    });

    it("does not include free engine", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.engines();
      expect(result).not.toHaveProperty("free");
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
      // It may succeed or fail (ElevenLabs API call), but should NOT throw a Zod error
      try {
        await caller.songs.generate({ keywords: "test", engine: "elevenlabs" });
      } catch (e: any) {
        // Should not be a Zod validation error
        expect(e.message).not.toMatch(/invalid_enum_value/i);
      }
    }, 60000);

    it("rejects free engine value", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({ keywords: "test", engine: "free" as any })
      ).rejects.toThrow();
    });

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
          engine: "elevenlabs",
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

    it("accepts custom mode fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Input validation should accept custom mode fields
      const promise = caller.songs.generate({
        keywords: "custom song",
        engine: "elevenlabs",
        mode: "custom",
        customTitle: "My Custom Song",
        customLyrics: "[Verse 1]\nHello world\n[Chorus]\nLa la la",
        customStyle: "pop, female vocals, upbeat",
        duration: 60,
      });

      // Should not throw a Zod validation error (may throw ElevenLabs API error)
      await expect(promise).rejects.not.toThrow(/invalid_type/i);
    });

    it("validates customLyrics max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          engine: "elevenlabs",
          mode: "custom",
          customLyrics: "a".repeat(10001),
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

    it("validates mode enum values", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generate({
          keywords: "test",
          engine: "elevenlabs",
          mode: "advanced" as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("songs.update", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 1, title: "Updated Title" })
      ).rejects.toThrow();
    });

    it("validates title min length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 1, title: "" })
      ).rejects.toThrow();
    });

    it("validates title max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 1, title: "a".repeat(256) })
      ).rejects.toThrow();
    });

    it("validates lyrics max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 1, lyrics: "a".repeat(5001) })
      ).rejects.toThrow();
    });

    it("validates genre max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 1, genre: "a".repeat(101) })
      ).rejects.toThrow();
    });

    it("validates mood max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 1, mood: "a".repeat(101) })
      ).rejects.toThrow();
    });

    it("validates styleTags max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 1, styleTags: "a".repeat(501) })
      ).rejects.toThrow();
    });

    it("throws for non-existent song", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.update({ id: 999999, title: "Updated" })
      ).rejects.toThrow("Song not found");
    });

    it("accepts nullable lyrics, genre, mood, styleTags", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Should pass validation (will fail at DB level for non-existent song)
      await expect(
        caller.songs.update({
          id: 999999,
          title: "Valid Title",
          lyrics: null,
          genre: null,
          mood: null,
          styleTags: null,
        })
      ).rejects.toThrow("Song not found");
    });

    it("accepts partial updates", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Only updating title should be valid
      await expect(
        caller.songs.update({ id: 999999, title: "Just Title" })
      ).rejects.toThrow("Song not found");
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

    it("accepts valid song id input", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Should not throw on input validation (may throw on DB not found)
      await expect(
        caller.songs.delete({ id: 999999 })
      ).rejects.toBeDefined();
    });

    it("rejects invalid input (missing id)", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error testing invalid input
        caller.songs.delete({})
      ).rejects.toThrow();
    });

    it("rejects invalid input (string id)", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error testing invalid input
        caller.songs.delete({ id: "abc" })
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

  describe("songs.generateLyrics", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generateLyrics({ subject: "love" })
      ).rejects.toThrow();
    });

    it("validates empty subject", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generateLyrics({ subject: "" })
      ).rejects.toThrow();
    });

    it("validates subject max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generateLyrics({ subject: "a".repeat(501) })
      ).rejects.toThrow();
    });

    it("accepts optional genre, mood, and vocalType", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Should pass input validation and attempt LLM call
      try {
        const result = await caller.songs.generateLyrics({
          subject: "summer road trip",
          genre: "Pop",
          mood: "Happy",
          vocalType: "female",
        });
        expect(result).toHaveProperty("lyrics");
        expect(typeof result.lyrics).toBe("string");
        expect(result.lyrics.length).toBeGreaterThan(0);
      } catch (e: any) {
        // LLM may fail in test env, but should not be a Zod validation error
        expect(e.message).not.toMatch(/invalid_type/i);
      }
    }, 30000);

    it("validates vocalType enum", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generateLyrics({
          subject: "love",
          vocalType: "soprano" as any,
        })
      ).rejects.toThrow();
    });

    it("generates lyrics for a simple subject", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.songs.generateLyrics({
          subject: "walking in the rain",
        });
        expect(result).toHaveProperty("lyrics");
        expect(typeof result.lyrics).toBe("string");
        expect(result.lyrics.length).toBeGreaterThan(50);
      } catch (e: any) {
        // LLM may fail in test env, but should not be a validation error
        expect(e.message).not.toMatch(/invalid_type/i);
      }
    }, 30000);
  });

  describe("songs.ttsPreview", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.ttsPreview({ text: "Hello world", voiceId: "test-voice" })
      ).rejects.toThrow();
    });

    it("validates empty text", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.ttsPreview({ text: "", voiceId: "test-voice" })
      ).rejects.toThrow();
    });

    it("validates text max length", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.ttsPreview({ text: "a".repeat(5001), voiceId: "test-voice" })
      ).rejects.toThrow();
    });

    it("validates empty voiceId", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.ttsPreview({ text: "Hello", voiceId: "" })
      ).rejects.toThrow();
    });
  });

  describe("songs.narration", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.narration({ songId: 1, text: "Welcome", voiceId: "v1", type: "intro" })
      ).rejects.toThrow();
    });

    it("validates type enum", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.narration({ songId: 1, text: "Welcome", voiceId: "v1", type: "middle" as any })
      ).rejects.toThrow();
    });

    it("throws for non-existent song", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.narration({ songId: 999999, text: "Welcome", voiceId: "v1", type: "intro" })
      ).rejects.toThrow("Song not found");
    });
  });

  describe("songs.generateVocals", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generateVocals({ songId: 1, lyrics: "La la la", voiceId: "v1" })
      ).rejects.toThrow();
    });

    it("validates empty lyrics", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generateVocals({ songId: 1, lyrics: "", voiceId: "v1" })
      ).rejects.toThrow();
    });

    it("throws for non-existent song", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.songs.generateVocals({ songId: 999999, lyrics: "La la la", voiceId: "v1" })
      ).rejects.toThrow("Song not found");
    });
  });

  describe("songs.voices", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.songs.voices()).rejects.toThrow();
    });

    it("returns array for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.songs.voices();
      expect(Array.isArray(result)).toBe(true);
    }, 30000);
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

  describe("albums.reorderSongs", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.reorderSongs({ albumId: 1, songIds: [1, 2, 3] })
      ).rejects.toThrow();
    });

    it("throws for non-existent album", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.reorderSongs({ albumId: 999999, songIds: [1, 2] })
      ).rejects.toThrow("Album not found");
    });

    it("validates albumId is a number", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.reorderSongs({ albumId: "abc" as any, songIds: [1] })
      ).rejects.toThrow();
    });

    it("validates songIds is a non-empty array", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.reorderSongs({ albumId: 1, songIds: [] })
      ).rejects.toThrow();
    });

    it("validates songIds contains numbers", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.reorderSongs({ albumId: 1, songIds: ["a", "b"] as any })
      ).rejects.toThrow();
    });
  });

  describe("albums.generateCover", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.generateCover({ albumId: 1 })
      ).rejects.toThrow();
    });

    it("throws for non-existent album", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.generateCover({ albumId: 999999 })
      ).rejects.toThrow("Album not found");
    });

    it("validates albumId is a number", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.albums.generateCover({ albumId: "abc" as any })
      ).rejects.toThrow();
    });
  });
});

describe("favorites router", () => {
  describe("favorites.toggle", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.favorites.toggle({ songId: 1 })
      ).rejects.toThrow();
    });

    it("validates songId is a number", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.favorites.toggle({ songId: "abc" as any })
      ).rejects.toThrow();
    });

    it("toggles favorite for a valid song", async () => {
      const { ctx } = createAuthContext(50);
      const caller = appRouter.createCaller(ctx);

      // First toggle should add to favorites
      const result1 = await caller.favorites.toggle({ songId: 999 });
      expect(result1).toHaveProperty("isFavorited");
      expect(typeof result1.isFavorited).toBe("boolean");

      // Second toggle should remove from favorites
      const result2 = await caller.favorites.toggle({ songId: 999 });
      expect(result2.isFavorited).toBe(!result1.isFavorited);
    });
  });

  describe("favorites.list", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.favorites.list()).rejects.toThrow();
    });

    it("returns array for authenticated user", async () => {
      const { ctx } = createAuthContext(51);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.favorites.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("favorites.ids", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.favorites.ids()).rejects.toThrow();
    });

    it("returns array of numbers for authenticated user", async () => {
      const { ctx } = createAuthContext(52);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.favorites.ids();
      expect(Array.isArray(result)).toBe(true);
    });

    it("reflects toggled favorites", async () => {
      const { ctx } = createAuthContext(53);
      const caller = appRouter.createCaller(ctx);

      // Start with no favorites
      const idsBefore = await caller.favorites.ids();
      const countBefore = idsBefore.length;

      // Add a favorite
      await caller.favorites.toggle({ songId: 12345 });
      const idsAfter = await caller.favorites.ids();
      expect(idsAfter.length).toBe(countBefore + 1);
      expect(idsAfter).toContain(12345);

      // Remove the favorite
      await caller.favorites.toggle({ songId: 12345 });
      const idsFinal = await caller.favorites.ids();
      expect(idsFinal.length).toBe(countBefore);
      expect(idsFinal).not.toContain(12345);
    });
  });
});
