/** Canonical audio types accepted by song upload. */
export const CANONICAL_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/flac",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/aiff",
  "audio/x-aiff",
] as const;

export type CanonicalAudioMime = (typeof CANONICAL_AUDIO_MIME_TYPES)[number];

const CANONICAL = new Set<string>(CANONICAL_AUDIO_MIME_TYPES);

/**
 * Types browsers report instead of the canonical MIME.
 * `audio/mp3`, `audio/x-wav`, and `audio/wave` are the common ones.
 */
const MIME_ALIASES: Record<string, CanonicalAudioMime> = {
  "audio/mp3": "audio/mpeg",
  "audio/x-mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-mpeg-3": "audio/mpeg",
  "audio/x-wav": "audio/wav",
  "audio/wave": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/x-pn-wav": "audio/wav",
  "audio/x-flac": "audio/flac",
  "audio/x-ogg": "audio/ogg",
  "application/ogg": "audio/ogg",
  "audio/m4a": "audio/x-m4a",
  "audio/x-aac": "audio/aac",
  "audio/aacp": "audio/aac",
  "audio/mp4a-latm": "audio/aac",
  "audio/aifc": "audio/aiff",
  "audio/aif": "audio/aiff",
};

const EXTENSION_MIME: Record<string, CanonicalAudioMime> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  wave: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  aac: "audio/aac",
  m4a: "audio/x-m4a",
  mp4: "audio/mp4",
  aiff: "audio/aiff",
  aif: "audio/aiff",
};

const GENERIC_MIME = new Set([
  "",
  "application/octet-stream",
  "application/octet",
  "binary/octet-stream",
  "application/binary",
]);

function baseMime(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function audioMimeFromFileName(fileName: string): CanonicalAudioMime | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  if (!match) return null;
  return EXTENSION_MIME[match[1].toLowerCase()] ?? null;
}

/**
 * Map a browser-reported type, or a known audio extension, to a canonical MIME.
 * Extension is used when the type is empty, generic, or an unrecognized audio type.
 * Returns null when the file should be rejected.
 */
export function normalizeAudioMime(mimeType: string, fileName = ""): CanonicalAudioMime | null {
  const raw = baseMime(mimeType || "");
  if (CANONICAL.has(raw)) return raw as CanonicalAudioMime;
  const alias = MIME_ALIASES[raw];
  if (alias) return alias;

  const fromExt = audioMimeFromFileName(fileName);
  if (!fromExt) return null;
  if (GENERIC_MIME.has(raw) || raw.startsWith("audio/")) return fromExt;
  return null;
}
