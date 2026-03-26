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

## Bug Fix: Sheet Music STILL Not Rendering (Critical)
- [x] Root cause identified: abcjs with `responsive: 'resize'` computes staff width from container width. When inside hidden Radix TabsContent (default tab is 'lyrics'), container has width 0, causing abcjs to render only title text with no musical notation.
- [x] Fix SheetMusicViewer: Added ResizeObserver to detect when container becomes visible (non-zero width) and trigger re-render
- [x] Fix SheetMusicViewer: Added width guard (skip render if container width < 10px) before calling renderAbc
- [x] Fix SheetMusicViewer: Added requestAnimationFrame wait to ensure layout is computed before rendering
- [x] Fix SheetMusicViewer: Compute staffwidth dynamically from actual container width instead of fixed 700
- [x] Fix Mp3ToSheetMusic: Applied same ResizeObserver + width guard + rAF pattern
- [x] Fix Mp3ToSheetMusic: Changed from string ID to DOM element for renderAbc call
- [x] Cleaned up debug endpoint from server/_core/index.ts
- [x] Added 16 new tests for sanitiseAbc, zero-width guard logic, and real ABC notation processing
- [x] All 849 tests passing (39 test files)

## Sheet Music Loading Skeleton
- [x] Create a music-themed skeleton component that mimics staff lines, notes, and measures
- [x] Show skeleton in SheetMusicViewer while abcjs is rendering (between abc available and isRendered)
- [x] Show skeleton in Mp3ToSheetMusic while abcjs is rendering
- [x] Smooth fade transition from skeleton to rendered notation (500ms opacity ease-in-out)
- [x] Added 12 tests for skeleton design constants and visibility logic — 861 tests passing

## Bug Fix: "Unexpected token '<' is not valid JSON" Server Timeout
- [x] Root cause: generateSheetMusicFromMp3 ran transcription + LLM in a single request (60-120s), exceeding production proxy timeout
- [x] Added mp3_sheet_jobs table to track background job status
- [x] Split into startMp3SheetJob (quick: upload + create job) + processMp3SheetJob (background: transcribe + generate)
- [x] Added getMp3SheetJobStatus query for frontend polling (3s interval)
- [x] Updated Mp3ToSheetMusic frontend to use polling pattern instead of single long request
- [x] Updated handleReset to clean up polling interval and active job state
- [x] Added 14 tests for job architecture, polling logic, and status transitions — 875 tests passing

## MP3-to-Sheet-Music Improvements
- [x] Add progress percentage and estimated time remaining to the polling UI (gradient progress bar, step percentages, time estimates)
- [x] Add "Recent Jobs" history with collapsible section, status badges, view/delete actions, date formatting
- [x] Backend: getRecentMp3SheetJobs + deleteMp3SheetJob routes, getUserMp3SheetJobs + deleteMp3SheetJob DB helpers
- [x] Added 18 tests for history feature and progress UI — 893 tests passing
- [ ] Verify the MP3-to-Sheet-Music flow end-to-end on production (user to test after publish)

## Audio Waveform Visualization
- [x] Create AudioWaveform component using Web Audio API + Canvas (no external deps)
- [x] Decode uploaded audio file to extract amplitude data (extractPeaks function)
- [x] Render waveform with played/unplayed color differentiation and cursor line
- [x] Integrated waveform into Mp3ToSheetMusic upload preview (replaces thin progress bar)
- [x] Click-to-seek on waveform + hover indicator with dashed line
- [x] Animated skeleton bars while audio is decoding
- [x] ResizeObserver for responsive bar count (1 bar per 3px)
- [x] HiDPI canvas rendering (devicePixelRatio support)
- [x] Added 17 tests for extractPeaks, rendering calculations, and skeleton — 910 tests passing

## Bug Fix: MP3-to-Sheet-Music 400 Error
- [x] Root cause: Claude model doesn't support audio file_url input, and hardcoded `thinking` parameter with `budget_tokens: 128` was sent to all models including non-Claude ones
- [x] Fixed llm.ts: thinking parameter now only applied to Claude models without file_url content
- [x] Fixed llm.ts: max_tokens now respects per-call overrides instead of hardcoded 32768
- [x] Fixed mp3SheetProcessor: switched from claude-sonnet to default gemini-2.5-flash which natively supports audio input
- [x] All 910 tests passing

## Better Error Messages for MP3-to-Sheet-Music
- [x] Backend: Added errorCode column to mp3SheetJobs table
- [x] Backend: Added structured error codes to mp3SheetProcessor (audio_too_long, transcription_failed, transcription_timeout, audio_download_failed, generation_failed, generation_timeout, validation_failed, credit_error)
- [x] Backend: Added specific TRPCError messages for file too large, unsupported format, empty file in startMp3SheetJob
- [x] Backend: Added errorCode to getMp3SheetJobStatus route response
- [x] Frontend: 13 distinct error types with mapErrorCodeToType + message-based fallback inference
- [x] Frontend: getErrorDisplay returns specific icon (wifi/file/clock/alert/credit), title, and suggestion per type
- [x] Frontend: Distinct icons per error type (WifiOff, FileAudio, Clock, AlertCircle)
- [x] Frontend: "Try Again" button hidden for non-retryable errors (file_too_large, empty_file, unsupported_format, insufficient_credits)
- [x] Frontend: "Back" button text for insufficient_credits instead of "Try Another File"
- [x] Added 11 tests for error mapping, display, retryability, and code conventions — 922 tests passing

## File Size Indicator Bar
- [x] Add visual file size indicator bar below the file info in the upload preview
- [x] Show percentage of 16MB limit used with color-coded bar (green < 50%, amber 50-80%, red > 80%)
- [x] Display remaining MB of 16MB limit, or "At file size limit" at 100%
- [x] Added 14 tests for percentage calculation, color thresholds, remaining space, and edge cases — 936 tests passing

## Save MP3 Sheet Music to Library
- [x] Add backend tRPC route saveMp3SheetToLibrary (validates job status, derives title, creates song with engine='mp3-transcription')
- [x] Add "Save to Library" button on the MP3-to-Sheet-Music results page with inline title editor dialog
- [x] Pre-fill title from filename with smart formatting (remove extension, replace dashes/underscores, title case)
- [x] Navigate to saved song via toast action ("View Song") and "View in Library" button after saving
- [x] Show success toast and swap button to "View in Library" after saving (prevents duplicates)
- [x] Reset save state on handleReset
- [x] Added 21 tests for title derivation, validation rules, data mapping, and UI state transitions — 957 tests passing

## Bug Fix: LLM 500 Error During MP3-to-Sheet-Music
- [x] Root cause: Forge API proxy doesn't reliably support file_url audio content in LLM calls
- [x] Fix: Switched mp3SheetProcessor to use text-only generateAbcNotation() from backgroundSheetMusic.ts (Whisper transcribes → text-only LLM generates ABC)
- [x] Removed direct audio-to-LLM pipeline entirely
- [ ] Needs publish to production to take effect

