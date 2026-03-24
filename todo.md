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
- [x] Create OnboardingContext to track walkthrough state (step, active, completed)
- [x] Persist onboarding completion status in localStorage
- [x] Build OnboardingOverlay component with spotlight highlight, tooltip, and step navigation
- [x] Add walkthrough steps for Generator page (describe music, select options, generate)
- [x] Add walkthrough steps for SongDetail page (view sheet music, explore tabs)
- [x] Auto-trigger tour for first-time users on Generator page
- [x] Integrate walkthrough into Generator page with step-specific highlights
- [x] Integrate walkthrough into SongDetail page with sheet music guidance
- [x] Add "Restart Tour" button in navigation (help icon) for returning users
- [x] Write tests for onboarding logic (29 tests in onboarding.test.ts)

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

## SEO Fixes
- [x] Reduce homepage keywords from 10 to 6 focused keywords

## Studio Section Removal
- [x] Remove Studio tab from SongDetail page
- [x] Remove StudioProducer import from SongDetail
- [ ] StudioProducer component file kept (not imported anywhere now)
- [ ] Studio plan/pricing kept as requested (only tab removed)

## Key Transposition Before Print
- [x] Add key selector dropdown to SheetMusicViewer (transpose ABC notation before PDF export)
- [x] Add key selector dropdown to GuitarChordViewer (transpose chord progression before PDF export)
- [x] Build transposition utility for notes and chords (client/src/lib/transpose.ts)

## Guided Onboarding Walkthrough
- [x] Create OnboardingContext to manage walkthrough state (current step, active, completed)
- [x] Create TourTooltip component with spotlight overlay and step-by-step tooltips
- [x] Define 9 walkthrough steps: creation mode, content entry, genre/mood, vocals/duration, generate, audio player, sheet music, chords, lyrics
- [x] Integrate data-tour attributes into Generator and SongDetail pages
- [x] Add first-time user detection (localStorage-based)
- [x] Add help icon button accessible from nav for returning users
- [x] Add walkthrough persistence so users can resume or skip
- [x] Write tests for onboarding logic (29 tests, 395 total passing)

## Album Creation Bug Fix
- [x] Fix: Duplicate song prevention in addSongToAlbum (checks before insert, throws error)
- [x] Fix: "Add to Album" UI — added "Add Songs" dialog in AlbumDetail page with search
- [x] Fix: "Add to Album" in History page now handles duplicate error gracefully
- [x] Fix: removeSong now verifies album ownership before removing
- [x] Fix: Track order gaps recompacted after song removal
- [x] Fix: Album creation verifies song ownership before adding
- [x] Fix: addSong endpoint verifies both album and song ownership
- [x] Fix: Empty album state now shows "Add Songs" button instead of dead-end "Go to My Songs"

## Professional Logo Redesign
- [ ] Generate a professional, modern logo for MakeCustomMusic.com
- [ ] Upload to CDN and update VITE_APP_LOGO

## Capo Recommendation Feature
- [x] Build capo recommendation algorithm (analyze chords, find optimal capo position for open chords)
- [x] Add capo recommendation display to GuitarChordViewer UI
- [x] Show simplified chord shapes when capo is applied
- [x] Allow toggling capo on/off to compare original vs capo chords (Apply Capo button + key change resets)
- [x] Include capo recommendation in PDF export
- [x] Write tests for capo recommendation logic (31 new tests)

## PDF Margin Fix
- [x] Fix sheet music PDF export to respect proper margins (no content encroachment)
- [x] Fix chord chart PDF export to respect proper margins (no content encroachment)
- [x] Fix lyrics PDF export to respect proper margins (no content encroachment)
- [x] Ensure consistent margin handling across all PDF exports (SAFE_BOTTOM + FOOTER_RESERVE system)

## Metronome Feature
- [x] Build Metronome audio engine using Web Audio API (click/accent sounds)
- [x] Create MetronomeVisualizer component with animated beat indicators
- [x] Parse strumming patterns (D/U/x) and sync visual indicators to beats
- [x] Add tempo control (BPM slider/input) with tap-tempo support
- [x] Add time signature support (4/4, 3/4, 6/8, etc.)
- [x] Integrate metronome into GuitarChordViewer with play/stop controls
- [x] Show current strum direction (down/up) synced to beat position
- [x] Add volume control for metronome click
- [x] Write tests for metronome logic (35 new tests)

