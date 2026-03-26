import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

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
  referralCode: varchar("referralCode", { length: 16 }).unique(),
  referredBy: int("referredBy"),
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
  sunoTaskId: varchar("sunoTaskId", { length: 255 }),
  sunoAudioId: varchar("sunoAudioId", { length: 255 }),
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
  // Community / Discover visibility
  visibility: mysqlEnum("visibility", ["private", "public"]).default("private").notNull(),
  publishedAt: timestamp("publishedAt"),
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

// Subscription plans
export const subscriptionPlans = mysqlEnum("plan", ["free", "creator", "professional", "studio"]);

export const userSubscriptions = mysqlTable("user_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  plan: mysqlEnum("plan", ["free", "creator", "professional", "studio"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "trialing", "incomplete"]).default("active").notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "annual"]).default("monthly").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  cancelAtPeriodEnd: int("cancelAtPeriodEnd").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

// Credit balances
export const creditBalances = mysqlTable("credit_balances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  monthlyCredits: int("monthlyCredits").default(0).notNull(),
  bonusCredits: int("bonusCredits").default(0).notNull(),
  purchasedCredits: int("purchasedCredits").default(0).notNull(),
  lastRefillAt: timestamp("lastRefillAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CreditBalance = typeof creditBalances.$inferSelect;
export type InsertCreditBalance = typeof creditBalances.$inferInsert;

// Credit transactions (audit log)
export const creditTransactions = mysqlTable("credit_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amount: int("amount").notNull(), // positive = credit, negative = debit
  type: mysqlEnum("type", ["subscription_refill", "purchase", "bonus", "generation", "tts", "takes", "refund", "admin"]).notNull(),
  description: text("description"),
  balanceAfter: int("balanceAfter").notNull(),
  relatedSongId: int("relatedSongId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;

// Plan limits configuration (used in code, not DB)
export const PLAN_LIMITS = {
  free: {
    monthlyCredits: 0,
    dailySongLimit: 0,
    dailySheetMusicLimit: 0,
    dailyChordLimit: 0,
    monthlyBonusSongs: 0,
    monthlyBonusSheetMusic: 0,
    commercialUse: false,
    audioQuality: "128kbps",
    canGenerate: false, // free users cannot generate — must subscribe
  },
  creator: {
    monthlyCredits: 200,
    dailySongLimit: 50,
    dailySheetMusicLimit: -1, // unlimited
    dailyChordLimit: -1,
    monthlyBonusSongs: 2,       // 2 free monthly bonus songs not counting toward monthly credits
    monthlyBonusSheetMusic: 2,  // 2 free monthly bonus sheet music not counting toward monthly credits
    commercialUse: "personal", // commercial use rights for new songs
    audioQuality: "192kbps",
    canGenerate: true,
  },
  professional: {
    monthlyCredits: 450,
    dailySongLimit: 100,
    dailySheetMusicLimit: -1,
    dailyChordLimit: -1,
    monthlyBonusSongs: 2,       // 2 free monthly bonus songs not counting toward monthly credits
    monthlyBonusSheetMusic: 2,  // 2 free monthly bonus sheet music not counting toward monthly credits
    commercialUse: "full",
    audioQuality: "192kbps",
    canGenerate: true,
  },
  studio: {
    monthlyCredits: 450,
    dailySongLimit: 100,
    dailySheetMusicLimit: -1,
    dailyChordLimit: -1,
    monthlyBonusSongs: 2,
    monthlyBonusSheetMusic: 2,
    commercialUse: "full",
    audioQuality: "192kbps",
    canGenerate: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

// Commercial license types stored on songs
export const licenseTypes = ["personal", "commercial_social", "commercial_full", "commercial_sync"] as const;
export type LicenseType = typeof licenseTypes[number];

// ─── MP3 to Sheet Music Jobs ───

export const mp3SheetJobs = mysqlTable("mp3_sheet_jobs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["uploading", "transcribing", "generating", "done", "error"]).default("uploading").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  audioUrl: text("audioUrl"),
  abcNotation: text("abcNotation"),
  lyrics: text("lyrics"),
  errorMessage: text("errorMessage"),
  errorCode: varchar("errorCode", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Mp3SheetJob = typeof mp3SheetJobs.$inferSelect;
export type InsertMp3SheetJob = typeof mp3SheetJobs.$inferInsert;

// ─── Notifications ───

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["song_ready", "song_favorited", "song_shared", "credit_added", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  songId: int("songId"),
  actorName: varchar("actorName", { length: 255 }),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Referrals ───

export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredUserId: int("referredUserId").notNull(),
  referralCode: varchar("referralCode", { length: 16 }).notNull(),
  creditsAwarded: int("creditsAwarded").default(5).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

export const REFERRAL_BONUS_CREDITS = 5;

// ─── Blog Comments ───

export const blogComments = mysqlTable("blog_comments", {
  id: int("id").autoincrement().primaryKey(),
  articleSlug: varchar("articleSlug", { length: 255 }).notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogComment = typeof blogComments.$inferSelect;
export type InsertBlogComment = typeof blogComments.$inferInsert;

// ─── Admin Notifications ───────────────────────────────────────────────────

export const adminNotifications = mysqlTable("admin_notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["subscription_new", "payment_failed", "subscription_canceled", "system", "other"]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedUserId: int("relatedUserId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;

// ─── Admin Notification Preferences ────────────────────────────────────────
export const adminNotificationPreferences = mysqlTable("admin_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  notificationType: mysqlEnum("notificationType", ["subscription_new", "payment_failed", "subscription_canceled"]).notNull(),
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  pushEnabled: boolean("pushEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminNotificationPreference = typeof adminNotificationPreferences.$inferSelect;
export type InsertAdminNotificationPreference = typeof adminNotificationPreferences.$inferInsert;

// ─── Worship Sets (Service Planning) ──────────────────────────────────────

export const worshipSets = mysqlTable("worship_sets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date", { length: 20 }), // ISO date string for the service date
  serviceType: varchar("serviceType", { length: 100 }).default("Sunday Morning"), // e.g., Sunday Morning, Wednesday Night, Special Event
  notes: text("notes"),
  liturgicalSeason: varchar("liturgicalSeason", { length: 100 }), // Advent, Christmas, Lent, Easter, Pentecost, Ordinary Time
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorshipSet = typeof worshipSets.$inferSelect;
export type InsertWorshipSet = typeof worshipSets.$inferInsert;

export const worshipSetItems = mysqlTable("worship_set_items", {
  id: int("id").autoincrement().primaryKey(),
  worshipSetId: int("worshipSetId").notNull(),
  songId: int("songId"), // nullable — can be a non-song item like "Prayer" or "Scripture Reading"
  itemType: mysqlEnum("itemType", ["song", "prayer", "scripture", "sermon", "offering", "communion", "announcement", "transition", "other"]).default("song").notNull(),
  title: varchar("title", { length: 255 }).notNull(), // song title or custom label
  notes: text("notes"), // e.g., "Key of G, capo 2" or "Pastor reads John 3:16"
  songKey: varchar("songKey", { length: 10 }), // musical key for this performance
  sortOrder: int("sortOrder").notNull().default(0),
  duration: int("duration"), // estimated minutes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorshipSetItem = typeof worshipSetItems.$inferSelect;
export type InsertWorshipSetItem = typeof worshipSetItems.$inferInsert;

// ─── Scripture Songs ──────────────────────────────────────────────────────

export const scriptureSongs = mysqlTable("scripture_songs", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  book: varchar("book", { length: 100 }).notNull(), // e.g., "Psalms", "John"
  chapter: int("chapter").notNull(),
  verseStart: int("verseStart").notNull(),
  verseEnd: int("verseEnd"),
  translation: varchar("translation", { length: 20 }).default("NIV"), // NIV, ESV, KJV, etc.
  fullReference: varchar("fullReference", { length: 100 }).notNull(), // e.g., "Psalm 23:1-6 (NIV)"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScriptureSong = typeof scriptureSongs.$inferSelect;
export type InsertScriptureSong = typeof scriptureSongs.$inferInsert;

// ─── Shared Lyrics (Collaborative Editing) ─────────────────────────────────

export type SharedLyricsSection = {
  id: string;
  type: string;
  label?: string;
  content: string;
};

export const sharedLyrics = mysqlTable("shared_lyrics", {
  id: int("id").autoincrement().primaryKey(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  ownerId: int("ownerId").notNull(),
  ownerName: varchar("ownerName", { length: 255 }),
  title: varchar("title", { length: 255 }).notNull().default("Untitled Song"),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  vocalType: varchar("vocalType", { length: 20 }),
  sections: json("sections").$type<SharedLyricsSection[]>().notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  editCount: int("editCount").default(0).notNull(),
  lastEditorName: varchar("lastEditorName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SharedLyrics = typeof sharedLyrics.$inferSelect;
export type InsertSharedLyrics = typeof sharedLyrics.$inferInsert;

// ─── Liturgical Calendar ──────────────────────────────────────────────────

export const LITURGICAL_SEASONS = [
  "Advent", "Christmas", "Epiphany", "Lent", "Holy Week",
  "Easter", "Pentecost", "Ordinary Time",
] as const;

export type LiturgicalSeason = typeof LITURGICAL_SEASONS[number];

export const SERVICE_SEGMENTS = [
  "Prelude", "Call to Worship", "Opening Hymn", "Praise & Worship",
  "Prayer", "Scripture Reading", "Offering", "Special Music",
  "Sermon", "Invitation/Altar Call", "Communion", "Closing Hymn",
  "Benediction", "Postlude",
] as const;

export type ServiceSegment = typeof SERVICE_SEGMENTS[number];

// ─── Church Band Parts ────────────────────────────────────────────────────

export const BAND_INSTRUMENTS = [
  "Lead Vocal", "Background Vocals", "Acoustic Guitar", "Electric Guitar",
  "Bass Guitar", "Keys/Piano", "Drums", "Strings", "Brass",
  "Woodwinds", "Choir", "Organ", "Synthesizer", "Percussion",
] as const;

export type BandInstrument = typeof BAND_INSTRUMENTS[number];

export const CHOIR_PARTS = ["Soprano", "Alto", "Tenor", "Bass"] as const;
export type ChoirPart = typeof CHOIR_PARTS[number];


// ─── Stem Separations ─────────────────────────────────────────────────────
export const stemSeparations = mysqlTable("stem_separations", {
  id: int("id").autoincrement().primaryKey(),
  songId: int("songId").notNull(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  status: mysqlEnum("status", ["pending_payment", "processing", "completed", "failed"]).default("pending_payment").notNull(),
  sunoSeparationTaskId: varchar("sunoSeparationTaskId", { length: 255 }),
  // Stem URLs (stored in S3 after download from Suno CDN)
  vocalUrl: text("vocalUrl"),
  instrumentalUrl: text("instrumentalUrl"),
  backingVocalsUrl: text("backingVocalsUrl"),
  drumsUrl: text("drumsUrl"),
  bassUrl: text("bassUrl"),
  guitarUrl: text("guitarUrl"),
  keyboardUrl: text("keyboardUrl"),
  percussionUrl: text("percussionUrl"),
  stringsUrl: text("stringsUrl"),
  synthUrl: text("synthUrl"),
  fxUrl: text("fxUrl"),
  brassUrl: text("brassUrl"),
  woodwindsUrl: text("woodwindsUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type StemSeparation = typeof stemSeparations.$inferSelect;
export type InsertStemSeparation = typeof stemSeparations.$inferInsert;
