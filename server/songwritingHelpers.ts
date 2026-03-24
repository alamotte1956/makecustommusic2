/**
 * Songwriting Helpers
 *
 * Genre-specific guidance, mood mapping, and production prompt building
 * for the best-in-class lyrics + music generation pipeline.
 *
 * All guidance is rooted in modern US culture (2023-2026 trends).
 */

// ─── Genre-Specific Songwriting Guidance ───

const GENRE_GUIDANCE: Record<string, string> = {
  pop: `\n\nGENRE GUIDANCE — POP (Modern US Pop 2024-2026):
Think Sabrina Carpenter, Olivia Rodrigo, Dua Lipa, The Weeknd, Doja Cat.
- Chorus must be an instant earworm — short, punchy, melodically simple but emotionally devastating
- Verses should feel like confessional voice memos — intimate, specific, slightly unfiltered
- Pre-chorus is the "lean forward" moment — build tension with ascending energy
- Use contemporary language naturally — texts, DMs, social media, late-night drives, therapy references
- Syllable patterns: verses can be conversational/loose, chorus MUST lock into a tight rhythmic grid
- Bridge should flip the script — key change energy, unexpected confession, or perspective shift
- Think "viral hook" — the chorus should work as a 15-second clip
- Reference points: bedroom pop intimacy meets arena-scale hooks`,

  "hip hop": `\n\nGENRE GUIDANCE — HIP HOP (Modern US Hip Hop 2024-2026):
Think Drake, Kendrick Lamar, Tyler the Creator, SZA, 21 Savage, Metro Boomin productions.
- FLOW IS KING: vary cadence between triplet flows, double-time, and laid-back delivery
- Use internal rhymes, multisyllabic rhymes, and enjambment for sophistication
- Mix braggadocio with vulnerability — the best modern rap does both
- Hooks should be melodic (singing-rapping hybrid is the current standard)
- Verses: dense wordplay, cultural references (designer brands, cities, social media, hustle)
- Ad-libs in brackets where natural: (yeah), (uh), (let's go), (sheesh)
- Bridge or breakdown: strip it back, get introspective, then hit the final hook harder
- Reference current slang naturally — don't force it, let it breathe
- Think 808s and heartbreak meets trap soul meets conscious rap`,

  rock: `\n\nGENRE GUIDANCE — ROCK (Modern US Rock 2024-2026):
Think Maneskin energy, Greta Van Fleet, Turnstile, The Warning, Foo Fighters legacy.
- Raw, visceral energy — lyrics should feel like they're being shouted/sung with conviction
- Power chord moments: write lines that BEG to be screamed at a festival
- Verses can be gritty and narrative, chorus must be anthemic and communal
- Use physical, kinetic imagery — sweat, fire, highways, breaking things, running
- Bridge should build to a guitar solo moment or a stripped-back confession before the final explosion
- Rhyme schemes can be looser — rock values attitude over technical precision
- Think garage energy meets stadium ambition`,

  "r&b": `\n\nGENRE GUIDANCE — R&B (Modern US R&B 2024-2026):
Think SZA, Daniel Caesar, Summer Walker, Brent Faiyaz, Kehlani, Steve Lacy.
- Sensual, emotionally layered, vulnerable without being weak
- Verses: slow-burn storytelling, specific intimate moments (2 AM texts, skin on skin, unspoken tension)
- Chorus: melodic, smooth, with a phrase that aches — the kind you sing with your eyes closed
- Use space and breath in the lyrics — not every line needs to be dense
- Modern R&B blends with trap and alternative — don't be afraid of edge
- Bridge: the most vulnerable moment — whispered confession or falsetto-ready emotional peak
- Reference modern relationship dynamics: situationships, healing, self-worth, toxic patterns
- Think bedroom intimacy meets emotional intelligence`,

  electronic: `\n\nGENRE GUIDANCE — ELECTRONIC (Modern US Electronic 2024-2026):
Think Fred Again.., Skrillex collabs, Disclosure, Charli XCX (Brat era), Kaytranada.
- Lyrics should be hypnotic, repetitive in a trance-like way — mantras, not novels
- Short, punchy phrases that loop well over beats
- Chorus: one killer phrase repeated with variations — think "I might say something stupid, I love you"
- Verses can be spoken-word adjacent, breathy, intimate against massive production
- Use sensory/physical language — lights, bass, bodies, sweat, neon, pulse
- Bridge: breakdown moment — strip to just voice and a single synth before the drop rebuilds
- Think club catharsis meets emotional release`,

  country: `\n\nGENRE GUIDANCE — COUNTRY (Modern US Country 2024-2026):
Think Morgan Wallen, Zach Bryan, Lainey Wilson, Chris Stapleton, Beyonce's Cowboy Carter influence.
- STORYTELLING IS EVERYTHING — paint a movie in the listener's mind
- Use specific American imagery: back roads, small towns, Friday nights, tailgates, front porches, neon signs
- Chorus should be singalong-ready — the whole bar should be able to join in
- Verses: narrative-driven, each one advancing the story or revealing a new layer
- Modern country blends with rock, pop, and even hip hop — don't be afraid to cross lanes
- Bridge: the twist in the story, the lesson learned, or the gut-punch realization
- Rhyme schemes: clean and satisfying — country audiences love a well-crafted rhyme
- Think heartland authenticity meets Nashville polish`,

  jazz: `\n\nGENRE GUIDANCE — JAZZ (Modern US Jazz/Neo-Soul 2024-2026):
Think Robert Glasper, Samara Joy, Thundercat, Esperanza Spalding, Tom Misch.
- Sophisticated wordplay, clever double meanings, literary references
- Verses: conversational, improvisational feel — like a late-night monologue at a dimly lit club
- Chorus: melodically adventurous but still hooky — jazz doesn't mean inaccessible
- Use extended metaphors, synesthesia (mixing senses), and abstract imagery
- Bridge: the "solo section" equivalent — take a lyrical risk, go somewhere unexpected
- Modern jazz lyrics can be playful, self-aware, and culturally sharp
- Think spoken word meets melody meets intellectual cool`,

  classical: `\n\nGENRE GUIDANCE — CLASSICAL/ORCHESTRAL (Modern Crossover):
Think cinematic scoring meets art song — Ludovico Einaudi, Max Richter, Hozier's orchestral moments.
- Elevated, poetic language — but still emotionally accessible
- Use imagery from nature, mythology, timelessness, the cosmos
- Longer phrases that breathe with orchestral pacing
- Chorus equivalent: a recurring refrain that builds in intensity each time
- Bridge: the dramatic climax — think opera's emotional peak
- Rhyme can be subtle or absent — prioritize beauty of language and imagery`,

  ambient: `\n\nGENRE GUIDANCE — AMBIENT/CHILL (Modern US Lo-Fi/Chill 2024-2026):
Think lo-fi beats culture, Bon Iver, Phoebe Bridgers, Billie Eilish whisper-vocals.
- Minimalist lyrics — every word carries enormous weight
- Whispered, intimate, like a secret shared in the dark
- Use fragmented thoughts, stream-of-consciousness, half-finished sentences
- Chorus: a single repeated phrase or image that deepens with each repetition
- Imagery: rain on windows, 3 AM thoughts, empty rooms, blue light, static
- Bridge: silence is a lyrical tool — leave space
- Think ASMR for the soul`,

  folk: `\n\nGENRE GUIDANCE — FOLK/INDIE FOLK (Modern US Folk 2024-2026):
Think Phoebe Bridgers, Noah Kahan, Hozier, Adrianne Lenker, Gregory Alan Isakov.
- Narrative-driven with literary quality — short stories set to music
- Use nature imagery grounded in American landscapes: forests, rivers, highways, seasons
- Chorus: simple, singable, communal — campfire energy
- Verses: detailed, observational, emotionally precise
- Modern folk is deeply personal and often deals with mental health, growing up, leaving home
- Bridge: the quiet revelation — the thing you couldn't say until now
- Think therapy session meets poetry reading meets road trip`,

  reggae: `\n\nGENRE GUIDANCE — REGGAE (Modern Reggae/Dancehall Fusion):
Think Bob Marley legacy meets Koffee, Shaggy, Sean Paul, Protoje.
- Positive vibrations, social consciousness, love, unity, resistance
- Chorus: uplifting, repetitive, easy to chant along with
- Verses: storytelling with purpose — address real issues with hope
- Use Jamaican patois influences naturally if it fits, but keep it accessible
- Bridge: the call to action or the deeper spiritual moment
- Think sunshine, bass, and truth`,

  blues: `\n\nGENRE GUIDANCE — BLUES (Modern US Blues 2024-2026):
Think Gary Clark Jr., Christone Kingfish Ingram, Fantastic Negrito, Black Keys influence.
- Raw, honest, lived-in — blues lyrics come from real pain and real joy
- Classic AAB structure works: state it, restate it, resolve it
- Use physical metaphors for emotional states: "my heart's a highway with no exit"
- Chorus: gritty, soulful, the kind of line that makes a guitarist bend a string
- Modern blues blends with rock, soul, and hip hop — keep it fresh
- Bridge: the cathartic scream or the whispered truth
- Think Saturday night at a juke joint meets Sunday morning confession`,

  christian: `\n\nGENRE GUIDANCE — CHRISTIAN / CONTEMPORARY CHRISTIAN MUSIC (CCM 2024-2026):
Think Hillsong, Elevation Worship, Chris Tomlin, Lauren Daigle, for KING & COUNTRY, Maverick City Music.
- Worship-ready lyrics — singable by a congregation, personal yet universal
- Themes: faith, grace, redemption, hope, surrender, God's love, spiritual warfare, testimony
- Chorus must be a declaration or prayer — something a room full of people can lift their voices to
- Verses: personal testimony or scripture-inspired narrative — specific moments of faith
- Bridge: the intimate prayer moment or the bold proclamation — often repeated with building intensity
- Use imagery from scripture naturally: light/darkness, water, mountains, shepherd, refuge, fire
- Modern CCM blends with pop, rock, and even hip hop — keep it fresh and authentic
- Avoid being preachy — lead with vulnerability and genuine emotion
- Think Sunday morning meets arena worship meets personal devotional`,

  gospel: `\n\nGENRE GUIDANCE — GOSPEL (Modern US Gospel 2024-2026):
Think Kirk Franklin, Tasha Cobbs Leonard, CeCe Winans, Maverick City Music, Tamela Mann, Todd Dunn.
- Rooted in the Black church tradition — call-and-response, spontaneous worship, Holy Spirit-led moments
- Chorus: powerful, anthemic, the kind of hook that makes a choir stand up — joyful noise energy
- Verses: testimony-driven, real-life struggles met with divine intervention
- Bridge: the "have church" moment — ad-libs, vocal runs, building intensity, spontaneous praise
- Use rich, soulful vocal arrangements — harmonies, runs, and melismatic passages
- Themes: praise, deliverance, breakthrough, faithfulness, overcoming, gratitude, the goodness of God
- Modern gospel blends with R&B, soul, funk, and hip hop — Kirk Franklin pioneered this fusion
- Energy should build from personal testimony to corporate celebration
- Think Sunday morning choir meets Saturday night soul meets Wednesday night prayer meeting`,

  "christian modern": `\n\nGENRE GUIDANCE — CHRISTIAN MODERN / CONTEMPORARY WORSHIP (2024-2026):
Think Bethel Music, Elevation Worship, Hillsong UNITED, Phil Wickham, Brandon Lake, Cody Carnes.
- Modern worship production with atmospheric electric guitars, ambient pads, and driving rhythms
- Chorus: singable declaration — the kind of anthem that fills an arena with 10,000 voices
- Verses: intimate and personal, often starting sparse with just keys or acoustic guitar, building layers
- Bridge: the spontaneous worship moment — simple repeated phrases that build in intensity, often the emotional peak
- Use dotted-eighth delay on electric guitar (the signature "worship guitar" sound), ambient reverb, swelling pads
- Dynamics are EVERYTHING: whisper-to-roar, intimate verse to explosive chorus, stripped bridge to massive final chorus
- Themes: encountering God's presence, surrender, awe, intimacy with God, declarations of faith, Holy Spirit
- Lyrics should feel like a prayer set to music — direct address to God ("You are...", "I will...", "We declare...")
- Modern worship borrows from indie rock, post-rock, and ambient — think Explosions in the Sky meets prayer room
- Think Bethel's "Goodness of God" meets Elevation's "Graves Into Gardens" — intimate yet anthemic`,

  "christian pop": `\n\nGENRE GUIDANCE — CHRISTIAN POP / CCM POP (2024-2026):
Think Lauren Daigle, for KING & COUNTRY, TobyMac, Casting Crowns, We The Kingdom, Anne Wilson, Matthew West.
- Pop-forward production with faith-based lyrics — sounds like mainstream pop but with a message of hope and faith
- Chorus: massive pop hook that's radio-ready — catchy, singable, the kind of melody that sticks for days
- Verses: relatable storytelling about real-life struggles, doubt, and finding faith — not preachy, but authentic
- Bridge: emotional pivot — the breakthrough moment, the answered prayer, the shift from struggle to hope
- Production mirrors mainstream pop: punchy drums, layered synths, clean guitars, big vocal production
- Lyrics balance accessibility with depth — someone who doesn't go to church should still connect emotionally
- Themes: hope in hard times, God's faithfulness, identity and purpose, grace, redemption, love that transforms
- Use contemporary language naturally — texts, coffee shops, late nights, real-world settings with spiritual undertones
- Think Lauren Daigle's crossover appeal — faith music that doesn't feel like it's preaching at you
- The best Christian pop makes you FEEL something before you realize it's about God — lead with emotion, not theology`,
};

