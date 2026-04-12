import { generateAbcNotation } from "./server/backgroundSheetMusic.ts";
import { getDb } from "./server/db.ts";
import { updateSongSheetMusic } from "./server/db.ts";

async function regenerateAllSheetMusic() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  // Get all songs
  const songs = await db.select().from(songs);
  console.log(`Found ${songs.length} songs`);

  let regenerated = 0;
  for (const song of songs) {
    try {
      console.log(`Regenerating sheet music for song ${song.id}: "${song.title}"`);
      const abc = await generateAbcNotation(song);
      await updateSongSheetMusic(song.id, abc);
      regenerated++;
      console.log(`✓ Regenerated song ${song.id}`);
    } catch (error) {
      console.error(`✗ Failed to regenerate song ${song.id}:`, error);
    }
  }

  console.log(`\nRegenerated ${regenerated}/${songs.length} songs`);
  process.exit(0);
}

regenerateAllSheetMusic();
