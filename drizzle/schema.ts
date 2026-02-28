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

export const songs = mysqlTable("songs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  keywords: varchar("keywords", { length: 500 }).notNull(),
  abcNotation: text("abcNotation").notNull(),
  musicDescription: text("musicDescription"),
  mp3Url: text("mp3Url"),
  mp3Key: varchar("mp3Key", { length: 500 }),
  duration: int("duration").default(30),
  tempo: int("tempo").default(120),
  keySignature: varchar("keySignature", { length: 20 }),
  timeSignature: varchar("timeSignature", { length: 10 }),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  instruments: json("instruments").$type<string[]>(),
  vocalType: varchar("vocalType", { length: 20 }).default("none"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

export const albums = mysqlTable("albums", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  coverColor: varchar("coverColor", { length: 20 }).default("#6366f1"),
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