export function getGenreGuidance(genre: string | null): string {
  if (!genre) return "";
  const key = genre.toLowerCase().trim();
  return GENRE_GUIDANCE[key] || `\n\nGENRE: ${genre}. Write lyrics authentic to this genre's conventions while keeping them fresh, modern, and rooted in contemporary American music culture. Prioritize singability and emotional truth.`;
}

// ─── Mood-Specific Guidance ───

const MOOD_GUIDANCE: Record<string, string> = {
  happy: `\n\nMOOD — HAPPY/UPLIFTING:
Channel pure joy without being cheesy. Think "Walking on Sunshine" meets "Levitating."
- Use bright, kinetic imagery: sunlight, dancing, open roads, laughter
- Rhythm should bounce — short syllables, upbeat phrasing
- The hook should make people smile involuntarily
- Avoid generic positivity — find the SPECIFIC happy moment`,

  melancholic: `\n\nMOOD — MELANCHOLIC/SAD:
Channel beautiful sadness. Think Billie Eilish, Phoebe Bridgers, Frank Ocean.
- Use quiet, intimate imagery: empty rooms, old photos, rain, 2 AM silence
- Let the sadness be specific — not "I'm sad" but the exact moment the sadness lives
- Pacing should be slower, more spacious — give the listener room to feel
- The hook should ache — a phrase that sits in your chest`,

  energetic: `\n\nMOOD — ENERGETIC/HYPE:
Channel pure adrenaline. Think festival main stage, windows down on the highway.
- Short, punchy lines that hit like drum beats
- Use action verbs, movement imagery, fire/electricity/speed metaphors
- The hook should make people jump — stadium-ready, fist-pumping energy
- Build momentum through the verse, EXPLODE in the chorus`,

  calm: `\n\nMOOD — CALM/PEACEFUL:
Channel serenity without being boring. Think Sunday morning, golden hour, deep breath.
- Use flowing, gentle imagery: water, breeze, warmth, soft light
- Longer vowel sounds, gentle consonants — the words should feel like a sigh
- The hook should be a mantra — something you'd repeat to soothe yourself
- Space and silence are your friends`,

  epic: `\n\nMOOD — EPIC/CINEMATIC:
Channel movie-trailer grandeur. Think Imagine Dragons meets Hans Zimmer.
- Use sweeping, large-scale imagery: mountains, oceans, armies, stars, fire
- Build from intimate to massive — whisper to roar
- The hook should feel like a battle cry or a declaration
- Bridge should be the "all is lost" moment before the triumphant final chorus`,

  romantic: `\n\nMOOD — ROMANTIC/LOVE:
Channel modern love. Think The Weeknd, SZA, Hozier.
- Be specific about the person — their laugh, their hands, the way they sleep
- Avoid cliches (roses, hearts) — find NEW ways to say "I love you"
- The hook should capture that one feeling: butterflies, obsession, devotion, or heartbreak
- Modern romance includes complexity: situationships, long-distance, healing, choosing yourself`,

  dark: `\n\nMOOD — DARK/INTENSE:
Channel controlled darkness. Think Billie Eilish, NF, Twenty One Pilots.
- Use shadow imagery: darkness, mirrors, masks, drowning, falling
- The tension should be palpable — the listener should feel slightly uncomfortable in the best way
- The hook should be haunting — something that echoes in your head at night
- Bridge: the darkest moment before a glimmer of light (or not — sometimes the dark wins)`,

  uplifting: `\n\nMOOD — UPLIFTING/INSPIRATIONAL:
Channel earned hope — not toxic positivity. Think overcoming, not ignoring.
- Acknowledge the struggle FIRST, then rise above it
- Use journey imagery: climbing, sunrise after storm, scars that healed
- The hook should be empowering without being preachy
- Think "I survived this" energy, not "everything is fine" energy`,

  mysterious: `\n\nMOOD — MYSTERIOUS/ETHEREAL:
Channel intrigue and wonder. Think Lorde, Radiohead, Billie Eilish.
- Use ambiguous, dreamlike imagery: fog, mirrors, echoes, half-remembered dreams
- Leave things unsaid — mystery lives in the gaps
- The hook should be a question or a riddle that the listener keeps turning over
- Bridge: pull back the curtain slightly, but don't reveal everything`,

  playful: `\n\nMOOD — PLAYFUL/FUN:
Channel infectious fun. Think Doja Cat, Lizzo, Bruno Mars.
- Wordplay, double meanings, clever turns of phrase
- Use pop culture references, food metaphors, playful innuendo
- The hook should be fun to say out loud — bouncy syllables, satisfying sounds
- Don't take yourself too seriously — wink at the audience`,

  devotional: `\n\nMOOD — DEVOTIONAL/WORSHIPFUL:
Channel intimate, reverent worship. Think quiet prayer room, candlelit service, personal time with God.
- Lyrics should feel like a direct conversation with God — honest, vulnerable, intimate
- Use imagery of closeness: being held, resting, shelter, still waters, quiet places
- The hook should be a prayer or declaration that the listener can make their own
- Pacing should be unhurried — give space for the listener to breathe and reflect
- Think "It Is Well" energy — peace that transcends circumstances`,

  triumphant: `\n\nMOOD — TRIUMPHANT/VICTORIOUS:
Channel the moment of breakthrough. Think overcoming the impossible, the battle already won.
- Use victory imagery: mountains conquered, chains broken, dawn after the darkest night, standing firm
- The hook should feel like a war cry of faith — bold, declarative, unshakeable
- Build from acknowledging the struggle to proclaiming the victory
- Energy should crescendo — start with resolve and build to full celebration
- Think "Way Maker" meets "Battle Belongs" — faith that moves mountains`,
};