## Bug Fix: PDF Sheet Music Upload Not Working
- [x] Investigate upload page PDF processing flow (root cause: PDFs sent as image_url instead of file_url to LLM)
- [x] Fix PDF upload — now uses file_url content type for PDFs, with better error messages for empty/corrupted files
- [x] Test PDF upload end-to-end (verified server correctly sends file_url for PDFs)

## Bug Fix: Subscription Checkout Failing
- [x] Investigate why subscription checkout fails (root cause: customer_creation param not allowed in subscription mode)
- [x] Fix subscription checkout session creation (removed customer_creation for subscription mode, added allow_promotion_codes)
- [ ] Test subscription purchase end-to-end on production

## Logo Resize
- [x] Make the logo 2x bigger in the navigation header (w-9 h-9 → w-[4.5rem] h-[4.5rem])

## Owner Notification on New Song Generation
- [x] Add notifyOwner call when a new song is generated (both standard and sheet music flows)
- [x] Include song title, genre, mood, user name, and generation mode in notification
- [x] Fire-and-forget pattern so notifications don't block song delivery

## Bug Fix: Mobile Player & Cross-Browser Compatibility
- [x] Fix QueuePlayerBar mobile layout (separate mobile/desktop layouts, touch events, expandable controls)
- [x] Fix AudioPlayer mobile and cross-browser compatibility (roundRect fallback, touch seek, Safari durationchange)
- [x] Fix Safari audio autoplay and Web Audio API issues (webkitAudioContext fallback, play() error handling)
- [x] Fix Firefox CSS and layout compatibility (roundRect canvas fallback)
- [x] Audit all components for cross-browser issues (QueuePlayerContext, Metronome hook)
- [x] Test mobile view in responsive mode (461 tests passing)

## Bug Fix: Missing Pricing Link in Mobile Nav
- [x] Add Pricing link to mobile navigation menu
- [x] Add Usage link to mobile navigation menu (authenticated only)
- [x] Add Guided Tour button to mobile navigation menu

## Bug Fix: Logo Not Displaying Correctly on All Pages
- [x] Find all logo references across the codebase (only in Layout.tsx header)
- [x] Fix logo display: reduced from 72px to 56px, increased header from 64px to 80px, added onError fallback

## Real-Time User Notification System
- [x] Create notifications table in database schema (id, userId, type, title, message, songId, read, createdAt)
- [x] Add notification DB helpers (create, list, markRead, markAllRead, getUnreadCount, delete)
- [x] Add tRPC procedures for notifications (list, markRead, markAllRead, unreadCount, delete)
- [x] Build notification polling with 15-second auto-refresh via tRPC refetchInterval
- [x] Build NotificationCenter UI component (bell icon with unread badge, dropdown panel, mark as read, delete)
- [x] Integrate notification triggers into song generation (notify user when their song is ready)
- [ ] Add notification for public song discoveries (when someone favorites/shares your song)
- [x] Write tests for notification logic (22 tests, 483 total passing across 22 test files)

## Google Search Console & SEO Setup
- [x] Create sitemap.xml with all public routes (/, /generate, /discover, /pricing, /upload)
- [x] Create robots.txt allowing crawling with sitemap reference
- [x] Add Open Graph meta tags (og:title, og:description, og:image, og:url)
- [x] Add Twitter Card meta tags (summary_large_image)
- [x] Add JSON-LD structured data (WebApplication schema with features, pricing, creator)
- [x] Add canonical URLs
- [ ] Guide user through Google Search Console submission

## Social Media OG Banner Image
- [ ] Generate 1200x630px banner with logo and tagline
- [ ] Upload to CDN and update OG meta tags in index.html

## Bug Fix: Credits Not Showing After Purchase
- [x] Investigated: credits were in DB (25 purchased + 49 monthly = 74 total), UI shows them on /usage page
- [x] Webhook fulfillment for credit packs is working correctly
- [x] Root cause: plan was stuck as 'free' due to missing product metadata in Stripe

