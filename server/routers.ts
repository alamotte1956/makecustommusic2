import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
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
  publishSong, unpublishSong, getPublicSongs, getPublicSongCount, getFeaturedSongs,
  createNotification, getUserNotifications, getUnreadNotificationCount,
  markNotificationRead, markAllNotificationsRead, deleteNotification,
  getBlogComments, createBlogComment, deleteBlogComment, getBlogCommentCount,
  createMp3SheetJob, getMp3SheetJob, updateMp3SheetJob, getUserMp3SheetJobs, deleteMp3SheetJob,
  createWorshipSet, getWorshipSetById, getUserWorshipSets, updateWorshipSet, deleteWorshipSet,
  addWorshipSetItem, getWorshipSetItems, updateWorshipSetItem, deleteWorshipSetItem, reorderWorshipSetItems,
  linkScriptureSong, getScriptureSongBySongId,
  createSharedLyrics, getSharedLyricsByToken, updateSharedLyrics, deleteSharedLyrics, getUserSharedLyrics,
  createStemSeparation, getStemSeparationById, getStemSeparationBySongId, updateStemSeparationStatus, updateStemSeparationStems, updateSongSunoIds,
  getDb,
  createGenerationTask, getGenerationTask, updateGenerationTask, getPendingGenerationTasks,
} from "./db";
import type { ChordProgressionData, SharedLyricsSection } from "../drizzle/schema";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { isSunoAvailable, generateMusic as sunoGenerateMusic, submitMusicGeneration, getTaskStatus, submitStemSeparation, waitForStemSeparation, downloadAndStoreStem } from "./sunoApi";
import { getGenreGuidance, getMoodGuidance, buildProductionPrompt } from "./songwritingHelpers";
import { postProcessAudio, mixVocalInstrumental, prepareStemDownloads, getPresets, type ProcessingPreset } from "./audioProcessor";
import { addTempoSync, getTempoVoiceSettings, estimateBpmFromGenre } from "./ssmlBuilder";
import { buildCoverArtPrompt } from "./coverArtMotifs";
import {
  getUserPlan, getCreditBalance, deductCredits, refundCredits, getUsageSummary,
  getTransactionHistory, checkDailyLimit, getPlanLimits, getLicenseType,
  getUserSubscription, canUserGenerate, checkMonthlyBonus, useMonthlyBonus,
  getDailyUsageChart,
} from "./credits";
import { PLAN_LIMITS, REFERRAL_BONUS_CREDITS, type PlanName, LITURGICAL_SEASONS, SERVICE_SEGMENTS, BAND_INSTRUMENTS, CHOIR_PARTS } from "../drizzle/schema";
import { getArticleBySlug } from "../shared/blogArticles";
import { ensureReferralCode, getReferralStats, getReferralHistory, getUserByReferralCode, processReferral, getLeaderboard } from "./referrals";
import { STRIPE_PLANS, type StripePlanId, STEM_SEPARATION_PRODUCT, TAX_RATE, TAX_JURISDICTION } from "./stripeProducts";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { generateSheetMusicInBackground, generateAbcNotation, sanitiseAbc, validateAbc } from "./backgroundSheetMusic";
import { processMp3SheetJob } from "./mp3SheetProcessor";
import { getAdminUserList, getAdminUserDetail, getAdminSiteStats, type AdminRevenueStats } from "./adminDb";
import { eq } from "drizzle-orm";
import { users as usersTable } from "../drizzle/schema";

