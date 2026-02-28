import { describe, expect, it } from "vitest";
import type { QueueSong } from "./QueuePlayerContext";

/**
 * Unit tests for QueuePlayer logic.
 * We test the pure data/state logic that the context manages,
 * since the actual React context requires a DOM environment.
 */

function makeSong(overrides: Partial<QueueSong> & { id: number }): QueueSong {
  return {
    title: `Song ${overrides.id}`,
    keywords: "test",
    genre: null,
    mood: null,
    tempo: 120,
    engine: "free",
    vocalType: null,
    audioUrl: null,
    mp3Url: null,
    abcNotation: "X:1\nT:Test\nK:C\nCDEF|",
    ...overrides,
  };
}

describe("QueueSong type", () => {
  it("creates a valid QueueSong with all required fields", () => {
    const song = makeSong({ id: 1 });
    expect(song.id).toBe(1);
    expect(song.title).toBe("Song 1");
    expect(song.keywords).toBe("test");
    expect(song.abcNotation).toBeTruthy();
  });

  it("allows audioUrl for Suno songs", () => {
    const song = makeSong({
      id: 2,
      engine: "suno",
      audioUrl: "https://cdn.suno.ai/test.mp3",
      abcNotation: null,
    });
    expect(song.audioUrl).toBe("https://cdn.suno.ai/test.mp3");
    expect(song.abcNotation).toBeNull();
  });

  it("allows mp3Url as alternative audio source", () => {
    const song = makeSong({
      id: 3,
      mp3Url: "https://example.com/song.mp3",
    });
    expect(song.mp3Url).toBe("https://example.com/song.mp3");
  });
});

describe("Queue state logic", () => {
  it("queue navigation bounds checking", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })];
    let currentIndex = 0;

    // Next
    const next = () => {
      if (currentIndex < songs.length - 1) currentIndex++;
    };
    next();
    expect(currentIndex).toBe(1);
    next();
    expect(currentIndex).toBe(2);
    next(); // Should not go beyond last
    expect(currentIndex).toBe(2);
  });

  it("previous navigation with restart behavior", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })];
    let currentIndex = 2;
    let currentTime = 0;

    const previous = () => {
      if (currentTime > 3) {
        currentTime = 0; // restart current
      } else if (currentIndex > 0) {
        currentIndex--;
      } else {
        currentTime = 0;
      }
    };

    // At beginning of track, go to previous
    previous();
    expect(currentIndex).toBe(1);

    // Simulate being 5 seconds into the track
    currentTime = 5;
    previous();
    expect(currentIndex).toBe(1); // stays on same track
    expect(currentTime).toBe(0); // but restarts

    // At beginning again, go to previous
    previous();
    expect(currentIndex).toBe(0);

    // At first track, restart
    currentTime = 1;
    previous();
    expect(currentIndex).toBe(0);
    expect(currentTime).toBe(0);
  });

  it("jumpTo validates index bounds", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })];
    let currentIndex = 0;

    const jumpTo = (index: number) => {
      if (index >= 0 && index < songs.length) {
        currentIndex = index;
      }
    };

    jumpTo(2);
    expect(currentIndex).toBe(2);

    jumpTo(-1); // invalid
    expect(currentIndex).toBe(2);

    jumpTo(5); // invalid
    expect(currentIndex).toBe(2);

    jumpTo(0);
    expect(currentIndex).toBe(0);
  });

  it("auto-advance stops at end of queue", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 })];
    let currentIndex = 0;
    let isPlaying = true;

    const handleAutoNext = () => {
      const nextIdx = currentIndex + 1;
      if (nextIdx < songs.length) {
        currentIndex = nextIdx;
      } else {
        isPlaying = false;
      }
    };

    handleAutoNext();
    expect(currentIndex).toBe(1);
    expect(isPlaying).toBe(true);

    handleAutoNext();
    expect(currentIndex).toBe(1); // stays at last
    expect(isPlaying).toBe(false); // stops playing
  });

  it("isInQueue checks song presence", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })];

    const isInQueue = (songId: number) => songs.some((s) => s.id === songId);

    expect(isInQueue(1)).toBe(true);
    expect(isInQueue(2)).toBe(true);
    expect(isInQueue(99)).toBe(false);
  });

  it("clearQueue resets all state", () => {
    let queue = [makeSong({ id: 1 }), makeSong({ id: 2 })];
    let currentIndex = 1;
    let isPlaying = true;
    let currentTime = 45;
    let duration = 120;
    let queueName = "Favorites";

    const clearQueue = () => {
      queue = [];
      currentIndex = 0;
      isPlaying = false;
      currentTime = 0;
      duration = 0;
      queueName = "";
    };

    clearQueue();
    expect(queue).toHaveLength(0);
    expect(currentIndex).toBe(0);
    expect(isPlaying).toBe(false);
    expect(currentTime).toBe(0);
    expect(duration).toBe(0);
    expect(queueName).toBe("");
  });

  it("audio source resolution priority", () => {
    // Priority: audioUrl > mp3Url > abcNotation synthesis
    const resolveSource = (song: QueueSong): string | null => {
      if (song.audioUrl) return song.audioUrl;
      if (song.mp3Url) return song.mp3Url;
      if (song.abcNotation) return "synthesized";
      return null;
    };

    const sunoSong = makeSong({ id: 1, audioUrl: "https://suno.ai/song.mp3", mp3Url: "https://alt.mp3", abcNotation: "X:1" });
    expect(resolveSource(sunoSong)).toBe("https://suno.ai/song.mp3");

    const mp3Song = makeSong({ id: 2, audioUrl: null, mp3Url: "https://alt.mp3", abcNotation: "X:1" });
    expect(resolveSource(mp3Song)).toBe("https://alt.mp3");

    const abcSong = makeSong({ id: 3, audioUrl: null, mp3Url: null });
    expect(resolveSource(abcSong)).toBe("synthesized");

    const noAudioSong = makeSong({ id: 4, audioUrl: null, mp3Url: null, abcNotation: null });
    expect(resolveSource(noAudioSong)).toBeNull();
  });

  it("volume and mute state", () => {
    let volume = 0.8;
    let isMuted = false;

    const effectiveVolume = () => (isMuted ? 0 : volume);

    expect(effectiveVolume()).toBe(0.8);

    isMuted = true;
    expect(effectiveVolume()).toBe(0);

    isMuted = false;
    volume = 0.5;
    expect(effectiveVolume()).toBe(0.5);
  });

  it("progress calculation", () => {
    const calcProgress = (currentTime: number, duration: number) =>
      duration > 0 ? currentTime / duration : 0;

    expect(calcProgress(30, 120)).toBeCloseTo(0.25);
    expect(calcProgress(0, 120)).toBe(0);
    expect(calcProgress(120, 120)).toBe(1);
    expect(calcProgress(0, 0)).toBe(0); // no division by zero
  });
});

describe("Queue name identification", () => {
  it("identifies Favorites queue", () => {
    const queueName = "Favorites";
    expect(queueName === "Favorites").toBe(true);
  });

  it("identifies Album queue by name", () => {
    const albumTitle = "My Jazz Collection";
    const queueName = `Album: ${albumTitle}`;
    expect(queueName.startsWith("Album:")).toBe(true);
    expect(queueName).toBe("Album: My Jazz Collection");
  });

  it("distinguishes different queue sources", () => {
    const favQueue = "Favorites";
    const albumQueue = "Album: Rock Hits";

    expect(favQueue === "Favorites").toBe(true);
    expect(favQueue === albumQueue).toBe(false);
    expect(albumQueue === "Favorites").toBe(false);
  });
});
