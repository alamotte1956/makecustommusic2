# Music Generation Flow — Deep Audit

## Full Flow Trace

### Frontend (Generator.tsx)
1. User clicks "Generate Song"
2. `handleGenerate()` validates inputs, starts progress animation
3. Calls `generateMutation.mutateAsync()` → tRPC `songs.generate`
4. Gets back `{ taskId, status: "pending" }`
5. Enters `pollForCompletion()` loop: polls `songs.generationStatus` every 5s, up to 120 attempts (10 min)
6. On `status === "completed"` → sets `generatedSong` state
7. On `status === "failed"` → throws error → toast

### Backend (routers.ts → songs.generate)
1. Check user plan: `getUserPlan()` → `canUserGenerate()` — free users blocked
2. Check monthly bonus: `checkMonthlyBonus()`
3. Check kie.ai API availability: `isSunoAvailable()`
4. Pre-check API credits: `getCredits()` — warns if <5, blocks if <=0
5. Build prompt: `buildProductionPrompt()`
6. Submit to kie.ai: `submitMusicGeneration()` — returns kieTaskId
7. Deduct credits or use bonus
8. Save to `generation_tasks` table
9. Fire-and-forget: `processGenerationTaskInBackground()`
10. Return `{ taskId, status: "pending" }` immediately

### Background Processing (processGenerationTaskInBackground)
1. Update task status to "processing"
2. Poll kie.ai every 10s for up to 10 minutes
3. On SUCCESS or FIRST_SUCCESS with audio → download audio → upload to S3 → create song → mark complete
4. On FAILED → mark task as failed with error message
5. On timeout → mark task as failed

### Frontend Polling (songs.generationStatus)
1. Fetches task from DB by taskId + userId
2. If completed + songId → returns song data
3. If failed → returns error
4. If still processing → live-checks kie.ai for kieStatus → returns "processing"

---

## IDENTIFIED FAILURE POINTS

### CRITICAL ISSUES

#### 1. Credits deducted BEFORE generation succeeds — no refund on failure
**Location:** routers.ts lines 308-315
**Problem:** Credits are deducted immediately after submitting to kie.ai, before the background task completes. If the background task fails (kie.ai error, timeout, audio download failure, S3 upload failure), the user loses their credit with no song.
**Impact:** User pays but gets nothing.
**Fix:** Add credit refund logic in the `catch` block of `processGenerationTaskInBackground`.

#### 2. No daily limit check in the generate route
**Location:** routers.ts lines 211-341
**Problem:** The generate route checks plan gate and monthly bonus, but does NOT check `checkDailyLimit()`. A user on the Creator plan (dailySongLimit: 10) could generate unlimited songs per day as long as they have credits.
**Impact:** Potential API credit abuse.
**Fix:** Add `checkDailyLimit(ctx.user.id, "generation", userPlan)` before submitting.

#### 3. Background task has no crash recovery
**Location:** processGenerationTaskInBackground (line 71)
**Problem:** If the server restarts/crashes during background processing, the task stays in "processing" status forever. The `getPendingGenerationTasks()` function exists but is never called on startup.
**Impact:** Song generation silently lost on server restart.
**Fix:** Add startup recovery that resumes pending tasks.

#### 4. Audio download from kie.ai can fail silently
**Location:** processGenerationTaskInBackground line 113
**Problem:** `axios.get(audio.audio_url)` has a 60s timeout but no retry. kie.ai CDN URLs can be temporarily unavailable. If the download fails, the entire generation fails.
**Impact:** Generation succeeds at kie.ai but user gets nothing.
**Fix:** Add retry logic (3 attempts with exponential backoff) for audio download.

### MODERATE ISSUES

#### 5. Empty audio_url from kie.ai not handled
**Location:** sunoApi.ts line 264
**Problem:** The code maps `item.audioUrl || item.audio_url || ""` — if both are empty/null, it maps to `""`. The background processor then tries to download from `""` which will fail with a confusing error.
**Fix:** Filter out items with empty audio URLs before returning.

#### 6. Frontend polling uses `utils.songs.generationStatus.fetch()` which can cache
**Location:** Generator.tsx line 611
**Problem:** tRPC's `fetch()` might return cached results depending on the query client configuration. If the status is cached as "processing", the frontend won't see the "completed" transition.
**Fix:** Use `{ staleTime: 0 }` or add a cache-busting parameter.

#### 7. generationStatus route does live kie.ai check on every poll
**Location:** routers.ts lines 363-367
**Problem:** Every frontend poll (every 5s) triggers a live kie.ai API call. With multiple users generating simultaneously, this could hit kie.ai rate limits (20 req/10s).
**Fix:** Only do the live check if the task is still in "processing" status AND last checked >10s ago.

#### 8. No validation that audio is actually MP3
**Location:** processGenerationTaskInBackground line 113-116
**Problem:** The code downloads whatever kie.ai returns and uploads it as `audio/mpeg`. If kie.ai returns an error page or different format, it gets stored as a corrupt MP3.
**Fix:** Validate the response content-type and file size before uploading.

### MINOR ISSUES

#### 9. Progress animation starts BEFORE the mutation call
**Location:** Generator.tsx lines 559-578
**Problem:** The progress interval starts at line 560, but `setIsGenerating(true)` happens at line 581. If the mutation fails immediately, the progress bar flickers briefly.
**Fix:** Move the interval start to after the mutation succeeds.

#### 10. Frontend timeout message is misleading
**Location:** Generator.tsx line 636
**Problem:** Says "check your History page — your song may still be processing" but the background task might have already failed.
**Fix:** Check the actual task status before showing this message.

#### 11. No duplicate generation prevention
**Problem:** User can click "Generate" multiple times rapidly, submitting multiple tasks and deducting credits for each.
**Fix:** Disable the button during generation (already done via `isGenerating` state, but verify it covers all paths).
