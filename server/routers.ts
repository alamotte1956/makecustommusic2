import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import {
  createSong, getSongById, getUserSongs, deleteSong, updateSong, updateSongMp3,
  updateSongAudioUrl, updateSongShareToken, getSongByShareToken,
  createAlbum, getAlbumById, getUserAlbums, deleteAlbum, updateAlbum,
  updateAlbumCoverImage, addSongToAlbum, removeSongFromAlbum, getAlbumSongs, getAlbumSongCount,
  reorderAlbumSongs,
  toggleFavorite, getUserFavorites, getUserFavoriteIds
} from "./db";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { isElevenLabsAvailable, generateMusic, textToSpeech, getVoices } from "./elevenLabsApi";

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

        // Build the prompt for ElevenLabs music generation
        let prompt: string;
        let forceInstrumental = false;

        if (mode === "custom" && customLyrics && customStyle) {
          // Custom Mode: build a detailed prompt from lyrics + style + title
          prompt = `Create a song titled "${customTitle || "Untitled"}" in the style of ${customStyle}.`;
          if (genre) prompt += ` Genre: ${genre}.`;
          if (mood) prompt += ` Mood: ${mood}.`;
          if (vocalType && vocalType !== "none") {
            prompt += ` Vocals: ${vocalType}.`;
          }
          prompt += `\n\nLyrics:\n${customLyrics}`;
        } else {
          // Simple Mode: build a rich prompt from keywords + genre + mood + vocal
          prompt = keywords;
          if (genre) prompt += `, ${genre} style`;
          if (mood) prompt += `, ${mood} mood`;
          if (vocalType === "none") {
            forceInstrumental = true;
          } else if (vocalType) {
            prompt += `, with ${vocalType} vocals`;
          }
          if (duration) prompt += `, ${duration} seconds long`;
        }

        // Truncate prompt to ElevenLabs limit (4100 chars)
        if (prompt.length > 4100) {
          prompt = prompt.substring(0, 4100);
        }

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
          musicDescription: `Generated with ElevenLabs${mode === "custom" ? " (Custom Mode)" : ""}`,
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

    // Generate lyrics from a subject/topic using LLM
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

        let styleHints = "";
        if (genre) styleHints += ` in a ${genre} style`;
        if (mood) styleHints += ` with a ${mood} mood`;
        if (vocalType && vocalType !== "none") {
          const vocalDesc = vocalType === "mixed" ? "a male and female duet" : `a ${vocalType} singer`;
          styleHints += `, written for ${vocalDesc}`;
        }

        const isExtended = length === "extended";
        const wordRange = isExtended ? "500-800" : "150-400";
        const structureHint = isExtended
          ? "Include at least 3 verses, a pre-chorus, a chorus, a bridge, and an outro. Make the lyrics rich with imagery, storytelling, and emotional depth."
          : "Include verses, a chorus, and optionally a bridge.";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional songwriter. Write original song lyrics based on the user's subject. Format the lyrics with section markers like [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro], etc. The lyrics should be creative, emotionally resonant, and ready to be set to music. ${structureHint} Keep lyrics between ${wordRange} words. Do not include any explanation or commentary — output only the lyrics.`,
            },
            {
              role: "user",
              content: `Write song lyrics about the following subject${styleHints}:\n\n"${subject}"`,
            },
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
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await textToSpeech(
          { text: input.text, voiceId: input.voiceId },
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
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        const result = await textToSpeech(
          { text: input.text, voiceId: input.voiceId },
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
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        const result = await textToSpeech(
          { text: input.lyrics, voiceId: input.voiceId },
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
});

export type AppRouter = typeof appRouter;