function getStripe(): Stripe | null {
  const key = ENV.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

import axios from "axios";

/**
 * Download audio with retry logic (3 attempts, exponential backoff).
 */
async function downloadAudioWithRetry(url: string, maxRetries = 3): Promise<Buffer> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 60000,
        validateStatus: (s) => s >= 200 && s < 300,
      });
      const buffer = Buffer.from(response.data);
      // Validate: must be at least 10KB and have audio content-type
      const contentType = response.headers["content-type"] || "";
      if (buffer.length < 10240) {
        throw new Error(`Audio file too small (${buffer.length} bytes) — likely corrupt or error page`);
      }
      if (contentType && !contentType.includes("audio") && !contentType.includes("octet-stream")) {
        console.warn(`[AudioDownload] Unexpected content-type: ${contentType}, but file size OK (${buffer.length} bytes)`);
      }
      return buffer;
    } catch (err: any) {
      console.warn(`[AudioDownload] Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1))); // 2s, 4s, 8s
    }
  }
  throw new Error("Audio download failed after all retries");
}

/**
 * Background task that polls kie.ai for generation completion,
 * downloads the audio, uploads to S3, and saves the song to DB.
 * Runs as a fire-and-forget async function — no request timeout risk.
 * On failure, refunds the user's credit.
 */
async function processGenerationTaskInBackground(
  taskDbId: number,
  userId: number,
  userName: string | null,
  userEmail: string | null
) {
  let usedBonus = false;
  try {
    await updateGenerationTask(taskDbId, { status: "processing" });
    const task = await getGenerationTask(taskDbId, userId);
    if (!task) throw new Error("Task not found");
    usedBonus = !!task.usedBonus;

    // Poll kie.ai for completion (up to 10 minutes)
    const maxWaitMs = 600000;
    const pollIntervalMs = 10000;
    const startTime = Date.now();
    let pollCount = 0;
    let completedResult: any = null;

    while (Date.now() - startTime < maxWaitMs) {
      pollCount++;
      try {
        const status = await getTaskStatus(task.kieTaskId);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[GenTask#${taskDbId}] Poll #${pollCount} (${elapsed}s): status=${status.status}, hasAudio=${!!status.response?.data?.length}`);

        if (status.status === "SUCCESS" || (status.status === "FIRST_SUCCESS" && status.response?.data?.length)) {
          completedResult = status;
          break;
        }

        if (status.status === "FAILED" || status.status === "CREATE_TASK_FAILED") {
          throw new Error(status.errorMessage || "Generation failed at kie.ai");
        }
      } catch (pollErr: any) {
        // If it's a definitive failure, rethrow; otherwise log and keep polling
        if (pollErr.message?.includes("Generation failed") || pollErr.message?.includes("CREATE_TASK_FAILED")) {
          throw pollErr;
        }
        console.warn(`[GenTask#${taskDbId}] Poll error (will retry): ${pollErr.message}`);
      }

      await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    if (!completedResult?.response?.data?.length) {
      throw new Error("Generation timed out after 10 minutes");
    }

    // Filter out items with empty audio URLs
    const audioItems = (completedResult.response.data as any[]).filter(
      (item: any) => item.audio_url || item.audioUrl
    );
    if (!audioItems.length) {
      throw new Error("Generation completed but no audio URL was returned");
    }
    const audio = audioItems[0];
    const audioSourceUrl = audio.audio_url || audio.audioUrl;

    // Download audio with retry and validation
    const buffer = await downloadAudioWithRetry(audioSourceUrl);
    const fileKey = `songs/${userId}/${nanoid()}.mp3`;
    const { url: audioUrl } = await storagePut(fileKey, buffer, "audio/mpeg");

    // Save song to DB
    const song = await createSong({
      userId,
      title: task.customTitle || audio.title || (task.keywords || "").substring(0, 100) || "Suno Track",
      keywords: task.keywords || "",
      abcNotation: null,
      musicDescription: `Suno${task.mode === "custom" ? " Custom" : " Simple"} | ${(task.prompt || "").substring(0, 400)}`,
      audioUrl,
      mp3Url: audioUrl,
      mp3Key: fileKey,
      tempo: null,
      keySignature: null,
      timeSignature: null,
      genre: task.genre || null,
      mood: task.mood || null,
      instruments: null,
      duration: Math.round(audio.duration || 0),
      engine: "suno",
      vocalType: task.vocalType || null,
      lyrics: task.customLyrics || null,
      styleTags: audio.tags || task.customStyle || null,
      externalSongId: audio.id || null,
      imageUrl: null,
    });

    // Mark task as completed
    await updateGenerationTask(taskDbId, {
      status: "completed",
      songId: song.id,
      completedAt: new Date(),
    });

    // Fire-and-forget notifications
    notifyOwner({
      title: `\uD83C\uDFB5 New Song Generated`,
      content: `User: ${userName || userEmail || "Unknown"}\nTitle: ${song.title}\nGenre: ${task.genre || "Not specified"}\nMode: ${task.mode || "simple"}`,
    }).catch(() => {});

    createNotification({
      userId,
      type: "song_ready",
      title: "Your song is ready!",
      message: `"${song.title}" has been generated. Tap to listen and download.`,
      songId: song.id,
    }).catch(() => {});

    generateSheetMusicInBackground(song.id);

    console.log(`[GenTask#${taskDbId}] Completed successfully: song #${song.id}`);
  } catch (err: any) {
    console.error(`[GenTask#${taskDbId}] Failed:`, err.message);
    await updateGenerationTask(taskDbId, {
      status: "failed",
      errorMessage: err.message || "Unknown error",
      completedAt: new Date(),
    }).catch(() => {});

    // ── CRITICAL: Refund the user's credit on failure ──
    if (!usedBonus) {
      try {
        await refundCredits(userId, 1, `Refund: generation failed (task #${taskDbId}) — ${(err.message || "").substring(0, 100)}`);
        console.log(`[GenTask#${taskDbId}] Credit refunded to user #${userId}`);
      } catch (refundErr: any) {
        console.error(`[GenTask#${taskDbId}] CRITICAL: Failed to refund credit:`, refundErr.message);
        notifyOwner({
          title: "\u26A0\uFE0F Credit Refund Failed",
          content: `User #${userId} needs manual refund of 1 credit.\nTask: #${taskDbId}\nError: ${err.message}\nRefund error: ${refundErr.message}`,
        }).catch(() => {});
      }
    }
  }
}

/**
 * Recover pending/processing generation tasks after server restart.
 * Called once during server startup.
 */
