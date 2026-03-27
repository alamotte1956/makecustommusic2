import { describe, it, expect } from "vitest";
import { getGenreGuidance, getMoodGuidance, buildProductionPrompt } from "./songwritingHelpers";
import { estimateBpmFromGenre } from "./ssmlBuilder";

describe("Additional Christian Sub-Genres", () => {
  // ─── Genre Guidance ───
  describe("Genre Guidance", () => {
    it("should return Christian Rock guidance with Skillet reference", () => {
      const guidance = getGenreGuidance("Christian Rock");
      expect(guidance).toContain("CHRISTIAN ROCK");
      expect(guidance).toContain("Skillet");
      expect(guidance).toContain("Switchfoot");
      expect(guidance).toContain("arena rock");
    });

    it("should return Christian Hip Hop guidance with Lecrae reference", () => {
      const guidance = getGenreGuidance("Christian Hip Hop");
      expect(guidance).toContain("CHRISTIAN HIP HOP");
      expect(guidance).toContain("Lecrae");
      expect(guidance).toContain("NF");
      expect(guidance).toContain("Andy Mineo");
    });

    it("should return Southern Gospel guidance with Gaither reference", () => {
      const guidance = getGenreGuidance("Southern Gospel");
      expect(guidance).toContain("SOUTHERN GOSPEL");
      expect(guidance).toContain("Gaither");
      expect(guidance).toContain("Four-part");
      expect(guidance).toContain("quartet");
    });

    it("should return Hymns guidance with Getty reference", () => {
      const guidance = getGenreGuidance("Hymns");
      expect(guidance).toContain("HYMNS");
      expect(guidance).toContain("Getty");
      expect(guidance).toContain("theological");
    });

    it("should return Praise & Worship guidance with Planetshakers reference", () => {
      const guidance = getGenreGuidance("Praise & Worship");
      expect(guidance).toContain("PRAISE & WORSHIP");
      expect(guidance).toContain("Planetshakers");
      expect(guidance).toContain("Jesus Culture");
      expect(guidance).toContain("HIGH ENERGY");
    });

    it("should return Christian R&B guidance with Jonathan McReynolds reference", () => {
      const guidance = getGenreGuidance("Christian R&B");
      expect(guidance).toContain("CHRISTIAN R&B");
      expect(guidance).toContain("Jonathan McReynolds");
      expect(guidance).toContain("DOE");
      expect(guidance).toContain("soulful");
    });

    it("should be case-insensitive for all new genres", () => {
      expect(getGenreGuidance("christian rock")).toBe(getGenreGuidance("Christian Rock"));
      expect(getGenreGuidance("christian hip hop")).toBe(getGenreGuidance("Christian Hip Hop"));
      expect(getGenreGuidance("southern gospel")).toBe(getGenreGuidance("Southern Gospel"));
      expect(getGenreGuidance("hymns")).toBe(getGenreGuidance("Hymns"));
      expect(getGenreGuidance("praise & worship")).toBe(getGenreGuidance("Praise & Worship"));
      expect(getGenreGuidance("christian r&b")).toBe(getGenreGuidance("Christian R&B"));
    });
  });

  // ─── BPM Estimation ───
  describe("BPM Estimation", () => {
    it("should return correct BPM for christian rock", () => {
      expect(estimateBpmFromGenre("christian rock")).toBe(130);
    });

    it("should return correct BPM for christian hip hop", () => {
      expect(estimateBpmFromGenre("christian hip hop")).toBe(90);
    });

    it("should return correct BPM for southern gospel", () => {
      expect(estimateBpmFromGenre("southern gospel")).toBe(95);
    });

    it("should return correct BPM for hymns", () => {
      expect(estimateBpmFromGenre("hymns")).toBe(80);
    });

    it("should return correct BPM for praise & worship", () => {
      expect(estimateBpmFromGenre("praise & worship")).toBe(130);
    });

    it("should return correct BPM for christian r&b", () => {
      expect(estimateBpmFromGenre("christian r&b")).toBe(80);
    });
  });

  // ─── Sonic Signatures ───
  describe("Sonic Signatures in Production Prompts", () => {
    it("should include Christian Rock sonic signature with guitar and arena references", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "spiritual warfare",
        genre: "Christian Rock",
        mood: "Energetic",
        vocalType: "male",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("CHRISTIAN ROCK SONIC IDENTITY");
      expect(prompt).toContain("HEAVY GUITARS");
      expect(prompt).toContain("Skillet");
    });

    it("should include Christian Hip Hop sonic signature with 808 references", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "redemption story",
        genre: "Christian Hip Hop",
        mood: "Dark",
        vocalType: "male",
        duration: 90,
        mode: "simple",
      });
      expect(prompt).toContain("CHRISTIAN HIP HOP SONIC IDENTITY");
      expect(prompt).toContain("808");
      expect(prompt).toContain("Lecrae");
    });

    it("should include Southern Gospel sonic signature with quartet references", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "heaven bound",
        genre: "Southern Gospel",
        mood: "Uplifting",
        vocalType: "mixed",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("SOUTHERN GOSPEL SONIC IDENTITY");
      expect(prompt).toContain("FOUR-PART VOCAL HARMONY");
      expect(prompt).toContain("Gaither");
    });

    it("should include Hymns sonic signature with organ and choir references", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "amazing grace",
        genre: "Hymns",
        mood: "Devotional",
        vocalType: "mixed",
        duration: 120,
        mode: "simple",
      });
      expect(prompt).toContain("HYMNS SONIC IDENTITY");
      expect(prompt).toContain("ORGAN");
      expect(prompt).toContain("CHOIR");
    });

    it("should include Praise & Worship sonic signature with driving drums references", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "celebrate the Lord",
        genre: "Praise & Worship",
        mood: "Triumphant",
        vocalType: "mixed",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("PRAISE & WORSHIP SONIC IDENTITY");
      expect(prompt).toContain("DRIVING DRUMS");
      expect(prompt).toContain("PRAISE BREAK");
    });

    it("should include Christian R&B sonic signature with neo-soul references", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "God's love",
        genre: "Christian R&B",
        mood: "Romantic",
        vocalType: "female",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("CHRISTIAN R&B SONIC IDENTITY");
      expect(prompt).toContain("NEO-SOUL KEYS");
      expect(prompt).toContain("Jonathan McReynolds");
    });
  });

  // ─── Arrangement Templates ───
  describe("Genre-Specific Arrangements", () => {
    it("should use Christian Rock arrangement with guitar riff intro", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "fight the good fight",
        genre: "Christian Rock",
        mood: null,
        vocalType: "male",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("guitar riff");
      expect(prompt).toContain("FULL POWER");
    });

    it("should use Christian Hip Hop arrangement with 808 beat drop", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "my testimony",
        genre: "Christian Hip Hop",
        mood: null,
        vocalType: "male",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("808");
      expect(prompt).toContain("bars");
    });

    it("should use Southern Gospel arrangement with piano intro", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "old rugged cross",
        genre: "Southern Gospel",
        mood: null,
        vocalType: "mixed",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("Piano intro");
      expect(prompt).toContain("quartet");
    });

    it("should use Hymns arrangement with organ", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "be thou my vision",
        genre: "Hymns",
        mood: null,
        vocalType: "mixed",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("Organ");
    });

    it("should use Praise & Worship arrangement with driving drums", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "shout to the Lord",
        genre: "Praise & Worship",
        mood: null,
        vocalType: "mixed",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("drum");
      expect(prompt).toContain("celebration");
    });

    it("should use Christian R&B arrangement with smooth keys", () => {
      const { prompt } = buildProductionPrompt({
        keywords: "grace and love",
        genre: "Christian R&B",
        mood: null,
        vocalType: "female",
        duration: 60,
        mode: "simple",
      });
      expect(prompt).toContain("Smooth");
      expect(prompt).toContain("gospel");
    });
  });

  // ─── Custom Mode ───
  describe("Custom Mode with Christian Sub-Genres", () => {
    it("should include sonic signature in custom mode style for Christian Rock", () => {
      const { prompt, style } = buildProductionPrompt({
        keywords: "",
        genre: "Christian Rock",
        mood: "Energetic",
        vocalType: "male",
        duration: 90,
        mode: "custom",
        customTitle: "Stand Firm",
        customLyrics: "[Verse 1]\nIn the fire, in the fight\nI will stand, I will rise\n\n[Chorus]\nStand firm, stand strong\nMy God is with me all along",
        customStyle: "hard rock with faith",
      });
      // In custom mode, prompt = only lyrics
      expect(prompt).toContain("In the fire, in the fight");
      // Sonic signature goes into style field
      expect(style).toContain("CHRISTIAN ROCK SONIC IDENTITY");
    });

    it("should include sonic signature in custom mode style for Hymns", () => {
      const { prompt, style } = buildProductionPrompt({
        keywords: "",
        genre: "Hymns",
        mood: "Devotional",
        vocalType: "mixed",
        duration: 120,
        mode: "custom",
        customTitle: "O Sacred Head",
        customLyrics: "[Verse 1]\nO sacred head now wounded\nWith grief and shame weighed down\n\n[Verse 2]\nWhat language shall I borrow\nTo thank Thee, dearest Friend",
        customStyle: "traditional hymn with organ",
      });
      // In custom mode, prompt = only lyrics
      expect(prompt).toContain("O sacred head now wounded");
      // Sonic signature goes into style field
      expect(style).toContain("HYMNS SONIC IDENTITY");
    });
  });

  // ─── Production Settings ───
  describe("Genre Production Settings", () => {
    const genres = [
      "Christian Rock", "Christian Hip Hop", "Southern Gospel",
      "Hymns", "Praise & Worship", "Christian R&B",
    ];

    for (const genre of genres) {
      it(`should include BPM in style for ${genre}`, () => {
        const { style } = buildProductionPrompt({
          keywords: "test",
          genre,
          mood: null,
          vocalType: "male",
          duration: 30,
          mode: "simple",
        });
        // BPM and instrumentation are in the style field
        expect(style).toContain("BPM");
      });
    }
  });

  // ─── Ensure No Cross-Contamination ───
  describe("Genre Isolation", () => {
    it("should NOT include Christian sonic signatures for non-Christian genres", () => {
      const nonChristianGenres = ["Pop", "Rock", "Jazz", "Electronic", "Hip Hop"];
      for (const genre of nonChristianGenres) {
        const { prompt } = buildProductionPrompt({
          keywords: "test",
          genre,
          mood: null,
          vocalType: "male",
          duration: 30,
          mode: "simple",
        });
        expect(prompt).not.toContain("SONIC IDENTITY");
      }
    });

    it("should produce distinct prompts for each Christian sub-genre", () => {
      const genres = [
        "Christian", "Gospel", "Christian Modern", "Christian Pop",
        "Christian Rock", "Christian Hip Hop", "Southern Gospel",
        "Hymns", "Praise & Worship", "Christian R&B",
      ];
      const prompts = genres.map(genre =>
        buildProductionPrompt({
          keywords: "faith",
          genre,
          mood: null,
          vocalType: "male",
          duration: 60,
          mode: "simple",
        }).prompt
      );
      // Each prompt should be unique
      const uniquePrompts = new Set(prompts);
      expect(uniquePrompts.size).toBe(genres.length);
    });
  });
});
