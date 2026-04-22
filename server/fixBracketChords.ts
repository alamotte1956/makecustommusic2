/**
 * Batch fix for songs with bracket chords [C] -> "C"
 * 
 * This script finds all songs with ABC notation containing bracket chords
 * and converts them to the proper quoted format that abcjs can parse.
 * 
 * Usage: npx tsx server/fixBracketChords.ts
 */

import { getDb } from "./db";
import { songs } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const BRACKET_CHORD_REGEX = /\[([A-G][#b]?(?:m|maj|min|7|9|11|13|sus|add|dim|aug|maj7|min7|dom7)?(?:\/[A-G][#b]?)?)\]/g;

/**
 * Convert bracket chords to quoted chords in ABC notation
 */
function fixBracketChords(abc: string): string {
  return abc.replace(BRACKET_CHORD_REGEX, '"$1"');
}

/**
 * Check if ABC notation has bracket chords
 */
function hasBracketChords(abc: string): boolean {
  BRACKET_CHORD_REGEX.lastIndex = 0; // Reset regex state
  return BRACKET_CHORD_REGEX.test(abc);
}

/**
 * Main function to fix all songs
 */
async function fixAllSongs() {
  console.log("[FixBracketChords] Starting batch fix...");

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Get all songs with ABC notation
    const allSongs = await db.select().from(songs);
    console.log(`[FixBracketChords] Found ${allSongs.length} total songs`);

    let fixedCount = 0;
    let skippedCount = 0;
    const errors: { songId: number; title: string; error: string }[] = [];

    // Process each song
    for (const song of allSongs) {
      if (!song.sheetMusicAbc) {
        skippedCount++;
        continue;
      }

      // Check if this song has bracket chords
      if (!hasBracketChords(song.sheetMusicAbc)) {
        skippedCount++;
        continue;
      }

      try {
        // Fix the bracket chords
        const fixedAbc = fixBracketChords(song.sheetMusicAbc);

        // Update the database
        await db
          .update(songs)
          .set({
            sheetMusicAbc: fixedAbc,
            updatedAt: new Date(),
          })
          .where(eq(songs.id, song.id));

        fixedCount++;
        console.log(
          `[FixBracketChords] Fixed song ${song.id}: "${song.title}"`
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push({
          songId: song.id,
          title: song.title || "Unknown",
          error: errorMsg,
        });
        console.error(
          `[FixBracketChords] Error fixing song ${song.id}: ${errorMsg}`
        );
      }
    }

    // Print summary
    console.log("\n[FixBracketChords] Batch fix complete!");
    console.log(`  - Fixed: ${fixedCount} songs`);
    console.log(`  - Skipped: ${skippedCount} songs (no bracket chords)`);
    console.log(`  - Errors: ${errors.length} songs`);

    if (errors.length > 0) {
      console.log("\nErrors encountered:");
      errors.forEach((e) => {
        console.log(`  - Song ${e.songId} (${e.title}): ${e.error}`);
      });
    }

    console.log("[FixBracketChords] Done!");
    process.exit(0);
  } catch (err) {
    console.error("[FixBracketChords] Fatal error:", err);
    process.exit(1);
  }
}

// Run the fix
fixAllSongs();

export { fixAllSongs, fixBracketChords, hasBracketChords };
