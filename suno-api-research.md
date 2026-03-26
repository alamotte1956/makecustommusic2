# Suno API Research Notes

## Base URL
https://api.sunoapi.org/api/v1

## Authentication
Authorization: Bearer YOUR_API_KEY

## Music Generation
- POST /generate
- Body: { prompt, customMode, style, title, instrumental, model, callBackUrl }
- Models: V4, V4_5, V4_5PLUS, V4_5ALL, V5
- Custom mode: set customMode=true, then provide style + title + prompt (lyrics)
- Returns: { code: 200, data: { taskId } }

## Task Status Polling
- GET /generate/record-info?taskId={taskId}
- Returns: { data: { taskId, status: "SUCCESS"|"PENDING"|"FAILED", response: { data: [{ id, audio_url, title, tags, duration }] } } }
- Poll every 30 seconds, max 10 minutes

## Lyrics Generation
- POST /lyrics
- Body: { prompt, callBackUrl }
- Returns taskId, poll for completion

## Vocal/Stem Separation
- POST /vocal-removal/generate
- Body: { taskId, audioId, type: "separate_vocal"|"split_stem", callBackUrl }
- separate_vocal: 2 stems (vocals + instrumental), 10 credits
- split_stem: up to 12 stems (vocals, backing_vocals, drums, bass, guitar, keyboard, percussion, strings, synth, fx, brass, woodwinds), 50 credits

## Get Separation Status (Polling)
- GET /vocal-removal/record-info?taskId={taskId}
- Response fields (camelCase in polling response):
  - response.vocalUrl
  - response.instrumentalUrl
  - response.backingVocalsUrl
  - response.drumsUrl
  - response.bassUrl
  - response.guitarUrl
  - response.keyboardUrl
  - response.percussionUrl
  - response.stringsUrl
  - response.synthUrl
  - response.fxUrl
  - response.brassUrl
  - response.woodwindsUrl
- successFlag: "SUCCESS" | "PENDING" | "FAILED"

## Credits Check
- GET /get-credits
- Returns: { data: { credits } }

## Key Notes
- Audio URLs expire after 14 days
- Each separation call is charged (no caching)
- Generation returns 2 audio variations by default
- V5 is the latest model