export function getMoodGuidance(mood: string | null): string {
  if (!mood) return "";
  const key = mood.toLowerCase().trim();
  return MOOD_GUIDANCE[key] || `\n\nMOOD: ${mood}. Let this emotional tone permeate every line. The listener should FEEL this mood from the first word to the last.`;
}

// ─── Production Prompt Builder ───

// ─── Arrangement Templates ───

const ARRANGEMENT_TEMPLATES: Record<string, string> = {
  short: `Arrangement: 4-bar intro → verse → chorus → short outro. Keep it tight and punchy.`,
  medium: `Arrangement: 4-bar intro with signature hook → verse 1 (build tension) → pre-chorus (lift) → chorus (full energy, all instruments) → verse 2 (add new element) → chorus 2 (bigger, add harmonies) → bridge (strip back, then build) → final chorus (biggest, double everything) → outro (callback to intro hook, fade or hard stop).`,
  long: `Arrangement: Cinematic intro with atmospheric build (8 bars) → verse 1 (intimate, sparse) → pre-chorus (rising energy) → chorus 1 (full production) → post-chorus hook → verse 2 (new melodic element, fuller) → pre-chorus 2 (more intense) → chorus 2 (add vocal harmonies, bigger drums) → bridge (breakdown to rebuild, key change optional) → final chorus (maximum energy, layered vocals, all instruments firing) → extended outro with melodic callback and natural decay.`,
};

