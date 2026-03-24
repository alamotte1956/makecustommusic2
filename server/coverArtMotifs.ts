/**
 * Genre-Specific Cover Art Visual Motifs
 *
 * Provides detailed visual direction for album/song cover art generation
 * based on genre. Christian sub-genres get highly specific motifs that
 * match the visual culture and aesthetic of each style.
 */

// ─── Christian Genre Cover Art Motifs ───

const CHRISTIAN_COVER_MOTIFS: Record<string, {
  style: string;
  palette: string;
  motifs: string;
  composition: string;
  avoid: string;
}> = {
  christian: {
    style: "modern worship aesthetic, clean and warm, contemporary Christian album art",
    palette: "warm golden tones, soft amber, cream, gentle sky blue, sunrise orange, white light",
    motifs: "golden light rays breaking through clouds, sunrise over rolling hills, modern minimalist cross silhouette, open sky with warm light, gentle lens flare, wheat fields in golden hour, dove in flight, still waters reflecting light",
    composition: "centered light source with radial glow, horizon line in lower third, expansive sky dominating the frame, sense of openness and peace, soft focus background with sharp light elements",
    avoid: "dark or gothic imagery, heavy textures, urban elements, neon colors",
  },
  gospel: {
    style: "vibrant and celebratory, rich and warm, classic gospel album art with soul and joy",
    palette: "deep royal purple, rich gold, warm burgundy, stained glass jewel tones (ruby, sapphire, emerald), radiant white light, amber glow",
    motifs: "ornate stained glass windows with light streaming through, church interior with golden light, raised hands in worship, gospel choir silhouettes, ornate cathedral arches, golden cross with radiating light, dove with olive branch, crown of glory",
    composition: "dramatic lighting from above, stained glass patterns framing the scene, warm light flooding from a central source, rich textures and depth, sense of grandeur and celebration, vertical orientation emphasizing height and majesty",
    avoid: "minimalist or sparse design, cold tones, modern tech aesthetic",
  },
  "christian modern": {
    style: "atmospheric and moody worship night aesthetic, Elevation Worship / Bethel album art style, cinematic",
    palette: "deep navy blue, dark teal, warm amber spotlights, soft purple haze, dark backgrounds with warm accent lights, subtle blue-gold contrast",
    motifs: "dark concert stage with atmospheric haze and spotlights, worship night ambiance with lens flares, silhouetted figure with arms raised against stage lights, abstract light trails and bokeh, misty mountain landscape at twilight, single candle flame in darkness, water reflections of light",
    composition: "dark background with strategic warm light sources, dramatic contrast between shadow and light, cinematic widescreen feel, atmospheric haze and depth, intimate yet expansive, moody and contemplative",
    avoid: "bright cheerful colors, cartoonish elements, busy patterns, daytime scenes",
  },
  "christian pop": {
    style: "bright, modern, and radio-friendly, clean graphic design, lifestyle-inspired, K-LOVE visual aesthetic",
    palette: "bright coral, sky blue, warm yellow, clean white, soft pink, mint green, fresh and vibrant pastels with bold accents",
    motifs: "abstract geometric patterns with warm colors, clean typography-inspired shapes, lifestyle photography aesthetic (coffee shops, open roads, golden hour portraits), colorful paint splashes, abstract watercolor washes, paper airplane, hot air balloon, wildflowers in sunlight",
    composition: "clean and uncluttered with bold color blocks, modern graphic design layout, centered subject with breathing room, Instagram-worthy aesthetic, bright and airy feel, playful but polished",
    avoid: "dark or moody tones, heavy religious symbolism, gothic elements, gritty textures",
  },
  "christian rock": {
    style: "dark and dramatic, arena rock energy, bold and intense, Winter Jam / Creation Festival poster aesthetic",
    palette: "deep charcoal, fiery red-orange, electric blue, stark white against black, molten gold accents, smoke gray",
    motifs: "dramatic lightning against dark sky, cracked earth with light breaking through, bold cross silhouette against fire or storm, arena stage with pyrotechnics, warrior shield and sword imagery, mountain peak with storm clouds, phoenix rising, chains breaking apart",
    composition: "high contrast with dramatic lighting, bold central imagery, dark backgrounds with intense accent colors, sense of power and movement, gritty textures and distressed edges, epic scale",
    avoid: "soft pastels, gentle imagery, minimalist design, cute or playful elements",
  },
  "christian hip hop": {
    style: "urban contemporary art, bold street-inspired design, modern hip hop album art with faith elements",
    palette: "bold primary colors against dark backgrounds, neon accents (electric blue, hot pink, lime green), concrete gray, gold chains aesthetic, deep black with vibrant pops",
    motifs: "urban cityscape with light breaking through buildings, graffiti-style art with cross or faith symbols, bold geometric patterns, city skyline at night with stars, street photography aesthetic, crown motif (King of Kings), lion imagery, concrete walls with light cracks",
    composition: "bold and graphic, strong geometric shapes, urban grid patterns, high contrast, street art influence, layered textures, collage-style elements, modern and edgy",
    avoid: "pastoral scenes, traditional church imagery, soft watercolors, vintage aesthetic",
  },
  "southern gospel": {
    style: "warm and nostalgic, Americana pastoral, Gaither Homecoming warmth, vintage-inspired",
    palette: "warm sepia tones, autumn gold, barn red, forest green, cream, sunset orange, honey amber, vintage warmth",
    motifs: "white country church with steeple against blue sky, rolling green hills with wildflowers, front porch with rocking chairs, old hymnal book, sunset over farmland, family gathering around piano, vintage microphone, dirt road leading to church, autumn leaves, wooden cross on hillside",
    composition: "warm and inviting, pastoral landscape with depth, golden hour lighting, nostalgic film grain texture, centered church or gathering scene, sense of home and community, wide landscape format",
    avoid: "modern tech aesthetic, urban imagery, dark or moody tones, abstract design",
  },
  hymns: {
    style: "timeless and reverent, cathedral beauty, illuminated manuscript aesthetic, classical sacred art",
    palette: "deep burgundy, midnight blue, antique gold, ivory, rich forest green, candlelight amber, parchment cream",
    motifs: "cathedral interior with soaring arches and stained glass, illuminated manuscript borders with gold leaf, pipe organ pipes reaching upward, open hymnal with musical notation, candlelit sanctuary, Celtic cross with intricate knotwork, ancient stone church, rose window, quill and parchment",
    composition: "vertical emphasis suggesting height and transcendence, ornate border framing, symmetrical and balanced, sense of timelessness and permanence, rich detail and texture, cathedral-like depth and grandeur",
    avoid: "modern or trendy elements, bright neon colors, casual or playful imagery, tech aesthetic",
  },
  "praise & worship": {
    style: "explosive energy, concert photography aesthetic, Hillsong / Passion Conference visual style, celebration",
    palette: "electric purple, hot magenta, golden yellow, bright white stage lights, sunset gradient (orange to purple), vibrant and saturated",
    motifs: "crowd with hands raised at concert, explosive stage lighting with beams cutting through haze, confetti and streamers, concert photography with motion blur, fireworks against night sky, sunrise explosion of color, dancing figures silhouetted against light, tambourine and clapping hands",
    composition: "dynamic and energetic, diagonal lines suggesting movement, crowd perspective looking toward stage, lens flares and light streaks, sense of massive scale and celebration, motion and energy in every element",
    avoid: "static or calm imagery, muted colors, minimalist design, somber tones",
  },
  "christian r&b": {
    style: "smooth and sophisticated, warm intimate lighting, elegant R&B album art with spiritual depth",
    palette: "warm rose gold, deep plum, soft lavender, midnight blue, warm amber, champagne gold, muted earth tones with luxurious accents",
    motifs: "smooth gradient washes of warm colors, intimate candlelit scene, elegant abstract curves and flowing shapes, silk or velvet textures, moonlight on water, single rose, gentle rain on window, warm interior lighting, piano keys in soft focus, saxophone silhouette",
    composition: "smooth flowing lines, warm and intimate framing, soft focus with selective sharpness, elegant negative space, sophisticated and understated, sense of warmth and closeness, portrait-style intimacy",
    avoid: "harsh or aggressive imagery, bright neon colors, gritty textures, busy or chaotic design",
  },
};