## Bug Fix: Current Plan Not Visible in UI
- [x] Added plan badge to navigation header (desktop + mobile) with Crown icon for paid plans
- [x] Plan badge links to /usage page, color-coded per plan tier
- [x] Fixed webhook handler: 3 fallback strategies (metadata → price amount → product name)
- [x] Manually updated Albert's account to Studio plan with 5000 monthly credits

## Remove TTS References from UI
- [x] Remove TTS Previews Today card from Usage Dashboard
- [x] Remove TTS type icon from history list
- [x] Remove TTS credit mention from Pricing FAQ
- [x] Note: ListenToLyricsButton.tsx has internal handleDownloadTTS function name (not user-facing, kept as-is)

## Notification System Architecture & Performance Page
- [ ] Create NotificationSystemInfo page with architecture diagram, metrics tables, and performance summary
- [ ] Register /system/notifications route in App.tsx
- [ ] Add navigation link or access point for the page
- [ ] Write tests for the page component

## Privacy Policy & Terms of Service Pages
- [x] Create Privacy Policy page with data collection, usage, cookies, third-party services, user rights
- [x] Create Terms of Service page with acceptable use, IP ownership, subscriptions, limitations
- [x] Register /privacy and /terms routes in App.tsx
- [x] Add Privacy Policy and Terms of Service links to footer
- [x] Write tests for both pages (9 tests, 492 total passing across 23 files)

## Cookie Consent Banner
- [x] Create CookieConsent component with accept/decline buttons and Privacy Policy link
- [x] Persist consent choice in localStorage so banner only shows for first-time visitors
- [x] Integrate banner into Layout at the bottom of the page
- [x] Add slide-up animation for smooth appearance
- [x] Write tests for the cookie consent component (10 tests passing)

## Contact Email in Legal Pages
- [x] Add dedicated contact email to Privacy Policy contact section
- [x] Add dedicated contact email to Terms of Service contact section
- [x] Update tests to verify email presence (11 tests passing)

## FAQ Page
- [x] Create FAQ page with categorized accordion Q&A (Getting Started, Plans & Credits, Audio & Quality, Sheet Music & Chords, Licensing, Account & Support)
- [x] Register /faq route in App.tsx
- [x] Add FAQ link to footer navigation

## Remove Deprecated Capabilities
- [x] Simplify PLAN_LIMITS in schema.ts (remove TTS, takes, stems, mastering, vocal mixing, concurrent, add-on fields)
- [x] Update Free plan to 2 credits/month, 128kbps, personal use only
- [x] Remove credit packs from stripeProducts.ts, routers.ts, stripeWebhook.ts, Pricing page
- [x] Update all plan features in routers.ts allPlans procedure
- [x] Simplify credits.ts (remove TTS daily limit, simplify types)
- [x] Update Pricing page FAQ (remove WAV/FLAC, credit packs, purchased credits rollover)
- [x] Update Terms page subscription table (2 credits free, 250 creator, 1,000 professional)
- [x] Update StudioProducer text (remove mastering/stems references)
- [x] Update all tests (credits.test.ts, stripe.test.ts) to match simplified structure

## White-Label Manus Branding
- [x] Replace "Login with Manus" with "Log In" in ManusDialog
- [x] Replace "Manus OAuth" with "OAuth Provider" in Privacy page
- [x] Update copyright to "© 2026 MakeCustomMusic.com" in footer

## Comprehensive Pricing Audit
- [x] Verify all pricing pages show correct plan details
- [x] Remove all credit pack UI and logic
- [x] All 495 tests passing across 24 test files

## Upload Song Preview Before Finalizing
- [x] Add audio preview player to Upload page after file is selected
- [x] Show play/pause button with progress bar and seek functionality for the selected file
- [x] Display file metadata (name, size, duration) before upload
- [x] Allow users to remove/replace the selected file before finalizing
- [x] Ensure preview works with all supported audio formats (MP3, WAV, FLAC, OGG, M4A, AAC)
- [x] Write tests for the upload preview functionality (27 tests, 522 total passing across 25 files)

## Volume Control for Upload Preview Player
- [x] Add volume state and muted state to Upload page
- [x] Add mute/unmute toggle button with Volume2/VolumeX icons
- [x] Add volume slider (range input) next to the mute button
- [x] Sync volume and mute state with the audio element
- [x] Update tests for volume control functionality (40 tests passing, 13 new volume tests)

