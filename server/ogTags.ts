import type { Express } from "express";
import { getSongByShareToken } from "./db";

const BASE_URL = "https://makecustommusic.com";
const DEFAULT_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663211654017/Q3oEbCsP6DUj527aoyypq7/logo-makecustommusic-V4H6NBVctSA5W9x5679fcE.webp";
const SITE_NAME = "Create Christian Music";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/**
 * Registers a middleware that intercepts /share/:token requests and injects
 * song-specific Open Graph and Twitter Card meta tags into the HTML template.
 * This ensures social media crawlers (which don't execute JavaScript) see
 * the correct title, description, and image for each shared song.
 */
export function registerOgTagsMiddleware(app: Express) {
  // This middleware must be registered BEFORE the Vite/static catch-all handler
  // It only handles /share/:token routes
  app.get("/share/:token", async (req, res, next) => {
    const token = req.params.token;
    if (!token) return next();

    try {
      const song = await getSongByShareToken(token);
      if (!song) return next();

      // Build description from available song metadata
      const descParts: string[] = [];
      if (song.genre) descParts.push(song.genre);
      if (song.mood) descParts.push(song.mood);
      if (song.vocalType && song.vocalType !== "none") descParts.push(`${song.vocalType} vocals`);
      if (song.tempo) descParts.push(`${song.tempo} BPM`);

      const description = descParts.length > 0
        ? `Listen to "${song.title}" — ${descParts.join(", ")}. Created with Create Christian Music.`
        : `Listen to "${song.title}" on Create Christian Music. AI-generated music you can download and share.`;

      const ogImage = song.imageUrl || DEFAULT_IMAGE;
      const ogUrl = `${BASE_URL}/share/${token}`;
      const ogTitle = escapeHtml(truncate(`${song.title} — ${SITE_NAME}`, 70));
      const ogDesc = escapeHtml(truncate(description, 160));

      // Build JSON-LD structured data for MusicRecording
      const jsonLd: Record<string, any> = {
        "@context": "https://schema.org",
        "@type": "MusicRecording",
        name: song.title,
        url: ogUrl,
        description: description,
        image: ogImage,
      };

      if (song.genre) {
        jsonLd.genre = song.genre;
      }
      if (song.duration) {
        // Convert seconds to ISO 8601 duration
        const mins = Math.floor(song.duration / 60);
        const secs = song.duration % 60;
        jsonLd.duration = `PT${mins}M${secs}S`;
      }
      if (song.audioUrl || song.mp3Url) {
        jsonLd.audio = {
          "@type": "AudioObject",
          contentUrl: song.audioUrl || song.mp3Url,
          encodingFormat: "audio/mpeg",
        };
      }
      if (song.keySignature) {
        jsonLd.musicalKey = song.keySignature;
      }
      if (song.tempo) {
        jsonLd.tempo = {
          "@type": "QuantitativeValue",
          value: song.tempo,
          unitText: "BPM",
        };
      }
      if (song.createdAt) {
        jsonLd.dateCreated = new Date(song.createdAt).toISOString();
      }
      // Creator is the platform itself for AI-generated music
      jsonLd.creator = {
        "@type": "Organization",
        name: SITE_NAME,
        url: BASE_URL,
      };

      // Store the OG data and JSON-LD in res.locals for the Vite/static handler to inject
      res.locals.ogTags = {
        title: ogTitle,
        description: ogDesc,
        image: ogImage,
        url: ogUrl,
        type: "music.song",
        jsonLd,
      };

      return next();
    } catch (err) {
      console.error("[OG Tags] Error fetching song for OG tags:", err);
      return next();
    }
  });
}

/**
 * Injects OG meta tags into the HTML template if res.locals.ogTags is set.
 * Call this function on the HTML string before sending it to the client.
 */
export function injectOgTags(html: string, ogTags?: {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  jsonLd?: Record<string, any>;
}): string {
  if (!ogTags) return html;

  const { title, description, image, url, type } = ogTags;

  // Replace existing OG tags in the <head>
  let result = html;

  // Replace <title>
  result = result.replace(
    /<title>[^<]*<\/title>/,
    `<title>${title}</title>`
  );

  // Replace meta name="title"
  result = result.replace(
    /<meta name="title" content="[^"]*" \/>/,
    `<meta name="title" content="${title}" />`
  );

  // Replace meta name="description"
  result = result.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${description}" />`
  );

  // Replace OG tags
  result = result.replace(
    /<meta property="og:type" content="[^"]*" \/>/,
    `<meta property="og:type" content="${type}" />`
  );
  result = result.replace(
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`
  );
  result = result.replace(
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${title}" />`
  );
  result = result.replace(
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${description}" />`
  );
  result = result.replace(
    /<meta property="og:image" content="[^"]*" \/>/,
    `<meta property="og:image" content="${image}" />`
  );

  // Replace Twitter Card tags
  result = result.replace(
    /<meta name="twitter:url" content="[^"]*" \/>/,
    `<meta name="twitter:url" content="${url}" />`
  );
  result = result.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  result = result.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${description}" />`
  );
  result = result.replace(
    /<meta name="twitter:image" content="[^"]*" \/>/,
    `<meta name="twitter:image" content="${image}" />`
  );

  // Replace canonical URL
  result = result.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`
  );

  // Inject JSON-LD structured data if available
  if (ogTags.jsonLd) {
    const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(ogTags.jsonLd)}</script>`;
    result = result.replace("</head>", `${jsonLdScript}\n</head>`);
  }

  return result;
}

/**
 * Builds a MusicRecording JSON-LD object from song data.
 * Exported for testing purposes.
 */
export function buildMusicRecordingJsonLd(song: {
  title: string;
  genre?: string | null;
  mood?: string | null;
  duration?: number | null;
  tempo?: number | null;
  keySignature?: string | null;
  audioUrl?: string | null;
  mp3Url?: string | null;
  imageUrl?: string | null;
  createdAt?: Date | string | null;
}, shareUrl: string): Record<string, any> {
  const jsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: song.title,
    url: shareUrl,
    image: song.imageUrl || DEFAULT_IMAGE,
  };

  if (song.genre) {
    jsonLd.genre = song.genre;
  }
  if (song.duration) {
    const mins = Math.floor(song.duration / 60);
    const secs = song.duration % 60;
    jsonLd.duration = `PT${mins}M${secs}S`;
  }
  if (song.audioUrl || song.mp3Url) {
    jsonLd.audio = {
      "@type": "AudioObject",
      contentUrl: song.audioUrl || song.mp3Url,
      encodingFormat: "audio/mpeg",
    };
  }
  if (song.keySignature) {
    jsonLd.musicalKey = song.keySignature;
  }
  if (song.tempo) {
    jsonLd.tempo = {
      "@type": "QuantitativeValue",
      value: song.tempo,
      unitText: "BPM",
    };
  }
  if (song.createdAt) {
    jsonLd.dateCreated = new Date(song.createdAt).toISOString();
  }
  jsonLd.creator = {
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
  };

  return jsonLd;
}
