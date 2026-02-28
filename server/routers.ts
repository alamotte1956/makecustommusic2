import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import {
  createSong, getSongById, getUserSongs, deleteSong, updateSongMp3, updateSongAudio,
  createAlbum, getAlbumById, getUserAlbums, deleteAlbum, updateAlbum,
  addSongToAlbum, removeSongFromAlbum, getAlbumSongs, getAlbumSongCount
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { isSunoAvailable, sunoGenerate, sunoPollUntilDone } from "./musicApis/suno";
import { isReplicateAvailable, replicateGenerateAndWait } from "./musicApis/replicate";

const engineEnum = z.enum(["free", "suno", "musicgen"]);

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

  // Engine availability check (public so UI can show/hide options)
  engines: router({
    available: publicProcedure.query(() => {
      return {
        free: true, // Always available
        suno: isSunoAvailable(),
        musicgen: isReplicateAvailable(),
      };
    }),
  }),

  songs: router({
    generate: protectedProcedure
      .input(z.object({
        keywords: z.string().min(1).max(500),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
        vocalType: z.enum(["none", "male", "female", "mixed"]).default("none"),
        duration: z.number().min(8).max(120).default(30),
        engine: engineEnum.default("free"),
      }))
      .mutation(async ({ ctx, input }) => {
        const { keywords, genre, mood, vocalType, duration, engine } = input;

        // Validate engine availability
        if (engine === "suno" && !isSunoAvailable()) {
          throw new Error("Suno API is not configured. Please add your SUNO_API_KEY in Settings > Secrets.");
        }
        if (engine === "musicgen" && !isReplicateAvailable()) {
          throw new Error("Replicate MusicGen is not configured. Please add your REPLICATE_API_TOKEN in Settings > Secrets.");
        }

        // Route to the appropriate engine
        if (engine === "suno") {
          return generateWithSuno({ ctx, keywords, genre, mood, vocalType, duration });
        } else if (engine === "musicgen") {
          return generateWithMusicGen({ ctx, keywords, genre, mood, duration });
        } else {
          return generateWithFreeEngine({ ctx, keywords, genre, mood, vocalType, duration });
        }
      }),

    // Poll status for async generation (Suno)
    getStatus: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const song = await getSongById(input.id);
        if (!song || song.userId !== ctx.user.id) return null;
        return {
          id: song.id,
          status: song.status,
          title: song.title,
          mp3Url: song.mp3Url,
          imageUrl: song.imageUrl,
          lyrics: song.lyrics,
          duration: song.duration,
        };
      }),

    saveAudio: protectedProcedure
      .input(z.object({
        songId: z.number(),
        audioBase64: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) {
          throw new Error("Song not found");
        }

        const buffer = Buffer.from(input.audioBase64, "base64");
        const fileKey = `songs/${ctx.user.id}/${nanoid()}.wav`;
        const { url } = await storagePut(fileKey, buffer, "audio/wav");

        await updateSongMp3(input.songId, url, fileKey);
        return { audioUrl: url };
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

// ─── Engine Implementations ───

async function generateWithFreeEngine({ ctx, keywords, genre, mood, vocalType, duration }: {
  ctx: any; keywords: string; genre?: string; mood?: string; vocalType: string; duration: number;
}) {
  // Build vocal instruction
  let vocalInstruction = "";
  if (vocalType === "male") {
    vocalInstruction = "\n7. Include a vocal melody line suitable for a male vocalist (baritone/tenor range). Add lyrics using the w: field in ABC notation.";
  } else if (vocalType === "female") {
    vocalInstruction = "\n7. Include a vocal melody line suitable for a female vocalist (alto/soprano range). Add lyrics using the w: field in ABC notation.";
  } else if (vocalType === "mixed") {
    vocalInstruction = "\n7. Include vocal melody lines suitable for mixed vocals. Add lyrics using the w: field in ABC notation.";
  } else {
    vocalInstruction = "\n7. This is an instrumental piece with no vocals.";
  }

  let presetContext = "";
  if (genre) presetContext += ` The genre should be ${genre}.`;
  if (mood) presetContext += ` The mood should be ${mood}.`;
  if (vocalType !== "none") presetContext += ` Include ${vocalType} vocals with lyrics.`;

  // Determine bar count from duration
  const estimatedBars = Math.max(8, Math.round(duration / 2));

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert music composer. Given keywords describing a desired piece of music, generate a complete musical composition in ABC notation format.

IMPORTANT RULES:
1. Generate valid ABC notation that can be rendered as sheet music
2. The piece should be approximately ${estimatedBars} bars long (targeting ~${duration} seconds at the given tempo)
3. Include proper headers: X (reference number), T (title), M (meter), L (default note length), K (key), Q (tempo)
4. Use appropriate key signatures, time signatures, and tempos for the described style
5. Create melodically interesting and harmonically coherent music
6. Include dynamics and expression marks where appropriate${vocalInstruction}

Return your response as a JSON object with these fields:
- title: A creative title for the piece
- abcNotation: The complete ABC notation string (include w: lines for lyrics if vocals are requested)
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
        content: `Create a musical composition based on these keywords: "${keywords}"${presetContext}`
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
    genre: composition.genre,
    mood: composition.mood,
    instruments: composition.instruments,
    vocalType,
    engine: "free",
    requestedDuration: duration,
    duration,
    status: "completed",
  });

  return song;
}

async function generateWithSuno({ ctx, keywords, genre, mood, vocalType, duration }: {
  ctx: any; keywords: string; genre?: string; mood?: string; vocalType: string; duration: number;
}) {
  const isInstrumental = vocalType === "none";

  // Build style string
  const styleParts: string[] = [];
  if (genre) styleParts.push(genre);
  if (mood) styleParts.push(mood);
  const style = styleParts.join(", ") || undefined;

  // Map vocal type to Suno's gender parameter
  let vocalGender: "m" | "f" | undefined;
  if (vocalType === "male") vocalGender = "m";
  else if (vocalType === "female") vocalGender = "f";

  // Use LLM to generate a creative title and lyrics if vocal
  let title = "Untitled";
  let lyricsPrompt = keywords;

  if (!isInstrumental) {
    try {
      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a songwriter. Given a music description, generate a creative song title and lyrics. Return JSON with "title" (string, max 80 chars) and "lyrics" (string, song lyrics with [Verse], [Chorus], [Bridge] sections).`
          },
          {
            role: "user",
            content: `Write a song about: "${keywords}"${genre ? ` in ${genre} style` : ""}${mood ? ` with a ${mood} mood` : ""}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "song_lyrics",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "Song title" },
                lyrics: { type: "string", description: "Song lyrics" },
              },
              required: ["title", "lyrics"],
              additionalProperties: false,
            },
          },
        },
      });
      const parsed = JSON.parse(response_content(llmResponse));
      title = parsed.title;
      lyricsPrompt = parsed.lyrics;
    } catch {
      title = keywords.slice(0, 80);
    }
  } else {
    title = `${keywords.slice(0, 60)} (Instrumental)`;
  }

  // Create the song record first with "generating" status
  const song = await createSong({
    userId: ctx.user.id,
    title,
    keywords,
    abcNotation: "", // No ABC notation for Suno
    musicDescription: `AI-generated ${isInstrumental ? "instrumental" : "vocal"} track`,
    genre: genre || null,
    mood: mood || null,
    vocalType,
    engine: "suno",
    requestedDuration: duration,
    status: "generating",
  });

  if (!song) throw new Error("Failed to create song record");

  // Start Suno generation (async)
  try {
    const { taskId } = await sunoGenerate({
      prompt: lyricsPrompt,
      style,
      title,
      instrumental: isInstrumental,
      vocalGender,
    });

    // Poll until done (this can take 2-3 minutes)
    const sunoSong = await sunoPollUntilDone(taskId);

    // Download the audio and re-upload to our S3
    const audioResponse = await fetch(sunoSong.audioUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const fileKey = `songs/${ctx.user.id}/${nanoid()}.mp3`;
    const { url: storedUrl } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

    // Update the song record
    await updateSongAudio(song.id, {
      mp3Url: storedUrl,
      mp3Key: fileKey,
      imageUrl: sunoSong.imageUrl,
      lyrics: sunoSong.prompt || lyricsPrompt,
      duration: Math.round(sunoSong.duration),
      title: sunoSong.title || title,
      status: "completed",
    });

    return getSongById(song.id);
  } catch (error: any) {
    await updateSongAudio(song.id, { status: "failed" });
    throw new Error(`Suno generation failed: ${error.message}`);
  }
}