## Halve Paid Plan Credits
- [x] Update PLAN_LIMITS in drizzle/schema.ts: Creator 250→125, Professional 1000→500, Studio 5000→2500
- [x] Update plan features text in server/routers.ts allPlans procedure
- [x] Update all hardcoded credit values in Pricing, FAQ, Terms, UsageDashboard, and stripeProducts.ts
- [x] Update tests to reflect new credit values (535 tests passing across 25 files)

## Referral System (5 bonus credits per signup)
- [x] Add referrals table to schema (id, referrerId, referredUserId, referralCode, status, creditAwarded, createdAt)
- [x] Add referralCode field to users table
- [x] Push database migration
- [x] Build DB helpers: ensureReferralCode, getReferralStats, processReferral, getReferralHistory, getUserByReferralCode
- [x] Build tRPC procedures: referrals.getInfo, referrals.getHistory, referrals.claim
- [x] Wire referral tracking via useReferral hook (captures ?ref= param, claims on login)
- [x] Award 5 bonus credits to referrer when referred user completes signup
- [x] Build Referrals page UI with shareable invite link, stats cards, and referral history table
- [x] Register /referrals route in App.tsx and add navigation/footer link
- [x] Write tests for referral logic (31 tests, 566 total passing across 26 files)

## Safari Browser Compatibility
- [x] Add clipboard fallback for Safari (copyToClipboard utility with execCommand fallback)
- [x] Wrap localStorage access in try/catch for Safari private browsing (ThemeContext, DashboardLayout, useAuth, CookieConsent, useReferral)
- [x] Ensure navigator.share graceful fallback with AbortError handling
- [x] Verify URL constructor and replaceState work in Safari
- [x] Test referral flow end-to-end in Safari-compatible patterns (31 referral tests passing)

## Referral Leaderboard
- [x] Add getLeaderboard DB helper (top referrers by count with anonymized names)
- [x] Add tRPC procedure referrals.leaderboard (public)
- [x] Build leaderboard UI section on Referrals page with rank, name, referrals, credits
- [x] Highlight current user's position on the leaderboard
- [x] Add trophy/medal icons for top 3 positions
- [x] Write tests for leaderboard logic (13 new tests)

## Referral Link in Top Nav
- [x] Add referral/invite link to the top navigation bar

## SEO Fix - Meta Description
- [x] Shorten homepage meta description to under 160 characters

## Dynamic Sitemap.xml
- [x] Create server-side GET /sitemap.xml endpoint
- [x] Include static routes (/, /pricing, /faq, /privacy, /terms)
- [x] Query database for all publicly shared songs (with shareToken)
- [x] Generate /share/:token URLs for each shared song
- [x] Include lastmod timestamps from song creation/update dates
- [x] Set proper XML content type and cache headers
- [x] Remove old static sitemap.xml from client/public
- [x] Write tests for sitemap endpoint

## Bug Fix - Redirect URL Not Set
- [ ] Investigate and fix "redirect URL is not set" error

## Safari Compatibility - OAuth Redirect Fix
- [ ] Audit OAuth login URL construction for Safari btoa/atob edge cases
- [ ] Audit OAuth callback state decoding for Safari compatibility
- [ ] Audit cookie settings (SameSite, Secure, Partitioned) for Safari
- [ ] Add Safari-safe encoding/decoding for OAuth state parameter
- [ ] Test and verify OAuth flow works in Safari

## Song & Album Cover Image Generation
- [x] Add song cover generation tRPC route (songs.generateCover)
- [x] Build image prompt from song title, genre, mood, and keywords
- [x] Store generated cover URL in songs.imageUrl field
- [x] Add "Generate Cover" button on song cards (History, Favorites, AlbumDetail)
- [x] Add "Generate Cover" button on Generator result card
- [x] Display song cover images on song cards across all pages
- [x] Support regenerating song covers
- [x] Verify existing album cover generation still works
- [x] Write tests for song cover generation

## Key Selection Before Sheet Music Generation
- [x] Add key parameter to songs.generateSheetMusic tRPC route
- [x] Add key selector UI in SheetMusicViewer component before generation
- [x] Pass selected key to the LLM prompt for ABC notation generation

