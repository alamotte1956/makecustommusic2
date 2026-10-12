import { describe, expect, it } from "vitest";
import { normalizeAudioMime } from "../shared/audioMime";

describe("normalizeAudioMime", () => {
  it("maps browser aliases to canonical types", () => {
    expect(normalizeAudioMime("audio/mp3", "song.mp3")).toBe("audio/mpeg");
    expect(normalizeAudioMime("audio/x-wav", "song.wav")).toBe("audio/wav");
    expect(normalizeAudioMime("audio/wave", "song.wav")).toBe("audio/wav");
    expect(normalizeAudioMime("audio/x-flac", "song.flac")).toBe("audio/flac");
    expect(normalizeAudioMime("Audio/MP3; charset=binary", "song.mp3")).toBe("audio/mpeg");
  });

  it("infers a canonical type from the extension when the browser type is empty", () => {
    expect(normalizeAudioMime("", "tone.mp3")).toBe("audio/mpeg");
    expect(normalizeAudioMime("", "tone.wav")).toBe("audio/wav");
    expect(normalizeAudioMime("", "tone.flac")).toBe("audio/flac");
    expect(normalizeAudioMime("", "tone.ogg")).toBe("audio/ogg");
    expect(normalizeAudioMime("", "tone.aac")).toBe("audio/aac");
    expect(normalizeAudioMime("application/octet-stream", "clip.m4a")).toBe("audio/x-m4a");
  });

  it("keeps canonical types and rejects non-audio files", () => {
    expect(normalizeAudioMime("audio/mpeg", "song.mp3")).toBe("audio/mpeg");
    expect(normalizeAudioMime("audio/x-aiff", "song.aiff")).toBe("audio/x-aiff");
    expect(normalizeAudioMime("video/mp4", "clip.mp4")).toBeNull();
    expect(normalizeAudioMime("image/png", "cover.png")).toBeNull();
    expect(normalizeAudioMime("text/plain", "notes.txt")).toBeNull();
    expect(normalizeAudioMime("", "notes.txt")).toBeNull();
  });
});