export async function recoverPendingGenerationTasks() {
  try {
    const pending = await getPendingGenerationTasks();
    if (pending.length === 0) return;
    console.log(`[Recovery] Found ${pending.length} pending generation task(s), resuming...`);
    for (const task of pending) {
      // Re-run the background processor for each pending task
      processGenerationTaskInBackground(task.id, task.userId, null, null);
    }
  } catch (err: any) {
    console.warn(`[Recovery] Failed to recover pending tasks:`, err.message);
  }
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
        suno: isSunoAvailable(),
      };
    }),

    // Get musicapi.ai API credits (for visual indicator)
    musicApiCredits: protectedProcedure.query(async () => {
      if (!isSunoAvailable()) {
        return { available: false, credits: 0, extraCredits: 0 };
      }
      try {
        const { getCredits } = await import("./sunoApi");
        const credits = await getCredits();
        return { available: true, credits, extraCredits: 0 };
      } catch (err: any) {
        console.warn("[musicApiCredits] Could not fetch API credits:", err.message);
        return { available: true, credits: -1, extraCredits: 0 }; // -1 = unknown
      }
    }),

    // Generate music with Suno (simple or custom mode)
    generate: protectedProcedure
      .input(z.object({
        keywords: z.string().min(1).max(500),
        engine: z.enum(["suno"]).default("suno"),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
        vocalType: z.enum(["none", "male", "female", "mixed", "male_and_female"]).optional(),
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

        // ── Plan gate: free users cannot generate ──
        const userPlan = await getUserPlan(ctx.user.id);
        if (!canUserGenerate(userPlan)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "A paid subscription is required to generate music. Please choose a Pro or Premier plan to get started.",
          });
        }

        // ── Check monthly bonus: if bonus available, use it instead of credits ──
        const bonusCheck = await checkMonthlyBonus(ctx.user.id, "bonus_song", userPlan);

        // ── Daily limit check ──
        const dailyCheck = await checkDailyLimit(ctx.user.id, "generation", userPlan);
        if (!dailyCheck.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `You've reached your daily limit of ${dailyCheck.limit} songs. Please try again tomorrow.`,
          });
        }

        // ── Duplicate prevention: reject if user has a pending/processing task created in last 60s ──
        try {
          const recentTasks = await getPendingGenerationTasks();
          const userRecent = recentTasks.filter(
            (t: any) => t.userId === ctx.user.id && (Date.now() - new Date(t.createdAt).getTime()) < 60000
          );
          if (userRecent.length > 0) {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message: "You already have a song being generated. Please wait for it to complete before starting another.",
            });
          }
        } catch (dupErr: any) {
          if (dupErr instanceof TRPCError) throw dupErr;
          console.warn("[generate] Duplicate check failed (non-blocking):", dupErr.message);
        }

        if (!isSunoAvailable()) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Music engine is not available. Please configure the MUSIC_API_KEY.",
          });
        }

        // ── Pre-check API credits to give a clear error before attempting generation ──
        try {
          const { getCredits } = await import("./sunoApi");
          const apiCredits = await getCredits();
          if (apiCredits < 5) {
            notifyOwner({
              title: "⚠️ Music API Credits Low",
              content: `Only ${apiCredits} API credits remaining. Please purchase more credits to keep the service running.`,
            }).catch(() => {});
          }
          if (apiCredits <= 0) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Music generation is temporarily unavailable due to API credit limits. The administrator has been notified. Please try again later.",
            });
          }
        } catch (creditErr: any) {
          if (creditErr instanceof TRPCError) throw creditErr;
          console.warn("[generate] Could not pre-check API credits:", creditErr.message);
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

        // ── ASYNC PATTERN: Submit to kie.ai and return immediately ──
        // This avoids proxy timeout errors on long-running generation (60-120s)
        let kieTaskId: string;
        try {
          kieTaskId = await submitMusicGeneration({
            prompt,
            customMode: mode === "custom",
            style: customStyle || undefined,
            title: customTitle || undefined,
            instrumental: forceInstrumental,
          });
        } catch (genErr: any) {
          const msg = genErr.message || "Unknown error during music generation";
          if (msg.includes("insufficient API credits") || msg.includes("credit")) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Music generation is temporarily unavailable due to API credit limits. The administrator has been notified." });
          }
          if (msg.includes("rate limit")) {
            throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many generation requests. Please wait a moment and try again." });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Music generation failed: ${msg}` });
        }

        // Deduct credits or use monthly bonus immediately (before polling)
        if (bonusCheck.available) {
          await useMonthlyBonus(ctx.user.id, "bonus_song", `Monthly bonus song: ${customTitle || keywords.substring(0, 50)}`);
        } else {
          const creditResult = await deductCredits(ctx.user.id, 1, "generation", `Generated: ${customTitle || keywords.substring(0, 50)}`);
          if (!creditResult.success) {
            throw new TRPCError({ code: "FORBIDDEN", message: creditResult.error || "Insufficient credits." });
          }
        }

        // Save the generation task to DB so the frontend can poll for status
        const taskDbId = await createGenerationTask({
          userId: ctx.user.id,
          kieTaskId,
          status: "pending",
          keywords,
          genre: genre || null,
          mood: mood || null,
          vocalType: vocalType || null,
          duration: duration ?? null,
          mode: mode || "simple",
          customTitle: customTitle || null,
          customLyrics: customLyrics || null,
          customStyle: customStyle || null,
          prompt,
          engine: "suno",
          usedBonus: bonusCheck.available,
        });

        // Start background polling (fire-and-forget)
        processGenerationTaskInBackground(taskDbId, ctx.user.id, ctx.user.name, ctx.user.email);

        // Return immediately with the task ID — frontend will poll via songs.generationStatus
        return { taskId: taskDbId, status: "pending" as const };
      }),

    // Poll for generation task status (fast, no timeout risk)
    generationStatus: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const task = await getGenerationTask(input.taskId, ctx.user.id);
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Generation task not found" });
        }

        if (task.status === "completed" && task.songId) {
          const song = await getSongById(task.songId);
          return { status: "completed" as const, song };
        }

        if (task.status === "failed") {
          return { status: "failed" as const, error: task.errorMessage || "Generation failed" };
        }

        // Still pending or processing
        // Also do a live check against kie.ai to give real-time progress
        let kieStatus = "pending";
        try {
          const kieResult = await getTaskStatus(task.kieTaskId);
          kieStatus = kieResult.status.toLowerCase();
        } catch { /* ignore polling errors */ }

        return { status: "processing" as const, kieStatus };
      }),

    // Generate lyrics from a subject/topic using Claude Sonnet — best-in-class songwriter
    generateLyrics: protectedProcedure
      .input(z.object({
        subject: z.string().min(1).max(500),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
        vocalType: z.enum(["none", "male", "female", "mixed", "male_and_female"]).optional(),
        length: z.enum(["standard", "extended"]).default("standard"),
      }))
      .mutation(async ({ input }) => {
        const { subject, genre, mood, vocalType, length } = input;

        // Build vocal arrangement guidance
        let vocalGuidance = "";
        if (vocalType === "mixed") {
          vocalGuidance = `\n\nVOCAL ARRANGEMENT: This is a DUET for male and female voices. Use [Male], [Female], and [Both] markers within sections to indicate who sings what. Create call-and-response moments, harmonized lines, and distinct perspectives for each voice. The interplay between voices should tell the story from two angles.`;
        } else if (vocalType === "male_and_female") {
          vocalGuidance = `\n\nVOCAL ARRANGEMENT: This song features BOTH a male and female singer performing together throughout. They sing in unison and harmony, blending their voices as a unified pair rather than trading lines. Write lyrics that feel natural for both voices singing together — powerful unison verses, layered harmonies in choruses, and moments where both voices lift the melody. Think worship team, husband-and-wife duo, or ensemble vocal blend.`;
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

    // Song Variations / Remix — regenerate specific sections while keeping the rest
    remixSection: protectedProcedure
      .input(z.object({
        songId: z.number(),
        section: z.string().min(1).max(100), // e.g., "Verse 1", "Chorus", "Bridge"
        instruction: z.string().max(500).optional(), // optional user guidance
      }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        if (!song.lyrics) throw new TRPCError({ code: "BAD_REQUEST", message: "This song has no lyrics to remix." });

        const sectionPattern = new RegExp(`\\[${input.section.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\]`, 'i');
        if (!sectionPattern.test(song.lyrics)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Section "${input.section}" not found in lyrics.` });
        }

        let contextHints = "";
        if (song.genre) contextHints += `\nGenre: ${song.genre}`;
        if (song.mood) contextHints += `\nMood: ${song.mood}`;
        if (song.vocalType) contextHints += `\nVocal type: ${song.vocalType}`;

        const userInstruction = input.instruction
          ? `\n\nUser's guidance for the new ${input.section}: ${input.instruction}`
          : "";

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are an elite worship songwriter. You will receive complete song lyrics and must REWRITE ONLY the specified section while keeping ALL other sections EXACTLY the same.${contextHints}\n\nRULES:\n- Output the COMPLETE lyrics with ALL sections\n- ONLY change the content of the specified section\n- Keep section markers like [Verse 1], [Chorus], etc.\n- The new section must fit the song's theme, rhyme scheme, and emotional arc\n- Maintain the same syllable count and rhythm as the original section\n- Keep it singable and worship-ready\n- NO explanations, NO commentary — output ONLY the complete lyrics`,
            },
            {
              role: "user",
              content: `Rewrite ONLY the [${input.section}] section of these lyrics. Keep everything else exactly the same.${userInstruction}\n\nFull lyrics:\n${song.lyrics}`,
            },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const newLyrics = typeof rawContent === "string" ? rawContent.trim() : null;
        if (!newLyrics) throw new Error("Failed to generate variation. Please try again.");

        return { lyrics: newLyrics, section: input.section };
      }),

    // Upload audio file for remastering
    uploadAudio: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1).max(255),
        fileData: z.string().min(1), // base64 encoded
        mimeType: z.string().refine(t => ["audio/mpeg", "audio/wav", "audio/flac", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/aiff", "audio/x-aiff"].includes(t), "Unsupported audio format"),
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

        const mimeSubtype = input.mimeType.split("/")[1];
        const ext = mimeSubtype === "mpeg" ? "mp3" : mimeSubtype === "x-m4a" ? "m4a" : mimeSubtype === "x-aiff" ? "aiff" : mimeSubtype;
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

        // Pre-generate sheet music in the background
        generateSheetMusicInBackground(song.id);

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
        vocalType: z.enum(["none", "male", "female", "mixed", "male_and_female"]).default("none"),
        duration: z.number().min(15).max(300).default(60),
      }))
      .mutation(async ({ ctx, input }) => {
        const plan = await getUserPlan(ctx.user.id);
        const balance = await getCreditBalance(ctx.user.id);
        if (balance.totalCredits < 1) throw new Error("Insufficient credits.");

        if (!isSunoAvailable()) throw new Error("Music generation service unavailable.");

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
        const result = await sunoGenerateMusic({
          prompt: fullPrompt,
          customMode: true,
          style: analysis.styleTags,
          title: analysis.title,
          instrumental: vocalType === "none",
        }, ctx.user.id);

        const song = await createSong({
          userId: ctx.user.id,
          title: analysis.title,
          keywords: `sheet music: ${analysis.title}`,
          genre: analysis.genre,
          mood: analysis.mood,
          audioUrl: result.audioUrl,
          engine: "suno",
          vocalType,
          duration: result.duration || duration,
          styleTags: result.tags || analysis.styleTags,
          lyrics: lyrics || null,
          externalSongId: result.sunoAudioId || null,
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

        // Pre-generate sheet music in the background
        generateSheetMusicInBackground(song.id);

        return { song, audioUrl: result.audioUrl };
      }),

    // Stem separation: create a $5 Stripe checkout for stem separation
    createStemCheckout: protectedProcedure
      .input(z.object({
        songId: z.number(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }))
      .mutation(async ({ ctx, input }) => {
        const stripe = getStripe();
        if (!stripe) throw new Error("Stripe is not configured.");

        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        if (!song.audioUrl) throw new Error("Song has no audio to separate");

        // Check if stems already exist
        const existingStems = await getStemSeparationBySongId(input.songId, ctx.user.id);
        if (existingStems && existingStems.status === "completed") {
          throw new Error("Stems have already been separated for this song.");
        }

        // Create a pending stem separation record
        const stemRecordId = await createStemSeparation({
          songId: input.songId,
          userId: ctx.user.id,
          status: "pending_payment",
        });

        const product = STEM_SEPARATION_PRODUCT;

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          client_reference_id: String(ctx.user.id),
          customer_email: ctx.user.email || undefined,
          metadata: {
            user_id: String(ctx.user.id),
            song_id: String(input.songId),
            stem_separation_id: String(stemRecordId),
            product_type: "stem_separation",
          },
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: product.name,
                  description: product.description,
                },
                unit_amount: product.basePrice,
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Sales Tax (${TAX_JURISDICTION} ${(TAX_RATE * 100).toFixed(2)}%)`,
                  description: `${TAX_JURISDICTION} sales tax`,
                },
                unit_amount: product.totalPrice - product.basePrice,
              },
              quantity: 1,
            },
          ],
          allow_promotion_codes: true,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
        });

        return { url: session.url, sessionId: session.id, stemSeparationId: stemRecordId };
      }),

    // Get stem separation status for a song
    getStemStatus: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .query(async ({ ctx, input }) => {
        const stems = await getStemSeparationBySongId(input.songId, ctx.user.id);
        if (!stems) return null;
        return stems;
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

        // Override key if explicitly requested
        const songForGeneration = input.key
          ? { ...song, keySignature: input.key }
          : song;

        try {
          const cleanAbc = await generateAbcNotation(songForGeneration);
          await updateSongSheetMusic(input.songId, cleanAbc);
          return { abcNotation: cleanAbc };
        } catch (err: any) {
          console.error(`[SheetMusic] Generation failed for song ${input.songId}:`, err?.message || err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Sheet music generation failed: ${err?.message || "Unknown error"}. Please try again.`,
          });
        }
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

    // ─── Singability Analysis ───
    analyzeSingability: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const song = await getSongById(input.songId);
        if (!song || song.userId !== ctx.user.id) throw new Error("Song not found");
        if (!song.lyrics) throw new TRPCError({ code: "BAD_REQUEST", message: "This song has no lyrics to analyze." });

        const { analyzeSingability } = await import("./singabilityAnalyzer");
        const analysis = await analyzeSingability(song.lyrics, song.genre, song.mood, song.vocalType);
        return analysis;
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

    // NOTE: Vocal mix and takes generation removed — stem separation is now handled via Suno API with $5 Stripe checkout

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

        const prompt = buildCoverArtPrompt({
          title: song.title || "Untitled",
          genres: [song.genre].filter(Boolean) as string[],
          moods: [song.mood].filter(Boolean) as string[],
          instruments: Array.isArray(song.instruments) ? song.instruments : [],
          keywords: song.keywords || undefined,
          type: "song",
        });

        const { url } = await generateImage({ prompt });

        if (url) {
          await updateSongImageUrl(input.songId, url);
        }

        return { imageUrl: url };
      }),

    // Generate sheet music from an uploaded MP3 file
    // Start an MP3-to-sheet-music background job (returns quickly with a jobId)
    startMp3SheetJob: protectedProcedure
      .input(z.object({
        fileData: z.string().min(1), // base64 encoded MP3
        fileName: z.string().min(1).max(255),
        mimeType: z.string().refine(
          t => ["audio/mpeg", "audio/wav", "audio/mp4", "audio/ogg", "audio/flac", "audio/x-m4a", "audio/aac", "audio/aiff", "audio/x-aiff"].includes(t),
          "Unsupported audio format. Please upload MP3, WAV, FLAC, OGG, M4A, or AIFF."
        ),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check credits
        const balance = await getCreditBalance(ctx.user.id);
        if (balance.totalCredits < 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient credits. You need at least 1 credit to convert audio to sheet music. Please upgrade your plan or purchase more credits.",
          });
        }

        // Decode and validate file size (16MB limit for Whisper)
        const buffer = Buffer.from(input.fileData, "base64");
        const sizeMB = buffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({
            code: "PAYLOAD_TOO_LARGE",
            message: `File too large (${sizeMB.toFixed(1)}MB). The maximum file size is 16MB. Please compress or trim your audio file and try again.`,
          });
        }
        if (sizeMB < 0.001) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The uploaded file appears to be empty. Please select a valid audio file.",
          });
        }

        // Upload to S3 for processing
        const mimeSubtype = input.mimeType.split("/")[1];
        const ext = mimeSubtype === "mpeg" ? "mp3" : mimeSubtype === "x-m4a" ? "m4a" : mimeSubtype === "x-aiff" ? "aiff" : mimeSubtype;
        const fileKey = `mp3-to-sheet/${ctx.user.id}/${nanoid()}.${ext}`;
        const { url: audioUrl } = await storagePut(fileKey, buffer, input.mimeType);

        // Create a job record
        const jobId = await createMp3SheetJob({
          userId: ctx.user.id,
          fileName: input.fileName,
          audioUrl,
          status: "transcribing",
        });

        // Fire-and-forget: run the heavy work in the background
        processMp3SheetJob(jobId, ctx.user.id, audioUrl, input.fileName).catch((err: any) => {
          console.error(`[Mp3SheetJob] Unhandled error for job ${jobId}:`, err);
        });

        return { jobId, audioUrl };
      }),

    // Poll the status of an MP3-to-sheet-music job
    getMp3SheetJobStatus: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await getMp3SheetJob(input.jobId, ctx.user.id);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        return {
          status: job.status,
          abcNotation: job.abcNotation,
          lyrics: job.lyrics,
          audioUrl: job.audioUrl,
          fileName: job.fileName,
          errorMessage: job.errorMessage,
          errorCode: job.errorCode,
        };
      }),

    // Get recent MP3-to-sheet-music jobs for the current user
    getRecentMp3SheetJobs: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
      .query(async ({ ctx, input }) => {
        const limit = input?.limit ?? 20;
        const jobs = await getUserMp3SheetJobs(ctx.user.id, limit);
        return jobs.map((j) => ({
          id: j.id,
          fileName: j.fileName,
          status: j.status,
          abcNotation: j.abcNotation,
          lyrics: j.lyrics,
          audioUrl: j.audioUrl,
          errorMessage: j.errorMessage,
          createdAt: j.createdAt,
        }));
      }),

    // Delete an MP3-to-sheet-music job
    deleteMp3SheetJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMp3SheetJob(input.jobId, ctx.user.id);
        return { success: true };
      }),

    // Retry a failed MP3-to-sheet-music job
    retryMp3SheetJob: protectedProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Fetch the job and verify ownership + failed status
        const job = await getMp3SheetJob(input.jobId, ctx.user.id);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        if (job.status !== "error") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only failed jobs can be retried" });
        }
        if (!job.audioUrl) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No audio URL available for retry" });
        }
        // Reset the job status to transcribing
        await updateMp3SheetJob(input.jobId, {
          status: "transcribing",
          errorMessage: null,
          errorCode: null,
          abcNotation: null,
          lyrics: null,
        });
        // Re-trigger background processing (fire and forget)
        processMp3SheetJob(input.jobId, ctx.user.id, job.audioUrl, job.fileName).catch((err) => {
          console.error(`[retryMp3SheetJob] Background processing failed for job ${input.jobId}:`, err);
        });
        return { jobId: input.jobId, status: "transcribing" as const };
      }),

    // Save MP3 sheet music result as a song in the user's library
    saveMp3SheetToLibrary: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        title: z.string().min(1).max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Fetch the completed job
        const job = await getMp3SheetJob(input.jobId, ctx.user.id);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        if (job.status !== "done") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Job is not completed yet" });
        }
        if (!job.abcNotation) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No sheet music notation available" });
        }

        // Derive a title from the filename if not provided
        const title = input.title || job.fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Untitled";

        // Create the song in the library
        const song = await createSong({
          userId: ctx.user.id,
          title,
          keywords: `mp3 transcription, ${job.fileName}`,
          abcNotation: null,
          sheetMusicAbc: job.abcNotation,
          lyrics: job.lyrics || null,
          audioUrl: job.audioUrl || null,
          engine: "mp3-transcription",
          genre: null,
          mood: null,
          duration: null,
        });

        return { songId: song!.id, title: song!.title };
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

        const genres = Array.from(new Set(songList.map((s: any) => s?.genre).filter(Boolean))) as string[];
        const moods = Array.from(new Set(songList.map((s: any) => s?.mood).filter(Boolean))) as string[];
        const instruments = Array.from(new Set(songList.flatMap((s: any) => s?.instruments || []).filter(Boolean))) as string[];

        const prompt = buildCoverArtPrompt({
          title: album.title || "Untitled Album",
          genres,
          moods,
          instruments,
          description: album.description || undefined,
          type: "album",
        });

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
            const prompt = buildCoverArtPrompt({
              title: song.title || "Untitled",
              genres: [song.genre].filter(Boolean) as string[],
              moods: [song.mood].filter(Boolean) as string[],
              instruments: Array.isArray(song.instruments) ? song.instruments : [],
              keywords: song.keywords || undefined,
              type: "song",
            });

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

    // Get daily/weekly usage chart data
    usageChart: protectedProcedure
      .input(z.object({ days: z.number().min(7).max(90).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        return getDailyUsageChart(ctx.user.id, input?.days ?? 30);
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
            name: "Pro",
            tagline: "Everything you need to create worship music.",
            monthlyPrice: 24,
            annualPrice: 230,
            popular: true,
            limits: PLAN_LIMITS.creator,
            features: [
              "20 songs or sheet music PDFs per month",
              "AI-powered music generation via Suno",
              "Upload and convert sheet music to MP3",
              "Write and export lyrics (PDF, DOCX)",
              "Collaborative lyrics sharing",
              "Stem separation ($5 per song)",
              "Commercial use rights for personal projects",
              "2 free bonus songs per month",
              "Upload up to 5 minutes of audio",
              "Organize songs into albums",
            ],
          },
          {
            id: "professional",
            name: "Premier",
            tagline: "For serious creators and worship teams.",
            monthlyPrice: 49,
            annualPrice: 470,
            popular: false,
            limits: PLAN_LIMITS.professional,
            features: [
              "50 songs or sheet music PDFs per month",
              "All Pro features included",
              "AI-powered music generation via Suno",
              "Upload and convert sheet music to MP3",
              "Write and export lyrics (PDF, DOCX)",
              "Collaborative lyrics sharing",
              "Stem separation ($5 per song)",
              "Full commercial use rights",
              "2 free bonus songs per month",
              "Upload up to 5 minutes of audio",
              "Organize songs into albums",
              "Early access to new features",
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

        try {
          const session = await stripe.checkout.sessions.create(sessionParams);
          return { url: session.url, sessionId: session.id };
        } catch (err: any) {
          // If the stored Stripe customer ID is invalid/deleted, retry without it
          if (err?.code === "resource_missing" || err?.message?.includes("No such customer")) {
            console.warn(`[Stripe] Stale customer ID ${existingSub?.stripeCustomerId} for user ${ctx.user.id}, retrying without it`);
            delete sessionParams.customer;
            if (ctx.user.email) {
              sessionParams.customer_email = ctx.user.email;
            }
            const session = await stripe.checkout.sessions.create(sessionParams);
            return { url: session.url, sessionId: session.id };
          }
          throw err;
        }
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

        try {
          const session = await stripe.billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: input.returnUrl,
          });
          return { url: session.url };
        } catch (err: any) {
          if (err?.code === "resource_missing" || err?.message?.includes("No such customer")) {
            throw new Error("Your billing account could not be found. Please contact support or re-subscribe.");
          }
          throw err;
        }
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
    // Get featured songs for homepage previews (no auth required)
    featured: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(12).default(6) }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 6;
        const featured = await getFeaturedSongs(limit);
        return { songs: featured };
      }),

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

  // ─── Admin Dashboard ───
  admin: router({
    // Get site-wide statistics
    stats: adminProcedure.query(async () => {
      return getAdminSiteStats();
    }),

    // Get paginated user list with search
    users: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getAdminUserList(
          input?.limit ?? 50,
          input?.offset ?? 0,
          input?.search
        );
      }),

    // Get detailed user info with transaction history
    userDetail: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const detail = await getAdminUserDetail(input.userId);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        return detail;
      }),

    // Get Stripe revenue stats
    revenue: adminProcedure.query(async () => {
      const stripe = getStripe();
      if (!stripe) {
        return {
          totalRevenue: 0,
          revenueThisMonth: 0,
          revenueLastMonth: 0,
          activeSubscriptions: 0,
          mrr: 0,
          recentCharges: [],
        } satisfies AdminRevenueStats;
      }

      try {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Get balance transactions for revenue
        const [thisMonthCharges, lastMonthCharges, activeSubsList, recentChargesList] = await Promise.all([
          stripe.charges.list({
            created: { gte: Math.floor(thisMonthStart.getTime() / 1000) },
            limit: 100,
          }),
          stripe.charges.list({
            created: {
              gte: Math.floor(lastMonthStart.getTime() / 1000),
              lt: Math.floor(thisMonthStart.getTime() / 1000),
            },
            limit: 100,
          }),
          stripe.subscriptions.list({ status: "active", limit: 100 }),
          stripe.charges.list({ limit: 20 }),
        ]);

        const revenueThisMonth = thisMonthCharges.data
          .filter((c) => c.status === "succeeded")
          .reduce((sum, c) => sum + c.amount, 0);

        const revenueLastMonth = lastMonthCharges.data
          .filter((c) => c.status === "succeeded")
          .reduce((sum, c) => sum + c.amount, 0);

        // Calculate MRR from active subscriptions
        const mrr = activeSubsList.data.reduce((sum, sub) => {
          const item = sub.items.data[0];
          if (!item?.price?.unit_amount) return sum;
          const amount = item.price.unit_amount;
          const interval = item.price.recurring?.interval;
          if (interval === "year") return sum + Math.round(amount / 12);
          return sum + amount;
        }, 0);

        // Total all-time revenue: sum all succeeded charges
        // For a more accurate total, we'd need to paginate through all charges
        // For now, use the balance
        let totalRevenue = 0;
        try {
          const balance = await stripe.balance.retrieve();
          totalRevenue = balance.available.reduce((sum, b) => sum + b.amount, 0)
            + balance.pending.reduce((sum, b) => sum + b.amount, 0);
        } catch {
          totalRevenue = revenueThisMonth + revenueLastMonth;
        }

        return {
          totalRevenue,
          revenueThisMonth,
          revenueLastMonth,
          activeSubscriptions: activeSubsList.data.length,
          mrr,
          recentCharges: recentChargesList.data.map((c) => ({
            id: c.id,
            amount: c.amount,
            currency: c.currency,
            status: c.status,
            customerEmail: c.billing_details?.email ?? null,
            description: c.description,
            created: c.created,
          })),
        } satisfies AdminRevenueStats;
      } catch (err: any) {
        console.error("[Admin] Failed to fetch Stripe revenue:", err.message);
        return {
          totalRevenue: 0,
          revenueThisMonth: 0,
          revenueLastMonth: 0,
          activeSubscriptions: 0,
          mrr: 0,
          recentCharges: [],
        } satisfies AdminRevenueStats;
      }
    }),

    // Update user role (promote/demote admin)
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change your own role" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(usersTable).set({ role: input.role }).where(eq(usersTable.id, input.userId));
        return { success: true };
      }),

    // Manually adjust user credits
    adjustCredits: adminProcedure
      .input(z.object({
        userId: z.number(),
        amount: z.number().min(-10000).max(10000),
        reason: z.string().min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        const { addBonusCredits } = await import("./credits");
        await addBonusCredits(input.userId, input.amount, `Admin adjustment: ${input.reason}`);
        return { success: true };
      }),

    // ─── Notification Center ──────────────────────────────────────────

    // List notifications with filtering
    notifications: adminProcedure
      .input(z.object({
        type: z.string().optional(),
        isRead: z.boolean().optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getAdminNotifications } = await import("./adminNotificationDb");
        return getAdminNotifications(input ?? {});
      }),

    // Get unread notification count
    unreadNotificationCount: adminProcedure
      .query(async () => {
        const { getUnreadNotificationCount } = await import("./adminNotificationDb");
        return { count: await getUnreadNotificationCount() };
      }),

    // Mark a single notification as read
    markNotificationRead: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { markNotificationRead } = await import("./adminNotificationDb");
        await markNotificationRead(input.id);
        return { success: true };
      }),

    // Mark all notifications as read
    markAllNotificationsRead: adminProcedure
      .mutation(async () => {
        const { markAllNotificationsRead } = await import("./adminNotificationDb");
        await markAllNotificationsRead();
        return { success: true };
      }),

    // Delete a notification
    deleteNotification: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteNotification } = await import("./adminNotificationDb");
        await deleteNotification(input.id);
        return { success: true };
      }),

    // Notification preferences
    getNotificationPreferences: adminProcedure
      .query(async () => {
        const { getNotificationPreferences } = await import("./adminPreferencesDb");
        return getNotificationPreferences();
      }),

    updateNotificationPreference: adminProcedure
      .input(z.object({
        notificationType: z.enum(["subscription_new", "payment_failed", "subscription_canceled"]),
        emailEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { updateNotificationPreference } = await import("./adminPreferencesDb");
        const { notificationType, ...updates } = input;
        return updateNotificationPreference(notificationType, updates);
      }),

    // API Credit Monitor
    creditMonitorStatus: adminProcedure
      .query(async () => {
        const { getCreditMonitorStatus } = await import("./creditMonitor");
        return getCreditMonitorStatus();
      }),

    checkCreditsNow: adminProcedure
      .mutation(async () => {
        const { checkAndAlertCredits } = await import("./creditMonitor");
        const credits = await checkAndAlertCredits();
        return { credits };
      }),
  }),

  // ─── Worship Sets (Service Planning) ──────────────────────────────────────
  worship: router({
    // Get constants for the UI
    constants: publicProcedure.query(() => {
      return {
        liturgicalSeasons: [...LITURGICAL_SEASONS],
        serviceSegments: [...SERVICE_SEGMENTS],
        bandInstruments: [...BAND_INSTRUMENTS],
        choirParts: [...CHOIR_PARTS],
        serviceTypes: [
          "Sunday Morning", "Sunday Evening", "Wednesday Night",
          "Youth Service", "Special Event", "Holiday Service",
          "Prayer Meeting", "Revival", "Funeral", "Wedding",
          "Christmas Eve", "Easter Sunday", "Good Friday",
        ],
        christianGenres: [
          "Contemporary Worship", "Gospel", "Hymn/Traditional", "Christian Pop",
          "Christian Rock", "Christian Hip-Hop", "Praise & Worship", "Scripture Song",
          "Christian Country", "Christian R&B", "Choir/Choral", "Instrumental Worship",
          "Christian EDM", "Kids Worship", "Southern Gospel", "Black Gospel",
          "Gregorian Chant", "Christian Folk", "Worship Ballad", "Anthem",
        ],
        worshipMoods: [
          "Reverent", "Joyful Praise", "Prayerful", "Celebratory",
          "Reflective", "Triumphant", "Intimate", "Peaceful",
          "Lamenting", "Grateful", "Hopeful", "Majestic",
        ],
      };
    }),

    // List user's worship sets
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserWorshipSets(ctx.user.id);
    }),

    // Get a single worship set with its items
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const set = await getWorshipSetById(input.id, ctx.user.id);
        if (!set) throw new TRPCError({ code: "NOT_FOUND", message: "Worship set not found" });
        const items = await getWorshipSetItems(input.id);
        return { ...set, items };
      }),

    // Create a new worship set
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        date: z.string().optional(),
        serviceType: z.string().max(100).optional(),
        notes: z.string().optional(),
        liturgicalSeason: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createWorshipSet({ ...input, userId: ctx.user.id });
      }),

    // Update a worship set
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(255).optional(),
        date: z.string().optional(),
        serviceType: z.string().max(100).optional(),
        notes: z.string().optional(),
        liturgicalSeason: z.string().max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateWorshipSet(id, ctx.user.id, data);
        return { success: true };
      }),

    // Delete a worship set
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteWorshipSet(input.id, ctx.user.id);
        return { success: true };
      }),

    // ─── Worship Set Items ───
    addItem: protectedProcedure
      .input(z.object({
        worshipSetId: z.number(),
        songId: z.number().optional(),
        itemType: z.enum(["song", "prayer", "scripture", "sermon", "offering", "communion", "announcement", "transition", "other"]).default("song"),
        title: z.string().min(1).max(255),
        notes: z.string().optional(),
        songKey: z.string().max(10).optional(),
        sortOrder: z.number().default(0),
        duration: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership of the worship set
        const set = await getWorshipSetById(input.worshipSetId, ctx.user.id);
        if (!set) throw new TRPCError({ code: "NOT_FOUND", message: "Worship set not found" });
        const id = await addWorshipSetItem(input);
        return { id };
      }),

    updateItem: protectedProcedure
      .input(z.object({
        id: z.number(),
        worshipSetId: z.number(),
        title: z.string().min(1).max(255).optional(),
        notes: z.string().optional(),
        songKey: z.string().max(10).optional(),
        sortOrder: z.number().optional(),
        duration: z.number().optional(),
        itemType: z.enum(["song", "prayer", "scripture", "sermon", "offering", "communion", "announcement", "transition", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const set = await getWorshipSetById(input.worshipSetId, ctx.user.id);
        if (!set) throw new TRPCError({ code: "NOT_FOUND", message: "Worship set not found" });
        const { id, worshipSetId, ...data } = input;
        await updateWorshipSetItem(id, data);
        return { success: true };
      }),

    deleteItem: protectedProcedure
      .input(z.object({ id: z.number(), worshipSetId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const set = await getWorshipSetById(input.worshipSetId, ctx.user.id);
        if (!set) throw new TRPCError({ code: "NOT_FOUND", message: "Worship set not found" });
        await deleteWorshipSetItem(input.id);
        return { success: true };
      }),

    reorderItems: protectedProcedure
      .input(z.object({
        worshipSetId: z.number(),
        itemIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const set = await getWorshipSetById(input.worshipSetId, ctx.user.id);
        if (!set) throw new TRPCError({ code: "NOT_FOUND", message: "Worship set not found" });
        await reorderWorshipSetItems(input.worshipSetId, input.itemIds);
        return { success: true };
      }),

    // ─── AI-Powered Worship Suggestions ───
    suggestSet: protectedProcedure
      .input(z.object({
        serviceType: z.string(),
        liturgicalSeason: z.string().optional(),
        theme: z.string().optional(),
        scriptureReading: z.string().optional(),
        mood: z.string().optional(),
        congregationSize: z.enum(["small", "medium", "large"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const prompt = `You are a church music director assistant. Suggest a worship set for a ${input.serviceType} service.
${input.liturgicalSeason ? `Liturgical Season: ${input.liturgicalSeason}` : ""}
${input.theme ? `Theme: ${input.theme}` : ""}
${input.scriptureReading ? `Scripture Reading: ${input.scriptureReading}` : ""}
${input.mood ? `Desired Mood: ${input.mood}` : ""}
${input.congregationSize ? `Congregation Size: ${input.congregationSize}` : ""}

Suggest a complete worship service flow with 8-12 items including songs, prayers, scripture readings, and transitions. For each item, provide:
- type (song/prayer/scripture/sermon/offering/communion/transition)
- title
- suggested key (for songs)
- estimated duration in minutes
- notes for the worship team

Focus on creating a natural flow from gathering to sending forth.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an experienced church music director who plans worship services. Return JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "worship_set_suggestion",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Suggested title for this worship set" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", description: "Item type: song, prayer, scripture, sermon, offering, communion, transition, other" },
                        title: { type: "string", description: "Title or description of the item" },
                        songKey: { type: "string", description: "Musical key for songs, empty for non-songs" },
                        duration: { type: "number", description: "Estimated duration in minutes" },
                        notes: { type: "string", description: "Notes for the worship team" },
                      },
                      required: ["type", "title", "songKey", "duration", "notes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "items"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate suggestion" });
        const text = typeof content === "string" ? content : JSON.stringify(content);
        return JSON.parse(text);
      }),

    // ─── Scripture Song Link ───
    linkScripture: protectedProcedure
      .input(z.object({
        songId: z.number(),
        book: z.string().min(1).max(100),
        chapter: z.number().min(1),
        verseStart: z.number().min(1),
        verseEnd: z.number().optional(),
        translation: z.string().max(20).default("NIV"),
        fullReference: z.string().min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        const id = await linkScriptureSong(input);
        return { id };
      }),

    getScriptureInfo: protectedProcedure
      .input(z.object({ songId: z.number() }))
      .query(async ({ input }) => {
        return getScriptureSongBySongId(input.songId);
      }),
  }),

  // ─── Shared Lyrics (Collaborative Editing) ─────────────────────────────
  sharedLyrics: router({
    // Create a shared lyrics session
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        genre: z.string().max(100).optional(),
        mood: z.string().max(100).optional(),
        vocalType: z.string().max(20).optional(),
        sections: z.array(z.object({
          id: z.string(),
          type: z.string(),
          label: z.string().optional(),
          content: z.string(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(16);
        const result = await createSharedLyrics({
          shareToken: token,
          ownerId: ctx.user.id,
          ownerName: ctx.user.name ?? null,
          title: input.title,
          genre: input.genre,
          mood: input.mood,
          vocalType: input.vocalType,
          sections: input.sections as SharedLyricsSection[],
        });
        return result;
      }),

    // Get shared lyrics by token (public — anyone with the link can view)
    getByToken: publicProcedure
      .input(z.object({ token: z.string().min(1).max(64) }))
      .query(async ({ input }) => {
        const result = await getSharedLyricsByToken(input.token);
        if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Shared lyrics not found" });
        if (!result.isPublic) throw new TRPCError({ code: "NOT_FOUND", message: "This shared lyrics session is no longer available" });
        return result;
      }),

    // Update shared lyrics (anyone with the link can edit)
    update: publicProcedure
      .input(z.object({
        token: z.string().min(1).max(64),
        title: z.string().min(1).max(255).optional(),
        genre: z.string().max(100).nullable().optional(),
        mood: z.string().max(100).nullable().optional(),
        vocalType: z.string().max(20).nullable().optional(),
        sections: z.array(z.object({
          id: z.string(),
          type: z.string(),
          label: z.string().optional(),
          content: z.string(),
        })).optional(),
        editorName: z.string().max(100).optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getSharedLyricsByToken(input.token);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Shared lyrics not found" });
        if (!existing.isPublic) throw new TRPCError({ code: "NOT_FOUND", message: "This shared lyrics session is no longer available" });

        const result = await updateSharedLyrics(input.token, {
          title: input.title,
          genre: input.genre,
          mood: input.mood,
          vocalType: input.vocalType,
          sections: input.sections as SharedLyricsSection[] | undefined,
          lastEditorName: input.editorName ?? null,
        });
        return result;
      }),

    // Delete shared lyrics (owner only)
    delete: protectedProcedure
      .input(z.object({ token: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        await deleteSharedLyrics(input.token, ctx.user.id);
        return { success: true };
      }),

    // List user's shared lyrics
    listMine: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserSharedLyrics(ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
