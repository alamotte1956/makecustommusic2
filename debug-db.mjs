import { getDb } from './server/db.ts';
import { songs } from './drizzle/schema.ts';

const db = await getDb();
const rows = await db.select({
  id: songs.id,
  title: songs.title,
  status: songs.sheetMusicStatus,
  hasAbc: songs.sheetMusicAbc,
  error: songs.sheetMusicError
}).from(songs);

for (const r of rows) {
  console.log(
    r.id, '|',
    (r.title || '').substring(0, 30).padEnd(30), '|',
    (r.status || 'null').padEnd(12), '|',
    r.hasAbc ? `HAS ABC (${r.hasAbc.length} chars)` : 'NO ABC',
    '|', r.error || ''
  );
}
console.log(`\nTotal: ${rows.length} songs`);
process.exit(0);
