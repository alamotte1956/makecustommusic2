# Suno Migration Notes

## Files with ElevenLabs references to update:

### Server (core changes):
- server/elevenLabsApi.ts (17 refs) - REMOVE entirely, replace with sunoApi.ts
- server/routers.ts (14 refs) - Replace all ElevenLabs calls with Suno
- server/generateVoice.ts (9 refs) - May need to remove/replace TTS feature
- server/ssmlBuilder.ts (4 refs) - May need to remove (ElevenLabs-specific SSML)
- server/songwritingHelpers.ts (3 refs) - Update references
- server/_core/env.ts (1 ref) - Replace elevenLabsApiKey with sunoApiKey
- server/_core/index.ts (1 ref) - Update route registration

### Client (UI changes):
- client/src/pages/Generator.tsx (9 refs) - Main generator page, remove engine selector
- client/src/pages/AlbumDetail.tsx (1 ref) - Badge text
- client/src/pages/Favorites.tsx (1 ref) - Badge text
- client/src/pages/SongDetail.tsx (1 ref) - Badge text
- client/src/pages/SharedSong.tsx (1 ref) - Badge text
- client/src/pages/WriteLyrics.tsx (1 ref) - Badge text
- client/src/pages/Privacy.tsx (1 ref) - Privacy policy text

### Tests to update:
- server/elevenLabsApi.test.ts (31 refs) - REMOVE, replace with sunoApi.test.ts
- server/elevenlabs.test.ts (9 refs) - REMOVE, replace with suno key validation
- server/songs.test.ts (8 refs) - Update engine references
- server/generateVoice.test.ts (3 refs) - Remove or update
- server/customLyrics.test.ts (3 refs) - Update references
- server/backgroundSheetMusic.test.ts (3 refs) - Update references
- server/writeLyrics.test.ts (2 refs) - Update references
- server/studioRoutes.test.ts (1 ref) - Update references
- client/src/contexts/QueuePlayerContext.test.ts (3 refs) - Update references

## Suno API Details (from docs.sunoapi.org):
- Base URL: https://api.sunoapi.org/api/v1
- Auth: Bearer token
- Generate: POST /generate
- Status: GET /generate/record-info?taskId=xxx
- Lyrics: POST /lyrics
- Models: V4, V4_5, V4_5PLUS, V4_5ALL, V5
- Async flow: submit → poll taskId → get audio_url on SUCCESS