## Page-Level Meta Descriptions
- [x] Create usePageMeta hook or helper to set document title and meta description per route
- [x] Add meta descriptions to /pricing, /faq, /referrals, /discover, /upload pages
- [x] Ensure meta tags update on route change (SPA-friendly)

## Batch Album Cover Generation
- [x] Add albums.generateAllSongCovers tRPC route to generate covers for all songs without one
- [x] Add "Generate All Covers" button on AlbumDetail page
- [x] Show progress/loading state during batch generation

## Open Graph Meta Tags for Shared Songs
- [x] Add server-side OG meta tag injection for /share/:token pages
- [x] Include song cover image, title, and description in OG tags
- [x] Add Twitter Card meta tags for shared songs
- [x] Test OG tags render correctly for crawlers (server-side HTML)

## JSON-LD Structured Data for Shared Songs
- [x] Add MusicRecording JSON-LD schema generation from song metadata
- [x] Inject JSON-LD script tag server-side in /share/:token HTML
- [x] Include song title, genre, duration, creator, image, and audio URL
- [x] Write tests for JSON-LD generation and injection

## Bug Fix - Lyrics Not Working
- [ ] Investigate and fix lyrics generation/display issue

## SEO - Canonical Tags & Robots.txt
- [x] Add canonical tag support to usePageMeta hook
- [x] Add canonical tags to all pages (Home, Pricing, FAQ, Discover, Upload, Referrals, Generator, History, Favorites, Albums, Usage, Privacy, Terms)
- [x] Server-side canonical tag for /share/:token already works via ogTags.ts
- [x] Update robots.txt to block private routes and allow public routes
- [x] Sitemap reference in robots.txt
- [x] Write tests for canonical tag injection

## SEO Quick Wins - Accessibility & Performance
- [x] Fix viewport maximum-scale from 1 to 5 (allow pinch-to-zoom)
- [x] Add font-display:swap to Google Fonts URL (already present)
- [x] Add preload hints for Google Fonts
- [x] Add preconnect hints for CDN domains
- [x] Add aria-labels to all icon-only buttons across pages and components (AudioPlayer, QueuePlayerBar, AIChatBox, StudioProducer, VoiceSelector, Albums)
- [x] Write tests for accessibility fixes

## Blog Section for SEO
- [x] Create blog article data structure (title, slug, excerpt, content, author, date, tags, coverImage)
- [x] Write 5 SEO-optimized articles about AI music generation
- [x] Create blog listing page at /blog with article cards
- [x] Create blog article detail page at /blog/:slug with full content
- [x] Add usePageMeta with canonical tags to blog pages
- [x] Add blog to site navigation (header/footer)
- [x] Add blog routes to dynamic sitemap
- [x] Allow blog routes in robots.txt
- [x] Add JSON-LD Article structured data to blog posts
- [x] Write tests for blog features

## Blog Comment Section
- [x] Create blogComments database table (id, articleSlug, userId, content, createdAt, updatedAt)
- [x] Push database migration for blogComments table
- [x] Create tRPC routes for comments (list by slug, create, delete own comment)
- [x] Build CommentSection UI component with comment list, form, and delete
- [x] Integrate CommentSection into BlogArticle page
- [x] Handle authentication state (prompt sign-in for unauthenticated users)
- [x] Add time-ago formatting for comment timestamps
- [x] Write tests for blog comment features

## Canonical URL Fix (SEO)
- [x] Fix rel=canonical tags to use absolute URLs with https://makecustommusic.com
- [x] Add server-side redirect from www to non-www
- [x] Ensure sitemap uses consistent non-www URLs
- [x] Verify canonical tag on homepage and all pages

## Blog Structured Data Enhancement (SEO)
- [x] Enhance Article JSON-LD with image, wordCount, articleSection, keywords, dateModified
- [x] Add BreadcrumbList JSON-LD to each blog article page
- [x] Add Blog/CollectionPage JSON-LD to the /blog listing page
- [x] Add FAQPage JSON-LD to articles that contain FAQ-style content
- [x] Add article images to blog data for structured data thumbnails
- [x] Update tests for enhanced structured data

