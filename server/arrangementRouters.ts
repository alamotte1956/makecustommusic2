/**
 * Arrangement tRPC Routers
 * 
 * Provides procedures for generating multi-part arrangements
 * and exporting individual PDF files for each part.
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import ArrangementAnalyzer, { InstrumentationConfig } from "./arrangementAnalyzer";
import MultiPartMelodyGenerator from "./multiPartMelodyGenerator";
import MultiPartPdfExporter from "./multiPartPdfExporter";
import * as path from "path";
import * as fs from "fs";

export const arrangementRouter = router({
  /**
   * Analyze a song and generate arrangement parts
   */
  analyzeSong: publicProcedure
    .input(
      z.object({
        songTitle: z.string(),
        genre: z.string(),
        mood: z.string(),
        tempo: z.number(),
        keySignature: z.string(),
        timeSignature: z.string().optional().default("4/4"),
        lyrics: z.string().optional(),
        instrumentationConfig: z.object({
          presetId: z.string().optional(),
          parts: z.record(
            z.string(),
            z.object({
              enabled: z.boolean(),
              prominence: z.number().min(1).max(10)
            })
          )
        }).optional()
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const analysis = await ArrangementAnalyzer.analyzeSong(
          input.songTitle,
          input.genre,
          input.mood,
          input.tempo,
          input.keySignature,
          input.timeSignature,
          input.lyrics,
          input.instrumentationConfig as InstrumentationConfig | undefined
        );

        return {
          success: true,
          analysis
        };
      } catch (error) {
        console.error("Error analyzing song:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }),

  /**
   * Generate multi-part melodies for an arrangement
   */
  generateMultiPartMelodies: publicProcedure
    .input(
      z.object({
        songTitle: z.string(),
        mainMelody: z.string(),
        chordProgression: z.string(),
        tempo: z.number(),
        keySignature: z.string(),
        timeSignature: z.string(),
        arrangementParts: z.array(
          z.object({
            name: z.string(),
            type: z.enum(["vocal", "instrument"]),
            instrument: z.string().optional(),
            clef: z.enum(["treble", "bass", "alto"]),
            range: z.object({
              low: z.number(),
              high: z.number()
            }),
            description: z.string(),
            voiceType: z.enum(["soprano", "alto", "tenor", "bass"]).optional()
          })
        ),
        lyrics: z.string().optional()
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        const melodyLines = await MultiPartMelodyGenerator.generateMultiPartMelodies(
          input.songTitle,
          input.mainMelody,
          input.chordProgression,
          input.tempo,
          input.keySignature,
          input.timeSignature,
          input.arrangementParts,
          input.lyrics
        );

        return {
          success: true,
          melodyLines
        };
      } catch (error) {
        console.error("Error generating multi-part melodies:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }),

  /**
   * Export all arrangement parts as individual PDFs
   */
  exportPartsPdf: publicProcedure
    .input(
      z.object({
        songTitle: z.string(),
        composer: z.string(),
        arranger: z.string().optional(),
        tempo: z.number(),
        keySignature: z.string(),
        timeSignature: z.string(),
        melodyLines: z.array(
          z.object({
            partName: z.string(),
            partType: z.enum(["vocal", "instrument"]),
            voiceType: z.string().optional(),
            clef: z.enum(["treble", "bass", "alto"]),
            range: z.object({
              low: z.number(),
              high: z.number()
            }),
            abcNotation: z.string(),
            description: z.string()
          })
        )
      })
    )
    .mutation(async ({ input }: any) => {
      try {
        // Create output directory
        const outputDir = path.join(process.cwd(), "public", "arrangements", input.songTitle);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Export individual PDFs
        const fileMap = await MultiPartPdfExporter.exportAllPartsPdf(
          input.melodyLines,
          {
            title: input.songTitle,
            composer: input.composer,
            arranger: input.arranger,
            tempo: input.tempo,
            keySignature: input.keySignature,
            timeSignature: input.timeSignature
          },
          outputDir
        );

        // Export combined score
        const combinedPath = await MultiPartPdfExporter.exportCombinedScorePdf(
          input.melodyLines,
          {
            title: input.songTitle,
            composer: input.composer,
            arranger: input.arranger,
            tempo: input.tempo,
            keySignature: input.keySignature,
            timeSignature: input.timeSignature
          },
          outputDir
        );

        // Convert to URLs
        const pdfUrls: Record<string, string> = {};
        const fileEntries = Array.from(fileMap.entries());
        for (const [partName, filePath] of fileEntries) {
          const relativePath = path.relative(path.join(process.cwd(), "public"), filePath);
          pdfUrls[partName] = `/${relativePath}`;
        }

        const combinedUrl = `/${path.relative(path.join(process.cwd(), "public"), combinedPath)}`;

        return {
          success: true,
          pdfUrls,
          combinedScoreUrl: combinedUrl,
          outputDirectory: outputDir
        };
      } catch (error) {
        console.error("Error exporting PDFs:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }),

  /**
   * Get arrangement presets for different music styles
   */
  getArrangementPresets: publicProcedure.query(async () => {
    return {
      presets: {
        pop: {
          name: "Pop/Contemporary",
          description: "Modern pop arrangement with vocals, piano, bass, and drums",
          instruments: ["Lead Vocal", "Harmony Vocal 1", "Piano", "Bass", "Drums"]
        },
        worship: {
          name: "Worship/Gospel",
          description: "Full vocal harmonies with piano, guitar, bass, and drums",
          instruments: [
            "Lead Vocal",
            "Harmony Vocal 1 (Alto)",
            "Harmony Vocal 2 (Tenor)",
            "Harmony Vocal 3 (Bass)",
            "Piano",
            "Guitar",
            "Bass",
            "Drums"
          ]
        },
        classical: {
          name: "Classical/Orchestral",
          description: "String and piano arrangement",
          instruments: ["Soprano Vocal", "Violin I", "Violin II", "Cello", "Piano"]
        },
        jazz: {
          name: "Jazz",
          description: "Jazz trio with vocals",
          instruments: ["Lead Vocal", "Piano", "Bass", "Drums"]
        },
        acoustic: {
          name: "Acoustic",
          description: "Minimal arrangement with vocals and guitar",
          instruments: ["Lead Vocal", "Guitar", "Bass"]
        }
      }
    };
  })
});

export default arrangementRouter;
