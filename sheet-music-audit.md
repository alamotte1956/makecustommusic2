# Sheet Music System - Deep Audit Findings

## Critical Issues

### 1. Schema Default "pending" Causes Infinite Polling
**File:** `drizzle/schema.ts` line 62
**Problem:** `sheetMusicStatus` defaults to `"pending"` for ALL new songs. SongDetail.tsx polls every 5s when status is not "done" or "failed". This means every song that hasn't had sheet music generated will poll indefinitely.
**Impact:** Unnecessary server load, confusing UX (shows "Preparing..." spinner forever for songs where background generation was never triggered or silently failed).
**Fix:** Change default to `null`. Only set to "pending" when generation is actually initiated.

### 2. Background Generation 3-Second Delay Race Condition
**File:** `backgroundSheetMusic.ts` line 293 (`setTimeout(..., 3000)`)
**Problem:** The 3-second delay before background generation starts means the song record may already be queried by the frontend before the status is set to "generating". During this window, status is "pending" (from schema default), causing the "Preparing..." spinner to show even before generation actually starts.
**Fix:** Set status to "generating" immediately when calling `generateSheetMusicInBackground()`, before the setTimeout.

### 3. Double Sanitization
**Files:** `server/db.ts` line 154-161 AND `server/backgroundSheetMusic.ts` line 103-190 AND `client/src/components/SheetMusicViewer.tsx` line 98-125
**Problem:** ABC notation is sanitized THREE times:
1. In `backgroundSheetMusic.ts` sanitiseAbc() - comprehensive
2. In `db.ts` updateSongSheetMusic() - partial (strips code fences, V:, %%staves)
3. In `SheetMusicViewer.tsx` sanitiseAbc() - partial (strips V:, dynamics, %%staves)
**Impact:** Redundant processing, potential for one sanitizer to break what another expects. The DB sanitizer is especially problematic because it strips code fences but doesn't do the full sanitization.
**Fix:** Sanitize ONCE in backgroundSheetMusic.ts (already comprehensive), remove the partial sanitizers from db.ts and simplify the frontend one.

### 4. LLM Prompt Issues
**File:** `backgroundSheetMusic.ts` lines 15-68
**Problems:**
- The prompt asks for `"quoted chords"` like `"Am"A "F"F "C"C` which is incorrect ABC syntax. The correct format is `"Am"A "F"F "C"C` but the example shows redundant note letters after chord symbols.
- The prompt says "Do NOT use [P:] section markers" but the sanitizer converts them to comments anyway - mixed signals to the LLM.
- No explicit instruction about proper w: lyrics alignment syntax.
- The minimum length requirement (16 measures) can lead to LLM padding with repetitive content.

### 5. Validation Too Lenient
**File:** `backgroundSheetMusic.ts` lines 196-228
**Problem:** validateAbc() only checks for X:, T:, K: headers and at least one music line. It doesn't check:
- Whether bar lines are balanced
- Whether the K: header has a valid key value
- Whether there are actual measures (not just random note letters)
- Whether lyrics lines (w:) have corresponding music lines
**Impact:** Invalid ABC that passes validation but fails rendering in abcjs.

### 6. Frontend Rendering: Container Width Check
**File:** `SheetMusicViewer.tsx` lines 280-288
**Problem:** The width check `rect.width < 10` is a magic number. When the sheet music tab is first clicked, there can be a brief moment where the container exists but hasn't been laid out yet. The ResizeObserver should handle this, but there's a potential race condition between the ResizeObserver callback and the render effect.
**Note:** This is actually handled reasonably well with the ResizeObserver pattern. Minor issue.

### 7. MIDI Export Doesn't Handle Ties
**File:** `midiExport.ts` line 233-235
**Problem:** Comment says "Handle ties (skip the dash, duration will be combined later)" but ties are never actually combined. Each tied note plays separately, creating a stuttering effect instead of a sustained note.

### 8. Rest Handling in MIDI Export Creates Silent Events
**File:** `midiExport.ts` lines 287-295
**Problem:** Rests are encoded as VLQ delta time followed by a dummy marker meta event. This is technically valid MIDI but some DAWs may not handle it well. A cleaner approach would be to accumulate rest duration into the next note's delta time.

### 9. Transpose: getSemitoneInterval Strips "m" Too Aggressively
**File:** `transpose.ts` line 48
**Problem:** `fromKey.replace("m", "")` will turn "Am" into "A" but also turns "Abm" into "Ab" correctly. However, it would turn "Cm" into "C" but also "Cmaj7" into "Caj7" if someone passed a full chord quality. The function is only used with key names so this is minor.

### 10. ABC Player Key Signature Not Applied
**File:** `abcPlayer.ts` 
**Problem:** The player parses the K: header but never applies key signature accidentals to notes. In ABC notation, if K:G, all F notes should be F# unless explicitly marked as =F. The player plays all notes at face value without key signature context.
**Impact:** Playback sounds wrong for any key other than C major / A minor.

## Medium Issues

### 11. No Retry Button When Background Generation Fails
**Problem:** When `sheetMusicStatus === "failed"`, the UI shows the error and a "Generate Sheet Music" button, but it's not prominently styled as a retry action.

### 12. Mp3ToSheetMusic: No Audio Preview Before Processing
**Problem:** Users upload an MP3 and immediately start processing. There's no way to preview the audio first to confirm it's the right file.

### 13. No Progress Indication During LLM Generation
**Problem:** The "Generating Sheet Music..." state shows a spinner but no progress indication. LLM generation can take 15-30 seconds.

## Priority Fixes

1. **Fix schema default** - Change sheetMusicStatus default from "pending" to null
2. **Fix background generation timing** - Set status immediately, not after 3s delay
3. **Remove double sanitization** - Single source of truth in backgroundSheetMusic.ts
4. **Fix ABC player key signature** - Apply key signature accidentals during playback
5. **Improve LLM prompt** - Fix chord symbol syntax, improve lyrics alignment instructions
6. **Improve validation** - Add more structural checks
