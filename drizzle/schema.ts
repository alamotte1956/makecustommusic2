import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Song take for multiple vocal variations
export type SongTake = {
  index: number;
  label: string; // e.g., "Take 1 - Warm", "Take 2 - Bright"
  vocalUrl: string;
  mixedUrl: string;
  voiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  createdAt: number; // Unix timestamp ms
};

export const songs = mysqlTable("songs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  keywords: varchar("keywords", { length: 500 }).notNull(),
  abcNotation: text("abcNotation"),
  musicDescription: text("musicDescription"),
  mp3Url: text("mp3Url"),
  mp3Key: varchar("mp3Key", { length: 500 }),
  audioUrl: text("audioUrl"),
  duration: int("duration").default(30),
  tempo: int("tempo").default(120),
  keySignature: varchar("keySignature", { length: 20 }),
  timeSignature: varchar("timeSignature", { length: 10 }),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  instruments: json("instruments").$type<string[]>(),
  engine: varchar("engine", { length: 20 }).default("free"),
  vocalType: varchar("vocalType", { length: 20 }),
  lyrics: text("lyrics"),
  styleTags: varchar("styleTags", { length: 500 }),
  shareToken: varchar("shareToken", { length: 64 }),
  externalSongId: varchar("externalSongId", { length: 100 }),
  imageUrl: text("imageUrl"),
  sheetMusicAbc: text("sheetMusicAbc"),
  chordProgression: json("chordProgression").$type<ChordProgressionData>(),
  // Studio production fields
  instrumentalUrl: text("instrumentalUrl"),
  vocalUrl: text("vocalUrl"),
  mixedUrl: text("mixedUrl"),
  takes: json("takes").$type<SongTake[]>(),
  selectedTakeIndex: int("selectedTakeIndex").default(0),
  postProcessPreset: varchar("postProcessPreset", { length: 50 }).default("radio-ready"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Chord progression data structure
export type ChordSection = {
  section: string; // e.g., "Verse 1", "Chorus"
  chords: string[]; // e.g., ["Am", "F", "C", "G"]
  strummingPattern: string; // e.g., "D DU UDU"
  bpm: number;
};

export type GuitarChordDiagram = {
  name: string; // e.g., "Am"
  frets: number[]; // e.g., [-1, 0, 2, 2, 1, 0] (-1 = muted, 0 = open)
  fingers: number[]; // e.g., [0, 0, 2, 3, 1, 0]
  barres: { fromString: number; toString: number; fret: number }[];
  baseFret: number;
};

export type ChordProgressionData = {
  key: string; // e.g., "Am" or "C"
  capo: number; // 0 = no capo
  tempo: number;
  timeSignature: string; // e.g., "4/4"
  sections: ChordSection[];
  chordDiagrams: GuitarChordDiagram[];
  notes: string; // Additional playing notes/tips
};

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

export const albums = mysqlTable("albums", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  coverColor: varchar("coverColor", { length: 20 }).default("#6366f1"),
  coverImageUrl: text("coverImageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Album = typeof albums.$inferSelect;
export type InsertAlbum = typeof albums.$inferInsert;

export const albumSongs = mysqlTable("album_songs", {
  id: int("id").autoincrement().primaryKey(),
  albumId: int("albumId").notNull(),
  songId: int("songId").notNull(),
  trackOrder: int("trackOrder").notNull().default(0),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type AlbumSong = typeof albumSongs.$inferSelect;
export type InsertAlbumSong = typeof albumSongs.$inferInsert;

export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  songId: int("songId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;
