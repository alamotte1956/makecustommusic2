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
  updateSongStems, updateSongTakes, updateSongPostProcessPreset,
  createAlbum, getAlbumById, getUserAlbums, deleteAlbum, updateAlbum,
  updateAlbumCoverImage, addSongToAlbum, removeSongFromAlbum, getAlbumSongs, getAlbumSongCount,
  reorderAlbumSongs,
  toggleFavorite, getUserFavorites, getUserFavoriteIds,
  publishSong, unpublishSong, getPublicSongs, getPublicSongCount
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
} from "./credits";
import { PLAN_LIMITS, type PlanName } from "../drizzle/schema";

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
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        // If already generated, return cached
        if (song.sheetMusicAbc) {
          return { abcNotation: song.sheetMusicAbc };
        }

        const songContext = [
          `Title: ${song.title}`,
          song.genre ? `Genre: ${song.genre}` : null,
          song.mood ? `Mood: ${song.mood}` : null,
          song.keySignature ? `Key: ${song.keySignature}` : null,
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
- Use appropriate key signature for the genre (e.g., minor keys for dark/melancholic, major for happy/uplifting)
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
            await addSongToAlbum(album.id, input.songIds[i], i);
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
        const count = await getAlbumSongCount(input.albumId);
        await addSongToAlbum(input.albumId, input.songId, count);
        return { success: true };
      }),

    removeSong: protectedProcedure
      .input(z.object({
        albumId: z.number(),
        songId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
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
      .input(z.object({ plan: z.enum(["free", "creator", "professional", "studio"]) }))
      .query(({ input }) => {
        return getPlanLimits(input.plan as PlanName);
      }),

    // Get all plan details for pricing page
    allPlans: publicProcedure.query(() => {
      return {
        plans: [
          {
            id: "free",
            name: "Free",
            tagline: "Get started with AI music",
            monthlyPrice: 0,
            annualPrice: 0,
            limits: PLAN_LIMITS.free,
            features: [
              "5 songs per day",
              "3 TTS previews per day",
              "2 sheet music generations per day",
              "2 chord progressions per day",
              "128kbps MP3 quality",
              "Personal use only",
            ],
          },
          {
            id: "creator",
            name: "Creator",
            tagline: "For content creators & hobbyists",
            monthlyPrice: 9,
            annualPrice: 84,
            popular: true,
            limits: PLAN_LIMITS.creator,
            features: [
              "100 songs per month",
              "50 TTS previews per month",
              "Unlimited sheet music & chords",
              "All 5 mastering presets",
              "2 vocal takes per song",
              "Instrumental + Full Mix stems",
              "192kbps MP3 quality",
              "Commercial use (personal & social)",
              "Add-on: 10 songs for $2",
            ],
          },
          {
            id: "professional",
            name: "Professional",
            tagline: "For serious musicians & businesses",
            monthlyPrice: 22,
            annualPrice: 216,
            limits: PLAN_LIMITS.professional,
            features: [
              "500 songs per month",
              "Unlimited TTS previews",
              "Unlimited sheet music & chords",
              "All 5 mastering presets",
              "3 vocal takes per song",
              "All stems (instrumental, vocal, mix)",
              "Full vocal-instrumental mixing",
              "192kbps MP3 + WAV export",
              "Full commercial rights",
              "Priority generation queue",
              "Add-on: 10 songs for $1.50",
            ],
          },
          {
            id: "studio",
            name: "Studio",
            tagline: "For studios, agencies & power users",
            monthlyPrice: 49,
            annualPrice: 468,
            limits: PLAN_LIMITS.studio,
            features: [
              "2,000 songs per month",
              "Unlimited everything",
              "3 vocal takes per song",
              "All stems unlimited",
              "Full studio production suite",
              "192kbps MP3 + WAV + FLAC",
              "Full commercial + sync licensing",
              "Priority queue (10 concurrent)",
              "API access",
              "White-label option",
              "Add-on: 10 songs for $1",
            ],
          },
        ],
      };
    }),

    // Check if user can perform an action (used before generation)
    canPerform: protectedProcedure
      .input(z.object({ action: z.enum(["generation", "tts"]) }))
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
});

export type AppRouter = typeof appRouter;