async function generateWithMusicGen({ ctx, keywords, genre, mood, duration }: {
  ctx: any; keywords: string; genre?: string; mood?: string; duration: number;
}) {
  // Build a rich prompt for MusicGen
  const promptParts: string[] = [keywords];
  if (genre) promptParts.push(genre);
  if (mood) promptParts.push(`${mood} mood`);
  const prompt = promptParts.join(", ");

  // Use LLM to generate a creative title
  let title = keywords.slice(0, 80);
  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Generate a creative music track title based on the description. Return JSON with a single "title" field (max 80 chars).`
        },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "track_title",
          strict: true,
          schema: {
            type: "object",
            properties: { title: { type: "string" } },
            required: ["title"],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = JSON.parse(response_content(llmResponse));
    title = parsed.title;
  } catch {
    // Use keywords as fallback title
  }

  // Create song record with "generating" status
  const song = await createSong({
    userId: ctx.user.id,
    title,
    keywords,
    abcNotation: "", // No ABC notation for MusicGen
    musicDescription: `AI-generated instrumental track via MusicGen`,
    genre: genre || null,
    mood: mood || null,
    vocalType: "none",
    engine: "musicgen",
    requestedDuration: duration,
    status: "generating",
  });

  if (!song) throw new Error("Failed to create song record");

  try {
    // Generate with Replicate MusicGen
    const audioUrl = await replicateGenerateAndWait({
      prompt,
      duration: Math.min(duration, 30), // MusicGen max ~30s per generation
      outputFormat: "mp3",
    });

    // Download and re-upload to our S3
    const audioResponse = await fetch(audioUrl);
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const fileKey = `songs/${ctx.user.id}/${nanoid()}.mp3`;
    const { url: storedUrl } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

    await updateSongAudio(song.id, {
      mp3Url: storedUrl,
      mp3Key: fileKey,
      duration,
      status: "completed",
    });

    return getSongById(song.id);
  } catch (error: any) {
    await updateSongAudio(song.id, { status: "failed" });
    throw new Error(`MusicGen generation failed: ${error.message}`);
  }
}

function response_content(result: any): string {
  const content = result.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("No LLM content");
  return content;
}
