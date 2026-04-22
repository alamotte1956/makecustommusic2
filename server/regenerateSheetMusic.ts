/**
 * Script to regenerate sheet music for all songs in the database.
 * This will use the simple generator to create proper multi-line sheet music.
 */

import { getDb } from "./db";
import { songs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateSimpleSheetMusic } from "./simpleSheetMusicGenerator";
import { validateAbc } from "./backgroundSheetMusic";

async function regenerateAllSheetMusic() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Regenerate] Database not available");
      return;
    }

    console.log("[Regenerate] Fetching all songs...");
    const allSongs = await db.select().from(songs).limit(100);
    
    console.log(`[Regenerate] Found ${allSongs.length} songs to regenerate`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const song of allSongs) {
      try {
        console.log(`[Regenerate] Processing song ${song.id}: "${song.title}"...`);
        
        // Generate new ABC notation using simple generator
        const newAbc = generateSimpleSheetMusic(
          song.title,
          song.keySignature || "C",
          song.timeSignature || "4/4",
          song.tempo || 120,
          song.lyrics || ""
        );
        
        // Validate
        const validationError = validateAbc(newAbc);
        if (validationError) {
          console.warn(`[Regenerate] Validation failed for song ${song.id}: ${validationError}`);
          failCount++;
          continue;
        }
        
        // Update database
        await db.update(songs).set({
          sheetMusicAbc: newAbc,
          sheetMusicStatus: "done",
          sheetMusicError: null,
          updatedAt: new Date(),
        }).where(eq(songs.id, song.id));
        
        console.log(`[Regenerate] ✓ Successfully regenerated sheet music for song ${song.id}`);
        successCount++;
      } catch (error) {
        console.error(`[Regenerate] ✗ Failed to regenerate song ${song.id}:`, error);
        failCount++;
      }
    }
    
    console.log(`[Regenerate] Complete! Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error("[Regenerate] Fatal error:", error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  regenerateAllSheetMusic().then(() => process.exit(0));
}

export { regenerateAllSheetMusic };
