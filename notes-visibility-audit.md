# Visibility Audit Notes

## Homepage (screenshot 1)
- Looks good: white text on dark background, gradient text for "Worship Song" is visible
- Sidebar: white text on dark sidebar background - OK
- Cookie banner: dark text on light background - OK

## Generator Page (screenshot 2-3)
- Overall looks good: white text on dark background
- Genre/mood buttons: visible text on dark buttons with borders
- Duration slider: "30s" label in orange/coral is visible
- "Generate Song" button: visible gradient with white text
- Textarea placeholder: slightly dim but readable (muted-foreground)
- "Add your own lyrics" collapsible: visible
- Issue: The duration time labels (15s, 1:00, 2:00, 3:00, 4:00) appear quite dim/hard to read
- Issue: "Show AI Prompt Preview" text is dim

## Song Detail Page
- Song title: white on dark - OK
- Badges ("radio-ready", "Transcribed from Audio"): green/purple with white text - OK
- BPM text: visible
- Audio waveform: visible gray/red on dark
- Tab labels: visible but inactive tabs may be dim
- Lyrics text: white on dark - OK
- Sheet Music section: "No sheet music yet" - white text visible
- "Generating Sheet Music..." button: visible coral/pink gradient
- Key dropdown: "Auto" text visible
- "The AI will choose the best key" helper text: slightly dim but readable

## Library Page
- Song cards: white text on dark cards - OK
- Keywords text: slightly dim muted color but readable
- Date text: visible
- Action buttons (Play, MP3, Lyrics, etc.): visible
- "Transcribed" badge: green on dark - OK
- BPM text: visible

## Issues Found:
1. Duration time labels on Generator page (15s, 1:00, 2:00, etc.) - dim/hard to read
2. "Show AI Prompt Preview" text on Generator page - dim
3. The 404 page uses a LIGHT card on gradient background - inconsistent with dark theme
4. Some muted-foreground text may be too dim on certain monitors

## Still need to check:
- Settings/Admin pages
- Select dropdowns when opened
- Toast notifications
- Modal dialogs
