import { describe, expect, it } from "vitest";
import { z } from "zod";
import { normalizeAudioMime } from "../shared/audioMime";

const uploadMime = z
  .object({
    fileName: z.string(),
    mimeType: z.string(),
  })
  .refine(
    (value) => normalizeAudioMime(value.mimeType, value.fileName) !== null,
    "Unsupported audio format"
  );

describe("normalizeAudioMime", () => {
  it("maps browser aliases to canonical types", () => {
    expect(normalizeAudioMime("audio/mp3", "song.mp3")).toBe("audio/mpeg");
    expect(normalizeAudioMime("audio/x-wav", "song.wav")).toBe("audio/wav");
    expect(normalizeAudioMime("audio/wave", "song.wav")).toBe("audio/wav");
    expect(normalizeAudioMime("audio/x-flac", "song.flac")).toBe("audio/flac");
    expect(normalizeAudioMime("Audio/MP3; charset=binary", "song.mp3")).toBe("audio/mpeg");
  });

  it("infers a canonical type from the extension when the browser type is empty or generic", () => {
    expect(normalizeAudioMime("", "tone.mp3")).toBe("audio/mpeg");
    expect(normalizeAudioMime("", "tone.wav")).toBe("audio/wav");
    expect(normalizeAudioMime("", "tone.flac")).toBe("audio/flac");
    expect(normalizeAudioMime("", "tone.ogg")).toBe("audio/ogg");
    expect(normalizeAudioMime("", "tone.aac")).toBe("audio/aac");
    expect(normalizeAudioMime("", "tone.mp4")).toBe("audio/mp4");
    expect(normalizeAudioMime("", "tone.aiff")).toBe("audio/aiff");
    expect(normalizeAudioMime("application/octet-stream", "clip.m4a")).toBe("audio/x-m4a");
  });

  it("keeps canonical types and rejects non-audio files", () => {
    expect(normalizeAudioMime("audio/mpeg", "song.mp3")).toBe("audio/mpeg");
    expect(normalizeAudioMime("audio/x-aiff", "song.aiff")).toBe("audio/x-aiff");
    expect(normalizeAudioMime("video/mp4", "clip.mp4")).toBeNull();
    expect(normalizeAudioMime("image/png", "cover.png")).toBeNull();
    expect(normalizeAudioMime("image/png", "song.mp3")).toBeNull();
    expect(normalizeAudioMime("text/plain", "notes.txt")).toBeNull();
    expect(normalizeAudioMime("", "notes.txt")).toBeNull();
  });

  it("accepts aliases through the upload schema and normalizes them", () => {
    const parsed = uploadMime.parse({ fileName: "tone.mp3", mimeType: "audio/mp3" });
    expect(normalizeAudioMime(parsed.mimeType, parsed.fileName)).toBe("audio/mpeg");
    expect(uploadMime.safeParse({ fileName: "notes.txt", mimeType: "text/plain" }).success).toBe(false);
    expect(uploadMime.safeParse({ fileName: "tone.wav", mimeType: "" }).success).toBe(true);
  });
});