## Share Button on Nav Bar
- [x] Add share button (Share2 icon) to desktop nav bar next to help/tour button
- [x] Add "Share This Page" option in mobile menu
- [x] Copies current page URL to clipboard with fallback for older browsers
- [x] Shows toast confirmation ("Link copied to clipboard!") via sonner
- [x] Icon swaps to green checkmark for 2 seconds after copying
- [x] Mobile menu shows "Link Copied!" text feedback
- [x] All 957 tests passing

## "Transcribed from Audio" Badge
- [x] Add teal "Transcribed from Audio" badge (with FileAudio icon) to SongDetail page for engine='mp3-transcription'
- [x] Add teal "Transcribed" badge to History page song cards
- [x] Add teal "Transcribed" badge to Favorites page (replaces ElevenLabs badge conditionally)
- [x] Add teal "Transcribed" badge to Discover page (overlay on card image)
- [x] Styled with distinct teal-600 color to differentiate from violet ElevenLabs badges
- [x] All 957 tests passing

## Retry Button for Failed Jobs in Recent Conversions
- [x] Add backend retryMp3SheetJob route (validates ownership, error status, audioUrl; resets fields; re-triggers processMp3SheetJob)
- [x] Add amber retry button (RotateCcw icon) on failed job cards in RecentJobsSection
- [x] Show Loader2 spinner on retry button while mutation is pending
- [x] Refetch jobs list after successful retry; toast confirmation "Retrying conversion..."
- [x] Error toast on failed retry with specific error message
- [x] Added 15 tests for route validation, UI state logic, and status transitions — 972 tests passing

## Auto-Polling for Processing Jobs in Recent Conversions
- [x] Detect when any job in the list has a processing status (uploading, transcribing, generating)
- [x] Enable tRPC refetchInterval (3s) when processing jobs exist, disable when all are done/error
- [x] Show animated spinner on processing jobs to signal live updates
- [x] Auto-stop polling when all jobs reach terminal state (done or error)
- [x] Added 16 tests for status detection, polling interval logic, and status categories — 988 tests passing

## Christian Music Genre & Styles
- [x] Add "Christian" / "Gospel" / "Christian Modern" / "Christian Pop" to Generator GENRES array
- [x] Add Worship / Hymn lyric template to LYRIC_TEMPLATES
- [x] Add Christian genre guidance to GENRE_GUIDANCE (CCM: Hillsong, Elevation Worship, Lauren Daigle style)
- [x] Add Gospel genre guidance to GENRE_GUIDANCE (Kirk Franklin, Tasha Cobbs, Maverick City style)
- [x] Add Christian Modern genre guidance (Bethel, Elevation Worship, Phil Wickham, worship guitar tone)
- [x] Add Christian Pop genre guidance (Lauren Daigle, for KING & COUNTRY, TobyMac, K-LOVE radio)
- [x] Add Christian production settings to GENRE_PRODUCTION (ambient delays, pad synths, worship atmosphere)
- [x] Add Gospel production settings to GENRE_PRODUCTION (Hammond B3, brass, choir, gospel chops)
- [x] Add Christian Modern production settings (dotted-eighth delay guitar, atmospheric pads, post-rock builds)
- [x] Add Christian Pop production settings (pop drums, synth arpeggios, radio-ready mix)
- [x] Add CHRISTIAN_SONIC_SIGNATURES — detailed sonic identity injected into ElevenLabs prompts for each Christian genre
- [x] Add CHRISTIAN_ARRANGEMENTS — genre-specific arrangement templates (short/medium/long) for all 4 Christian genres
- [x] Inject sonic signatures into both Simple and Custom mode in buildProductionPrompt
- [x] Add Christian, Christian Modern, Christian Pop, CCM, Worship, Hymn BPM entries to ssmlBuilder.ts
- [x] Update FAQ page to mention Christian, Gospel, Christian Modern, Christian Pop genres
- [x] Add Devotional and Triumphant moods (guidance + production settings) that pair well with Christian genres
- [x] Update style tags placeholder to mention worship, hymn, praise & worship
- [x] Add 22 tests for Christian genres (guidance, moods, BPM, prompt builder, sonic signatures) — 1010 tests passing

## Additional Christian Sub-Genres (6 new genres added)
- [x] Add Christian Rock (Skillet, Switchfoot, Newsboys — driving guitars, arena rock energy)
- [x] Add Christian Hip Hop (Lecrae, NF, Andy Mineo — 808s, trap, faith testimony)
- [x] Add Southern Gospel (Gaither Vocal Band, The Cathedrals — four-part harmony, piano-driven)
- [x] Add Hymns / Traditional (Getty, Indelible Grace — organ/piano, classic melodies, theological depth)
- [x] Add Praise & Worship (Planetshakers, Jesus Culture — high energy, celebratory, praise breaks)
- [x] Add Christian R&B (Jonathan McReynolds, DOE, Koryn Hawthorne — smooth R&B with faith lyrics)
- [x] Add genre guidance for all 6 new sub-genres (with artist references and lyric direction)
- [x] Add production settings for all 6 new sub-genres (BPM, instruments, production quality)
- [x] Add sonic signatures for all 6 new sub-genres (detailed ElevenLabs prompt injection)
- [x] Add arrangement templates for all 6 new sub-genres (short/medium/long structures)
- [x] Add BPM estimation entries for all 6 new sub-genres in ssmlBuilder.ts
- [x] Update Generator GENRES array with all 6 new sub-genres
- [x] Update FAQ page to list all 10 Christian sub-genres
- [x] Add 35 tests for all 6 new sub-genres — 1045 tests passing across 50 test files

## Christian Genre-Specific Album Cover Art
- [x] Create CHRISTIAN_COVER_ART_MOTIFS mapping with distinct visual styles for each of the 10 Christian sub-genres
- [x] Enhance album cover prompt builder to detect Christian genres and inject genre-specific visual motifs
- [x] Christian (CCM): warm golden light rays, sunrise over hills, modern minimalist cross
- [x] Gospel: vibrant stained glass, church interior, golden light, joyful celebration imagery
- [x] Christian Modern: atmospheric/moody, dark stage with spotlights, worship night aesthetic
- [x] Christian Pop: bright, colorful, modern graphic design, clean typography, lifestyle imagery
- [x] Christian Rock: dark/dramatic, arena lighting, bold typography, gritty textures
- [x] Christian Hip Hop: urban art, graffiti-inspired, bold colors, street photography aesthetic
- [x] Southern Gospel: warm pastoral scenes, country church, vintage/nostalgic feel, family warmth
- [x] Hymns: classic/timeless, cathedral architecture, illuminated manuscript, reverent beauty
- [x] Praise & Worship: explosive color, concert photography, crowd with hands raised, energy
- [x] Christian R&B: smooth gradients, warm tones, intimate lighting, elegant/sophisticated
- [x] Wired buildCoverArtPrompt into all 3 cover generation routes (single song, album, batch songs)
- [x] Also enhanced non-Christian genres with style hints (Pop, Rock, Jazz, etc.)
- [x] Write 28 tests for genre-specific cover art prompt generation — 1073 tests passing across 51 files