function getArrangementTemplate(duration: number): string {
  if (duration <= 30) return ARRANGEMENT_TEMPLATES.short;
  if (duration <= 90) return ARRANGEMENT_TEMPLATES.medium;
  return ARRANGEMENT_TEMPLATES.long;
}

// ─── Vocal Production Details ───

const VOCAL_PRODUCTION: Record<string, string> = {
  male: "male vocals with chest resonance and warmth, double-tracked in choruses, subtle pitch correction, de-essed and compressed for presence, reverb plate with pre-delay for depth, ad-libs and vocal runs in final chorus",
  female: "female vocals with clarity and airiness, layered harmonies in choruses, subtle pitch correction, de-essed with bright EQ presence, lush reverb with stereo widening, melodic ad-libs and runs in final chorus",
  mixed: "male and female vocal duet with call-and-response verses, layered harmonies in choruses, both voices double-tracked, blended reverb spaces, trading lines in the bridge, powerful unison in final chorus",
};

// ─── Mastering Chain Description ───

const MASTERING_CHAIN = "Mastering chain: multiband compression for balanced frequency response, stereo widening on mids and highs, harmonic saturation for analog warmth, brick-wall limiter at -1dB true peak, LUFS targeting -14 for streaming platforms. The final master should be loud, clear, and competitive with commercial releases.";

