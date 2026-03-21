import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import {
  createSong, getSongById, getUserSongs, deleteSong, updateSong, updateSongMp3,
  updateSongAudioUrl, updateSongShareToken, getSongByShareToken,
  updateSongSheetMusic, updateSongChordProgression,
  updateSongStems, updateSongTakes, updateSongPostProcessPreset, updateSongImageUrl,
  createAlbum, getAlbumById, getUserAlbums, deleteAlbum, updateAlbum,
  updateAlbumCoverImage, addSongToAlbum, removeSongFromAlbum, getAlbumSongs, getAlbumSongCount,
  reorderAlbumSongs,
  toggleFavorite, getUserFavorites, getUserFavoriteIds,
  publishSong, unpublishSong, getPublicSongs, getPublicSongCount,
  createNotification, getUserNotifications, getUnreadNotificationCount,
  markNotificationRead, markAllNotificationsRead, deleteNotification,
  getBlogComments, createBlogComment, deleteBlogComment, getBlogCommentCount
} from "./db";
import type { ChordProgressionData } from "../drizzle/schema";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { isElevenLabsAvailable, generateMusic, textToSpeech, getVoices } from "./elevenLabsApi";
import { getGenreGuidance, getMoodGuidance, buildProductionPrompt } from "./songwritingHelpers";
import { postProcessAudio, mixVocalInstrumental, prepareStemDownloads, getPresets, type ProcessingPreset } from "./audioProcessor";
import { addTempoSync, getTempoVoiceSettings, estimateBpmFromGenre } from "./ssmlBuilder";
import {
  getUserPlan, getCreditBalance, deductCredits, getUsageSummary,
  getTransactionHistory, checkDailyLimit, getPlanLimits, getLicenseType,
  getUserSubscription,
} from "./credits";
import { PLAN_LIMITS, REFERRAL_BONUS_CREDITS, type PlanName } from "../drizzle/schema";
import { getArticleBySlug } from "../shared/blogArticles";
import { ensureReferralCode, getReferralStats, getReferralHistory, getUserByReferralCode, processReferral, getLeaderboard } from "./referrals";
import { STRIPE_PLANS, type StripePlanId } from "./stripeProducts";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