## Collapsible Christian Genre Group in Dropdown
- [x] Group all 10 Christian sub-genres under a collapsible "Christian" section in the genre selector
- [x] Keep non-Christian genres (Jazz, Classical, etc.) as flat chips above the Christian group
- [x] Add expand/collapse toggle with Cross icon, chevron, and highlighted border
- [x] Show selected Christian sub-genre name when collapsed (e.g. "Christian — Gospel")
- [x] Auto-expand Christian section when a Christian genre is already selected
- [x] Collapsible section uses smooth CSS transition (max-h + opacity)
- [x] Maintain visual consistency with primary/accent color scheme

## Male & Female Combined Vocal Option
- [x] Add "Male & Female" vocal option (value: male_and_female) with Users icon to Generator VOCAL_OPTIONS
- [x] Update vocalType state type and all 3 backend zod enums to include male_and_female
- [x] Add male_and_female entry to VOCAL_PRODUCTION (blended unison, worship-team blend, thirds/sixths harmonies)
- [x] Add male_and_female vocal guidance to lyrics generation (unified pair, not trading lines)
- [x] Distinct from "Duet" (mixed): Duet = call-and-response, Male & Female = blended unison throughout
- [x] Add 10 tests for male_and_female vocal type — 1083 tests passing across 52 files

## Vocal Option Tooltips
- [x] Add descriptive tooltip to each vocal option using shadcn Tooltip component
- [x] No Vocals: "Instrumental only — no singing"
- [x] Male: "Solo male vocalist with chest resonance and warmth"
- [x] Female: "Solo female vocalist with clarity and airiness"
- [x] Duet: "Male and female trading lines and harmonizing"
- [x] Male & Female: "Both voices singing together in blended harmony"

## Safari & macOS MP3 Compatibility
- [x] Audit AudioPlayer, QueuePlayerContext, Upload, Mp3ToSheetMusic, StudioProducer, ListenToLyricsButton for Safari issues
- [x] Created shared Safari-safe download utility (client/src/lib/safariDownload.ts) — fetches as blob, creates objectURL, fallback to window.open
- [x] Replaced cross-origin download in 6 pages: Generator, History, Favorites, AlbumDetail, SongDetail, SharedSong
- [x] Replaced cross-origin download in 2 components: StudioProducer, ListenToLyricsButton
- [x] Added durationchange handler to Upload.tsx and Mp3ToSheetMusic.tsx audio previews (Safari fires this instead of loadedmetadata)
- [x] Added audio.preload = "metadata" to Upload.tsx and Mp3ToSheetMusic.tsx
- [x] Added isFinite(audio.duration) guard to all duration handlers
- [x] Fixed autoplay rejection handling in Upload.tsx, Mp3ToSheetMusic.tsx, StudioProducer.tsx, ListenToLyricsButton.tsx (.play().then/.catch pattern)
- [x] QueuePlayerContext already had durationchange and autoplay handling — verified
- [x] AudioPlayer already had webkitAudioContext, callback decodeAudioData, roundRect fallback — verified
- [x] Added CSS Safari fixes: -webkit-backdrop-filter prefix, -webkit-overflow-scrolling, -webkit-appearance for inputs, range input webkit fix
- [x] M4A/macOS format support verified: audio/x-m4a and audio/mp4 accepted in Upload, Mp3ToSheetMusic, and server
- [x] AlbumDetail zip download: added delayed cleanup (setTimeout 250ms) for Safari
- [x] Added 28 Safari compatibility tests — 1111 tests passing across 53 files

## Audio Load Failure Toast with Retry Button
- [x] Created shared audioRetryToast utility (client/src/lib/audioRetryToast.ts) with retry callback and descriptive error messages
- [x] Add retry toast to AudioPlayer on network/load errors (onerror event handler)
- [x] Add retry toast to QueuePlayerContext on network/load errors (onerror event handler)
- [x] Add retry toast to Upload.tsx audio preview on load failure
- [x] Add retry toast to Mp3ToSheetMusic.tsx audio preview on load failure
- [x] Add retry toast to StudioProducer.tsx on playback failure
- [x] Add retry toast to ListenToLyricsButton.tsx on playback failure

## Comprehensive Legal Terms (Privacy Policy & Terms of Service)
- [x] Rewrote Terms of Service: user retains all IP rights to generated music, lyrics, sheet music, MIDI, stems, and cover art
- [x] Added commercial use license, performance rights, derivative works rights for users
- [x] Added platform license (limited, non-exclusive) for hosting/serving content
- [x] Added AI-generated content disclaimers (no guarantee of uniqueness, similarity risk)
- [x] Added DMCA/copyright infringement takedown procedure
- [x] Added platform IP section (© 2026 Albert LaMotte for platform itself)
- [x] Added limitation of liability, indemnification, and governing law sections
- [x] Rewrote Privacy Policy: comprehensive AI music data handling, uploaded content, voice cloning data
- [x] Added CCPA and GDPR compliance sections
- [x] Added international data transfers section
- [x] Added third-party services table with data shared column
- [x] Added data retention schedule (account, content, voice samples, payment, logs)
- [x] Added "What We Do NOT Do" section (no selling data, no AI training without consent)

## Copyright Notice - Albert LaMotte
- [ ] Add "© Albert LaMotte" to site footer
- [ ] Add copyright notice to Terms of Service page
- [ ] Add copyright notice to Privacy Policy page
- [ ] Add copyright notice to About/FAQ page if appropriate

## Comprehensive Legal Terms (Privacy Policy & Terms of Service)
- [x] Rewrote Terms of Service: user retains all IP rights to generated music, lyrics, sheet music, MIDI, stems, and cover art
- [x] Added commercial use license, performance rights, derivative works rights for users
- [x] Added platform license (limited, non-exclusive) for hosting/serving content
- [x] Added AI-generated content disclaimers (no guarantee of uniqueness, similarity risk)
- [x] Added DMCA/copyright infringement takedown procedure
- [x] Added platform IP section (© 2026 Albert LaMotte for platform itself)
- [x] Added limitation of liability, indemnification, and governing law sections
- [x] Rewrote Privacy Policy: comprehensive AI music data handling, uploaded content, voice cloning data
- [x] Added CCPA and GDPR compliance sections
- [x] Added international data transfers section
- [x] Added third-party services table with data shared column
- [x] Added data retention schedule (account, content, voice samples, payment, logs)
- [x] Added "What We Do NOT Do" section (no selling data, no AI training without consent)

