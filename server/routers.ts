import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import {
  createSong, getSongById, getUserSongs, deleteSong, updateSongMp3,
  createAlbum, getAlbumById, getUserAlbums, deleteAlbum, updateAlbum,
  addSongToAlbum, removeSongFromAlbum, getAlbumSongs, getAlbumSongCount
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

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
    generate: protectedProcedure
      .input(z.object({
        keywords: z.string().min(1).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const { keywords } = input;

        // Use LLM to generate ABC notation music from keywords
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
6. Include dynamics and expression marks where appropriate

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

        // Save to database
        const song = await createSong({
          userId: ctx.user.id,
          title: composition.title,
          keywords,
          abcNotation: composition.abcNotation,
          musicDescription: composition.description,
          tempo: composition.tempo,
          keySignature: composition.keySignature,
          timeSignature: composition.timeSignature,
          genre: composition.genre,
          mood: composition.mood,
          instruments: composition.instruments,
          duration: 30,
        });

        return song;
      }),

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
        const fileKey = `songs/${ctx.user.id}/${nanoid()}.mp3`;
        const { url } = await storagePut(fileKey, buffer, "audio/mpeg");

        await updateSongMp3(input.songId, url, fileKey);
        return { mp3Url: url };
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
  }),
});

export type AppRouter = typeof appRouter;
