import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, songs, albums, albumSongs, favorites, InsertSong, InsertAlbum, InsertAlbumSong, ChordProgressionData, SongTake, notifications, InsertNotification, blogComments, InsertBlogComment, mp3SheetJobs, InsertMp3SheetJob, worshipSets, InsertWorshipSet, worshipSetItems, InsertWorshipSetItem, scriptureSongs, InsertScriptureSong, sharedLyrics, InsertSharedLyrics, SharedLyricsSection, stemSeparations, InsertStemSeparation, generationTasks, InsertGenerationTask } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Song Queries ───

export async function createSong(data: InsertSong) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(songs).values(data);
  const id = result[0].insertId;
  return getSongById(id);
}

export async function getSongById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(songs).where(eq(songs.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getUserSongs(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(songs).where(eq(songs.userId, userId)).orderBy(desc(songs.createdAt));
}

export async function deleteSong(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Verify ownership first
  const song = await db.select().from(songs).where(and(eq(songs.id, id), eq(songs.userId, userId))).limit(1);
  if (song.length === 0) throw new Error("Song not found or not owned by user");
  // Cascade: remove from favorites, albums, then delete the song
  await db.delete(favorites).where(eq(favorites.songId, id));
  await db.delete(albumSongs).where(eq(albumSongs.songId, id));
  await db.delete(songs).where(and(eq(songs.id, id), eq(songs.userId, userId)));
}

export async function updateSongMp3(id: number, mp3Url: string, mp3Key: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ mp3Url, mp3Key }).where(eq(songs.id, id));
}

export async function updateSongAudioUrl(id: number, audioUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ audioUrl }).where(eq(songs.id, id));
}

export async function updateSongShareToken(id: number, shareToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ shareToken }).where(eq(songs.id, id));
}

export async function getSongByShareToken(shareToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(songs).where(eq(songs.shareToken, shareToken)).limit(1);
  return result[0] ?? null;
}

export async function updateSongSheetMusic(id: number, sheetMusicAbc: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // ABC is already sanitised by backgroundSheetMusic.sanitiseAbc() — store as-is
  await db.update(songs).set({ sheetMusicAbc: sheetMusicAbc.trim(), sheetMusicStatus: "done", sheetMusicError: null }).where(eq(songs.id, id));
}

export async function updateSongSheetMusicStatus(id: number, status: "pending" | "generating" | "done" | "failed", error?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ sheetMusicStatus: status, sheetMusicError: error ?? null }).where(eq(songs.id, id));
}

export async function updateSongChordProgression(id: number, chordProgression: ChordProgressionData) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ chordProgression }).where(eq(songs.id, id));
}

export async function updateSongStems(id: number, data: {
  instrumentalUrl?: string;
  vocalUrl?: string;
  mixedUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set(data).where(eq(songs.id, id));
}

export async function updateSongTakes(id: number, takes: SongTake[], selectedTakeIndex?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, unknown> = { takes };
  if (selectedTakeIndex !== undefined) updateData.selectedTakeIndex = selectedTakeIndex;
  await db.update(songs).set(updateData).where(eq(songs.id, id));
}

export async function updateSongPostProcessPreset(id: number, preset: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ postProcessPreset: preset }).where(eq(songs.id, id));
}

export async function updateSongImageUrl(id: number, imageUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ imageUrl }).where(eq(songs.id, id));
}

export async function updateSong(
  id: number,
  userId: number,
  data: { title?: string; lyrics?: string | null; genre?: string | null; mood?: string | null; styleTags?: string | null }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set(data).where(and(eq(songs.id, id), eq(songs.userId, userId)));
  return getSongById(id);
}

// ─── Album Queries ───

export async function createAlbum(data: InsertAlbum) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(albums).values(data);
  const id = result[0].insertId;
  return getAlbumById(id);
}