const GENRE_PRODUCTION: Record<string, { bpm: string; instruments: string; production: string }> = {
  pop: {
    bpm: "118-128",
    instruments: "punchy drums, layered synth pads, clean electric guitar, sub bass, claps on 2 and 4, shimmering hi-hats, vocal chops",
    production: "radio-polished mix, wide stereo image, sidechain compression on the bass, bright vocal presence, subtle reverb throws, crisp transients, mastered loud for streaming",
  },
  "hip hop": {
    bpm: "75-95",
    instruments: "deep 808 bass, trap hi-hats with rolls, snappy snare, dark ambient pads, piano chords, vocal chops, percs",
    production: "heavy low-end with sub presence, spacious mix with room for vocals, tape saturation, half-time feel, hard-hitting kick, atmospheric reverb on melodic elements, distorted 808 slides",
  },
  rock: {
    bpm: "120-145",
    instruments: "distorted electric guitars with overdrive, driving drums with crash cymbals, bass guitar with grit, power chords, tom fills, rhythm guitar chugging",
    production: "raw energy with controlled chaos, room mics on drums for live feel, guitar amp warmth and crunch, punchy bass, dynamic range from quiet verses to explosive choruses, arena reverb on snare",
  },
  "r&b": {
    bpm: "68-90",
    instruments: "smooth Rhodes piano, warm fingerstyle bass, finger snaps, lush string pads, subtle guitar licks, soft kick drum, vinyl crackle texture",
    production: "warm and intimate mix, smooth low-end, breathy vocal space, gentle sidechain, late-night atmosphere, analog warmth, wide stereo pads",
  },
  electronic: {
    bpm: "124-132",
    instruments: "driving four-on-the-floor kick, layered synth arpeggios, saw wave bass, atmospheric pads, crisp hi-hats, vocal chops, white noise risers, sub bass drops",
    production: "massive stereo width, heavy sidechain pumping, build-ups with white noise risers, impactful drops, filtered sweeps, club-ready loudness, compressed and punchy",
  },
  country: {
    bpm: "100-130",
    instruments: "acoustic guitar fingerpicking, steel guitar slides, fiddle, upright bass, brushed drums, banjo accents, harmonica, pedal steel",
    production: "warm and organic mix, natural room reverb, Nashville-polished but authentic, clear vocal presence front and center, gentle compression, front-porch intimacy meets arena clarity",
  },
  jazz: {
    bpm: "90-140",
    instruments: "upright bass walking lines, ride cymbal with brush work, grand piano comping, muted trumpet, tenor saxophone, subtle hollow-body guitar",
    production: "warm analog feel, natural dynamics, room ambience like a jazz club, minimal compression, instruments breathing together, intimate and live-sounding",
  },
  classical: {
    bpm: "60-100",
    instruments: "full string section with violins violas cellos basses, French horn, oboe, harp arpeggios, timpani for drama, celesta for sparkle, legato phrases",
    production: "concert hall reverb, wide orchestral staging, natural dynamics from pianissimo to fortissimo, cinematic scope, emotional swells, lush and expansive",
  },
  ambient: {
    bpm: "70-90",
    instruments: "granular synth textures, reversed reverb pads, gentle piano notes with long decay, field recordings, sub bass drones, ethereal vocal layers, soft bells",
    production: "vast reverb spaces, lo-fi warmth, tape hiss texture, slow filter movements, minimal percussion, meditative pacing, spacious and dreamy",
  },
  folk: {
    bpm: "95-125",
    instruments: "acoustic guitar strumming and fingerpicking, mandolin, upright bass, light percussion with tambourine, harmonica, layered vocal harmonies",
    production: "organic and raw, minimal processing, room mic warmth, campfire intimacy, natural vocal presence, gentle tape saturation, honest and unpolished feel",
  },
  reggae: {
    bpm: "70-90",
    instruments: "offbeat rhythm guitar skanks, deep bass drops on the one, one-drop drum pattern, organ bubbling, horn stabs, percussion shakers",
    production: "heavy bass presence, dub-style reverb and delay throws, warm analog feel, spacious mix, sunshine energy, laid-back groove",
  },
  blues: {
    bpm: "70-120",
    instruments: "overdriven electric guitar with bends and vibrato, walking bass line, shuffle drums with hi-hat, Hammond organ, harmonica wails, piano comping",
    production: "raw and gritty, tube amp warmth, natural room sound, dynamic performance feel, smoky atmosphere, juke joint energy, live and breathing",
  },
  christian: {
    bpm: "72-128",
    instruments: "acoustic guitar, electric guitar with ambient delays, piano/keys, pad synths, bass guitar, modern drums with room reverb, strings, atmospheric swells",
    production: "spacious and reverent mix, lush reverb for worship atmosphere, clear vocal presence front and center, building dynamics from intimate verses to soaring choruses, ambient pads for emotional depth, modern CCM polish meets authentic worship feel",
  },
  gospel: {
    bpm: "80-130",
    instruments: "Hammond B3 organ, grand piano, bass guitar with gospel runs, drums with gospel chops and fills, brass section (trumpet, trombone, saxophone), choir pads, tambourine, claps",
    production: "warm and powerful mix, rich low-end from organ and bass, dynamic choir arrangements, call-and-response vocal production, soulful reverb, live church energy, building from testimony to celebration, joyful and full-bodied",
  },
  "christian modern": {
    bpm: "68-76",
    instruments: "electric guitar with dotted-eighth delay and ambient reverb, acoustic guitar, warm pad synths with slow attack, piano/keys, bass guitar with subtle drive, modern drums with room reverb and rimshot verses, atmospheric swells and risers, strings for emotional builds",
    production: "spacious and atmospheric mix with massive reverb tails, signature worship guitar tone (dotted-eighth delay, shimmer reverb, volume swells), dynamic range from whisper-quiet verses to wall-of-sound choruses, ambient pads filling the stereo field, drums that breathe in verses and drive in choruses, vocal clarity with intimate proximity effect, post-rock influenced builds and crescendos, the sound of a modern worship night",
  },
  "christian pop": {
    bpm: "110-130",
    instruments: "punchy pop drums with claps and snaps, layered synth pads and arpeggios, clean electric guitar with chorus effect, acoustic guitar strumming, bass guitar with pop groove, piano hooks, string accents for emotional moments, vocal harmonies and gang vocals in choruses",
    production: "polished mainstream pop production with faith-forward lyrics, radio-ready mix with bright vocal presence, punchy and compressed drums, wide stereo synths, catchy melodic hooks, sidechain compression for energy, big chorus production with layered vocals and harmonies, sounds like it belongs on both K-LOVE and mainstream pop radio, Lauren Daigle and for KING & COUNTRY level polish",
  },
};