## Copyright Notice - © 2026 Albert LaMotte
- [x] Updated global site footer: "© 2026 Albert LaMotte. All rights reserved. MakeCustomMusic.com"
- [x] Copyright notice in Terms of Service page (section 6 + footer)
- [x] Copyright notice in Privacy Policy page (footer)
- [x] Added meta copyright tag in index.html
- [x] Updated meta author tag to "Albert LaMotte"

## Song Extension / Continuation Feature
- [ ] Add backend route to extend/continue an existing song (add verse, bridge, outro)
- [ ] Use ElevenLabs/Suno API to generate continuation audio from existing song context
- [ ] Add "Extend Song" button on SongDetail page
- [ ] Allow user to choose extension type (verse, chorus, bridge, outro, instrumental break)
- [ ] Concatenate or stitch extended audio with original
- [ ] Save extended version as new take or update existing song
- [ ] Add extension history tracking
- [ ] Write tests for song extension

## Stem Separation Feature
- [ ] Add backend route for stem separation using AI
- [ ] Separate audio into stems (vocals, drums, bass, other/instruments)
- [ ] Add "Separate Stems" button on SongDetail page
- [ ] Display individual stem players with solo/mute controls
- [ ] Allow downloading individual stems
- [ ] Store separated stems in S3 and link to song record
- [ ] Write tests for stem separation

## Audio-to-Audio (Melody/Humming to Full Song)
- [ ] Add upload endpoint for melody/humming audio input
- [ ] Process uploaded audio and use as reference for AI generation
- [ ] Add "Create from Melody" page/section in the UI
- [ ] Allow user to hum, whistle, or play a melody and generate a full song
- [ ] Write tests for audio-to-audio feature

## MIDI Export
- [ ] Convert ABC notation (from sheet music) to MIDI format
- [ ] Add "Download MIDI" button on SongDetail page alongside sheet music
- [ ] Implement server-side ABC-to-MIDI conversion
- [ ] Write tests for MIDI export

## Voice Cloning / Personas
- [ ] Allow users to upload a voice sample (~10 seconds)
- [ ] Create a "persona" from the voice sample
- [ ] Use persona voice when generating songs
- [ ] Add Personas management page (create, name, delete personas)
- [ ] Write tests for voice cloning feature

## Ringtone Creator
- [ ] Add "Create Ringtone" button on SongDetail page
- [ ] Allow user to select start/end time for ringtone clip
- [ ] Trim audio to selected range (max 30 seconds)
- [ ] Export in ringtone-friendly format (M4R for iPhone, MP3 for Android)
- [ ] Write tests for ringtone creator

## Audio Format Converter
- [ ] Add audio format converter tool page
- [ ] Support conversion between MP3, WAV, FLAC, OGG formats
- [ ] Allow upload of any supported format and download in chosen format
- [ ] Write tests for audio format converter

## Collaboration (Multi-User Albums/Songs)
- [ ] Add collaboration invite system for albums
- [ ] Allow album owner to invite collaborators by email/username
- [ ] Collaborators can add songs to shared albums
- [ ] Add collaborator role permissions (view, add, edit, admin)
- [ ] Show collaborator list on album detail page
- [ ] Write tests for collaboration feature

## Full Apple/macOS/iOS Compatibility (Import, Processing, Export)
- [ ] Audit all file upload accept attributes for Apple audio formats (M4A, AAC, AIFF, CAF, Apple Lossless)
- [ ] Ensure server-side MIME type validation accepts Apple-specific types (audio/x-m4a, audio/aac, audio/aiff, audio/x-caf)
- [ ] Fix iOS Safari audio autoplay restrictions (require user gesture, use AudioContext resume)
- [ ] Ensure all CSS animations use -webkit prefixes where needed for Safari
- [ ] Fix iOS Safari viewport issues (100vh, safe-area-inset, notch handling)
- [ ] Ensure file downloads work on iOS Safari (no blob URL issues, proper Content-Disposition)
- [ ] Test and fix touch events for all interactive elements (sliders, drag-and-drop)
- [ ] Ensure audio recording (if any) uses MediaRecorder with Safari-compatible codecs
- [ ] Fix iOS Safari input zoom issue (font-size >= 16px on inputs)
- [ ] Ensure PWA meta tags are present for iOS home screen support
- [ ] Add apple-touch-icon for iOS bookmarks
- [ ] Fix iOS Safari rubber-banding / overscroll on modals and drawers
- [ ] Ensure sheet music PDF export works on Safari/macOS Preview
- [ ] Ensure exported audio files play in Apple Music, QuickTime, GarageBand
- [ ] Write Apple compatibility tests

## Pricing Update - Match Highest Competitor
- [ ] Update pricing to match highest competitor (AIVA Pro $49/mo, Soundraw Unlimited $50/mo)
- [ ] Update Stripe products/prices configuration
- [ ] Update Pricing page UI with new prices
- [ ] Update any hardcoded price references across the app

## Admin Dashboard
- [x] Create admin-only backend procedures (list users, user details, spending stats)
- [x] Track user signups with names, emails, signup dates
- [x] Track total money spent per user (from Stripe payment history)
- [x] Track total credits used and remaining per user
- [x] Show total Stripe revenue summary (total collected, this month, active subscribers)
- [x] Build admin UI page with sortable/searchable user table
- [x] Add revenue overview cards at top of admin page
- [x] Add admin route protection (only role=admin can access)
- [x] Add admin nav link in sidebar/header for admin users
- [x] Write tests for admin procedures

## Admin Dashboard
- [x] Create admin DB helpers (getAllUsers, getUserDetails, getAdminStats, getRevenueStats)
- [x] Create admin tRPC procedures (users list, user details, revenue summary, site stats)
- [x] Build admin dashboard frontend page with revenue cards and user table
- [x] Add admin route protection (only role=admin can access)
- [x] Add admin nav link in header for admin users
- [x] Register /admin route in App.tsx
- [x] Write tests for admin procedures

## Admin Credits Exclusion
- [x] Exclude admin/owner account from total credits in circulation count

## Admin Notifications
- [x] Send owner notification when a new subscription is created
- [x] Send owner notification when a payment fails

## Song Rename
- [x] Add rename song mutation (backend) (already existed via songs.update)
- [x] Add inline rename UI on SongDetail page
- [x] Add rename option on History page
- [x] Write tests for song rename (covered by existing songs.update tests)

## Progressive Web App (PWA)
- [x] Create web app manifest (manifest.json) with icons, theme color, display mode
- [x] Create service worker for offline caching (app shell, audio files)
- [x] Register service worker in main.tsx
- [x] Add meta tags for PWA in index.html (theme-color, apple-touch-icon, etc.)
- [x] Add install prompt banner/button for "Add to Home Screen"
- [x] Generate PWA icons in multiple sizes
- [x] Write tests for PWA setup

## Admin Notifications Implementation
- [x] Add notifyOwner call for new subscription events in Stripe webhook
- [x] Add notifyOwner call for failed payment events in Stripe webhook
- [x] Write tests for admin notification triggers

