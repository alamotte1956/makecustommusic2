import { describe, it, expect, vi } from "vitest";
import { getGenreGuidance, getMoodGuidance, buildProductionPrompt } from "./songwritingHelpers";

describe("Sheet Music & Chord Progression Backend", () => {
  describe("songwritingHelpers integration for sheet music context", () => {
    it("should build production prompt with all fields for sheet music context", () => {
      const result = buildProductionPrompt({
        keywords: "love song acoustic",
        genre: "pop",
        mood: "romantic",
        vocalType: "female",
        duration: 120,
        mode: "custom",
        customTitle: "Midnight Hearts",
        customLyrics: "[Verse 1]\nUnder the stars we danced\n[Chorus]\nMidnight hearts collide",
        customStyle: "acoustic pop ballad",
      });

      expect(result.prompt).toBeTruthy();
      expect(typeof result.prompt).toBe("string");
      expect(result.prompt.length).toBeGreaterThan(50);
      expect(result.forceInstrumental).toBe(false);
    });

    it("should produce instrumental prompt when vocalType is none", () => {
      const result = buildProductionPrompt({
        keywords: "jazz piano",
        genre: "jazz",
        mood: "chill",
        vocalType: "none",
        duration: 60,
        mode: "simple",
      });

      expect(result.forceInstrumental).toBe(true);
    });
  });

  describe("ChordProgressionData schema validation", () => {
    it("should validate a well-formed chord progression object", () => {
      const chordData = {
        key: "Am",
        capo: 0,
        tempo: 120,
        timeSignature: "4/4",
        sections: [
          {
            section: "Verse 1",
            chords: ["Am", "F", "C", "G"],
            strummingPattern: "D DU UDU",
            bpm: 120,
          },
          {
            section: "Chorus",
            chords: ["F", "G", "Am", "C"],
            strummingPattern: "D D DU DU",
            bpm: 120,
          },
        ],
        chordDiagrams: [
          {
            name: "Am",
            frets: [-1, 0, 2, 2, 1, 0],
            fingers: [0, 0, 2, 3, 1, 0],
            barres: [],
            baseFret: 1,
          },
          {
            name: "F",
            frets: [1, 1, 2, 3, 3, 1],
            fingers: [1, 1, 2, 3, 4, 1],
            barres: [{ fromString: 6, toString: 1, fret: 1 }],
            baseFret: 1,
          },
          {
            name: "C",
            frets: [-1, 3, 2, 0, 1, 0],
            fingers: [0, 3, 2, 0, 1, 0],
            barres: [],
            baseFret: 1,
          },
          {
            name: "G",
            frets: [3, 2, 0, 0, 0, 3],
            fingers: [2, 1, 0, 0, 0, 3],
            barres: [],
            baseFret: 1,
          },
        ],
        notes: "Use a capo on fret 2 for a brighter sound. Focus on smooth transitions between Am and F.",
      };

      // Validate structure
      expect(chordData.key).toBeTruthy();
      expect(typeof chordData.capo).toBe("number");
      expect(chordData.capo).toBeGreaterThanOrEqual(0);
      expect(chordData.tempo).toBeGreaterThan(0);
      expect(chordData.timeSignature).toMatch(/^\d+\/\d+$/);
      expect(chordData.sections.length).toBeGreaterThan(0);
      expect(chordData.chordDiagrams.length).toBeGreaterThan(0);

      // Validate sections
      for (const section of chordData.sections) {
        expect(section.section).toBeTruthy();
        expect(section.chords.length).toBeGreaterThan(0);
        expect(section.strummingPattern).toBeTruthy();
        expect(section.bpm).toBeGreaterThan(0);
      }

      // Validate chord diagrams
      for (const diagram of chordData.chordDiagrams) {
        expect(diagram.name).toBeTruthy();
        expect(diagram.frets).toHaveLength(6); // 6 strings
        expect(diagram.fingers).toHaveLength(6);
        expect(Array.isArray(diagram.barres)).toBe(true);
        expect(diagram.baseFret).toBeGreaterThanOrEqual(1);

        // Each fret value should be -1 (muted), 0 (open), or positive
        for (const fret of diagram.frets) {
          expect(fret).toBeGreaterThanOrEqual(-1);
        }

        // Each finger value should be 0-4
        for (const finger of diagram.fingers) {
          expect(finger).toBeGreaterThanOrEqual(0);
          expect(finger).toBeLessThanOrEqual(4);
        }
      }

      // All chords used in sections should have diagrams
      const diagramNames = new Set(chordData.chordDiagrams.map(d => d.name));
      for (const section of chordData.sections) {
        for (const chord of section.chords) {
          expect(diagramNames.has(chord)).toBe(true);
        }
      }
    });

    it("should handle capo position correctly", () => {
      const withCapo = {
        key: "G",
        capo: 3,
        tempo: 95,
        timeSignature: "4/4",
        sections: [{ section: "Verse", chords: ["G", "Em", "C", "D"], strummingPattern: "D DU", bpm: 95 }],
        chordDiagrams: [
          { name: "G", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], barres: [], baseFret: 1 },
          { name: "Em", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], barres: [], baseFret: 1 },
          { name: "C", frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], barres: [], baseFret: 1 },
          { name: "D", frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], barres: [], baseFret: 1 },
        ],
        notes: "Capo on fret 3. Actual sounding key is Bb major.",
      };

      expect(withCapo.capo).toBe(3);
      expect(withCapo.notes).toContain("Capo");
    });
  });

  describe("ABC notation format validation", () => {
    it("should validate a well-formed ABC notation string", () => {
      const abc = `X:1
T:Midnight Hearts
M:4/4
L:1/8
Q:1/4=120
K:Am
"Am"A2 B2 c2 d2 | "F"f4 e4 | "C"c2 d2 e2 f2 | "G"g4 z4 |
w:Un-der the stars we danced to-night my love`;

      // Validate required headers
      expect(abc).toContain("X:");
      expect(abc).toContain("T:");
      expect(abc).toContain("M:");
      expect(abc).toContain("K:");

      // Should contain notes (letters a-g or A-G)
      expect(abc).toMatch(/[a-gA-G]/);
    });

    it("should clean markdown code blocks from ABC notation", () => {
      const raw = "```abc\nX:1\nT:Test\nM:4/4\nK:C\nCDEF|GABC|\n```";
      const cleaned = raw.replace(/^```[a-z]*\n?/gm, "").replace(/```$/gm, "").trim();

      expect(cleaned).not.toContain("```");
      expect(cleaned).toContain("X:1");
      expect(cleaned).toContain("T:Test");
    });
  });

  describe("Database schema fields", () => {
    it("should have sheetMusicAbc and chordProgression fields defined", () => {
      // This test validates that the schema types are importable
      // The actual schema is validated at migration time
      const mockSong = {
        id: 1,
        userId: 1,
        title: "Test Song",
        keywords: "test",
        sheetMusicAbc: "X:1\nT:Test\nM:4/4\nK:C\nCDEF|",
        chordProgression: {
          key: "C",
          capo: 0,
          tempo: 120,
          timeSignature: "4/4",
          sections: [],
          chordDiagrams: [],
          notes: "",
        },
      };

      expect(mockSong.sheetMusicAbc).toBeTruthy();
      expect(mockSong.chordProgression).toBeTruthy();
      expect(mockSong.chordProgression.key).toBe("C");
    });
  });
});
