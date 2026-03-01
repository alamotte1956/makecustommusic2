import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, songs, albums, albumSongs, favorites, InsertSong, InsertAlbum, InsertAlbumSong, ChordProgressionData, SongTake, notifications, InsertNotification } from "../drizzle/schema";
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
  await db.update(songs).set({ sheetMusicAbc }).where(eq(songs.id, id));
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
