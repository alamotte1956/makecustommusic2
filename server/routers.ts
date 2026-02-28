import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import {
  createSong, getSongById, getUserSongs, deleteSong, updateSongMp3,
  updateSongAudioUrl, updateSongShareToken, getSongByShareToken,
  createAlbum, getAlbumById, getUserAlbums, deleteAlbum, updateAlbum,
  updateAlbumCoverImage, addSongToAlbum, removeSongFromAlbum, getAlbumSongs, getAlbumSongCount
} from "./db";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { isSunoAvailable, sunoGenerateAndWait } from "./sunoApi";

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
        free: true,
        suno: isSunoAvailable(),
      };
    }),

    // Generate music — supports "free" (LLM+ABC) and "suno" (simple or custom mode)
    generate: protectedProcedure
      .input(z.object({
        keywords: z.string().min(1).max(500),
        engine: z.enum(["free", "suno"]).default("free"),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
        vocalType: z.enum(["none", "male", "female", "mixed"]).optional(),
        duration: z.number().min(15).max(240).optional(),
        // Suno Custom Mode fields
        sunoMode: z.enum(["simple", "custom"]).optional(),
        customTitle: z.string().max(255).optional(),
        customLyrics: z.string().max(5000).optional(),
        customStyle: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const {
          keywords, engine, genre, mood, vocalType, duration,
          sunoMode, customTitle, customLyrics, customStyle
        } = input;

        // ─── SUNO ENGINE ───
        if (engine === "suno") {
          if (!isSunoAvailable()) {
            throw new Error("Suno engine is not available. Please configure the SUNO_API_KEY.");
          }

          let sunoResult;

          if (sunoMode === "custom" && customLyrics && customStyle) {
            // Suno Custom Mode: user provides lyrics, style tags, and title
            sunoResult = await sunoGenerateAndWait({
              mode: "custom",
              title: customTitle || "Untitled",
              lyrics: customLyrics,
              style: customStyle,
              duration: duration,
            });
          } else {
            // Suno Simple Mode: build a rich prompt from keywords + genre + mood + vocal
            let prompt = keywords;
            if (genre) prompt += `, ${genre} style`;
            if (mood) prompt += `, ${mood} mood`;
            if (vocalType && vocalType !== "none") {
              prompt += `, with ${vocalType} vocals`;
            }
            if (duration) prompt += `, ${duration} seconds long`;

            sunoResult = await sunoGenerateAndWait({
              mode: "simple",
              prompt,
              duration,
            });
          }

          // Save to database
          const song = await createSong({
            userId: ctx.user.id,
            title: sunoResult.title || customTitle || "Suno Track",
            keywords,
            abcNotation: null,
            musicDescription: `Generated with Suno V5${sunoMode === "custom" ? " (Custom Mode)" : ""}`,
            audioUrl: sunoResult.audioUrl,
            tempo: null,
            keySignature: null,
            timeSignature: null,
            genre: genre || sunoResult.tags || null,
            mood: mood || null,
            instruments: null,
            duration: sunoResult.duration ? Math.round(sunoResult.duration) : (duration || 30),
            engine: "suno",
            vocalType: vocalType || null,
            lyrics: sunoResult.lyric || customLyrics || null,
            styleTags: customStyle || sunoResult.tags || null,
            sunoSongId: sunoResult.id || null,
            imageUrl: sunoResult.imageUrl || null,
          });

          return song;
        }

        // ─── FREE ENGINE (LLM + ABC Notation) ───
        const vocalInstruction = vocalType && vocalType !== "none"
          ? `\nInclude vocal melody line marked with "V:" voice. The vocal style should be ${vocalType}. Add lyrics as "w:" lines under the vocal melody.`
          : "";

        const genreInstruction = genre ? `\nThe genre should be: ${genre}` : "";
        const moodInstruction = mood ? `\nThe mood should be: ${mood}` : "";
        const durationInstruction = duration
          ? `\nTarget duration: approximately ${duration} seconds. Adjust the number of bars accordingly (roughly ${Math.round(duration / 2)} bars at moderate tempo).`
          : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert music composer. Given keywords describing a desired piece of music, generate a complete musical composition in ABC notation format.

IMPORTANT RULES:
1. Generate valid ABC notation that can be rendered as sheet music
2. The piece should be 16-32 bars long
3. Include proper headers: X (reference number), T (title), M (meter), L (default note length), K (key), Q (tempo)
4. Use appropriate key signatures, time signatures, and tempos for the described style
5. Create melodically interesting and harmonically coherent music
6. Include dynamics and expression marks where appropriate${vocalInstruction}${genreInstruction}${moodInstruction}${durationInstruction}

Return your response as a JSON object with these fields:
- title: A creative title for the piece
- abcNotation: The complete ABC notation string
- genre: The primary genre
- mood: The primary mood
- tempo: BPM as a number
- keySignature: The key (e.g., "C major", "A minor")
- timeSignature: The time signature (e.g., "4/4", "3/4")
- instruments: Array of instrument names suitable for this piece
- description: A brief description of the musical piece (2-3 sentences)`
            },
            {
              role: "user",
              content: `Create a musical composition based on these keywords: "${keywords}"`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "music_composition",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Creative title for the piece" },
                  abcNotation: { type: "string", description: "Complete ABC notation" },
                  genre: { type: "string", description: "Primary genre" },
                  mood: { type: "string", description: "Primary mood" },
                  tempo: { type: "integer", description: "BPM tempo" },
                  keySignature: { type: "string", description: "Key signature" },
                  timeSignature: { type: "string", description: "Time signature" },
                  instruments: { type: "array", items: { type: "string" }, description: "Suitable instruments" },
                  description: { type: "string", description: "Brief description" },
                },
                required: ["title", "abcNotation", "genre", "mood", "tempo", "keySignature", "timeSignature", "instruments", "description"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new Error("Failed to generate music composition");
        }

        const composition = JSON.parse(content);

        const song = await createSong({
          userId: ctx.user.id,
          title: composition.title,
          keywords,
          abcNotation: composition.abcNotation,
          musicDescription: composition.description,
          tempo: composition.tempo,
          keySignature: composition.keySignature,
          timeSignature: composition.timeSignature,
          genre: genre || composition.genre,
          mood: mood || composition.mood,
          instruments: composition.instruments,
          duration: duration || 30,
          engine: "free",
          vocalType: vocalType || null,
        });

        return song;
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
        // Return limited info for public view
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSong(input.id, ctx.user.id);
        return { success: true };
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

    // Generate album cover image based on album's songs
    generateCover: protectedProcedure
      .input(z.object({ albumId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const album = await getAlbumById(input.albumId);
        if (!album || album.userId !== ctx.user.id) {
          throw new Error("Album not found");
        }

        // Get the album's songs to extract genres and moods
        const songList = await getAlbumSongs(input.albumId);

        // Collect unique genres and moods from songs
        const genres = Array.from(new Set(songList.map((s: any) => s?.genre).filter(Boolean)));
        const moods = Array.from(new Set(songList.map((s: any) => s?.mood).filter(Boolean)));
        const instruments = Array.from(new Set(songList.flatMap((s: any) => s?.instruments || []).filter(Boolean)));

        // Build a rich prompt for album cover generation
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