const MOOD_PRODUCTION: Record<string, string> = {
  happy: "bright and uplifting energy, major key tonality, bouncy rhythm, sparkling high-end, wide open mix, feel-good groove",
  melancholic: "minor key tonality, spacious and sparse arrangement, gentle dynamics, intimate and close, aching beauty, slow decay on reverbs",
  energetic: "high energy, driving rhythm, punchy transients, compressed and loud, festival-ready impact, relentless momentum",
  calm: "gentle dynamics, soft attack on all instruments, spacious reverb, warm low-mids, breathing room, meditative pace",
  epic: "cinematic build from minimal to massive, layered arrangement, dramatic dynamics, orchestral swells, goosebump moments, triumphant resolution",
  romantic: "warm and intimate, lush harmonies, gentle groove, close vocal presence, candlelit atmosphere, tender and sensual",
  dark: "minor key, dissonant textures, heavy low-end, sparse and tense, shadows and edges, controlled menace, unsettling beauty",
  uplifting: "building energy, major key resolution, layered harmonies, anthemic crescendo, earned triumph, soaring finale",
  mysterious: "ambiguous tonality, unusual textures, space and silence, filtered sounds, dreamlike atmosphere, questions without answers",
  playful: "bouncy rhythm, bright tones, staccato elements, fun sound design, infectious groove, cheeky energy",
  devotional: "intimate and reverent, warm pads, gentle dynamics, spacious reverb, unhurried pace, prayerful atmosphere, soft piano and acoustic guitar, sustained strings",
  triumphant: "bold and victorious, major key resolution, powerful drums, brass fanfares, layered choir harmonies, building crescendo, anthem energy, celebratory and declarative",
};

/**
 * Builds a rich, production-quality prompt for ElevenLabs music generation.
 * Transforms simple user inputs into detailed production instructions
 * following ElevenLabs best practices for radio-ready output.
 */
// ─── Christian Genre Sonic Signatures ───
// These are appended to the production prompt when a Christian genre is selected,
// giving ElevenLabs very specific sonic direction that makes the output sound
// authentically like real Christian music rather than generic pop/rock with
// vaguely spiritual lyrics.

const CHRISTIAN_SONIC_SIGNATURES: Record<string, string> = {
  christian: `\nCHRISTIAN MUSIC SONIC IDENTITY: This must sound like authentic Contemporary Christian Music (CCM). Key sonic markers: (1) Warm, reverent atmosphere with spacious reverb — the listener should feel like they're in a worship space. (2) Acoustic guitar or piano-led foundation with layered electric guitar ambience. (3) Dynamics that mirror a worship service — intimate and quiet in verses, building to powerful, declarative choruses. (4) Vocal delivery should be sincere and heartfelt, not performative — think singing TO God, not about God. (5) Pad synths or strings sustaining underneath to create a continuous bed of warmth. (6) The overall feel should evoke hope, peace, and reverence — not generic pop energy. Reference sound: Chris Tomlin, Hillsong Worship, Lauren Daigle ballads.`,

  gospel: `\nGOSPEL MUSIC SONIC IDENTITY: This must sound like authentic Gospel music rooted in the Black church tradition. Key sonic markers: (1) Hammond B3 organ is ESSENTIAL — swirling Leslie speaker tone, sustained chords, and gospel organ runs. (2) Piano with gospel voicings — extended chords, runs between chord changes, call-and-response with the vocalist. (3) Drums with gospel chops — syncopated fills, ghost notes on snare, building intensity through the song. (4) Bass guitar with melodic gospel runs and walking lines, not just root notes. (5) Brass section (trumpet, trombone, sax) for punctuation and celebration moments. (6) Choir or vocal harmonies are critical — layered voices, ad-libs, "yes Lord" and "hallelujah" responses. (7) The energy should build like a church service — start with testimony, build to praise, crescendo into celebration. (8) Tambourine and hand claps on the backbeat. Reference sound: Kirk Franklin, Tasha Cobbs Leonard, Maverick City Music.`,

  "christian modern": `\nMODERN WORSHIP SONIC IDENTITY: This must sound like a modern worship night at Elevation Church or Bethel. Key sonic markers: (1) THE GUITAR TONE: Electric guitar with dotted-eighth-note delay (the "Edge" / "worship guitar" sound) — this is the #1 identifier of modern worship music. Shimmer reverb, volume swells, ambient picking patterns. (2) Atmospheric pads that never stop — warm analog-style synth pads sustaining underneath everything, creating a continuous sonic bed. (3) Drums that serve the song dynamics: rimshot and minimal kick in verses, full kit with room reverb in choruses, building tom fills into big moments. (4) Bass that's felt more than heard — deep, warm, following the root movement. (5) The BUILD is everything: songs should go from near-silence to massive walls of sound. (6) Vocal production: intimate and close in verses (like the singer is right next to you), then layered and powerful in choruses. (7) Bridge section should feel like spontaneous worship — simple repeated phrase building in layers and intensity. (8) Post-rock influenced crescendos with tremolo picking and delay swells. Reference sound: "Graves Into Gardens" (Elevation), "Goodness of God" (Bethel), Phil Wickham's "Battle Belongs".`,

  "christian pop": `\nCHRISTIAN POP SONIC IDENTITY: This must sound like it belongs on K-LOVE radio alongside mainstream pop hits. Key sonic markers: (1) Pop-forward production: punchy, compressed drums with claps/snaps, bright and present mix, catchy melodic hooks. (2) The production quality should be INDISTINGUISHABLE from mainstream pop — if you heard it on the radio, you wouldn't immediately know it's Christian until you listen to the lyrics. (3) Synth-driven with layered pads, arpeggiated patterns, and modern pop sound design. (4) Acoustic guitar as a texture element (strumming patterns, fingerpicking in verses) blended with electronic production. (5) Big, anthemic choruses with gang vocals, layered harmonies, and melodic hooks that stick in your head. (6) Lyrics should be hopeful and faith-inspired but use everyday language — coffee shops, highways, phone calls, real life. (7) Bridge should have an emotional lift — the "goosebump moment" where the message hits home. (8) Clean, bright, radio-ready mastering. Reference sound: Lauren Daigle "You Say", for KING & COUNTRY "God Only Knows", TobyMac, Casting Crowns "Nobody".`,
};

