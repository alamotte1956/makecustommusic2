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
};

/**
 * Builds a rich, production-quality prompt for ElevenLabs music generation.
 * Transforms simple user inputs into detailed production instructions
 * following ElevenLabs best practices for radio-ready output.
 */
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
  const arrangement = getArrangementTemplate(duration);

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

  return { prompt: prompt.substring(0, 4100), forceInstrumental };
}
