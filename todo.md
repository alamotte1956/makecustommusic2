# AI Music Generator - Project TODO

## Core Features
- [x] Keyword input form for music generation (text descriptions like 'happy jazz piano')
- [x] AI-powered music generation using LLM to create musical compositions from keywords
- [x] Real-time music playback preview with audio player controls
- [x] MP3 file download functionality for generated music
- [x] Sheet music generation for each song
- [x] Sheet music print functionality
- [x] Album creation feature (combine multiple songs into a collection)
- [x] Music generation history tracking for authenticated users
- [x] Loading states and progress indicators during generation

## UI/UX
- [x] Landing page with hero section and feature overview
- [x] Music generator page with keyword input and generation controls
- [x] Audio player component with play/pause/seek controls
- [x] History page showing past generations
- [x] Albums page for managing collections
- [x] Sheet music viewer with print button
- [x] Responsive design for mobile and desktop
- [x] Light theme with music-inspired purple/indigo design
- [x] Navigation with black text links

## Backend
- [x] Database schema for songs, albums, and album-song relations
- [x] tRPC routes for song CRUD operations
- [x] tRPC routes for album CRUD operations
- [x] LLM integration for generating musical data from keywords
- [x] Music synthesis engine (ABC notation to audio via Web Audio API + native WAV encoder)
- [x] S3 storage for generated audio files

## Testing
- [x] Unit tests for backend routes (38 tests passing)
- [x] Test music generation flow

## Custom Mode
- [x] Add Custom Mode toggle when ElevenLabs engine is selected
- [x] Add separate lyrics textarea field for custom lyrics input
- [x] Add style tags field for genre/style control (e.g., "synthwave, male vocals, slow tempo")
- [x] Add custom title field for song naming
- [x] Update backend ElevenLabs API integration to send custom mode parameters
- [x] Update database schema to store custom lyrics if provided
- [x] Maintain existing simple prompt mode as default
- [x] Update tests for Custom Mode

## Vocal Type Enhancement
- [x] Ensure Male Singer, Female Singer, and Both Singers options are prominent card-style in the UI
- [x] Verify vocal type is passed correctly to ElevenLabs API in both Simple and Custom modes

## Album Cover Image Generation
- [x] Add coverImageUrl column to albums table in database schema
- [x] Create backend route to generate album cover using built-in image generation API
- [x] Build prompt from album's song genres, moods, and title for image generation
- [x] Add "Generate Cover" button on album detail page and album cards (hover overlay)
- [x] Display album cover images on Albums listing page and AlbumDetail page
- [x] Support regenerating covers
- [x] Update tests for album cover generation (38 tests passing)

## Regenerate Button
- [x] Add "Regenerate" button on Generator page after a song is generated
- [x] Reuse same keywords, genre, mood, vocal type, duration, and engine settings
- [x] Generate a new variation with the same prompt

## Public Sharing Links
- [x] Add shareToken column to songs table for unique share URLs
- [x] Create public share API route (no auth required) to fetch song by shareToken
- [x] Add "Share" button on History page and Generator result
- [x] Create public /share/:token page for viewing shared songs without login
- [x] Copy-to-clipboard functionality for share links
- [x] Public share page with playback, download, and sheet music view

## Duration Slider
- [x] Add duration slider to generator page (15s to 4 minutes)
- [x] Pass duration to backend for all engines
- [x] Display selected duration with formatted label

## App Rename
- [x] Rename app to "Make Custom Music" across all UI elements (header, footer, page title, hero badge)

## Audio Waveform Visualization
- [x] Replace progress bar with dynamic waveform canvas visualization in AudioPlayer
- [x] Generate waveform data from audio buffer using Web Audio API (with fallback)
- [x] Render animated waveform bars that respond to playback position
- [x] Support click-to-seek on the waveform with hover preview
- [x] Smooth animation and color-coded played/unplayed/hover sections

## Personal Favorites
- [x] Create favorites table in database (userId + songId, unique constraint)
- [x] Add backend tRPC routes: toggleFavorite, listFavorites, isFavorited
- [x] Add heart/favorite toggle button on Generator result card
- [x] Add heart/favorite toggle button on History page song cards
- [x] Add heart/favorite toggle button on AlbumDetail page song cards
- [x] Create dedicated Favorites page showing all favorited songs
- [x] Add Favorites link to navigation header
- [x] Optimistic UI updates for instant toggle feedback
- [x] Update tests for favorites functionality (46 tests passing)