// ─── Non-Christian Genre Cover Art Styles ───

const GENRE_COVER_STYLES: Record<string, string> = {
  pop: "bright, colorful, modern pop aesthetic with clean design and bold visual impact",
  "hip hop": "bold urban art, high contrast, street-inspired with strong graphic elements",
  rock: "raw and powerful, dark with dramatic lighting, gritty textures and bold imagery",
  "r&b": "smooth and warm, intimate lighting, elegant and sophisticated design",
  electronic: "futuristic, neon-lit, geometric patterns, digital art aesthetic with glowing elements",
  country: "warm Americana, pastoral scenes, golden hour lighting, authentic and earthy",
  jazz: "smoky atmosphere, vintage feel, sophisticated and cool, classic album art style",
  classical: "elegant and refined, orchestral grandeur, timeless beauty, rich and detailed",
  ambient: "ethereal and dreamy, soft textures, vast landscapes, meditative and spacious",
  folk: "organic and handcrafted, earthy tones, nature imagery, warm and authentic",
  reggae: "vibrant tropical colors, sunshine energy, island vibes, warm and laid-back",
  blues: "raw and soulful, smoky atmosphere, vintage feel, deep emotion and grit",
};

/**
 * Builds a genre-aware cover art prompt for image generation.
 * Christian sub-genres get highly specific visual motifs; other genres
 * get appropriate style direction.
 */