export async function getAlbumById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(albums).where(eq(albums.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getUserAlbums(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(albums).where(eq(albums.userId, userId)).orderBy(desc(albums.createdAt));
}

export async function deleteAlbum(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(albumSongs).where(eq(albumSongs.albumId, id));
  await db.delete(albums).where(and(eq(albums.id, id), eq(albums.userId, userId)));
}

export async function updateAlbum(id: number, userId: number, data: { title?: string; description?: string; coverColor?: string; coverImageUrl?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(albums).set(data).where(and(eq(albums.id, id), eq(albums.userId, userId)));
  return getAlbumById(id);
}

export async function updateAlbumCoverImage(id: number, coverImageUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(albums).set({ coverImageUrl }).where(eq(albums.id, id));
}

// ─── Album Songs Queries ───

export async function addSongToAlbum(albumId: number, songId: number, trackOrder: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check for duplicate
  const existing = await db.select().from(albumSongs)
    .where(and(eq(albumSongs.albumId, albumId), eq(albumSongs.songId, songId)))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("Song is already in this album");
  }
  await db.insert(albumSongs).values({ albumId, songId, trackOrder });
}

export async function removeSongFromAlbum(albumId: number, songId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(albumSongs).where(and(eq(albumSongs.albumId, albumId), eq(albumSongs.songId, songId)));
  // Recompact track orders after removal
  const remaining = await db.select().from(albumSongs)
    .where(eq(albumSongs.albumId, albumId))
    .orderBy(albumSongs.trackOrder);
  const reorders = remaining.map((r, index) =>
    db.update(albumSongs)
      .set({ trackOrder: index })
      .where(eq(albumSongs.id, r.id))
  );
  await Promise.all(reorders);
}

export async function getAlbumSongs(albumId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const relations = await db.select().from(albumSongs).where(eq(albumSongs.albumId, albumId)).orderBy(albumSongs.trackOrder);
  if (relations.length === 0) return [];
  const songIds = relations.map(r => r.songId);
  const songList = await db.select().from(songs).where(inArray(songs.id, songIds));
  // Sort by track order
  const songMap = new Map(songList.map(s => [s.id, s]));
  return relations.map(r => songMap.get(r.songId)).filter(Boolean);
}

export async function reorderAlbumSongs(albumId: number, songIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Update trackOrder for each song in the new order
  const updates = songIds.map((songId, index) =>
    db.update(albumSongs)
      .set({ trackOrder: index })
      .where(and(eq(albumSongs.albumId, albumId), eq(albumSongs.songId, songId)))
  );
  await Promise.all(updates);
}

export async function getAlbumSongCount(albumId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(albumSongs).where(eq(albumSongs.albumId, albumId));
  return result.length;
}

// ─── Favorites Queries ───

export async function toggleFavorite(userId: number, songId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)))
    .limit(1);
  if (existing.length > 0) {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.songId, songId)));
    return false; // removed from favorites
  } else {
    await db.insert(favorites).values({ userId, songId });
    return true; // added to favorites
  }
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const favs = await db.select().from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
  if (favs.length === 0) return [];
  const songIds = favs.map(f => f.songId);
  const songList = await db.select().from(songs).where(inArray(songs.id, songIds));
  const songMap = new Map(songList.map(s => [s.id, s]));
  return favs.map(f => songMap.get(f.songId)).filter(Boolean);
}

export async function getUserFavoriteIds(userId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const favs = await db.select({ songId: favorites.songId }).from(favorites)
    .where(eq(favorites.userId, userId));
  return favs.map(f => f.songId);
}

// ─── Community / Discover Queries ───

export async function publishSong(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const song = await db.select().from(songs).where(and(eq(songs.id, id), eq(songs.userId, userId))).limit(1);
  if (song.length === 0) throw new Error("Song not found or not owned by user");
  await db.update(songs).set({ visibility: "public", publishedAt: new Date() }).where(eq(songs.id, id));
  return getSongById(id);
}

export async function unpublishSong(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const song = await db.select().from(songs).where(and(eq(songs.id, id), eq(songs.userId, userId))).limit(1);
  if (song.length === 0) throw new Error("Song not found or not owned by user");
  await db.update(songs).set({ visibility: "private", publishedAt: null }).where(eq(songs.id, id));
  return getSongById(id);
}

export async function getPublicSongs(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const publicSongs = await db.select({
    song: songs,
    creator: {
      id: users.id,
      name: users.name,
      openId: users.openId,
    },
  })
    .from(songs)
    .innerJoin(users, eq(songs.userId, users.id))
    .where(eq(songs.visibility, "public"))
    .orderBy(desc(songs.publishedAt))
    .limit(limit)
    .offset(offset);
  return publicSongs;
}

export async function getFeaturedSongs(limit = 6) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Return songs with audio that can be played, preferring public songs first
  const featured = await db.select({
    id: songs.id,
    title: songs.title,
    genre: songs.genre,
    mood: songs.mood,
    audioUrl: songs.audioUrl,
    mp3Url: songs.mp3Url,
    duration: songs.duration,
    vocalType: songs.vocalType,
    engine: songs.engine,
    imageUrl: songs.imageUrl,
  })
    .from(songs)
    .where(sql`${songs.audioUrl} IS NOT NULL AND ${songs.audioUrl} != ''`)
    .orderBy(desc(songs.publishedAt), desc(songs.id))
    .limit(limit);
  return featured;
}

export async function getPublicSongCount() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(songs).where(eq(songs.visibility, "public"));
  return result.length;
}

// ─── Notification Queries ───

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

export async function getUserNotifications(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
  return result[0]?.count ?? 0;
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications)
    .set({ isRead: 1 })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications)
    .set({ isRead: 1 })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
}

export async function deleteNotification(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(notifications)
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}


// ─── Blog Comments ───

