import { describe, expect, it } from "vitest";
import { filterSongs, type SongFilters } from "./SongFilters";

function makeSong(overrides: Partial<{
  id: number;
  title: string;
  keywords: string;
  genre: string | null;
  mood: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? "Test Song",
    keywords: overrides.keywords ?? "test keywords",
    genre: overrides.genre ?? null,
    mood: overrides.mood ?? null,
  };
}

const noFilters: SongFilters = { search: "", genre: "__all__", mood: "__all__" };

describe("filterSongs", () => {
  it("returns all songs when no filters are active", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })];
    const result = filterSongs(songs, noFilters);
    expect(result).toHaveLength(3);
  });

  it("returns empty array when songs is undefined", () => {
    const result = filterSongs(undefined, noFilters);
    expect(result).toEqual([]);
  });

  it("returns empty array when songs is empty", () => {
    const result = filterSongs([], noFilters);
    expect(result).toEqual([]);
  });

  it("filters out undefined items in the array", () => {
    const songs = [makeSong({ id: 1 }), undefined, makeSong({ id: 3 })];
    const result = filterSongs(songs, noFilters);
    expect(result).toHaveLength(2);
  });

  describe("search filter", () => {
    const songs = [
      makeSong({ id: 1, title: "Happy Jazz Piano", keywords: "jazz happy" }),
      makeSong({ id: 2, title: "Epic Rock Anthem", keywords: "rock epic guitar" }),
      makeSong({ id: 3, title: "Calm Ocean Waves", keywords: "ambient calm relaxing" }),
    ];

    it("filters by title (case insensitive)", () => {
      const result = filterSongs(songs, { ...noFilters, search: "jazz" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("filters by keywords (case insensitive)", () => {
      const result = filterSongs(songs, { ...noFilters, search: "GUITAR" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("matches partial title", () => {
      const result = filterSongs(songs, { ...noFilters, search: "oce" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it("matches partial keywords", () => {
      const result = filterSongs(songs, { ...noFilters, search: "relax" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it("returns empty when no match", () => {
      const result = filterSongs(songs, { ...noFilters, search: "nonexistent" });
      expect(result).toHaveLength(0);
    });

    it("trims whitespace from search query", () => {
      const result = filterSongs(songs, { ...noFilters, search: "  jazz  " });
      expect(result).toHaveLength(1);
    });

    it("empty search returns all songs", () => {
      const result = filterSongs(songs, { ...noFilters, search: "   " });
      expect(result).toHaveLength(3);
    });
  });

  describe("genre filter", () => {
    const songs = [
      makeSong({ id: 1, genre: "Jazz" }),
      makeSong({ id: 2, genre: "Rock" }),
      makeSong({ id: 3, genre: "Jazz" }),
      makeSong({ id: 4, genre: null }),
    ];

    it("filters by exact genre match", () => {
      const result = filterSongs(songs, { ...noFilters, genre: "Jazz" });
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.id)).toEqual([1, 3]);
    });

    it("__all__ returns all songs", () => {
      const result = filterSongs(songs, { ...noFilters, genre: "__all__" });
      expect(result).toHaveLength(4);
    });

    it("empty genre string returns all songs", () => {
      const result = filterSongs(songs, { ...noFilters, genre: "" });
      expect(result).toHaveLength(4);
    });

    it("non-matching genre returns empty", () => {
      const result = filterSongs(songs, { ...noFilters, genre: "Classical" });
      expect(result).toHaveLength(0);
    });
  });

  describe("mood filter", () => {
    const songs = [
      makeSong({ id: 1, mood: "Happy" }),
      makeSong({ id: 2, mood: "Sad" }),
      makeSong({ id: 3, mood: "Happy" }),
      makeSong({ id: 4, mood: null }),
    ];

    it("filters by exact mood match", () => {
      const result = filterSongs(songs, { ...noFilters, mood: "Sad" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("__all__ returns all songs", () => {
      const result = filterSongs(songs, { ...noFilters, mood: "__all__" });
      expect(result).toHaveLength(4);
    });

    it("empty mood string returns all songs", () => {
      const result = filterSongs(songs, { ...noFilters, mood: "" });
      expect(result).toHaveLength(4);
    });
  });

  describe("combined filters", () => {
    const songs = [
      makeSong({ id: 1, title: "Happy Jazz", keywords: "jazz", genre: "Jazz", mood: "Happy" }),
      makeSong({ id: 2, title: "Sad Jazz", keywords: "jazz", genre: "Jazz", mood: "Sad" }),
      makeSong({ id: 3, title: "Happy Rock", keywords: "rock", genre: "Rock", mood: "Happy" }),
      makeSong({ id: 4, title: "Sad Rock", keywords: "rock", genre: "Rock", mood: "Sad" }),
    ];

    it("search + genre", () => {
      const result = filterSongs(songs, { search: "happy", genre: "Jazz", mood: "__all__" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("search + mood", () => {
      const result = filterSongs(songs, { search: "rock", genre: "__all__", mood: "Sad" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
    });

    it("genre + mood", () => {
      const result = filterSongs(songs, { search: "", genre: "Jazz", mood: "Sad" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it("all three filters combined", () => {
      const result = filterSongs(songs, { search: "happy", genre: "Rock", mood: "Happy" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it("all three filters with no match", () => {
      const result = filterSongs(songs, { search: "jazz", genre: "Rock", mood: "Happy" });
      expect(result).toHaveLength(0);
    });
  });
});
