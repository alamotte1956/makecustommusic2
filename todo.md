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
- [x] Add "Listen to Lyrics" button on song cards (History, Favorites, AlbumDetail)
- [x] Play TTS audio inline with loading state

### Feature 2: Voice Narration Intros/Outros
- [x] Add tRPC route (songs.narration) to generate narration audio from custom text
- [ ] Add UI on Generator/song detail to create intro/outro narration (future)
- [ ] Save narration audio to S3 and associate with song (future)

### Feature 3: AI Vocal Generation
- [x] Add tRPC route (songs.generateVocals) to generate singing/vocal track from lyrics
- [ ] Add "Generate Vocals" button on song cards (future)
- [ ] Save vocal audio to S3 and associate with song (future)

### Common
- [x] Add voices route (songs.voices) to list ElevenLabs voices
- [x] Add voice selector dropdown (ElevenLabs voices) to UI

## SEO Fixes for Home Page
- [x] Add keywords meta tag to home page (10 relevant keywords)
- [x] Update title to 30-60 characters using document.title (49 chars)
- [x] Add meta description (50-160 characters, 155 chars)

## API Key Issue
- [x] ElevenLabs API key returns 401 (unauthorized) — resolved with new key

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

## World-Class Enhancements

### Sheet Music Generation (Downloadable/Printable PDF)
- [x] Add backend route to generate professional sheet music from song lyrics + genre + mood using Claude Sonnet
- [x] Generate lead sheet with melody notation, lyrics aligned under notes, tempo/key markings
- [x] Render sheet music as SVG using abcjs library (ABC notation → visual score)
- [x] Add PDF export using print window for downloadable/printable sheet music
- [x] Add "Sheet Music" tab on song detail page
- [x] Store generated sheet music data (ABC notation) in database

### Chord Progressions for Acoustic Guitar
- [x] Add backend route to generate chord progressions tailored for acoustic guitar
- [x] Include chord names, fingering positions, strumming patterns, and capo recommendations
- [x] Build guitar chord diagram component (SVG-based fretboard visualization)
- [x] Display chord progression timeline aligned with song sections (verse, chorus, bridge)
- [x] Add "Guitar Chords" tab on song detail page
- [x] Make chord charts downloadable as PDF (print window)

### World-Class Polish
- [x] Add professional song detail page with tabs: Lyrics, Sheet Music, Guitar Chords
- [x] Improve loading animations with skeleton screens and progress indicators
- [x] Add toast notifications for all user actions
- [x] Ensure all pages have proper empty states with CTAs

## Headline Text Change
- [x] Replace "Turn Your Words Into Music" with "Turn Your Ideas into Songs" on Home page

## Studio-Grade Production Enhancements

### 1. Audio Post-Processing (FFmpeg)
- [x] Install FFmpeg on server
- [x] Build audioPostProcess module with reverb, EQ, and compression filters
- [x] Apply post-processing to generated audio before S3 upload
- [x] Add processing preset options (raw, warm, bright, radio-ready, cinematic)

### 2. Vocal-Instrumental Mixing
- [x] Build vocal-instrumental mixer that layers TTS vocal over instrumental track
- [x] Auto-balance volume levels (vocal prominence vs instrumental bed)
- [x] Generate mixed output as single MP3 file
- [x] Store mixed audio URL in database

### 3. Tempo-Synced Delivery (SSML)
- [x] Add SSML markup generation based on song BPM and time signature
- [x] Align vocal pacing with instrumental tempo using tempo-aware text processing
- [x] Adjust voice settings (stability/style) based on BPM for natural pacing

### 4. Multiple Takes
- [x] Generate 3 vocal variations per song with different voice settings
- [x] Store all takes in database with take number and labels
- [x] Build take selector UI for user to audition and pick best take
- [x] Allow switching between takes with instant playback

### 5. Stem Separation
- [x] Offer separate instrumental and vocal stem downloads
- [x] Store stem URLs in database (instrumentalUrl, vocalUrl, mixedUrl)
- [x] Add stem download buttons on song detail page
- [x] Build Studio tab in SongDetail with mastering presets, mixing controls, and stem downloads

## Competitive Features & Pricing Strategy
- [x] Research all major competitors (Suno, Udio, AIVA, Soundraw, Boomy) pricing and features
- [x] Create comprehensive pricing strategy document with package recommendations
- [x] Design credit system schema (credits, usage tracking, plan tiers)
- [x] Build pricing page UI with plan comparison
- [x] Build credit system backend (credit balance, deduction per action, refill on subscription)
- [x] Prepare Stripe-ready architecture (plan IDs, webhook handlers, checkout flow)
- [x] Add competitive features identified from gap analysis
- [x] Write tests for credit system

## Community Song Pool (Discover)
- [x] Add visibility field (private/public) to songs database schema
- [x] Add publishedAt timestamp field for sorting public songs
- [x] Create backend routes: publishSong, unpublishSong, getPublicSongs
- [x] Add publish/unpublish toggle button on song cards (History)
- [x] Build Discover page with public song feed (grid layout, play, like)
- [x] Add Discover link to main navigation
- [x] Ensure private songs are never returned in public queries
- [x] Add creator name/avatar display on public song cards
- [x] Write tests for visibility and public song routes