export function buildCoverArtPrompt(params: {
  title: string;
  genres: string[];
  moods: string[];
  instruments?: string[];
  description?: string;
  keywords?: string;
  type: "song" | "album";
}): string {
  const { title, genres, moods, instruments, description, keywords, type } = params;
  const typeLabel = type === "album" ? "album cover art" : "single cover art";

  // Detect if any genre is a Christian sub-genre
  const christianGenre = genres.find(g => {
    const lower = g.toLowerCase().trim();
    return CHRISTIAN_COVER_MOTIFS[lower] !== undefined;
  });

  const genreStr = genres.length > 0 ? genres.join(", ") : "eclectic";
  const moodStr = moods.length > 0 ? moods.join(" and ") : "expressive";
  const instrumentStr = instruments && instruments.length > 0 ? instruments.slice(0, 5).join(", ") : "";

  let prompt: string;

  if (christianGenre) {
    const motif = CHRISTIAN_COVER_MOTIFS[christianGenre.toLowerCase().trim()];
    prompt = `Create a stunning, professional ${typeLabel} for "${title}". ` +
      `\n\nVISUAL STYLE: ${motif.style}. ` +
      `\nCOLOR PALETTE: ${motif.palette}. ` +
      `\nVISUAL MOTIFS: ${motif.motifs}. ` +
      `\nCOMPOSITION: ${motif.composition}. ` +
      `\nMUSIC CONTEXT: The music is ${genreStr} with a ${moodStr} atmosphere. ` +
      (instrumentStr ? `Featured instruments include ${instrumentStr}. ` : "") +
      (description ? `Description: ${description}. ` : "") +
      (keywords ? `Inspired by: ${keywords}. ` : "") +
      `\nAVOID: ${motif.avoid}. ` +
      `\nThe image must be square format, suitable as ${typeLabel}. ` +
      `No text, no typography, no letters, no words on the image. Professional quality, high detail, 4K resolution.`;
  } else {
    // Non-Christian genre — use style hint if available, otherwise generic
    const primaryGenre = genres[0]?.toLowerCase().trim() || "";
    const styleHint = GENRE_COVER_STYLES[primaryGenre] || "";

    prompt = `Create a stunning, professional ${typeLabel} for "${title}". ` +
      `The music style is ${genreStr} with a ${moodStr} atmosphere. ` +
      (styleHint ? `Visual style: ${styleHint}. ` : "") +
      (instrumentStr ? `Featured instruments include ${instrumentStr}. ` : "") +
      (description ? `Description: ${description}. ` : "") +
      (keywords ? `Inspired by: ${keywords}. ` : "") +
      `The design should be artistic, visually striking, and suitable as a square ${typeLabel}. ` +
      `Use rich colors, abstract or symbolic imagery that evokes the music's mood. ` +
      `No text or typography on the image. Professional quality, high detail.`;
  }

  return prompt;
}

/**
 * Checks if a genre string matches any Christian sub-genre.
 */
export function isChristianGenre(genre: string): boolean {
  return CHRISTIAN_COVER_MOTIFS[genre.toLowerCase().trim()] !== undefined;
}

/**
 * Returns the list of all supported Christian genre keys.
 */
export function getChristianGenreKeys(): string[] {
  return Object.keys(CHRISTIAN_COVER_MOTIFS);
}