## Admin Notification Center
- [x] Create admin_notifications database table (title, content, type, read status, timestamps)
- [x] Push database migration
- [x] Create DB helpers for listing, creating, marking read, and deleting notifications
- [x] Create tRPC procedures for admin notification CRUD
- [x] Update Stripe webhook to persist notifications to DB alongside notifyOwner
- [x] Build notification center tab/section in admin dashboard UI
- [x] Add filtering by type and read/unread status
- [x] Add mark as read / mark all as read functionality
- [x] Add unread notification badge in admin nav
- [x] Write tests for notification center

## Pricing Update & Free Credits
- [x] Make subscription prices more competitive (lower prices)
- [x] Add 2 free credits with each new subscription
- [x] Update Stripe product definitions
- [x] Update pricing page UI
- [x] Update credit allocation logic
- [x] Update tests for new pricing

## Subscription Cancellation Notification
- [x] Add subscription_canceled notification in Stripe webhook when user cancels
- [x] Include user details, plan tier, and cancellation reason in notification
- [x] Write tests for cancellation notification

## Payment Error Fix
- [x] Investigate and fix payment errors when subscribing (stale Stripe customer ID - added retry without old customer)

## Email Forwarding for Critical Notifications
- [x] Implement email sending for payment failure notifications
- [x] Implement email sending for subscription cancellation notifications
- [x] Write tests for email forwarding

## Admin Notification Settings Page
- [x] Create admin_notification_preferences database table
- [x] Push database migration
- [x] Create DB helpers for getting/updating notification preferences
- [x] Create tRPC procedures for reading and updating preferences
- [x] Build admin settings UI page with toggles for each notification type and channel
- [x] Add settings link/tab in admin dashboard navigation
- [x] Integrate preferences check into webhook notification dispatch
- [x] Write tests for notification preferences

## Suno.com Design Match
- [x] Study Suno.com color palette, layout, typography, and navigation
- [x] Update global CSS variables and theme to match Suno dark theme
- [x] Update font to match Suno typography
- [x] Redesign navigation/sidebar to match Suno layout
- [x] Redesign landing/home page to match Suno style
- [x] Redesign generator page to match Suno create flow (global theme applies)
- [x] Redesign history/library page to match Suno library (global theme applies)
- [x] Update all page backgrounds, cards, and components to match Suno
- [x] Verify visual consistency across all pages

## FAQ Section Update
- [x] Update FAQ content to reflect current pricing ($19.99/$34.99)
- [x] Update FAQ to reflect 2 free bonus credits with subscriptions
- [x] Update FAQ to match current features (Custom Mode, AI lyrics, albums, etc.)
- [x] Update FAQ styling to match new Suno dark theme
- [x] Update support email to gs@safarilegacy.org