## Stripe Payment Gateway Integration
- [x] Add Stripe feature to project scaffold (webdev_add_feature)
- [x] Configure Stripe API keys (secret key + publishable key + webhook secret in ENV)
- [x] Create Stripe products and price configuration (stripeProducts.ts with 3 plans + 3 credit packs)
- [x] Build Stripe Checkout session creation endpoint (credits.createCheckout for subscriptions)
- [x] Build Stripe Checkout for one-time credit pack purchases (credits.buyCredits)
- [x] Build Stripe webhook handler for subscription events (stripeWebhook.ts)
- [x] Handle subscription lifecycle: created, updated, cancelled, payment_failed, invoice.paid
- [x] Connect Stripe subscriptions to credit system (auto-refill credits on invoice.paid)
- [x] Update Pricing page with real Stripe checkout buttons (redirects to Stripe Checkout)
- [x] Add subscription management (cancel, change plan) to Usage Dashboard
- [x] Add Stripe customer portal link for billing management (credits.createPortalSession)
- [x] Add checkout success handling with banner on Usage Dashboard
- [x] Add credit packs API endpoint (credits.creditPacks)
- [x] Add Stripe status check endpoint (credits.stripeStatus)
- [x] Write tests for Stripe integration (23 tests in stripe.test.ts)
- [x] All 283 tests passing across 16 test files

## First-Time User Onboarding Walkthrough
- [ ] Create OnboardingContext to track walkthrough state (step, active, completed)
- [ ] Persist onboarding completion status in localStorage
- [ ] Build OnboardingOverlay component with spotlight highlight, tooltip, and step navigation
- [ ] Add walkthrough steps for Generator page (describe music, select options, generate)
- [ ] Add walkthrough steps for SongDetail page (view sheet music, explore tabs)
- [ ] Add welcome modal for first-time users with option to start or skip walkthrough
- [ ] Integrate walkthrough into Generator page with step-specific highlights
- [ ] Integrate walkthrough into SongDetail page with sheet music guidance
- [ ] Add "Restart Tour" button in navigation or settings for returning users
- [ ] Write tests for onboarding logic

## Custom Lyrics UX Improvement
- [x] Make "Write Your Own Lyrics" a first-class option on the Generator page (three-tab creation mode selector)
- [x] Add a dedicated lyrics textarea that's always visible when lyrics mode is selected (12-row textarea with mono font)
- [x] Add clear helper text and placeholder guiding users on how to format lyrics (section markers, example lyrics)
- [x] Add song structure templates (Love Song, Story Song, Hip Hop/Rap, Simple Verse-Chorus)
- [x] Ensure lyrics are passed correctly to the backend and stored with the song
- [x] Keep AI-generated lyrics option alongside manual entry (AI Lyrics tab)
- [x] Write tests for custom lyrics flow (36 tests in customLyrics.test.ts)
- [x] All 319 tests passing across 17 test files

## Generator Controls UX Reorganization
- [x] Reorganize controls into logical top-to-bottom creation flow (5 numbered steps)
- [x] Simplify the creation mode selector (compact 3-column cards)
- [x] Group related controls together (genre+mood in Step 3, vocals+duration in Step 4)
- [x] Make the generate button more prominent and always visible (Step 5 with highlight border)
- [x] Ensure all controls follow a natural step-by-step order (1→2→3→4→5)
- [x] Remove visual clutter and unnecessary complexity (compact chips, preset buttons)
- [x] Write/update tests for reorganized controls (all 319 tests passing)

## Competitive Pricing & Stripe Checkout
- [x] Update stripeProducts.ts with competitive pricing (based on Suno/Udio/Soundraw research)
- [x] Update PLAN_LIMITS in schema.ts to match new credit allocations
- [x] Update Pricing page to reflect new prices
- [x] Ensure all purchase flows route through Stripe Checkout

## AI Lyrics Refinement Feature
- [x] Add refineLyrics tRPC endpoint (polish, improve rhymes, tighten structure)
- [x] Add refine mode selector (Polish, Rhyme Enhance, Restructure, Full Rewrite)
- [x] Add "AI Refine" button in Write Lyrics and AI Lyrics modes on Generator page

## Audio Upload & Remastering
- [x] Add uploadAudio tRPC endpoint (base64 upload to S3, create song record)
- [x] Build Upload & Remaster page with drag-and-drop file picker
- [x] Add copyright acknowledgment checkbox
- [x] Add Upload nav item to Layout

## Sheet Music Upload & MP3 Generation
- [x] Create sheetMusicAnalyzer.ts (LLM vision for image/PDF, XML parser for MusicXML)
- [x] Add analyzeSheetMusic tRPC endpoint
- [x] Add generateFromSheetMusic tRPC endpoint
- [x] Build Sheet Music Upload page UI (integrated into Upload page)

## Sheet Music & Chord Display Formatting
- [x] Fix chord chart layout to prevent overlapping text and symbols
- [x] Add print-friendly CSS styles for clean printed output
- [x] Improve SheetMusicViewer with better spacing and PDF export
- [x] Improve GuitarChordViewer with clean grid layout and print styles

## Song Production Quality Improvements
- [x] Enhance buildProductionPrompt with richer arrangement instructions
- [x] Add instrument layering and mastering descriptors
- [x] Increase default duration for more complete song structures

## Bug Fixes
- [x] Fix 404 error when opening shared song links from email (created SharedSong page and route)

## PDF Document Formatting
- [x] Ensure all downloadable documents export as PDF (not PNG/text) using jsPDF
- [x] Fix sheet music PDF: proper page breaks, margins, no content overflow
- [x] Fix chord chart PDF: proper layout, no overlapping diagrams
- [x] Fix lyrics PDF: clean formatting with proper pagination
- [x] Add shared PDF generation utility (client/src/lib/pdfExport.ts)
- [x] Add lyrics Download PDF button to SongDetail lyrics tab
- [x] Test all PDF downloads for readability (338 tests passing across 18 test files)