// Christian-specific arrangement templates that override the generic ones
const CHRISTIAN_ARRANGEMENTS: Record<string, Record<string, string>> = {
  christian: {
    short: `Arrangement: Gentle intro with piano or acoustic guitar → verse (intimate, prayerful) → chorus (lifting, declarative) → short outro with sustained pad.`,
    medium: `Arrangement: Atmospheric intro with pads and gentle guitar → verse 1 (intimate, personal prayer) → pre-chorus (building hope) → chorus (full band, declarative worship) → verse 2 (deeper, more vulnerable) → chorus 2 (bigger, add harmonies) → bridge (repeated declaration, building intensity) → final chorus (full congregation energy) → outro (gentle, reflective, fading pads).`,
    long: `Arrangement: Atmospheric intro building from silence (pads, distant guitar) → verse 1 (intimate, just voice and piano/guitar) → pre-chorus (adding layers) → chorus 1 (full band, worship energy) → verse 2 (fuller, adding strings) → chorus 2 (bigger, vocal harmonies) → bridge (stripped to voice and keys, then building — repeated simple phrase gaining intensity, adding layers one by one until massive) → final chorus (everything, maximum worship energy) → extended outro (spontaneous worship feel, fading into reverent silence).`,
  },
  gospel: {
    short: `Arrangement: Organ intro with gospel feel → verse (testimony, call-and-response) → chorus (full choir, celebratory) → tag ending with vocal runs.`,
    medium: `Arrangement: Organ/piano intro with gospel groove → verse 1 (testimony, building) → chorus (full choir, brass hits, celebration) → verse 2 (deeper testimony) → chorus 2 (bigger, more ad-libs) → bridge ("have church" moment — vocal runs, building intensity, spontaneous praise) → final chorus (maximum celebration, full choir and brass) → vamp outro with ad-libs and organ.`,
    long: `Arrangement: Slow organ intro building atmosphere → verse 1 (intimate testimony, piano and bass) → pre-chorus (choir enters softly) → chorus 1 (full band, choir, brass punctuation) → verse 2 (fuller, drums driving) → chorus 2 (bigger, more vocal runs) → bridge (breakdown — just organ and voice, then building layer by layer: bass, drums, choir, brass, until explosive praise) → final chorus (maximum energy, full gospel production, ad-libs flying) → extended vamp (repeated hook with spontaneous worship, vocal runs, gradually winding down).`,
  },
  "christian modern": {
    short: `Arrangement: Ambient pad intro with delayed guitar → verse (intimate, sparse) → chorus (full band, anthemic) → ambient outro.`,
    medium: `Arrangement: Atmospheric intro (pad swell, delayed guitar picking) → verse 1 (intimate — voice, acoustic guitar, soft pad) → pre-chorus (electric guitar enters with delay, building) → chorus (full band explosion, anthemic) → verse 2 (add bass, fuller) → chorus 2 (bigger, add vocal layers) → bridge (strip to voice and pad, simple repeated phrase building in intensity — add guitar, drums, bass one by one until massive crescendo) → final chorus (wall of sound, all instruments, layered vocals) → outro (delayed guitar fading into pad).`,
    long: `Arrangement: Extended atmospheric intro (ambient pads building from silence, distant delayed guitar notes) → verse 1 (whisper-close vocals, acoustic guitar, gentle pad) → pre-chorus (electric guitar swells, building anticipation) → chorus 1 (full band, anthemic worship) → post-chorus (instrumental, delayed guitar melody) → verse 2 (fuller, bass and light drums) → pre-chorus 2 (more intense build) → chorus 2 (bigger, vocal harmonies, gang vocals) → bridge (the worship moment — strip everything back to voice and keys, simple repeated declaration building for 16+ bars, adding instruments one by one: pad → guitar → bass → drums → strings → full band crescendo) → final chorus (maximum, wall of sound) → extended outro (ambient, fading delayed guitar and pads, reverent).`,
  },
  "christian pop": {
    short: `Arrangement: Catchy synth/guitar intro hook → verse (rhythmic, relatable) → chorus (big pop hook, singalong) → short outro.`,
    medium: `Arrangement: Hooky intro (synth riff or guitar pattern) → verse 1 (conversational, relatable story) → pre-chorus (lifting energy, building anticipation) → chorus (massive pop hook, layered vocals, claps) → verse 2 (deeper story, fuller production) → chorus 2 (bigger, add gang vocals) → bridge (emotional pivot — stripped back then building to goosebump moment) → final chorus (biggest, all harmonies, maximum energy) → outro (callback to intro hook).`,
    long: `Arrangement: Atmospheric intro building to hooky riff → verse 1 (intimate, storytelling) → pre-chorus (building hope) → chorus 1 (full pop production, catchy hook) → post-chorus (instrumental hook) → verse 2 (deeper, fuller) → pre-chorus 2 (more intense) → chorus 2 (bigger, gang vocals, harmonies) → bridge (emotional breakdown — quiet confession building to powerful declaration of faith) → final chorus (maximum pop energy, all layers, anthemic) → outro (reflective, fading with the hook).`,
  },
};