## Bright White Typeface
- [x] Update all text to bright white (#ffffff) on dark backgrounds and very black (#000000) on light backgrounds

## Persistent Left Sidebar Navigation
- [ ] Create SidebarLayout component for logged-in users (Suno-style)
- [ ] Add sidebar nav items: Create, Library/History, Favorites, Albums, Discover
- [ ] Add user profile section at bottom of sidebar with avatar, name, logout
- [ ] Add admin link in sidebar for admin users
- [ ] Keep top nav Layout for non-authenticated visitors
- [ ] Switch between top nav and sidebar layout based on auth state
- [ ] Make sidebar collapsible on mobile (hamburger toggle)
- [ ] Ensure queue player works with sidebar layout
- [ ] Write tests for sidebar layout

## Pricing Page Text Fix
- [x] Fix pricing page text colors to be bright white on dark background

## Landing Page Title Update
- [x] Change hero title to "Make any Song you can Imagine"

## Full Suno-Identical Redesign
### Global Theme & Cross-Browser
- [ ] Rewrite index.css with Suno-exact colors (pure black bg, white text, pink/coral CTA gradient)
- [ ] Add cross-browser CSS prefixes (-webkit, -moz, -ms) for all animations and transforms
- [ ] Add Safari-specific fixes (backdrop-filter, scrollbar, flexbox)
- [ ] Add Firefox-specific fixes (scrollbar styling, smooth scrolling)
- [ ] Ensure Edge/Brave compatibility

### Layout & Navigation (Suno-style)
- [ ] Create Suno-style left sidebar for logged-in users (Home, Create, Library, Favorites, Albums, Discover)
- [ ] Add MAKE CUSTOM MUSIC logo at top of sidebar (bold white caps)
- [ ] Add user profile/credits section in sidebar
- [ ] Add "Go Pro" upgrade card at bottom of sidebar
- [ ] Keep minimal top nav for non-authenticated visitors
- [ ] Add bottom persistent player bar matching Suno style
- [ ] Add prompt bar at top of main content area ("Create your own song")

### Home/Landing Page (Suno-style)
- [ ] Redesign hero to match Suno's landing page style
- [ ] Add feature showcase sections matching Suno layout
- [ ] Add pricing preview section on landing page
- [ ] Add FAQ section on landing page matching Suno style

### Pricing (Suno's exact tiers)
- [ ] Update to 3-tier pricing: Free ($0), Pro ($10/mo or $8/mo annual), Premier ($30/mo or $24/mo annual)
- [ ] Update Stripe products/prices for new tiers
- [ ] Update pricing page layout to match Suno's card-based design
- [ ] Update backend plan definitions with new pricing

### Legal Pages (Suno-style)
- [ ] Create Terms of Service page matching Suno's structure and style
- [ ] Create Privacy Policy/Notice page matching Suno's structure and style
- [ ] Add legal page links to footer
- [ ] Style legal pages with dark theme, proper typography

### Remaining Pages
- [ ] Restyle Generator page with Suno dark theme
- [ ] Restyle History page with Suno dark theme
- [ ] Restyle Favorites page with Suno dark theme
- [ ] Restyle Albums pages with Suno dark theme
- [ ] Restyle Admin pages with Suno dark theme
- [ ] Restyle FAQ page with Suno dark theme

### Download App Page (Sonos.com-style)
- [ ] Research Sonos.com download/app page design
- [ ] Create Download App page with Sonos-style layout (hero, platform cards, features)
- [ ] Add route and navigation link for Download App page
- [x] Spell out "Make Custom Music" in full everywhere (no abbreviations like MCM)
- [x] Generate revised Terms of Service incorporating comparison report recommendations (arbitration clause, anti-competition, service discontinuation refund, free tier limits, marketing opt-out, storage limits, updated pricing)
- [x] Use consistent typeface/font for website name "Make Custom Music" in upper left corner across all layouts (desktop sidebar, mobile header, mobile menu, visitor nav)
- [x] Update Pricing page to match Suno's exact feature lists and prices (Pro $8/mo, Premier $24/mo)
- [x] Update Pro plan features: Access to latest v5 model, 2500 credits (500 songs), commercial use rights, Standard + Pro features (personas and advanced editing), split songs into 12 stems, upload 8 min audio, add vocals/instrumentals to existing songs, early access, add-on credits, priority queue up to 10 songs
- [x] Update Premier plan features: Access to Suno Studio, all Pro features plus 10000 credits (2000 songs), same feature list with Studio access highlighted
- [x] Update stripe products and backend plan definitions to match new pricing ($8/mo Pro, $24/mo Premier)
- [x] Update Terms of Service pricing table to match new prices

## Christian Creator Features & Price Increase

### Price Increase ($2/month)
- [x] Raise Pro plan from $8/mo to $10/mo (annual from $72 to $90)
- [x] Raise Premier plan from $24/mo to $26/mo (annual from $216 to $234)
- [x] Update stripeProducts.ts, schema PLAN_LIMITS, routers allPlans, Pricing page, Terms pricing table
- [x] Update all related test files with new prices

### Christian Music Genres & Styles
- [ ] Add Christian/worship genre options to the music generator (Contemporary Worship, Gospel, Hymn/Traditional, Christian Pop, Christian Rock, Christian Hip-Hop, Praise & Worship, Scripture Songs, Christian Country, Christian R&B, Choir/Choral, Instrumental Worship, Christian EDM, Kids Worship)
- [ ] Add scripture-inspired prompt templates (Psalms, Proverbs, Beatitudes, etc.)
- [ ] Add worship mood/atmosphere presets (Reverent, Joyful Praise, Reflective/Meditative, Celebratory, Prayerful, Lament, Thanksgiving, Communion/Intimate)

### Christian Community & Content
- [ ] Add "Worship & Faith" category to Discover/Community page
- [ ] Add Christian creator spotlight section on landing page
- [ ] Add church/ministry use case section on landing page (worship teams, youth groups, VBS, sermon backgrounds)

### Church & Ministry Tools
- [ ] Add Worship Set Builder feature (create ordered worship sets for services)
- [ ] Add Sermon Background Music generator (ambient/instrumental for sermons)
- [ ] Add Scripture Reference field in song creation (link songs to Bible verses)
- [ ] Add Church License info section explaining usage rights for churches
- [ ] Add seasonal/liturgical calendar presets (Advent, Christmas, Lent, Easter, Pentecost, etc.)

### Church Music Director Tools
- [ ] Worship Set Builder: create ordered worship sets with song flow (opener, worship, offering, communion, closing)
- [ ] Service Planning: assign songs to specific service segments (prelude, processional, offertory, communion, recessional)
- [ ] Key & Tempo Matching: suggest key transitions between songs in a worship set for smooth flow
- [ ] Choir Parts Generator: generate SATB (soprano, alto, tenor, bass) vocal arrangements
- [ ] Rehearsal Tracks: generate individual part rehearsal tracks (soprano only, alto only, etc.)
- [ ] Chord Charts for Band: auto-generate Nashville Number System charts and standard chord charts
- [ ] Transpose for Band: one-click transpose for capo guitar, Bb trumpet, Eb alto sax, F horn
- [ ] Click Track / Metronome: generate click tracks with count-ins for band rehearsal
- [ ] Sermon Background Music: ambient/instrumental generator for sermon illustrations and prayer time
- [ ] Call to Worship Generator: create short musical intros for call to worship moments

### Church Band Features
- [ ] Band Arrangement Generator: create full band arrangements (lead guitar, rhythm guitar, bass, keys, drums, vocals)
- [ ] Individual Instrument Parts: generate and download separate parts for each band member
- [ ] Lead Sheet Generator: melody + chords + lyrics on one page for worship leaders
- [ ] Rhythm Chart Generator: simplified charts showing only chords and rhythm patterns
- [ ] Bass Tab Generator: generate bass tablature from chord progressions
- [ ] Drum Pattern Generator: create drum patterns appropriate for worship style
- [ ] Pad/Ambient Track Generator: create sustained pad tracks for transitions and prayer
- [ ] In-Ear Mix Builder: create practice mixes with adjustable instrument levels

### Scripture & Liturgical Features
- [ ] Scripture Song Generator: input a Bible verse, generate a song based on it
- [ ] Psalm Setting Generator: set any Psalm to music (chant, contemporary, hymn style)
- [ ] Liturgical Calendar Presets: pre-built song suggestions for Advent, Christmas, Epiphany, Lent, Holy Week, Easter, Pentecost, Ordinary Time
- [ ] Lectionary Integration: suggest songs based on the Revised Common Lectionary readings
- [ ] Prayer Music Generator: create background music for corporate prayer, altar calls, communion
- [ ] Responsive Reading Music: generate musical underscoring for responsive readings

### Youth Ministry & VBS
- [ ] Kids Worship Generator: age-appropriate worship songs with simple melodies and repetitive lyrics
- [ ] VBS Theme Song Creator: create custom theme songs for Vacation Bible School programs
- [ ] Youth Group Worship: contemporary/upbeat worship suitable for teen audiences
- [ ] Camp Song Generator: fun, singable camp-style worship songs
- [ ] Motion/Action Song Creator: songs with suggested hand motions for children's ministry

### Christian Content Creator Tools
- [ ] Podcast Intro/Outro Music: generate branded intro/outro music for Christian podcasts
- [ ] YouTube Background Music: royalty-free worship-style background for Christian YouTube channels
- [ ] Social Media Clips: generate 15-30 second worship clips for Instagram/TikTok
- [ ] Devotional Music: short ambient pieces for daily devotional apps and content
- [ ] Audio Bible Background: create atmospheric music beds for audio Bible recordings

### Hymn Library & Resources
- [ ] Public Domain Hymn Library: searchable database of classic hymns with sheet music
- [ ] Hymn Modernizer: take a classic hymn and create a modern arrangement
- [ ] Hymn Medley Builder: combine multiple hymns into a seamless medley
- [ ] Hymn History & Context: display historical context and theological notes for hymns

### Church Licensing & Rights
- [ ] Church License Page: explain CCLI, OneLicense, and original content rights
- [ ] CCLI Reporting Helper: track songs used in services for CCLI reporting
- [ ] Original Content License: clear licensing for church-generated original content
- [ ] Performance Rights Guide: explain rights for live streaming, recording, and distribution
- [x] Add Suno-style shimmering/aurora background effect to the site
- [x] Add 2 free daily songs/sheet music that don't count toward monthly credit allotment
- [x] Remove free tier entirely — visitors can explore/listen but must pick a paid plan (Pro or Premier) to generate
- [x] Require plan selection at registration before allowing any music generation
- [x] Update Pricing page to show only Pro and Premier plans (no free option)
- [x] Update generator to block generation for users without an active paid plan
- [x] Add easy subscription cancellation option (cancel anytime, no refund policy)
- [x] Add cancel subscription button/flow in user account/settings area
- [x] Update FAQ with cancellation policy (cancel anytime, no refund, access until end of billing period)
- [x] Update Terms of Service with no-refund cancellation policy
- [x] Update admin dashboard to show subscription cancellation status and management

## Write Your Own Lyrics Page
- [x] Create dedicated /write-lyrics page with structured songwriting editor
- [x] Add section builder (Verse, Chorus, Bridge, Pre-Chorus, Outro, Intro, Hook, Interlude, Ad-lib) with move up/down reordering
- [x] Add AI lyric assistant (generate full lyrics from theme, refine sections with polish/rhyme/restructure/rewrite)
- [x] Add style/genre selector and vocal type picker on the page
- [x] Add "Generate Song from Lyrics" button that sends lyrics to the music generation backend
- [x] Add lyrics preview/formatting panel showing the full song structure
- [x] Add save draft functionality for work-in-progress lyrics (localStorage)
- [x] Add route in App.tsx and navigation link in sidebar
- [x] Write tests for the lyrics page features (55 tests, all 1,342 total passing)

## Drag-and-Drop Section Reordering (Write Lyrics Page)
- [x] Replace up/down arrow buttons with @dnd-kit drag-and-drop reordering
- [x] Add drag handle with visual grab indicator on each section card
- [x] Add drag overlay with section preview during drag
- [x] Add visual drop indicators and smooth animations
- [x] Maintain section expand/collapse state after reordering
- [x] Update tests for drag-and-drop reordering (17 new tests, all 1,359 total passing)

## Undo/Redo for Write Lyrics Page
- [x] Create useUndoHistory hook with snapshot-based history stack
- [x] Track all section mutations: add, remove, reorder, duplicate, content edit, type change
- [x] Track template application and scripture insertion
- [x] Add undo/redo buttons to the page header
- [x] Add Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts (Cmd on Mac)
- [x] Show undo/redo availability state (disabled when no history)
- [x] Cap history stack to prevent memory issues (50 steps max)
- [x] Write tests for undo/redo logic (30 tests, all 1,389 total passing)

## Lyrics Export Feature (Write Lyrics Page)
- [x] Install docx generation library (docx) and pdfkit for PDF export
- [x] Create server-side Express route for lyrics export (PDF, TXT, DOCX)
- [x] Generate styled PDF with song title, section headers, metadata, and lyrics content
- [x] Generate plain text file with section markers and metadata
- [x] Generate DOCX with formatted headings, paragraphs, and metadata
- [x] Add export dropdown menu to the Write Lyrics page header
- [x] Handle loading states during export generation
- [x] Write tests for export logic (26 tests, all 1,415 total passing)

## Collaborative Lyrics Sharing
- [x] Create shared_lyrics database table with schema migration (14 columns)
- [x] Push database migration
- [x] Add server tRPC procedures: create, getByToken, update, delete, listMine
- [x] Add database helpers: createSharedLyrics, getSharedLyricsByToken, updateSharedLyrics, deleteSharedLyrics, getUserSharedLyrics
- [x] Add "Share" button and dialog to Write Lyrics page header that generates a shareable link
- [x] Create /shared-lyrics/:token page for viewing/editing shared lyrics
- [x] Allow anyone with the link to view and edit (no auth required for viewing/editing)
- [x] Show last-updated timestamp, edit count, owner name, and genre/mood badges
- [x] Add copy-link-to-clipboard and open-in-new-tab actions
- [x] Add route in App.tsx for the shared lyrics page
- [x] Track editor name (persisted in localStorage) and edit count
- [x] Write tests for shared lyrics feature (35 tests, all 1,450 total passing)

## Replace ElevenLabs with Suno (Full Replacement)
- [x] Verify SUNO_API_KEY is available in environment
- [x] Audit all ElevenLabs usage across server and client code
- [ ] Create server/sunoApi.ts with Suno music generation, lyrics, and status polling
- [ ] Update songs.generate procedure to use Suno API instead of ElevenLabs
- [ ] Update songs.engines query to return suno instead of elevenlabs
- [ ] Remove ElevenLabs-specific features (TTS preview, voices, narration)
- [ ] Update frontend Generator page to remove ElevenLabs references
- [ ] Remove engine selector (Suno is the only engine)
- [ ] Handle Suno async generation flow (polling for task completion)
- [ ] Update audio URL storage to use Suno CDN URLs
- [ ] Remove server/elevenLabsApi.ts and server/generateVoice.ts
- [ ] Update all ElevenLabs badges/labels in UI to Suno
- [ ] Update Privacy page ElevenLabs reference to Suno
- [ ] Clean up ListenToLyricsButton, VoiceSelector, StudioProducer (ElevenLabs TTS components)
- [ ] Write tests for Suno API integration
- [ ] Ensure all existing tests pass after migration

## Stem Separation Feature ($5 per separation via Stripe)
- [ ] Research and integrate stem separation API (Suno vocal-removal or third-party)
- [ ] Create server-side stem separation procedure with Suno API
- [ ] Add stem_separations database table to store separated track URLs
- [ ] Create Stripe checkout session for $5 stem separation charge
- [ ] Handle Stripe webhook for stem_separation payment completion
- [ ] Trigger stem separation after successful payment
- [ ] Build stem separation UI on SongDetail page (separate vocals, drums, bass, other)
- [ ] Add individual stem playback and download controls
- [ ] Handle async separation with loading/progress states
- [ ] Write tests for stem separation feature

## MN Hennepin County Sales Tax (8.53%)
- [ ] Calculate tax-inclusive base prices so totals are even dollar amounts
- [ ] Update stripeProducts.ts with adjusted base prices
- [ ] Update stem separation price ($5 total including tax)
- [ ] Show tax-inclusive pricing on frontend (Pricing page, checkout)
- [ ] Add tax line item or note on receipts/checkout

## Sheet Music to MP3 with Suno
- [ ] Verify sheet music upload and MP3 generation works with Suno API (replacing ElevenLabs)
- [ ] Ensure generateFromSheetMusic procedure uses Suno for audio generation
- [ ] Test the full flow: upload sheet music → parse → generate MP3 via Suno

## Title Update
- [x] Change app title to "Make any Worship Song you can Imagine" across all UI elements (75 references updated, responsive mobile shortening)

## Site Name Change
- [ ] Change site name from "Make any Worship Song you can Imagine" to "Create Christian Music" across all UI elements

## Bug Fixes
- [ ] Fix "Cannot read properties of undefined (reading 'canGenerate')" error on credits.summary query

## Pricing Update & Bug Fix
- [ ] Fix canGenerate error: add "studio" plan to PLAN_LIMITS
- [ ] Update Pro plan: $19/month for 200 songs or sheet music PDFs
- [ ] Update Premier plan: $39/month for 450 songs or sheet music PDFs
- [ ] Update annual pricing accordingly
- [ ] Update Stripe products with new base prices (tax-inclusive)
- [ ] Update pricing page feature claims to match actual implemented features
- [ ] Update FAQ answers to match new pricing
- [ ] Remove "priority queue" claim from all pages (FAQ, etc.)
- [ ] Remove "add new vocals or instrumentals" claim from all pages
- [ ] Add "Upload up to 5 minutes of songs" to pricing features
- [ ] Remove "personas and advanced editing" claim from all pages
- [ ] Remove "8 min audio upload" claim from all pages
- [ ] Remove "add-on credits" claim from all pages
- [ ] Update FAQ answers to match new truthful pricing
- [x] Change bonus songs from 2 per day to 2 per month across all code, UI, and legal pages
- [x] Remove plain text (TXT) export option, keep only PDF and DOCX
- [x] Adjust all prices to even dollar amounts with 8.53% MN sales tax built in
- [x] Update stripeProducts.ts with new tax-inclusive base prices
- [x] Update Pricing page, FAQ, routers allPlans with new even-dollar prices
- [x] Update stem separation price to even dollar amount with tax
- [x] Add tax breakdown tooltip next to prices on Pricing page (base price vs. MN 8.53% tax)
- [x] Add Suno.com-style shimmering/aurora background effect to the site
- [ ] Optimize shimmer background animation for mobile (smaller orbs, less blur, fewer orbs, GPU hints)
- [ ] Rework shimmer background to closely match Suno.com's actual implementation
- [x] Fix unauthorized Suno API error
- [x] Switch music generation API from sunoapi.org to musicapi.ai
- [ ] Set up automated email notification when musicapi.ai credits fall below 10
- [x] UX comparison report: createchristianmusic.com vs Suno.com
- [ ] UX Improvement 1: Seed Discover page with 20-30 curated example songs across Christian genres
- [ ] UX Improvement 2: Add playable song previews to homepage hero section
- [ ] UX Improvement 3: Add Simple/Advanced mode toggle to Generator page
- [x] Fix homepage SEO: title to 30-60 chars, description to 50-160 chars
- [x] Research and create comprehensive Christian music SEO keyword set
- [x] Update all page meta tags (title, description) with Christian-themed keywords
- [x] Add meta keywords tag support to usePageMeta hook and HTML head
- [x] Update index.html default meta tags with Christian music keywords
- [x] Update all email addresses across the site to support@createchristianmusic.com
- [x] Implement recommended SEO keywords from report across all pages
- [ ] Write and publish blog post: "How to Write a Worship Song for Beginners"
- [x] Comprehensive site functionality audit (all pages, API, Stripe, music generation)
- [x] Fix musicapi.ai endpoint: /sonic/create-music -> /sonic/create
- [x] Fix musicapi.ai endpoint: /sonic/get-vox -> /sonic/vox
- [x] Fix response parsing for musicapi.ai top-level task_id format
- [x] Deep investigation and fix of music generation errors (root cause: musicapi.ai 403 insufficient credits)
- [x] Add clear error message when musicapi.ai credits are insufficient (403 forbidden)
- [x] Fix SEO: Update VITE_APP_TITLE to "Create Christian Music" for proper page title
- [x] Fix SEO: Shorten homepage meta description to under 160 chars
- [x] Add API credit check before attempting generation to give user-friendly error
- [x] Harden sunoApi.ts error handling for all HTTP error codes from musicapi.ai
- [x] Fix all makecustommusic.com references to createchristianmusic.com across codebase
- [x] Fix email notification domain references (emailNotification.ts)
- [x] Fix OG tags, sitemap, blog, privacy, terms domain references
- [x] Update all test files to match new domain references
- [x] Add visual indicator on music generation page showing remaining API credits
- [x] Update PLAN_LIMITS: Pro from 200 to 20 monthly credits, Premier from 450 to 50
- [x] Update PLAN_LIMITS: Pro daily song limit from 50 to 10, Premier from 100 to 25
- [x] Update Stripe product prices: Pro from $19/mo to $24/mo, Premier from $39/mo to $49/mo
- [x] Update annual pricing proportionally
- [x] Update pricing page UI to reflect new prices and limits
- [x] Update all tests to match new pricing/limits
- [x] Deep investigation of sheet music generator pipeline - find and fix all errors
- [x] Fix backgroundSheetMusic.ts: removed hardcoded model name, added retry logic (2 attempts per generation, 2 background retries)
- [x] Fix backgroundSheetMusic.ts: added ABC validation and sanitisation with missing header injection (M:, L:, Q:)
- [x] Fix routers.ts: removed hardcoded model names from generateChordProgression, generateLyrics, refineLyrics
- [x] Fix mp3SheetProcessor.ts: removed unused variable warning
- [x] Fix SheetMusicViewer.tsx: fixed initialAbc sync issue (now updates when parent re-sends ABC)
- [x] Fix pdfExport.ts: chord diagrams were never actually rendered to PDF (SVG→canvas→image pipeline was broken)
- [x] Fix pdfExport.ts: made exportChordPDF async to support proper SVG-to-image conversion
- [x] Fix GuitarChordViewer.tsx: made handleDownloadPDF async to await the now-async exportChordPDF
- [x] Remove testimonials section from the website
- [x] Implement MusicXML export: ABC-to-MusicXML converter library (using musicxml-io)
- [x] Implement MusicXML export: Download button in SheetMusicViewer UI and Mp3ToSheetMusic page
- [x] Implement MusicXML export: Write tests for the converter (14 tests) and referral bonus (9 tests)
- [x] Affiliate program: Both referrer AND referred user get 5 bonus songs each
- [x] Affiliate program: Backend routes for creating/validating referral codes and awarding credits
- [x] Affiliate program: Frontend UI for sharing referral codes and tracking referrals
- [x] Change site title first word from "Make" to "Create"
- [x] Implement Singability/Prosody Analysis feature (new tab in Song Detail with score ring, 6 metrics, strengths/improvements/rhyme map)
- [ ] Implement Song Variations/Remix (regenerate sections)
- [ ] Implement Album Art Generation
- [ ] Album Art: DB schema for storing generated art per song
- [ ] Album Art: Backend route using built-in image generation helper
- [ ] Album Art: Frontend UI with style picker, prompt editor, and art gallery
- [ ] Album Art: Download and set as cover art functionality
- [ ] Implement Worship Setlist Builder
- [ ] Implement Kids Worship Mode
- [ ] Implement WAV Export
- [ ] Implement Collaboration/Sharing with worship teams
- [ ] Update pricing to 20% premium: Pro $29/mo, Premier $59/mo
- [x] Fix SEO: Reduce homepage keywords from 12 to 6 focused keywords
- [x] Switch music generation API from musicapi.ai to kie.ai (10x cheaper, same Suno quality)
- [x] Audit all save/download/action buttons across the site to ensure they work
- [x] Fix any broken save/download buttons found during audit (none found - all buttons properly wired)
- [x] Write/update tests for fixed buttons (existing 1498 tests all passing)
