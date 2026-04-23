import { describe, it, expect, vi } from "vitest";
import { generateSheetMusicImproved } from "./improvedSheetMusicGenerator";
import {
  generateComprehensiveSheetMusic,
  generateComprehensiveSheetMusicWithLyrics,
} from "./comprehensiveSheetMusicGenerator";
import { validateAbc } from "./backgroundSheetMusic";

describe("improvedSheetMusicGenerator", () => {
  it("should generate ABC with chord symbols via LLM", async () => {
    const abc = await generateSheetMusicImproved(
      "Chord Test",
      "Christian",
      "G",
      "4/4",
      120,
      "Test lyrics for a worship song"
    );

    // Check for chord symbols (e.g., "C", "G", "Am")
    expect(abc).toMatch(/"[A-G][m7b#]*"/);
    // Check required headers
    expect(abc).toContain("X: 1");
    expect(abc).toContain("K:");
    // Check for bar lines
    expect(abc).toContain("|");

    console.log("LLM-generated ABC (first 600 chars):");
    console.log(abc.substring(0, 600));
  }, 60000);

  it("should generate valid ABC notation structure via LLM", async () => {
    const abc = await generateSheetMusicImproved(
      "Structure Test",
      "Christian Pop",
      "C",
      "4/4",
      120,
      "Amazing grace how sweet the sound that saved a wretch like me"
    );

    // Validate with the same validator used in production
    const validationError = validateAbc(abc);
    expect(validationError).toBeNull();

    // Check for note content
    expect(abc).toMatch(/[A-Ga-g]/);

    console.log("LLM-generated ABC (first 600 chars):");
    console.log(abc.substring(0, 600));
  }, 60000);
});

describe("comprehensiveSheetMusicGenerator (fallback)", () => {
  it("should generate valid ABC notation for key of C", () => {
    const abc = generateComprehensiveSheetMusic({
      title: "Test Song C",
      key: "C",
      timeSignature: "4/4",
      tempo: 120,
    });

    // Required headers
    expect(abc).toContain("X: 1");
    expect(abc).toContain("T: Test Song C");
    expect(abc).toContain("M: 4/4");
    expect(abc).toContain("L: 1/8");
    expect(abc).toContain("Q: 1/4=120");
    expect(abc).toContain("K: C");

    // Must have chord symbols
    expect(abc).toMatch(/"[A-G][m7b#]*"/);

    // Must have bar lines
    expect(abc).toContain("|");

    // Must have section comments
    expect(abc).toContain("% Intro");
    expect(abc).toContain("% Verse 1");
    expect(abc).toContain("% Chorus");
    expect(abc).toContain("% Bridge");

    // Validate with production validator
    const validationError = validateAbc(abc);
    expect(validationError).toBeNull();

    console.log("Fallback ABC for C (first 600 chars):");
    console.log(abc.substring(0, 600));
  });

  it("should generate valid ABC for key of G", () => {
    const abc = generateComprehensiveSheetMusic({
      title: "Test Song G",
      key: "G",
      timeSignature: "4/4",
      tempo: 100,
    });

    expect(abc).toContain("K: G");
    const validationError = validateAbc(abc);
    expect(validationError).toBeNull();
  });

  it("should generate valid ABC for key of Am", () => {
    const abc = generateComprehensiveSheetMusic({
      title: "Test Song Am",
      key: "Am",
      timeSignature: "4/4",
      tempo: 90,
    });

    expect(abc).toContain("K: Am");
    const validationError = validateAbc(abc);
    expect(validationError).toBeNull();
  });

  it("should produce different output for different titles (seeded variety)", () => {
    const abc1 = generateComprehensiveSheetMusic({
      title: "Song Alpha",
      key: "C",
    });
    const abc2 = generateComprehensiveSheetMusic({
      title: "Song Beta",
      key: "C",
    });

    // Strip headers (which differ by title) and compare music body
    const body1 = abc1.split("\n").filter((l) => !l.startsWith("X:") && !l.startsWith("T:")).join("\n");
    const body2 = abc2.split("\n").filter((l) => !l.startsWith("X:") && !l.startsWith("T:")).join("\n");

    // The music bodies should be different due to seeded randomness
    expect(body1).not.toBe(body2);
  });

  it("should NOT produce ascending scale runs", () => {
    const abc = generateComprehensiveSheetMusic({
      title: "Anti Scale Test",
      key: "C",
    });

    // Extract just the note names from the ABC
    const noteNames = abc
      .replace(/"[^"]*"/g, "")  // remove chord symbols
      .replace(/%.*$/gm, "")     // remove comments
      .replace(/w:.*$/gm, "")    // remove lyrics
      .match(/[A-Ga-g][,']*/g) || [];

    // Check there are no 7+ consecutive ascending scale steps
    const noteValues: Record<string, number> = {
      C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6,
      c: 7, d: 8, e: 9, f: 10, g: 11, a: 12, b: 13,
    };

    let maxConsecutiveSteps = 0;
    let consecutiveSteps = 0;
    for (let i = 1; i < noteNames.length; i++) {
      const prev = noteValues[noteNames[i - 1]] ?? -1;
      const curr = noteValues[noteNames[i]] ?? -1;
      if (prev >= 0 && curr >= 0 && curr - prev === 1) {
        consecutiveSteps++;
        maxConsecutiveSteps = Math.max(maxConsecutiveSteps, consecutiveSteps);
      } else {
        consecutiveSteps = 0;
      }
    }

    // Should not have 7+ consecutive ascending steps (that's a scale run)
    expect(maxConsecutiveSteps).toBeLessThan(7);
    console.log(`Max consecutive ascending steps: ${maxConsecutiveSteps}`);
  });

  it("should include rests for musical breathing", () => {
    const abc = generateComprehensiveSheetMusic({
      title: "Rest Test",
      key: "C",
    });

    // Must contain rests (z or z2 or z4)
    expect(abc).toMatch(/z[0-9]?/);
  });

  it("should generate lyrics-aligned ABC when lyrics provided", () => {
    const abc = generateComprehensiveSheetMusicWithLyrics({
      title: "Lyrics Test",
      key: "C",
      lyrics: "Amazing grace how sweet the sound\nThat saved a wretch like me",
    });

    // Must contain w: lyrics lines
    expect(abc).toContain("w:");
    expect(abc).toMatch(/w:.*Amazing/i);
  });

  it("should handle all supported keys without errors", () => {
    const keys = ["C", "G", "D", "A", "F", "Am", "Em"];
    for (const key of keys) {
      const abc = generateComprehensiveSheetMusic({
        title: `Key Test ${key}`,
        key,
      });
      const validationError = validateAbc(abc);
      expect(validationError).toBeNull();
    }
  });
});