function getStripe(): Stripe | null {
  const key = ENV.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  songs: router({
    // Check which engines are available
    engines: publicProcedure.query(() => {
      return {
        elevenlabs: isElevenLabsAvailable(),
      };
    }),

    // Generate music with ElevenLabs (simple or custom mode)
    generate: protectedProcedure
      .input(z.object({
        keywords: z.string().min(1).max(500),
        engine: z.enum(["elevenlabs"]).default("elevenlabs"),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
        vocalType: z.enum(["none", "male", "female", "mixed"]).optional(),
        duration: z.number().min(15).max(240).optional(),
        // Custom Mode fields
        mode: z.enum(["simple", "custom"]).optional(),
        customTitle: z.string().max(255).optional(),
        customLyrics: z.string().max(10000).optional(),
        customStyle: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const {
          keywords, genre, mood, vocalType, duration,
          mode, customTitle, customLyrics, customStyle
        } = input;

        if (!isElevenLabsAvailable()) {
          throw new Error("ElevenLabs engine is not available. Please configure the ELEVENLABS_API_KEY.");
        }

        // Build production-quality prompt using the songwriting helpers
        const { prompt, forceInstrumental } = buildProductionPrompt({
          keywords,
          genre: genre || null,
          mood: mood || null,
          vocalType: vocalType || null,
          duration: duration ?? 30,
          mode: mode || "simple",
          customTitle,
          customLyrics,
          customStyle,
        });

        const durationMs = (duration ?? 30) * 1000;

        const result = await generateMusic(
          {
            prompt,
            durationMs,
            forceInstrumental,
          },
          ctx.user.id
        );

        // Save to database
        const song = await createSong({
          userId: ctx.user.id,
          title: customTitle || keywords.substring(0, 100) || "ElevenLabs Track",
          keywords,
          abcNotation: null,
          musicDescription: `ElevenLabs${mode === "custom" ? " Custom" : " Simple"} | ${prompt.substring(0, 400)}`,
          audioUrl: result.audioUrl,
          mp3Url: result.audioUrl,
          mp3Key: result.audioKey,
          tempo: null,
          keySignature: null,
          timeSignature: null,
          genre: genre || null,
          mood: mood || null,
          instruments: null,
          duration: result.duration,
          engine: "elevenlabs",
          vocalType: vocalType || null,
          lyrics: customLyrics || null,
          styleTags: customStyle || null,
          externalSongId: null,
          imageUrl: null,
        });

        // Notify owner about new song generation
        notifyOwner({
          title: `🎵 New Song Generated`,
          content: `User: ${ctx.user.name || ctx.user.email || "Unknown"}\nTitle: ${song.title}\nGenre: ${genre || "Not specified"}\nMood: ${mood || "Not specified"}\nMode: ${mode || "simple"}\nEngine: ElevenLabs`,
        }).catch(() => {}); // Fire-and-forget, don't block the response

        // Create in-app notification for the user
        createNotification({
          userId: ctx.user.id,
          type: "song_ready",
          title: "Your song is ready!",
          message: `"${song.title}" has been generated. Tap to listen and download.`,
          songId: song.id,
        }).catch(() => {}); // Fire-and-forget

        return song;
      }),

    // Generate lyrics from a subject/topic using Claude Sonnet — best-in-class songwriter
    generateLyrics: protectedProcedure
      .input(z.object({
        subject: z.string().min(1).max(500),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
        vocalType: z.enum(["none", "male", "female", "mixed"]).optional(),
        length: z.enum(["standard", "extended"]).default("standard"),
      }))
      .mutation(async ({ input }) => {
        const { subject, genre, mood, vocalType, length } = input;

        // Build vocal arrangement guidance
        let vocalGuidance = "";
        if (vocalType === "mixed") {
          vocalGuidance = `\n\nVOCAL ARRANGEMENT: This is a DUET for male and female voices. Use [Male], [Female], and [Both] markers within sections to indicate who sings what. Create call-and-response moments, harmonized lines, and distinct perspectives for each voice. The interplay between voices should tell the story from two angles.`;
        } else if (vocalType === "male") {
          vocalGuidance = `\n\nVOCAL STYLE: Written for a male vocalist. Consider the natural range and emotional expression of male voices — from chest-voice power to falsetto vulnerability. Write lines that feel natural in a male register.`;
        } else if (vocalType === "female") {
          vocalGuidance = `\n\nVOCAL STYLE: Written for a female vocalist. Consider the natural range and emotional expression of female voices — from powerful belting to intimate whisper. Write lines that feel natural in a female register.`;
        }

        // Get genre-specific and mood-specific songwriting guidance
        const genreGuide = getGenreGuidance(genre || null);
        const moodGuide = getMoodGuidance(mood || null);

        const isExtended = length === "extended";
        const wordRange = isExtended ? "400-700" : "150-350";
        const structureGuide = isExtended
          ? `STRUCTURE: Full radio-length song. Include: [Intro] (optional spoken/sung hook), [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Chorus] (final, with variation), [Outro]. The bridge MUST shift perspective, key, or energy — it's the emotional pivot of the entire song.`
          : `STRUCTURE: Standard song. Include: [Verse 1], [Pre-Chorus] (optional but recommended), [Chorus], [Verse 2], [Chorus], [Bridge] (optional), [Chorus]. Keep it tight — every line earns its place.`;

        const systemPrompt = `You are an elite, Grammy-caliber songwriter with 20 years of experience writing #1 hits across genres. You've written for the biggest artists in modern American music. Your lyrics are known for:

1. HOOKS THAT HAUNT: Your choruses get stuck in people's heads for weeks. They're melodically singable, rhythmically tight, and emotionally devastating in their simplicity.

2. SPECIFICITY OVER GENERALITY: You never write "I'm sad" — you write the exact moment, the specific detail, the precise image that MAKES the listener feel sad. A cracked phone screen. The 2:47 AM timestamp. The hoodie that still smells like them.

3. CONVERSATIONAL AUTHENTICITY: Your lyrics sound like real people talk in 2025 America — not poetry class, not greeting cards. Natural cadence, contemporary language, real references.

4. RHYTHMIC PRECISION: Every syllable is placed intentionally. Your verses have a natural flow that rappers respect and singers love. The words WANT to be sung — they fall naturally into rhythmic patterns.

5. EMOTIONAL ARCHITECTURE: Each song has an emotional arc. Verse 1 sets the scene. Verse 2 deepens it. The pre-chorus builds tension. The chorus releases it. The bridge flips everything. The final chorus hits different because of the journey.

6. SINGABILITY: You write for the VOICE, not the page. Short vowels on high notes. Open vowels on sustained notes. Consonant clusters that feel good in the mouth. Lines that breathe.

RULES:
- Output ONLY the lyrics with section markers: [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro], etc.
- NO explanations, NO commentary, NO notes about the song
- Keep lyrics between ${wordRange} words
- ${structureGuide}
- Every line must be SINGABLE — read it aloud, does it flow naturally?
- The chorus must work as a standalone 15-second clip (think TikTok/Reels virality)
- Use internal rhymes and slant rhymes, not just end rhymes
- Avoid clichés unless you're subverting them
- Root everything in modern American culture (2024-2026)
${genreGuide}${moodGuide}${vocalGuidance}`;

        let userPrompt = `Write a hit song about: "${subject}"`;
        if (genre) userPrompt += `\nGenre: ${genre}`;
        if (mood) userPrompt += `\nMood: ${mood}`;
        userPrompt += `\n\nMake it radio-ready. Make it unforgettable. Make it the kind of song that stops someone mid-scroll.`;

        const response = await invokeLLM({
          model: "claude-sonnet-4-20250514",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const lyrics = typeof rawContent === "string" ? rawContent.trim() : null;
        if (!lyrics) {
          throw new Error("Failed to generate lyrics. Please try again.");
        }

        return { lyrics };
      }),

    // AI Lyrics Refinement: polish, enhance rhymes, restructure, or rewrite user lyrics
    refineLyrics: protectedProcedure
      .input(z.object({
        lyrics: z.string().min(1).max(10000),
        mode: z.enum(["polish", "rhyme", "restructure", "rewrite"]).default("polish"),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        const modeInstructions: Record<string, string> = {
          polish: "Gently polish these lyrics: fix awkward phrasing, improve word choices, tighten rhythm, and enhance emotional impact. Keep the original meaning, structure, and voice intact. Make subtle improvements, not wholesale changes.",
          rhyme: "Enhance the rhyme scheme of these lyrics: improve end rhymes, add internal rhymes and slant rhymes where natural, strengthen rhythmic flow. Keep the original meaning and structure but make it more musically satisfying to sing.",
          restructure: "Restructure these lyrics into proper song format with clear sections ([Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], etc.). Organize the ideas into a compelling emotional arc. Improve transitions between sections. Keep the core ideas and best lines.",
          rewrite: "Completely rewrite these lyrics while keeping the same theme, subject matter, and emotional core. Elevate the writing to professional quality with vivid imagery, strong hooks, and singable phrasing. The result should feel like a hit song.",
        };

        let contextHints = "";
        if (input.genre) contextHints += `\nGenre: ${input.genre}`;
        if (input.mood) contextHints += `\nMood: ${input.mood}`;

        const response = await invokeLLM({
          model: "claude-sonnet-4-20250514",
          messages: [
            {
              role: "system",
              content: `You are an elite songwriter and lyric editor. ${modeInstructions[input.mode]}\n\nRULES:\n- Output ONLY the refined lyrics with section markers\n- NO explanations, NO commentary, NO notes\n- Keep section markers like [Verse 1], [Chorus], etc.\n- Ensure every line is singable and rhythmically tight\n- Maintain the original language and cultural context${contextHints}`,
            },
            {
              role: "user",
              content: `Please refine these lyrics (mode: ${input.mode}):\n\n${input.lyrics}`,
            },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const refined = typeof rawContent === "string" ? rawContent.trim() : null;
        if (!refined) throw new Error("Failed to refine lyrics. Please try again.");
        return { lyrics: refined, mode: input.mode };
      }),

    // Upload audio file for remastering
    uploadAudio: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1).max(255),
        fileData: z.string().min(1), // base64 encoded
        mimeType: z.string().refine(t => ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac"].includes(t), "Unsupported audio format"),
        title: z.string().min(1).max(200).optional(),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const plan = await getUserPlan(ctx.user.id);
        const balance = await getCreditBalance(ctx.user.id);
        if (balance.totalCredits < 1) throw new Error("Insufficient credits. Please upgrade or purchase more credits.");

        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileData, "base64");
        if (buffer.length > 50 * 1024 * 1024) throw new Error("File too large. Maximum size is 50MB.");

        const ext = input.mimeType.split("/")[1] === "mpeg" ? "mp3" : input.mimeType.split("/")[1];
        const fileKey = `uploads/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url: audioUrl } = await storagePut(fileKey, buffer, input.mimeType);

        const title = input.title || input.fileName.replace(/\.[^/.]+$/, "");
        const song = await createSong({
          userId: ctx.user.id,
          title,
          keywords: `uploaded: ${title}`,
          genre: input.genre || "uploaded",
          mood: input.mood || "original",
          audioUrl,
          engine: "upload",
          vocalType: "none",
          duration: 0,
        });

        await deductCredits(ctx.user.id, 1, "generation", `Uploaded audio: ${title}`);
        return { song, audioUrl };
      }),

    // Analyze uploaded sheet music (image or MusicXML)
    analyzeSheetMusic: protectedProcedure
      .input(z.object({
        fileData: z.string().min(1), // base64 encoded
        fileName: z.string().min(1),
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const balance = await getCreditBalance(ctx.user.id);
        if (balance.totalCredits < 1) throw new Error("Insufficient credits.");

        const buffer = Buffer.from(input.fileData, "base64");
        if (buffer.length > 20 * 1024 * 1024) throw new Error("File too large. Maximum 20MB.");

        const { analyzeSheetMusicImage, analyzeMusicXML } = await import("./sheetMusicAnalyzer");

        // For images/PDFs, upload to S3 first then use the URL for vision
        if (input.mimeType.startsWith("image/") || input.mimeType === "application/pdf") {
          const ext = input.mimeType.split("/")[1];
          const fileKey = `sheet-music/${ctx.user.id}/${nanoid()}.${ext}`;
          const { url } = await storagePut(fileKey, buffer, input.mimeType);
          const analysis = await analyzeSheetMusicImage(url, input.mimeType);
          return { analysis, sourceUrl: url };
        }

        // For MusicXML text files
        if (input.mimeType.includes("xml") || input.fileName.endsWith(".xml") || input.fileName.endsWith(".musicxml")) {
          const xmlContent = buffer.toString("utf-8");
          const analysis = await analyzeMusicXML(xmlContent);
          return { analysis, sourceUrl: null };
        }

        throw new Error("Unsupported file format. Please upload an image (PNG, JPG), PDF, or MusicXML file.");
      }),

    // Generate a song from analyzed sheet music
    generateFromSheetMusic: protectedProcedure
      .input(z.object({
        analysis: z.object({
          title: z.string(),
          key: z.string(),
          timeSignature: z.string(),
          tempo: z.number(),
          genre: z.string(),
          mood: z.string(),
          instruments: z.array(z.string()),
          description: z.string(),
          styleTags: z.string(),
          chordProgression: z.array(z.string()),
        }),
        lyrics: z.string().optional(),
        vocalType: z.enum(["none", "male", "female", "mixed"]).default("none"),
        duration: z.number().min(15).max(300).default(60),
      }))
      .mutation(async ({ ctx, input }) => {
        const plan = await getUserPlan(ctx.user.id);
        const balance = await getCreditBalance(ctx.user.id);
        if (balance.totalCredits < 1) throw new Error("Insufficient credits.");

        if (!isElevenLabsAvailable()) throw new Error("Music generation service unavailable.");

        const { analysis, vocalType, duration, lyrics } = input;

        // Build a rich production prompt from the analysis
        const prompt = [
          `${analysis.description}`,
          `Key: ${analysis.key}, Time: ${analysis.timeSignature}, Tempo: ${analysis.tempo} BPM`,
          `Instruments: ${analysis.instruments.join(", ")}`,
          `Chord progression: ${analysis.chordProgression.join(" - ")}`,
          `Style: ${analysis.styleTags}`,
          vocalType !== "none" ? `Vocals: ${vocalType}` : "Instrumental only",
        ].join(". ");

        // Include lyrics in the prompt if provided
        const fullPrompt = lyrics ? `${prompt}. Lyrics:\n${lyrics}` : prompt;
        const result = await generateMusic({
          prompt: fullPrompt,
          durationMs: duration * 1000,
        }, ctx.user.id);

        const song = await createSong({
          userId: ctx.user.id,
          title: analysis.title,
          keywords: `sheet music: ${analysis.title}`,
          genre: analysis.genre,
          mood: analysis.mood,
          audioUrl: result.audioUrl,
          engine: "elevenlabs",
          vocalType,
          duration,
          styleTags: analysis.styleTags,
          lyrics: lyrics || null,
        });

        await deductCredits(ctx.user.id, 1, "generation", `Generated from sheet music: ${analysis.title}`);

        // Notify owner about new song from sheet music
        notifyOwner({
          title: `🎵 New Song from Sheet Music`,
          content: `User: ${ctx.user.name || ctx.user.email || "Unknown"}\nTitle: ${analysis.title}\nGenre: ${analysis.genre}\nMood: ${analysis.mood}\nSource: Sheet Music Upload`,
        }).catch(() => {}); // Fire-and-forget

        // Create in-app notification for the user
        createNotification({
          userId: ctx.user.id,
          type: "song_ready",
          title: "Your song is ready!",
          message: `"${analysis.title}" has been generated from sheet music. Tap to listen and download.`,
          songId: song.id,
        }).catch(() => {}); // Fire-and-forget

        return { song, audioUrl: result.audioUrl };
      }),

    // Text-to-Speech: preview lyrics as spoken audio
    ttsPreview: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        voiceId: z.string().min(1),
        stability: z.number().min(0).max(1).optional(),
        similarityBoost: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await textToSpeech(
          {
            text: input.text,
            voiceId: input.voiceId,
            voiceSettings: {
              stability: input.stability ?? 0.5,
              similarity_boost: input.similarityBoost ?? 0.8,
              style: 0.35,
              use_speaker_boost: true,
            },
          },
          ctx.user.id
        );
        return { audioUrl: result.audioUrl };
      }),

    // Voice narration: generate intro/outro narration for a song
    narration: protectedProcedure
      .input(z.object({
        songId: z.number(),
        text: z.string().min(1).max(2000),
        voiceId: z.string().min(1),
        type: z.enum(["intro", "outro"]),
        stability: z.number().min(0).max(1).optional(),
        similarityBoost: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        const result = await textToSpeech(
          {
            text: input.text,
            voiceId: input.voiceId,
            voiceSettings: {
              stability: input.stability ?? 0.5,
              similarity_boost: input.similarityBoost ?? 0.8,
              style: 0.35,
              use_speaker_boost: true,
            },
          },
          ctx.user.id
        );

        return {
          audioUrl: result.audioUrl,
          type: input.type,
          songId: input.songId,
        };
      }),

    // AI Vocal generation: generate vocals from lyrics using TTS
    generateVocals: protectedProcedure
      .input(z.object({
        songId: z.number(),
        lyrics: z.string().min(1).max(10000),
        voiceId: z.string().min(1),
        stability: z.number().min(0).max(1).optional(),
        similarityBoost: z.number().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        const result = await textToSpeech(
          {
            text: input.lyrics,
            voiceId: input.voiceId,
            voiceSettings: {
              stability: input.stability ?? 0.5,
              similarity_boost: input.similarityBoost ?? 0.8,
              style: 0.35,
              use_speaker_boost: true,
            },
          },
          ctx.user.id
        );

        return {
          audioUrl: result.audioUrl,
          songId: input.songId,
        };
      }),

    // Get available ElevenLabs voices
    voices: protectedProcedure.query(async () => {
      if (!isElevenLabsAvailable()) {
        return [];
      }
      try {
        return await getVoices();
      } catch {
        return [];
      }
    }),

    // Save synthesized audio to S3
    saveMp3: protectedProcedure
      .input(z.object({
        songId: z.number(),
        mp3Base64: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        const buffer = Buffer.from(input.mp3Base64, "base64");
        const fileKey = `songs/${ctx.user.id}/${nanoid()}.wav`;
        const { url } = await storagePut(fileKey, buffer, "audio/wav");

        await updateSongMp3(input.songId, url, fileKey);
        return { mp3Url: url };
      }),

    // Create a share link for a song
    createShareLink: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        if (song.shareToken) {
          return { shareToken: song.shareToken };
        }

        const shareToken = nanoid(16);
        await updateSongShareToken(input.songId, shareToken);
        return { shareToken };
      }),

    // Get a shared song (public, no auth required)
    getShared: publicProcedure
      .input(z.object({ shareToken: z.string() }))
      .query(async ({ input }) => {
        const song = await getSongByShareToken(input.shareToken);
        if (!song) return null;
        return {
          id: song.id,
          title: song.title,
          keywords: song.keywords,
          abcNotation: song.abcNotation,
          musicDescription: song.musicDescription,
          audioUrl: song.audioUrl,
          mp3Url: song.mp3Url,
          duration: song.duration,
          tempo: song.tempo,
          keySignature: song.keySignature,
          timeSignature: song.timeSignature,
          genre: song.genre,
          mood: song.mood,
          instruments: song.instruments,
          engine: song.engine,
          vocalType: song.vocalType,
          lyrics: song.lyrics,
          styleTags: song.styleTags,
          imageUrl: song.imageUrl,
          createdAt: song.createdAt,
        };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const song = await getSongById(input.id);
        if (!song || song.userId !== ctx.user.id) return null;
        return song;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserSongs(ctx.user.id);
    }),

    // Update song metadata (title, lyrics, genre, mood, styleTags)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        lyrics: z.string().max(10000).nullable().optional(),
        genre: z.string().max(100).nullable().optional(),
        mood: z.string().max(100).nullable().optional(),
        styleTags: z.string().max(500).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const song = await getSongById(id);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }
        const updateData: Record<string, any> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.lyrics !== undefined) updateData.lyrics = data.lyrics;
        if (data.genre !== undefined) updateData.genre = data.genre;
        if (data.mood !== undefined) updateData.mood = data.mood;
        if (data.styleTags !== undefined) updateData.styleTags = data.styleTags;

        if (Object.keys(updateData).length === 0) {
          return song;
        }

        return updateSong(id, ctx.user.id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSong(input.id, ctx.user.id);
        return { success: true };
      }),

    // Generate professional sheet music (ABC notation) from song data
    generateSheetMusic: protectedProcedure
      .input(z.object({ songId: z.number(), key: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        // If already generated and no specific key requested, return cached
        if (song.sheetMusicAbc && !input.key) {
          return { abcNotation: song.sheetMusicAbc };
        }

        // Use the requested key, or fall back to the song's key signature
        const requestedKey = input.key || song.keySignature;

        const songContext = [
          `Title: ${song.title}`,
          song.genre ? `Genre: ${song.genre}` : null,
          song.mood ? `Mood: ${song.mood}` : null,
          requestedKey ? `Key: ${requestedKey}` : null,
          song.timeSignature ? `Time Signature: ${song.timeSignature}` : null,
          song.tempo ? `Tempo: ${song.tempo} BPM` : null,
          song.lyrics ? `Lyrics:\n${song.lyrics}` : null,
        ].filter(Boolean).join("\n");

        const response = await invokeLLM({
          model: "claude-sonnet-4-20250514",
          messages: [
            {
              role: "system",
              content: `You are a professional music arranger and sheet music engraver. Generate valid ABC notation for a lead sheet based on the song information provided.

RULES:
- Output ONLY valid ABC notation, no explanations
- Include the X: (reference number), T: (title), M: (meter), L: (default note length), Q: (tempo), K: (key) headers
- Write a singable melody line that matches the lyrics and genre
- Align lyrics under notes using w: lines
- If a specific key is provided in the song info, you MUST use that exact key for the K: header and write all melody and chords in that key
- If no key is specified, choose an appropriate key signature for the genre (e.g., minor keys for dark/melancholic, major for happy/uplifting)
- Include dynamics and expression marks where appropriate
- For songs without lyrics, write an instrumental melody
- Keep the notation clean and professional — this will be rendered as printable sheet music
- Use standard ABC notation features: bar lines |, repeat signs :|, section markers [P:Verse], etc.
- Ensure the melody is musically coherent and matches the mood/genre
- Include chord symbols above the staff using "quoted chords" e.g. "Am"A "F"F "C"C
- The output must be parseable by abcjs library`,
            },
            {
              role: "user",
              content: `Generate a professional lead sheet in ABC notation for this song:\n\n${songContext}`,
            },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const abcNotation = typeof rawContent === "string" ? rawContent.trim() : null;
        if (!abcNotation) {
          throw new Error("Failed to generate sheet music. Please try again.");
        }

        // Clean up: extract just the ABC notation if wrapped in markdown code blocks
        const cleanAbc = abcNotation.replace(/^```[a-z]*\n?/gm, "").replace(/```$/gm, "").trim();

        // Save to database
        await updateSongSheetMusic(input.songId, cleanAbc);

        return { abcNotation: cleanAbc };
      }),

    // Generate chord progression for acoustic guitar
    generateChordProgression: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        // If already generated, return cached
        if (song.chordProgression) {
          return { chordProgression: song.chordProgression as ChordProgressionData };
        }

        const songContext = [
          `Title: ${song.title}`,
          song.genre ? `Genre: ${song.genre}` : null,
          song.mood ? `Mood: ${song.mood}` : null,
          song.keySignature ? `Key: ${song.keySignature}` : null,
          song.tempo ? `Tempo: ${song.tempo} BPM` : null,
          song.lyrics ? `Lyrics:\n${song.lyrics}` : null,
        ].filter(Boolean).join("\n");

        const response = await invokeLLM({
          model: "claude-sonnet-4-20250514",
          messages: [
            {
              role: "system",
              content: `You are a professional guitar instructor and music arranger specializing in acoustic guitar. Generate a complete chord progression analysis for a song, optimized for acoustic guitar performance.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) matching this exact structure:
{
  "key": "Am",
  "capo": 0,
  "tempo": 120,
  "timeSignature": "4/4",
  "sections": [
    {
      "section": "Verse 1",
      "chords": ["Am", "F", "C", "G"],
      "strummingPattern": "D DU UDU",
      "bpm": 120
    }
  ],
  "chordDiagrams": [
    {
      "name": "Am",
      "frets": [-1, 0, 2, 2, 1, 0],
      "fingers": [0, 0, 2, 3, 1, 0],
      "barres": [],
      "baseFret": 1
    }
  ],
  "notes": "Playing tips and performance notes"
}

RULES:
- Choose guitar-friendly keys (C, G, D, A, E, Am, Em, Dm are preferred)
- If the song's natural key isn't guitar-friendly, recommend a capo position to simplify chords
- frets array: 6 values for strings E-A-D-G-B-e. -1 = muted, 0 = open, 1+ = fret number
- fingers array: 0 = not pressed, 1 = index, 2 = middle, 3 = ring, 4 = pinky
- barres: only include if the chord requires a barre (e.g., F major, Bm)
- Include ALL unique chords used across all sections in chordDiagrams
- Strumming patterns should match the genre and feel (D=down, U=up, x=mute)
- Match sections to the song's lyrics structure (Verse 1, Pre-Chorus, Chorus, Bridge, etc.)
- Include practical playing tips in the notes field
- For modern pop/rock, use common progressions (I-V-vi-IV, vi-IV-I-V, etc.)
- The chord progression should sound good on acoustic guitar specifically`,
            },
            {
              role: "user",
              content: `Generate a complete acoustic guitar chord progression for this song:\n\n${songContext}`,
            },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        if (!rawContent || typeof rawContent !== "string") {
          throw new Error("Failed to generate chord progression. Please try again.");
        }

        // Parse the JSON response
        let chordProgression: ChordProgressionData;
        try {
          // Clean up potential markdown wrapping
          const cleanJson = rawContent.replace(/^```[a-z]*\n?/gm, "").replace(/```$/gm, "").trim();
          chordProgression = JSON.parse(cleanJson);
        } catch {
          throw new Error("Failed to parse chord progression data. Please try again.");
        }

        // Save to database
        await updateSongChordProgression(input.songId, chordProgression);

        return { chordProgression };
      }),

    // ─── Studio Production Routes ───

    // Get available processing presets
    processingPresets: publicProcedure.query(() => {
      return getPresets();
    }),

    // Post-process a song's audio with a preset
    postProcess: protectedProcedure
      .input(z.object({
        songId: z.number(),
        preset: z.enum(["raw", "warm", "bright", "radio-ready", "cinematic"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        if (!song.audioUrl) throw new Error("Song has no audio to process");

        const result = await postProcessAudio(song.audioUrl, input.preset, ctx.user.id);
        await updateSongAudioUrl(song.id, result.url);
        await updateSongPostProcessPreset(song.id, input.preset);

        return { audioUrl: result.url, preset: input.preset };
      }),

    // Generate vocal track from lyrics and mix with instrumental
    generateVocalMix: protectedProcedure
      .input(z.object({
        songId: z.number(),
        voiceId: z.string().min(1),
        voiceSettings: z.object({
          stability: z.number().min(0).max(1).optional(),
          similarity_boost: z.number().min(0).max(1).optional(),
          style: z.number().min(0).max(1).optional(),
          use_speaker_boost: z.boolean().optional(),
        }).optional(),
        vocalLevel: z.number().min(-10).max(10).optional(),
        instrumentalLevel: z.number().min(-10).max(10).optional(),
        preset: z.enum(["raw", "warm", "bright", "radio-ready", "cinematic"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        if (!song.lyrics) throw new Error("Song has no lyrics for vocal generation");
        if (!song.audioUrl) throw new Error("Song has no instrumental track");

        // Apply tempo-synced pacing to lyrics
        const songBpm = song.tempo ?? (song.genre ? estimateBpmFromGenre(song.genre) : 110);
        const tempoSyncedLyrics = addTempoSync(song.lyrics, {
          bpm: songBpm,
          timeSignature: song.timeSignature ?? "4/4",
          genre: song.genre ?? undefined,
          mood: song.mood ?? undefined,
        });

        // Get tempo-aware voice setting adjustments
        const tempoAdjust = getTempoVoiceSettings(songBpm);
        const baseStability = input.voiceSettings?.stability ?? 0.5;
        const baseStyle = input.voiceSettings?.style ?? 0.35;

        // Generate the vocal track via TTS with tempo-synced text and adjusted settings
        const vocalResult = await textToSpeech({
          text: tempoSyncedLyrics,
          voiceId: input.voiceId,
          modelId: "eleven_multilingual_v2",
          voiceSettings: {
            stability: Math.max(0, Math.min(1, baseStability + tempoAdjust.stabilityAdjust)),
            similarity_boost: input.voiceSettings?.similarity_boost ?? 0.8,
            style: Math.max(0, Math.min(1, baseStyle + tempoAdjust.styleAdjust)),
            use_speaker_boost: input.voiceSettings?.use_speaker_boost ?? true,
          },
        }, ctx.user.id);

        // Mix vocal over instrumental
        const mixResult = await mixVocalInstrumental(
          song.audioUrl,
          vocalResult.audioUrl,
          ctx.user.id,
          {
            vocalLevel: input.vocalLevel ?? 2,
            instrumentalLevel: input.instrumentalLevel ?? -3,
            preset: input.preset ?? "radio-ready",
          }
        );

        // Save stems and mix to database
        await updateSongStems(song.id, {
          instrumentalUrl: song.audioUrl,
          vocalUrl: vocalResult.audioUrl,
          mixedUrl: mixResult.mixedUrl,
        });

        return {
          vocalUrl: vocalResult.audioUrl,
          mixedUrl: mixResult.mixedUrl,
          instrumentalUrl: song.audioUrl,
        };
      }),

    // Generate multiple takes with different voice settings
    generateTakes: protectedProcedure
      .input(z.object({
        songId: z.number(),
        voiceId: z.string().min(1),
        takeCount: z.number().min(2).max(3).default(3),
        preset: z.enum(["raw", "warm", "bright", "radio-ready", "cinematic"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        if (!song.lyrics) throw new Error("Song has no lyrics for vocal generation");
        if (!song.audioUrl) throw new Error("Song has no instrumental track");

        // Define voice setting variations for each take
        const takeVariations = [
          { label: "Take 1 — Warm & Intimate", stability: 0.6, similarity_boost: 0.85, style: 0.25, use_speaker_boost: true },
          { label: "Take 2 — Energetic & Bright", stability: 0.4, similarity_boost: 0.75, style: 0.5, use_speaker_boost: true },
          { label: "Take 3 — Smooth & Polished", stability: 0.55, similarity_boost: 0.9, style: 0.35, use_speaker_boost: true },
        ].slice(0, input.takeCount);

        const takes = [];

        for (let i = 0; i < takeVariations.length; i++) {
          const variation = takeVariations[i];

          // Generate vocal with this variation's settings
          const vocalResult = await textToSpeech({
            text: song.lyrics,
            voiceId: input.voiceId,
            modelId: "eleven_multilingual_v2",
            voiceSettings: {
              stability: variation.stability,
              similarity_boost: variation.similarity_boost,
              style: variation.style,
              use_speaker_boost: variation.use_speaker_boost,
            },
          }, ctx.user.id);

          // Mix with instrumental
          const mixResult = await mixVocalInstrumental(
            song.audioUrl,
            vocalResult.audioUrl,
            ctx.user.id,
            { preset: input.preset ?? "radio-ready" }
          );

          takes.push({
            index: i,
            label: variation.label,
            vocalUrl: vocalResult.audioUrl,
            mixedUrl: mixResult.mixedUrl,
            voiceSettings: {
              stability: variation.stability,
              similarity_boost: variation.similarity_boost,
              style: variation.style,
              use_speaker_boost: variation.use_speaker_boost,
            },
            createdAt: Date.now(),
          });
        }

        // Save all takes and set the first as selected
        await updateSongTakes(song.id, takes, 0);
        // Also save the first take's stems
        await updateSongStems(song.id, {
          instrumentalUrl: song.audioUrl,
          vocalUrl: takes[0].vocalUrl,
          mixedUrl: takes[0].mixedUrl,
        });

        return { takes };
      }),

    // Select a specific take as the active one
    selectTake: protectedProcedure
      .input(z.object({
        songId: z.number(),
        takeIndex: z.number().min(0).max(2),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        const takes = (song.takes as any[]) ?? [];
        if (input.takeIndex >= takes.length) throw new Error("Take not found");

        const selectedTake = takes[input.takeIndex];
        await updateSongTakes(song.id, takes, input.takeIndex);
        await updateSongStems(song.id, {
          vocalUrl: selectedTake.vocalUrl,
          mixedUrl: selectedTake.mixedUrl,
        });

        return { selectedTakeIndex: input.takeIndex, take: selectedTake };
      }),

    // Get stem download URLs
    getStems: protectedProcedure
      .input(z.object({
        songId: z.number(),
        processPreset: z.enum(["raw", "warm", "bright", "radio-ready", "cinematic"]).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");

        const instrumentalUrl = song.instrumentalUrl || song.audioUrl;
        const vocalUrl = song.vocalUrl;

        if (!instrumentalUrl) throw new Error("No instrumental track available");

        return {
          instrumentalUrl,
          vocalUrl: vocalUrl || null,
          mixedUrl: song.mixedUrl || null,
          hasStems: !!vocalUrl,
        };
      }),

    // Generate AI cover art for a song
    generateCover: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        const genre = song.genre || "eclectic";
        const mood = song.mood || "expressive";
        const instruments = Array.isArray(song.instruments) ? song.instruments.slice(0, 5).join(", ") : "";

        const prompt = `Create a stunning, professional single cover art for a song titled "${song.title}". ` +
          `The music style is ${genre} with a ${mood} atmosphere. ` +
          (instruments ? `Featured instruments include ${instruments}. ` : "") +
          (song.keywords ? `Inspired by: ${song.keywords}. ` : "") +
          `The design should be artistic, visually striking, and suitable as a square song cover. ` +
          `Use rich colors, abstract or symbolic imagery that evokes the music's mood. ` +
          `No text or typography on the image. Professional quality, high detail.`;

        const { url } = await generateImage({ prompt });

        if (url) {
          await updateSongImageUrl(input.songId, url);
        }

        return { imageUrl: url };
      }),
  }),

  favorites: router({
    toggle: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const isFavorited = await toggleFavorite(ctx.user.id, input.songId);
        return { isFavorited };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserFavorites(ctx.user.id);
    }),

    ids: protectedProcedure.query(async ({ ctx }) => {
      return getUserFavoriteIds(ctx.user.id);
    }),
  }),

  albums: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(1000).optional(),
        coverColor: z.string().optional(),
        songIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const album = await createAlbum({
          userId: ctx.user.id,
          title: input.title,
          description: input.description ?? null,
          coverColor: input.coverColor ?? "#6366f1",
        });

        if (album && input.songIds && input.songIds.length > 0) {
          for (let i = 0; i < input.songIds.length; i++) {
            // Verify each song belongs to the user
            const song = await getSongById(input.songIds[i]);
            if (!song || song.userId !== ctx.user.id) continue;
            try {
              await addSongToAlbum(album.id, input.songIds[i], i);
            } catch {
              // Skip duplicates or invalid songs
            }
          }
        }

        return album;
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const albumList = await getUserAlbums(ctx.user.id);
      const result = [];
      for (const album of albumList) {
        const songCount = await getAlbumSongCount(album.id);
        result.push({ ...album, songCount });
      }
      return result;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const album = await getAlbumById(input.id);
        if (!album || album.userId !== ctx.user.id) return null;
        const songList = await getAlbumSongs(input.id);
        return { ...album, songs: songList };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
        coverColor: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return updateAlbum(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteAlbum(input.id, ctx.user.id);
        return { success: true };
      }),

    addSong: protectedProcedure
      .input(z.object({
        albumId: z.number(),
        songId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const album = await getAlbumById(input.albumId);
        if (!album || album.userId !== ctx.user.id) throw new Error("Album not found");
        // Verify the song belongs to the user
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        const count = await getAlbumSongCount(input.albumId);
        try {
          await addSongToAlbum(input.albumId, input.songId, count);
        } catch (err: any) {
          if (err.message?.includes("already in this album")) {
            throw new Error("This song is already in the album");
          }
          throw err;
        }
        return { success: true };
      }),

    removeSong: protectedProcedure
      .input(z.object({
        albumId: z.number(),
        songId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const album = await getAlbumById(input.albumId);
        if (!album || album.userId !== ctx.user.id) throw new Error("Album not found");
        await removeSongFromAlbum(input.albumId, input.songId);
        return { success: true };
      }),

    reorderSongs: protectedProcedure
      .input(z.object({
        albumId: z.number(),
        songIds: z.array(z.number()).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const album = await getAlbumById(input.albumId);
        if (!album || album.userId !== ctx.user.id) {
          throw new Error("Album not found");
        }
        await reorderAlbumSongs(input.albumId, input.songIds);
        return { success: true };
      }),

    generateCover: protectedProcedure
      .input(z.object({ albumId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const album = await getAlbumById(input.albumId);
        if (!album || album.userId !== ctx.user.id) {
          throw new Error("Album not found");
        }

        const songList = await getAlbumSongs(input.albumId);

        const genres = Array.from(new Set(songList.map((s: any) => s?.genre).filter(Boolean)));
        const moods = Array.from(new Set(songList.map((s: any) => s?.mood).filter(Boolean)));
        const instruments = Array.from(new Set(songList.flatMap((s: any) => s?.instruments || []).filter(Boolean)));

        const genreStr = genres.length > 0 ? genres.join(", ") : "eclectic";
        const moodStr = moods.length > 0 ? moods.join(" and ") : "expressive";
        const instrumentStr = instruments.length > 0 ? instruments.slice(0, 5).join(", ") : "";

        const prompt = `Create a stunning, professional album cover art for a music album titled "${album.title}". ` +
          `The music style is ${genreStr} with a ${moodStr} atmosphere. ` +
          (instrumentStr ? `Featured instruments include ${instrumentStr}. ` : "") +
          (album.description ? `Album description: ${album.description}. ` : "") +
          `The design should be artistic, visually striking, and suitable as a square album cover. ` +
          `Use rich colors, abstract or symbolic imagery that evokes the music's mood. ` +
          `No text or typography on the image. Professional quality, high detail.`;

        const { url } = await generateImage({ prompt });

        if (url) {
          await updateAlbumCoverImage(input.albumId, url);
        }

        return { coverImageUrl: url };
      }),

    generateAllSongCovers: protectedProcedure
      .input(z.object({ albumId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const album = await getAlbumById(input.albumId);
        if (!album || album.userId !== ctx.user.id) {
          throw new Error("Album not found");
        }

        const songList = await getAlbumSongs(input.albumId);
        const songsWithoutCovers = songList.filter((s: any) => !s.imageUrl);

        if (songsWithoutCovers.length === 0) {
          return { generated: 0, total: songList.length };
        }

        let generated = 0;
        for (const s of songsWithoutCovers) {
          const song = s as any;
          if (!song) continue;
          try {
            const genre = song.genre || "eclectic";
            const mood = song.mood || "expressive";
            const instruments = Array.isArray(song.instruments) ? song.instruments.slice(0, 5).join(", ") : "";

            const prompt = `Create a stunning, professional single cover art for a song titled "${song.title}". ` +
              `The music style is ${genre} with a ${mood} atmosphere. ` +
              (instruments ? `Featured instruments include ${instruments}. ` : "") +
              (song.keywords ? `Inspired by: ${song.keywords}. ` : "") +
              `The design should be artistic, visually striking, and suitable as a square song cover. ` +
              `Use rich colors, abstract or symbolic imagery that evokes the music's mood. ` +
              `No text or typography on the image. Professional quality, high detail.`;

            const { url } = await generateImage({ prompt });
            if (url) {
              await updateSongImageUrl(song.id, url);
              generated++;
            }
          } catch (err) {
            console.error(`[Albums] Failed to generate cover for song ${song.id}:`, err);
          }
        }

        return { generated, total: songList.length };
      }),
  }),

  // ─── Credits & Subscription ─────────────────────────────────────────────
  credits: router({
    // Get current user's plan, balance, and usage summary
    summary: protectedProcedure.query(async ({ ctx }) => {
      return getUsageSummary(ctx.user.id);
    }),

    // Get credit balance only
    balance: protectedProcedure.query(async ({ ctx }) => {
      return getCreditBalance(ctx.user.id);
    }),

    // Get transaction history
    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return getTransactionHistory(ctx.user.id, input?.limit ?? 50);
      }),

    // Get plan limits for display
    planLimits: publicProcedure
      .input(z.object({ plan: z.enum(["free", "creator", "professional"]) }))
      .query(({ input }) => {
        return getPlanLimits(input.plan as PlanName);
      }),

    // Get all plan details for pricing page
    allPlans: publicProcedure.query(() => {
      return {
        plans: [
          {
            id: "creator",
            name: "Creator",
            tagline: "For content creators & hobbyists",
            monthlyPrice: 15,
            annualPrice: 132,
            popular: true,
            limits: PLAN_LIMITS.creator,
            features: [
              "30 songs per month",
              "Unlimited sheet music & chords",
              "192kbps MP3 quality",
              "Commercial use (personal & social)",
            ],
          },
          {
            id: "professional",
            name: "Professional",
            tagline: "For serious musicians & businesses",
            monthlyPrice: 29,
            annualPrice: 264,
            limits: PLAN_LIMITS.professional,
            features: [
              "60 songs per month",
              "Unlimited sheet music & chords",
              "192kbps MP3 quality",
              "Full commercial rights",
            ],
          },
        ],
      };
    }),

    // ─── Stripe Checkout ─────────────────────────────────────────────
    // Create a Stripe Checkout session for a subscription plan
    createCheckout: protectedProcedure
      .input(z.object({
        planId: z.enum(["creator", "professional"]),
        billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const stripe = getStripe();
        if (!stripe) throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY.");

        const plan = STRIPE_PLANS[input.planId as StripePlanId];
        if (!plan) throw new Error(`Invalid plan: ${input.planId}`);

        const priceInCents = input.billingCycle === "annual" ? plan.prices.annual : plan.prices.monthly;
        const interval = input.billingCycle === "annual" ? "year" : "month";

        // Check if user already has a Stripe customer ID
        const existingSub = await getUserSubscription(ctx.user.id);
        const sessionParams: Stripe.Checkout.SessionCreateParams = {
          mode: "subscription",
          client_reference_id: String(ctx.user.id),
          metadata: {
            user_id: String(ctx.user.id),
            plan_tier: input.planId,
            customer_email: ctx.user.email || "",
          },
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: plan.name,
                  description: plan.description,
                  metadata: plan.metadata,
                },
                unit_amount: priceInCents,
                recurring: { interval },
              },
              quantity: 1,
            },
          ],
          subscription_data: {
            metadata: {
              user_id: String(ctx.user.id),
              plan_tier: input.planId,
            },
          },
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
        };

        // If user already has a Stripe customer, reuse it
        if (existingSub?.stripeCustomerId) {
          sessionParams.customer = existingSub.stripeCustomerId;
        } else {
          // Note: customer_creation is NOT allowed in subscription mode
          // Stripe automatically creates a customer for subscription checkouts
          if (ctx.user.email) {
            sessionParams.customer_email = ctx.user.email;
          }
        }

        // Allow promotion codes for discounts
        sessionParams.allow_promotion_codes = true;

        const session = await stripe.checkout.sessions.create(sessionParams);
        return { url: session.url, sessionId: session.id };
      }),

    // Create a Stripe Customer Portal session for billing management
    createPortalSession: protectedProcedure
      .input(z.object({
        returnUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const stripe = getStripe();
        if (!stripe) throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY.");

        const sub = await getUserSubscription(ctx.user.id);
        if (!sub?.stripeCustomerId) {
          throw new Error("No billing account found. Please subscribe to a plan first.");
        }

        const session = await stripe.billingPortal.sessions.create({
          customer: sub.stripeCustomerId,
          return_url: input.returnUrl,
        });

        return { url: session.url };
      }),

    // Check if Stripe is configured
    stripeStatus: publicProcedure.query(() => {
      return {
        configured: !!ENV.STRIPE_SECRET_KEY,
      };
    }),

    // Check if user can perform an action (used before generation)
    canPerform: protectedProcedure
      .input(z.object({ action: z.enum(["generation"]) }))
      .query(async ({ ctx, input }) => {
        const plan = await getUserPlan(ctx.user.id);
        const balance = await getCreditBalance(ctx.user.id);
        const dailyCheck = await checkDailyLimit(ctx.user.id, input.action, plan);
        const limits = getPlanLimits(plan);
        return {
          allowed: dailyCheck.allowed && balance.totalCredits > 0,
          plan,
          balance,
          dailyUsage: dailyCheck,
          limits,
          license: getLicenseType(plan),
        };
      }),
  }),

  // ─── Community / Discover ───
  community: router({
    // Get public songs for the Discover page (no auth required)
    discover: publicProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(24),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 24;
        const offset = input?.offset ?? 0;
        const [publicSongs, totalCount] = await Promise.all([
          getPublicSongs(limit, offset),
          getPublicSongCount(),
        ]);
        return {
          songs: publicSongs.map(({ song, creator }) => ({
            ...song,
            creatorName: creator.name || "Anonymous",
            creatorId: creator.id,
          })),
          totalCount,
          hasMore: offset + limit < totalCount,
        };
      }),

    // Publish a song to the community pool
    publish: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const song = await publishSong(input.songId, ctx.user.id);
        return song;
      }),

    // Unpublish a song (make it private again)
    unpublish: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const song = await unpublishSong(input.songId, ctx.user.id);
        return song;
      }),
  }),

  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 30;
        const items = await getUserNotifications(ctx.user.id, limit);
        return items;
      }),

    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await getUnreadNotificationCount(ctx.user.id);
        return { count };
      }),

    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        await markAllNotificationsRead(ctx.user.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteNotification(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Referrals ─────────────────────────────────────────────────────────────
  referrals: router({
    getInfo: protectedProcedure.query(async ({ ctx }) => {
      const code = await ensureReferralCode(ctx.user.id);
      const stats = await getReferralStats(ctx.user.id);
      return {
        referralCode: code,
        ...stats,
      };
    }),

    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        return getReferralHistory(ctx.user.id, input?.limit ?? 50);
      }),

    claim: protectedProcedure
      .input(z.object({ code: z.string().min(1).max(16) }))
      .mutation(async ({ ctx, input }) => {
        const referrer = await getUserByReferralCode(input.code);
        if (!referrer) return { success: false, reason: "invalid_code" };
        if (referrer.id === ctx.user.id) return { success: false, reason: "self_referral" };

        const result = await processReferral(referrer.id, ctx.user.id, input.code);
        return { success: result, reason: result ? null : "already_referred" };
      }),

    leaderboard: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ ctx, input }) => {
        const userId = ctx.user?.id;
        return getLeaderboard(input?.limit ?? 20, userId);
      }),
  }),

  // ─── Blog Comments ─────────────────────────────────────────────────────────
  blogComments: router({
    // List comments for an article (public)
    list: publicProcedure
      .input(z.object({
        articleSlug: z.string().min(1).max(255),
        limit: z.number().min(1).max(100).default(50),
      }))
      .query(async ({ input }) => {
        const comments = await getBlogComments(input.articleSlug, input.limit);
        return comments.map((c) => ({
          id: c.id,
          articleSlug: c.articleSlug,
          userId: c.userId,
          content: c.content,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          userName: c.userName || "Anonymous",
        }));
      }),

    // Get comment count for an article (public)
    count: publicProcedure
      .input(z.object({ articleSlug: z.string().min(1).max(255) }))
      .query(async ({ input }) => {
        const count = await getBlogCommentCount(input.articleSlug);
        return { count };
      }),

    // Create a comment (authenticated)
    create: protectedProcedure
      .input(z.object({
        articleSlug: z.string().min(1).max(255),
        content: z.string().min(1).max(2000),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate that the article exists
        const article = getArticleBySlug(input.articleSlug);
        if (!article) throw new Error("Article not found");

        const result = await createBlogComment({
          articleSlug: input.articleSlug,
          userId: ctx.user.id,
          content: input.content.trim(),
        });
        return { id: result.id, success: true };
      }),

    // Delete own comment (authenticated)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteBlogComment(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
