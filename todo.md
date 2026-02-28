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

## Suno V5 Custom Mode
- [x] Add Custom Mode toggle when Suno engine is selected
- [x] Add separate lyrics textarea field for custom lyrics input
- [x] Add style tags field for genre/style control (e.g., "synthwave, male vocals, slow tempo")
- [x] Add custom title field for song naming
- [x] Update backend Suno API integration to send custom mode parameters
- [x] Update database schema to store custom lyrics if provided
- [x] Maintain existing simple prompt mode as default
- [x] Update tests for Custom Mode

## Vocal Type Enhancement
- [x] Ensure Male Singer, Female Singer, and Both Singers options are prominent card-style in the UI
- [x] Verify vocal type is passed correctly to Suno API in both Simple and Custom modes
- [x] Fix stale TS watcher issue with sunoApiKey in env.ts (use process.env directly)

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

## Engine Selector
- [x] Three engines: Built-in AI (free), Replicate MusicGen (premium), Suno V5 (pro)
- [x] Engine availability check based on configured API keys
- [x] Engine selector UI with descriptions and availability badges

## App Rename
- [x] Rename app to "Make Custom Music" across all UI elements (header, footer, page title, hero badge)