## Performance Optimization (Lighthouse)
- [x] Add route-level code splitting with React.lazy and Suspense to reduce unused JS (~277 KiB savings)
- [x] Add font-display: swap to Google Fonts for faster text rendering
- [x] Add explicit width/height to image elements to reduce CLS
- [x] Optimize font loading: removed unused weights (300, 800), JetBrains Mono; non-blocking load with media=print trick
- [x] Preload critical fonts and defer non-critical CSS

## Service Worker for Caching
- [x] Create service worker with cache-first strategy for static assets (JS, CSS, fonts, images)
- [x] Register service worker in main.tsx with proper lifecycle handling
- [x] Add network-first strategy for API/tRPC calls
- [x] Handle service worker updates gracefully (notify user of new version)
- [x] Write tests for service worker registration and caching logic

## Offline Indicator
- [x] Create useOnlineStatus hook to track navigator.onLine state
- [x] Create OfflineIndicator component with animated banner
- [x] Integrate OfflineIndicator into App layout
- [x] Write tests for offline indicator feature

## Vercel Deployment Compatibility
- [x] Create vercel.json with routes and serverless function config
- [x] Create Vercel-compatible server entry point (api/index.ts)
- [x] Update build scripts for Vercel (client build + server bundle)
- [x] Ensure environment variables are documented for Vercel dashboard
- [x] Write VERCEL_DEPLOY.md deployment guide
- [x] Run tests to verify no regressions

## Railway Deployment Guide
- [x] Write RAILWAY_DEPLOY.md deployment guide

## Remove Free Pricing Tier
- [x] Remove free tier from pricing configuration and UI

## Pricing Update
- [x] Update Creator plan to $15/month
- [x] Update Professional plan to $29/month
- [x] Remove Free tier entirely
- [x] Remove Studio tier entirely
- [x] Change 'Get Started Free' to 'Get Started Here'
- [x] Update Creator to 30 songs/month and Professional to 60 songs/month

## MP3 to Sheet Music Feature
- [x] Create server-side MP3-to-sheet-music pipeline (transcribe audio → LLM extract notes → generate ABC notation)
- [x] Add tRPC route for MP3 upload and sheet music generation
- [x] Build frontend UI for MP3 upload with drag-and-drop, audio preview, and progress steps
- [x] Integrate with existing sheet music renderer (abcjs, transpose, PDF export)
- [x] Add route to App.tsx, navigation, sitemap, and robots.txt
- [x] Write tests for MP3-to-sheet-music feature

## MIDI Export Feature
- [x] Custom ABC-to-MIDI converter (no external library needed)
- [x] Create ABC-to-MIDI conversion utility
- [x] Add MIDI export button to MP3 to Sheet Music page
- [x] Add MIDI export button to SongDetail sheet music section
- [x] Write tests for MIDI export feature

## Guitar Chord Chart Feature
- [x] Create guitar chord diagram data (fingerings for common chords)
- [x] Create GuitarChordChart component with SVG chord diagrams
- [x] Extract chords from ABC notation and display chord chart
- [x] Integrate chord chart into SheetMusicViewer and Mp3ToSheetMusic pages
- [x] Write tests for guitar chord chart feature

## Enhanced Sheet Music Notation
- [x] Improve LLM prompts to include time signatures, key signatures, tempo, dynamics, repeats, articulations
- [x] Ensure MP3-to-sheet-music pipeline produces complete notation

## MIDI Export (respects selected key)
- [x] Create ABC-to-MIDI converter utility
- [x] Add MIDI download button to SheetMusicViewer and Mp3ToSheetMusic
- [x] MIDI export uses the currently transposed key
- [x] Write tests for MIDI export

## MIDI Audio Playback in Browser
- [x] Create Web Audio API playback engine from ABC notation
- [x] Add Play/Pause/Stop controls to SheetMusicViewer
- [x] Add Play/Pause/Stop controls to Mp3ToSheetMusic page
- [x] Playback respects the currently transposed key
- [x] Add tempo control slider
- [x] Write tests for playback feature

## Real-Time Note Highlighting During Playback
- [x] Extend ABCPlayer to track current note index based on playback time
- [x] Build note-timing map from ABC parsing (note index → start/end times)
- [x] Emit activeNoteIndex in PlaybackState callback
- [x] Add CSS highlight styles for active notes in sheet music SVG
- [x] Integrate note highlighting into SheetMusicViewer
- [x] Integrate note highlighting into Mp3ToSheetMusic page
- [x] Auto-scroll to keep active note visible
- [x] Write tests for note highlighting logic

