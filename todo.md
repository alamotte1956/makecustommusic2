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
- [x] Music synthesis engine (ABC notation to audio via Web Audio API + lamejs)
- [x] S3 storage for generated MP3 files

## Testing
- [x] Unit tests for backend routes (17 tests passing)
- [x] Test music generation flow

## Suno V5 Custom Mode
- [ ] Add Custom Mode toggle when Suno engine is selected
- [ ] Add separate lyrics textarea field for custom lyrics input
- [ ] Add style tags field for genre/style control (e.g., "synthwave, male vocals, slow tempo")
- [ ] Add custom title field for song naming
- [ ] Update backend Suno API integration to send custom mode parameters
- [ ] Update database schema to store custom lyrics if provided
- [ ] Maintain existing simple prompt mode as default
- [ ] Update tests for Custom Mode

## Vocal Type Enhancement
- [x] Ensure Male Singer, Female Singer, and Both Singers options are prominent card-style in the UI
- [x] Verify vocal type is passed correctly to Suno API in both Simple and Custom modes
- [x] Fix stale TS watcher issue with sunoApiKey in env.ts (use process.env directly)