export async function getBlogComments(articleSlug: string, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const comments = await db
    .select({
      id: blogComments.id,
      articleSlug: blogComments.articleSlug,
      userId: blogComments.userId,
      content: blogComments.content,
      createdAt: blogComments.createdAt,
      updatedAt: blogComments.updatedAt,
      userName: users.name,
    })
    .from(blogComments)
    .leftJoin(users, eq(blogComments.userId, users.id))
    .where(eq(blogComments.articleSlug, articleSlug))
    .orderBy(desc(blogComments.createdAt))
    .limit(limit);
  return comments;
}

export async function createBlogComment(data: { articleSlug: string; userId: number; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(blogComments).values({
    articleSlug: data.articleSlug,
    userId: data.userId,
    content: data.content,
  });
  return { id: Number(result[0].insertId) };
}

export async function deleteBlogComment(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogComments)
    .where(and(eq(blogComments.id, id), eq(blogComments.userId, userId)));
}

export async function getBlogCommentCount(articleSlug: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(blogComments)
    .where(eq(blogComments.articleSlug, articleSlug));
  return result[0]?.count ?? 0;
}


// ─── MP3 Sheet Music Jobs ───

export async function createMp3SheetJob(data: InsertMp3SheetJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mp3SheetJobs).values(data);
  return result[0].insertId;
}

