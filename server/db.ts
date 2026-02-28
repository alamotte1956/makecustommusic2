import { eq, desc, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, songs, albums, albumSongs, InsertSong, InsertAlbum, InsertAlbumSong } from "../drizzle/schema";
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
  // Remove from any albums first
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

export async function updateAlbum(id: number, userId: number, data: { title?: string; description?: string; coverColor?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(albums).set(data).where(and(eq(albums.id, id), eq(albums.userId, userId)));
  return getAlbumById(id);
}

// ─── Album Songs Queries ───

export async function addSongToAlbum(albumId: number, songId: number, trackOrder: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(albumSongs).values({ albumId, songId, trackOrder });
}

export async function removeSongFromAlbum(albumId: number, songId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(albumSongs).where(and(eq(albumSongs.albumId, albumId), eq(albumSongs.songId, songId)));
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

export async function getAlbumSongCount(albumId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(albumSongs).where(eq(albumSongs.albumId, albumId));
  return result.length;
}