function getChristianArrangement(genre: string, duration: number): string | null {
  const key = genre.toLowerCase().trim();
  const templates = CHRISTIAN_ARRANGEMENTS[key];
  if (!templates) return null;
  if (duration <= 30) return templates.short;
  if (duration <= 90) return templates.medium;
  return templates.long;
}

export function buildProductionPrompt(params: {
  keywords: string;
  genre: string | null;
  mood: string | null;
  vocalType: string | null;
  duration: number;
  mode: string;
  customTitle?: string;
  customLyrics?: string;
  customStyle?: string;
}): { prompt: string; forceInstrumental: boolean } {
  const { keywords, genre, mood, vocalType, duration, mode, customTitle, customLyrics, customStyle } = params;

   let forceInstrumental = vocalType === "none";
  // Use Christian-specific arrangement if applicable, otherwise generic
  const christianArrangement = genre ? getChristianArrangement(genre, duration) : null;
  const arrangement = christianArrangement || getArrangementTemplate(duration);
  const genreLower = genre?.toLowerCase().trim() || "";
  const sonicSignature = CHRISTIAN_SONIC_SIGNATURES[genreLower] || "";

  if (mode === "custom" && customLyrics && customStyle) {
    // Custom Mode: build a detailed production prompt from lyrics + style + metadata
    const genreProd = genre ? GENRE_PRODUCTION[genre.toLowerCase()] : null;
    const moodProd = mood ? MOOD_PRODUCTION[mood.toLowerCase()] : null;

    let prompt = `Create a professionally produced, radio-ready song titled "${customTitle || "Untitled"}"`
    prompt += `\n\nStyle: ${customStyle}.`;

    if (genre) {
      prompt += ` Genre: ${genre}.`;
      if (genreProd) {
        prompt += ` Tempo: ${genreProd.bpm} BPM.`;
        prompt += ` Instrumentation: ${genreProd.instruments}.`;
        prompt += ` Production quality: ${genreProd.production}.`;
      }
    }

    if (mood) {
      prompt += ` Mood: ${mood}.`;
      if (moodProd) {
        prompt += ` Sonic character: ${moodProd}.`;
      }
    }

    if (vocalType && vocalType !== "none") {
      const vocalProd = VOCAL_PRODUCTION[vocalType] || VOCAL_PRODUCTION.male;
      prompt += `\nVocals: ${vocalProd}.`;
    } else if (forceInstrumental) {
      prompt += "\nInstrumental only — no vocals. Fill the vocal frequency range with melodic lead instruments, synth leads, or guitar melodies to maintain fullness.";
    }

    prompt += `\nDuration: ${duration} seconds.`;
    prompt += `\n\n${arrangement}`;
    prompt += `\n\nProduction notes: Professional mixing with clear separation between instruments. Use sidechain compression on bass elements against the kick. Apply parallel compression on drums for punch and sustain. Create width with stereo delays and panned elements. Use automation for dynamic builds — filter sweeps, volume rides, reverb throws on key phrases. ${MASTERING_CHAIN}`;
    // Inject Christian sonic signature for genre-authentic sound
    if (sonicSignature) prompt += sonicSignature;
    prompt += `\n\nLyrics:\n${customLyrics}`;

    return { prompt: prompt.substring(0, 4100), forceInstrumental };
  }

  // Simple Mode: transform keywords into a rich production prompt
  const genreProd = genre ? GENRE_PRODUCTION[genre.toLowerCase()] : null;
  const moodProd = mood ? MOOD_PRODUCTION[mood.toLowerCase()] : null;

  let prompt = `Create a professionally produced, radio-ready track: ${keywords}.`;

  if (genre) {
    prompt += `\n\nGenre: ${genre}.`;
    if (genreProd) {
      prompt += ` Tempo: ${genreProd.bpm} BPM.`;
      prompt += ` Core instrumentation: ${genreProd.instruments}.`;
      prompt += ` Production approach: ${genreProd.production}.`;
    }
  }

  if (mood) {
    prompt += `\nMood: ${mood}.`;
    if (moodProd) {
      prompt += ` Sonic character: ${moodProd}.`;
    }
  }

  if (forceInstrumental) {
    prompt += "\nInstrumental only — no vocals. Use melodic lead instruments to fill the vocal frequency range and maintain a full, rich arrangement.";
  } else if (vocalType) {
    const vocalProd = VOCAL_PRODUCTION[vocalType] || VOCAL_PRODUCTION.male;
    prompt += `\nVocals: ${vocalProd}.`;
  }

  prompt += `\nDuration: ${duration} seconds.`;
  prompt += `\n\n${arrangement}`;
  prompt += `\n\nProduction quality: Professional, radio-ready mix. Clear instrument separation with each element occupying its own frequency space. Punchy low-end with tight kick and sub bass. Crisp highs with shimmer and air. Warm, full mids. Use sidechain compression, parallel processing, and automation for dynamic movement. Build tension and release throughout the arrangement. ${MASTERING_CHAIN}`;
  // Inject Christian sonic signature for genre-authentic sound
  if (sonicSignature) prompt += sonicSignature;

  return { prompt: prompt.substring(0, 4100), forceInstrumental };
}