export async function getMp3SheetJob(jobId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(mp3SheetJobs)
    .where(and(eq(mp3SheetJobs.id, jobId), eq(mp3SheetJobs.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateMp3SheetJob(
  jobId: number,
  data: Partial<Pick<InsertMp3SheetJob, "status" | "audioUrl" | "abcNotation" | "lyrics" | "errorMessage" | "errorCode">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(mp3SheetJobs).set(data).where(eq(mp3SheetJobs.id, jobId));
}


export async function getUserMp3SheetJobs(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(mp3SheetJobs)
    .where(eq(mp3SheetJobs.userId, userId))
    .orderBy(desc(mp3SheetJobs.createdAt))
    .limit(limit);
}

export async function deleteMp3SheetJob(jobId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(mp3SheetJobs)
    .where(and(eq(mp3SheetJobs.id, jobId), eq(mp3SheetJobs.userId, userId)));
}


// ─── Worship Sets ───

export async function createWorshipSet(data: InsertWorshipSet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(worshipSets).values(data);
  const id = result[0].insertId;
  return getWorshipSetById(id, data.userId);
}

export async function getWorshipSetById(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(worshipSets)
    .where(and(eq(worshipSets.id, id), eq(worshipSets.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getUserWorshipSets(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(worshipSets)
    .where(eq(worshipSets.userId, userId))
    .orderBy(desc(worshipSets.updatedAt));
}

export async function updateWorshipSet(id: number, userId: number, data: Partial<Pick<InsertWorshipSet, "title" | "date" | "serviceType" | "notes" | "liturgicalSeason">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(worshipSets).set(data)
    .where(and(eq(worshipSets.id, id), eq(worshipSets.userId, userId)));
}

export async function deleteWorshipSet(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete items first, then the set
  await db.delete(worshipSetItems).where(eq(worshipSetItems.worshipSetId, id));
  await db.delete(worshipSets)
    .where(and(eq(worshipSets.id, id), eq(worshipSets.userId, userId)));
}

// ─── Worship Set Items ───

export async function addWorshipSetItem(data: InsertWorshipSetItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(worshipSetItems).values(data);
  return result[0].insertId;
}

export async function getWorshipSetItems(worshipSetId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(worshipSetItems)
    .where(eq(worshipSetItems.worshipSetId, worshipSetId))
    .orderBy(worshipSetItems.sortOrder);
}

export async function updateWorshipSetItem(id: number, data: Partial<Pick<InsertWorshipSetItem, "title" | "notes" | "songKey" | "sortOrder" | "duration" | "itemType">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(worshipSetItems).set(data).where(eq(worshipSetItems.id, id));
}

export async function deleteWorshipSetItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(worshipSetItems).where(eq(worshipSetItems.id, id));
}

export async function reorderWorshipSetItems(worshipSetId: number, itemIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (let i = 0; i < itemIds.length; i++) {
    await db.update(worshipSetItems)
      .set({ sortOrder: i })
      .where(and(eq(worshipSetItems.id, itemIds[i]), eq(worshipSetItems.worshipSetId, worshipSetId)));
  }
}

// ─── Scripture Songs ───

export async function linkScriptureSong(data: InsertScriptureSong) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scriptureSongs).values(data);
  return result[0].insertId;
}

export async function getScriptureSongBySongId(songId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(scriptureSongs)
    .where(eq(scriptureSongs.songId, songId))
    .limit(1);
  return result[0] ?? null;
}

export async function getScriptureSongsByBook(book: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(scriptureSongs)
    .where(eq(scriptureSongs.book, book))
    .orderBy(scriptureSongs.chapter, scriptureSongs.verseStart);
}


// ─── Shared Lyrics (Collaborative Editing) ─────────────────────────────────

export async function createSharedLyrics(data: {
  shareToken: string;
  ownerId: number;
  ownerName: string | null;
  title: string;
  genre?: string | null;
  mood?: string | null;
  vocalType?: string | null;
  sections: SharedLyricsSection[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sharedLyrics).values({
    shareToken: data.shareToken,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    title: data.title,
    genre: data.genre ?? null,
    mood: data.mood ?? null,
    vocalType: data.vocalType ?? null,
    sections: data.sections,
    editCount: 0,
  });
  const [row] = await db.select().from(sharedLyrics).where(eq(sharedLyrics.shareToken, data.shareToken));
  return row;
}

export async function getSharedLyricsByToken(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(sharedLyrics).where(eq(sharedLyrics.shareToken, token));
  return row ?? null;
}

export async function updateSharedLyrics(token: string, data: {
  title?: string;
  genre?: string | null;
  mood?: string | null;
  vocalType?: string | null;
  sections?: SharedLyricsSection[];
  lastEditorName?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.genre !== undefined) updateSet.genre = data.genre;
  if (data.mood !== undefined) updateSet.mood = data.mood;
  if (data.vocalType !== undefined) updateSet.vocalType = data.vocalType;
  if (data.sections !== undefined) updateSet.sections = JSON.stringify(data.sections);
  if (data.lastEditorName !== undefined) updateSet.lastEditorName = data.lastEditorName;
  updateSet.editCount = sql`${sharedLyrics.editCount} + 1`;

  await db.update(sharedLyrics)
    .set(updateSet)
    .where(eq(sharedLyrics.shareToken, token));

  return getSharedLyricsByToken(token);
}

export async function deleteSharedLyrics(token: string, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sharedLyrics)
    .where(and(eq(sharedLyrics.shareToken, token), eq(sharedLyrics.ownerId, ownerId)));
}

export async function getUserSharedLyrics(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(sharedLyrics)
    .where(eq(sharedLyrics.ownerId, userId))
    .orderBy(desc(sharedLyrics.updatedAt));
}


// ─── Stem Separations ───

export async function createStemSeparation(data: InsertStemSeparation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(stemSeparations).values(data);
  return result.insertId;
}

export async function getStemSeparationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(stemSeparations).where(eq(stemSeparations.id, id));
  return rows[0] ?? null;
}

export async function getStemSeparationBySongId(songId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select().from(stemSeparations)
    .where(and(eq(stemSeparations.songId, songId), eq(stemSeparations.userId, userId)))
    .orderBy(desc(stemSeparations.createdAt));
  return rows[0] ?? null;
}

export async function updateStemSeparationStatus(id: number, status: "pending_payment" | "processing" | "completed" | "failed") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stemSeparations).set({ status }).where(eq(stemSeparations.id, id));
}

export async function updateStemSeparationStems(id: number, stems: {
  sunoSeparationTaskId?: string;
  vocalUrl?: string | null;
  instrumentalUrl?: string | null;
  backingVocalsUrl?: string | null;
  drumsUrl?: string | null;
  bassUrl?: string | null;
  guitarUrl?: string | null;
  keyboardUrl?: string | null;
  percussionUrl?: string | null;
  stringsUrl?: string | null;
  synthUrl?: string | null;
  fxUrl?: string | null;
  brassUrl?: string | null;
  woodwindsUrl?: string | null;
  status?: "processing" | "completed" | "failed";
  completedAt?: Date;
  stripePaymentIntentId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(stemSeparations).set(stems).where(eq(stemSeparations.id, id));
}

export async function updateSongSunoIds(songId: number, sunoTaskId: string, sunoAudioId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(songs).set({ sunoTaskId, sunoAudioId }).where(eq(songs.id, songId));
}

// ─── Generation Tasks (async pattern) ───

export async function createGenerationTask(data: InsertGenerationTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(generationTasks).values(data).$returningId();
  return result.id;
}

export async function getGenerationTask(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(generationTasks).where(and(eq(generationTasks.id, taskId), eq(generationTasks.userId, userId))).limit(1);
  return rows[0] || null;
}

export async function getGenerationTaskByKieId(kieTaskId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(generationTasks).where(eq(generationTasks.kieTaskId, kieTaskId)).limit(1);
  return rows[0] || null;
}

export async function updateGenerationTask(taskId: number, data: Partial<InsertGenerationTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(generationTasks).set(data).where(eq(generationTasks.id, taskId));
}

export async function getPendingGenerationTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generationTasks).where(
    and(
      sql`${generationTasks.status} IN ('pending', 'processing')`,
      sql`${generationTasks.createdAt} > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
    )
  );
}