## Sequential Playback / Queue Player
- [x] Create QueuePlayer React context to manage playlist state (queue, current index, play/pause)
- [x] Build persistent bottom player bar with song info, waveform, next/previous/play-pause controls
- [x] Handle audio source resolution for ElevenLabs (URL-based) songs
- [x] Add "Play All" button to Favorites page that loads all favorited songs into the queue
- [x] Add "Play All" button to AlbumDetail page that loads all album songs into the queue
- [x] Auto-advance to next song when current song ends
- [x] Highlight currently playing song in the list
- [x] Write tests for queue player logic (61 tests passing)

## Shuffle Mode
- [x] Add shuffle state and shuffled index order to QueuePlayerContext
- [x] Implement shuffle toggle that creates a random permutation of the queue
- [x] Wire next/previous to follow shuffled order when shuffle is active
- [x] Add shuffle toggle button to QueuePlayerBar UI with active indicator
- [x] Update queue list overlay to show shuffled order when active
- [x] Update tests for shuffle logic (75 tests passing)

## Footer Update
- [x] Update footer copyright text to "© 2026 A. LaMotte Music"

## Remove Free Engine
- [x] Remove free engine option from Generator page UI (engine selector)
- [x] Remove free engine generation logic from backend routers
- [x] Remove ABC notation synthesis and related code from all pages
- [x] Remove ABC synthesis from QueuePlayerContext
- [x] Update tests to remove free engine references (77 tests passing)

## Search & Filter
- [x] Create reusable SongFilters component with search bar, genre dropdown, and mood dropdown
- [x] Extract unique genres and moods from song data for filter options
- [x] Integrate SongFilters into History page with client-side filtering
- [x] Integrate SongFilters into Favorites page with client-side filtering
- [x] Show result count and "no results" empty state when filters match nothing
- [x] Write tests for filter logic (100 tests passing)

## Home Page Layout
- [x] Move all home page content up to the top (reduce vertical padding/spacing)

## AI Lyrics Generation
- [x] Add backend tRPC route to generate lyrics from a subject/topic using LLM
- [x] Add subject input field and "Generate Lyrics" button in Custom Mode on Generator page
- [x] Pre-fill the lyrics textarea with AI-generated lyrics
- [x] Show loading state during lyrics generation
- [x] Write tests for lyrics generation route (106 tests passing)

## Song Editing
- [x] Add updateSong DB helper to update title, lyrics, genre, mood, styleTags
- [x] Add songs.update tRPC route (protected, owner-only)
- [x] Create reusable EditSongDialog component with form fields
- [x] Add edit button to History page song cards
- [x] Add edit button to Favorites page song cards
- [x] Add edit button to AlbumDetail page song cards
- [x] Optimistic UI updates after editing (invalidate on save)
- [x] Write tests for song update route (116 tests passing)

## Play All on History Page
- [x] Add Play All button to History page header
- [x] Integrate queue player context into History page
- [x] Highlight currently playing song in the History list
- [x] Allow clicking individual songs to start queue from that position

## Song Deletion
- [x] Add deleteSong DB helper (delete song + cascade favorites + album-song relations)
- [x] Add songs.delete tRPC route (protected, owner-only)
- [x] Create reusable DeleteSongDialog confirmation component
- [x] Add delete button to History page song cards (replaced inline AlertDialog)
- [x] Add delete button to Favorites page song cards
- [x] Add delete button to AlbumDetail page song cards
- [x] Invalidate relevant queries after deletion (songs, favorites, albums)
- [x] Write tests for song deletion route (131 tests passing)

## Bulk Album ZIP Download
- [x] Add backend Express endpoint (GET /api/albums/:albumId/download) to generate ZIP
- [x] Fetch audio files from URLs and stream them into a ZIP archive
- [x] Sanitize filenames (track number + title) for the ZIP entries
- [x] Add "Download All" button to AlbumDetail page header
- [x] Show loading state during ZIP generation/download ("Preparing ZIP...")
- [x] Write tests for ZIP download endpoint (142 tests passing)

## Album Song Reordering (Drag & Drop)
- [x] Add reorderAlbumSongs DB helper to update trackOrder for all songs in an album
- [x] Add albums.reorderSongs tRPC route (protected, owner-only)
- [x] Install and integrate @dnd-kit for drag-and-drop on AlbumDetail page
- [x] Add drag handles to song cards with visual feedback during drag
- [x] Persist new order to backend after drop (optimistic update)
- [x] Write tests for reorder route (147 tests passing)