## Sheet Music Playback Progress Bar
- [x] Create SheetMusicProgressBar component with thin colored overlay on sheet music
- [x] Track playback progress percentage from PlaybackControls state
- [x] Show progress bar above sheet music container synced with playback
- [x] Animate progress bar smoothly during playback
- [x] Integrate into SheetMusicViewer
- [x] Integrate into Mp3ToSheetMusic page
- [x] Write tests for progress bar component

## Bug Fix: Sheet Music Not Working Correctly
- [x] Investigate and fix sheet music rendering/playback issue (root cause: dynamic import("abcjs") returns ESM module wrapper where renderAbc is on .default, not top-level)

## Sheet Music Generation Error Handling
- [x] Add error state with clear message and Try Again button in SheetMusicViewer
- [x] Add error state with clear message and Try Again button in Mp3ToSheetMusic
- [x] Distinguish between LLM errors, network errors, and rendering errors
- [x] Write tests for error handling

## Pre-Generate Sheet Music After Song Creation
- [x] Identify song creation endpoints and trigger points (ElevenLabs generate, audio upload, generateFromSheetMusic)
- [x] Add background sheet music generation function on the server (backgroundSheetMusic.ts)
- [x] Trigger background generation after song creation (fire-and-forget)
- [x] Add polling via refetchInterval on SongDetail getById query (polls every 5s when sheetMusicAbc is null)
- [x] Update SheetMusicViewer to show "Preparing" state and sync with initialAbc prop changes
- [x] Write tests for background generation logic

## Bug Fix: JSON Error in Sheet Music Generation
- [x] Investigated JSON error — improved LLM prompt to explicitly forbid JSON/XML output, added validation

## Deep Audit: Sheet Music Generation Pipeline
- [x] Audit backgroundSheetMusic.ts — rewrote prompt with strict format rules, added sanitiseAbc/validateAbc, 2s delay
- [x] Audit routers.ts — added V: prohibition to Mp3 prompt, used shared sanitiseAbc/validateAbc
- [x] Audit db.ts — added V: directive stripping in updateSongSheetMusic, cleaned existing DB records
- [x] Audit SheetMusicViewer.tsx — added frontend sanitisation layer, uses sanitisedDisplayAbc everywhere
- [x] Audit Mp3ToSheetMusic.tsx — added frontend sanitisation, try/catch on renderAbc, uses sanitisedDisplayAbc
- [x] Audit abcPlayer.ts — confirmed parsing handles sanitised ABC correctly
- [x] Test full pipeline end-to-end — LLM returns valid ABC, sanitisation works, validation passes
- [x] Fix all identified issues — V: directives stripped at all layers, prompts hardened, validation added

## Bug Fix: Sheet Music Only Shows Title, No Music Notation
- [x] Root cause: renderAbc passed HTMLElement instead of string ID (inconsistent across bundlers in production)
- [x] Fix: Changed renderAbc to use string element ID in both SheetMusicViewer and Mp3ToSheetMusic
- [x] Fix: Strip standalone dynamics (!mp! etc.) on their own lines in sanitisation
- [x] Fix: Convert [P:] section markers to comments for abcjs compatibility
- [x] Fix: Applied same sanitisation enhancements to server-side backgroundSheetMusic.ts
- [x] Fix: Cleaned existing DB records to remove problematic directives
- [x] Added abcjs warnings logging for future debugging

## Bug Fix: "Unexpected token '<' is not valid JSON" During Sheet Music Generation
- [x] Root cause: Server errors during LLM call cause production proxy to return HTML fallback instead of JSON
- [x] Fix: Wrapped generateSheetMusic and generateSheetMusicFromMp3 with TRPCError handling
- [x] Fix: Updated classifyError to detect HTML response errors ("Unexpected token '<'", "is not valid JSON")
- [x] Fix: Updated both SheetMusicViewer and Mp3ToSheetMusic error handling
- [x] Fix: Removed [P:] markers and standalone dynamics from all LLM prompts to prevent rendering issues
- [x] Fix: Added user-friendly error messages for all error types