## Replace Suno with ElevenLabs (Full Replacement)
### Backend
- [x] Create server/elevenLabsApi.ts with music generation, TTS, and voice list helpers
- [x] Replace songs.generate in routers.ts to use ElevenLabs music API
- [x] Replace isSunoAvailable with isElevenLabsAvailable in routers.ts
- [x] Update engines query to return elevenlabs instead of suno
- [x] Add TTS preview, narration, vocal generation, and voices routes
- [x] Delete server/sunoApi.ts
- [x] Delete server/sunoApi.test.ts

### Schema
- [x] Rename sunoSongId column to externalSongId in drizzle/schema.ts (migration pushed)

### Frontend
- [x] Replace all Suno references in Generator.tsx with ElevenLabs
- [x] Replace Suno badges in AlbumDetail.tsx and Favorites.tsx
- [x] Update engine name from 'suno' to 'elevenlabs' throughout

### Tests
- [x] Update songs.test.ts to remove Suno references and add ElevenLabs tests
- [x] Create elevenLabsApi.test.ts with mocked unit tests (11 tests)
- [x] Update elevenlabs.test.ts for API key validation
- [x] Update QueuePlayerContext.test.ts to remove Suno references
- [x] All 161 tests passing

## ElevenLabs Features (Backend routes ready, frontend integration pending)
### Feature 1: Text-to-Speech Lyrics Preview
- [x] Add tRPC route (songs.ttsPreview) to convert lyrics text to speech audio
- [ ] Add "Listen to Lyrics" button on song cards (History, Favorites, AlbumDetail)
- [ ] Play TTS audio inline with loading state

### Feature 2: Voice Narration Intros/Outros
- [x] Add tRPC route (songs.narration) to generate narration audio from custom text
- [ ] Add UI on Generator/song detail to create intro/outro narration
- [ ] Save narration audio to S3 and associate with song

### Feature 3: AI Vocal Generation
- [x] Add tRPC route (songs.generateVocals) to generate singing/vocal track from lyrics
- [ ] Add "Generate Vocals" button on song cards
- [ ] Save vocal audio to S3 and associate with song

### Common
- [x] Add voices route (songs.voices) to list ElevenLabs voices
- [ ] Add voice selector dropdown (ElevenLabs voices) to UI

## SEO Fixes for Home Page
- [x] Add keywords meta tag to home page (10 relevant keywords)
- [x] Update title to 30-60 characters using document.title (49 chars)
- [x] Add meta description (50-160 characters, 155 chars)

## API Key Issue
- [ ] ElevenLabs API key returns 401 (unauthorized) — user needs to provide a valid/active key

## ElevenLabs Voice Settings & TTS UI Integration
- [x] Add voice_settings (stability, similarity_boost) to elevenLabsApi.ts TTS function
- [x] Update ttsPreview backend route to accept voice_settings parameters
- [x] Build VoiceSelector component with ElevenLabs voice dropdown
- [x] Add "Listen to Lyrics" TTS button on History page song cards
- [x] Add "Listen to Lyrics" TTS button on Favorites page song cards
- [x] Add "Listen to Lyrics" TTS button on AlbumDetail page song cards
- [x] Add inline TTS audio playback with loading state
- [x] Update tests for voice_settings changes

## Server-Side API Key Security
- [x] Verify ELEVENLABS_API_KEY is registered in server/_core/env.ts (server-only)
- [x] Verify key is NOT exposed via any VITE_ prefixed env var
- [x] Verify all ElevenLabs API calls happen exclusively in server code
- [x] Verify no frontend code directly accesses the API key
- [x] Add test to confirm key is available server-side

## Full ElevenLabs TTS Integration (User Architecture Guide)
- [x] Add Express POST /api/generate-voice endpoint for direct audio streaming (arraybuffer response)
- [x] Use voice_settings (stability: 0.4, similarity_boost: 0.75) in all TTS calls
- [x] Add rate limiting middleware to voice generation endpoints
- [x] Add auth guard to /api/generate-voice endpoint
- [x] Build frontend generateSong() flow: fetch → blob → Audio playback
- [x] Add "Listen to Lyrics" button on History page song cards
- [x] Add "Listen to Lyrics" button on Favorites page song cards
- [x] Add "Listen to Lyrics" button on AlbumDetail page song cards
- [x] Add voice selector dropdown component (ElevenLabs voices)
- [x] Upload generated TTS audio to S3 for persistent URLs
- [x] Write tests for /api/generate-voice endpoint
- [x] Write tests for rate limiting
