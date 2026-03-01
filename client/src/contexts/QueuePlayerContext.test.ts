import { describe, expect, it } from "vitest";
import { shuffleIndices, type QueueSong } from "./QueuePlayerContext";

/**
 * Unit tests for QueuePlayer logic including shuffle.
 * We test the pure data/state logic that the context manages.
 */

function makeSong(overrides: Partial<QueueSong> & { id: number }): QueueSong {
  return {
    title: `Song ${overrides.id}`,
    keywords: "test",
    genre: null,
    mood: null,
    tempo: 120,
    engine: "elevenlabs",
    vocalType: null,
    audioUrl: "https://example.com/test.mp3",
    mp3Url: null,
    ...overrides,
  };
}

describe("QueueSong type", () => {
  it("creates a valid QueueSong with all required fields", () => {
    const song = makeSong({ id: 1 });
    expect(song.id).toBe(1);
    expect(song.title).toBe("Song 1");
    expect(song.keywords).toBe("test");
    expect(song.audioUrl).toBeTruthy();
  });

  it("allows audioUrl for ElevenLabs songs", () => {
    const song = makeSong({
      id: 2,
      engine: "elevenlabs",
      audioUrl: "https://example.com/test.mp3",
    });
    expect(song.audioUrl).toBe("https://example.com/test.mp3");
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

    const next = () => {
      if (currentIndex < songs.length - 1) currentIndex++;
    };
    next();
    expect(currentIndex).toBe(1);
    next();
    expect(currentIndex).toBe(2);
    next();
    expect(currentIndex).toBe(2);
  });

  it("previous navigation with restart behavior", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })];
    let currentIndex = 2;
    let currentTime = 0;

    const previous = () => {
      if (currentTime > 3) {
        currentTime = 0;
      } else if (currentIndex > 0) {
        currentIndex--;
      } else {
        currentTime = 0;
      }
    };

    previous();
    expect(currentIndex).toBe(1);

    currentTime = 5;
    previous();
    expect(currentIndex).toBe(1);
    expect(currentTime).toBe(0);

    previous();
    expect(currentIndex).toBe(0);

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

    jumpTo(-1);
    expect(currentIndex).toBe(2);

    jumpTo(5);
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
    expect(currentIndex).toBe(1);
    expect(isPlaying).toBe(false);
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
    let isShuffled = true;
    let playOrder = [1, 0];
    let playOrderPosition = 1;

    const clearQueue = () => {
      queue = [];
      currentIndex = 0;
      isPlaying = false;
      currentTime = 0;
      duration = 0;
      queueName = "";
      isShuffled = false;
      playOrder = [];
      playOrderPosition = 0;
    };

    clearQueue();
    expect(queue).toHaveLength(0);
    expect(currentIndex).toBe(0);
    expect(isPlaying).toBe(false);
    expect(currentTime).toBe(0);
    expect(duration).toBe(0);
    expect(queueName).toBe("");
    expect(isShuffled).toBe(false);
    expect(playOrder).toHaveLength(0);
    expect(playOrderPosition).toBe(0);
  });

  it("audio source resolution priority", () => {
    const resolveSource = (song: QueueSong): string | null => {
      if (song.audioUrl) return song.audioUrl;
      if (song.mp3Url) return song.mp3Url;
      return null;
    };

    const elSong = makeSong({ id: 1, audioUrl: "https://example.com/song.mp3", mp3Url: "https://alt.mp3" });
    expect(resolveSource(elSong)).toBe("https://example.com/song.mp3");

    const mp3Song = makeSong({ id: 2, audioUrl: null, mp3Url: "https://alt.mp3" });
    expect(resolveSource(mp3Song)).toBe("https://alt.mp3");

    const noAudioSong = makeSong({ id: 4, audioUrl: null, mp3Url: null });
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
    expect(calcProgress(0, 0)).toBe(0);
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

describe("shuffleIndices", () => {
  it("returns an array of the correct length", () => {
    const result = shuffleIndices(5);
    expect(result).toHaveLength(5);
  });

  it("contains all indices from 0 to n-1", () => {
    const result = shuffleIndices(10);
    const sorted = [...result].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("places the current index at position 0 when provided", () => {
    const result = shuffleIndices(8, 5);
    expect(result[0]).toBe(5);
    // Still contains all indices
    const sorted = [...result].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("handles single-element queue", () => {
    const result = shuffleIndices(1, 0);
    expect(result).toEqual([0]);
  });

  it("handles two-element queue", () => {
    const result = shuffleIndices(2, 0);
    expect(result[0]).toBe(0);
    expect(result).toHaveLength(2);
    expect(new Set(result).size).toBe(2);
  });

  it("handles edge case where currentQueueIndex is 0", () => {
    const result = shuffleIndices(5, 0);
    expect(result[0]).toBe(0);
    expect(new Set(result).size).toBe(5);
  });

  it("produces no duplicates", () => {
    const result = shuffleIndices(20);
    expect(new Set(result).size).toBe(20);
  });

  it("handles large queue", () => {
    const result = shuffleIndices(100, 42);
    expect(result[0]).toBe(42);
    expect(result).toHaveLength(100);
    expect(new Set(result).size).toBe(100);
  });
});

describe("Shuffle-aware navigation", () => {
  it("next follows shuffled play order", () => {
    const playOrder = [3, 1, 4, 0, 2]; // shuffled order
    let playOrderPosition = 0;
    let currentIndex = playOrder[0]; // song 3

    const next = () => {
      const nextPos = playOrderPosition + 1;
      if (nextPos < playOrder.length) {
        playOrderPosition = nextPos;
        currentIndex = playOrder[nextPos];
      }
    };

    expect(currentIndex).toBe(3);
    next();
    expect(currentIndex).toBe(1);
    expect(playOrderPosition).toBe(1);
    next();
    expect(currentIndex).toBe(4);
    expect(playOrderPosition).toBe(2);
  });

  it("previous follows shuffled play order backwards", () => {
    const playOrder = [3, 1, 4, 0, 2];
    let playOrderPosition = 3;
    let currentIndex = playOrder[3]; // song 0
    let currentTime = 0;

    const previous = () => {
      if (currentTime > 3) {
        currentTime = 0;
      } else if (playOrderPosition > 0) {
        playOrderPosition--;
        currentIndex = playOrder[playOrderPosition];
      } else {
        currentTime = 0;
      }
    };

    expect(currentIndex).toBe(0);
    previous();
    expect(currentIndex).toBe(4);
    expect(playOrderPosition).toBe(2);
    previous();
    expect(currentIndex).toBe(1);
    expect(playOrderPosition).toBe(1);
  });

  it("auto-advance follows shuffled order and stops at end", () => {
    const playOrder = [2, 0, 1];
    let playOrderPosition = 0;
    let currentIndex = playOrder[0]; // song 2
    let isPlaying = true;

    const autoNext = () => {
      const nextPos = playOrderPosition + 1;
      if (nextPos < playOrder.length) {
        playOrderPosition = nextPos;
        currentIndex = playOrder[nextPos];
      } else {
        isPlaying = false;
      }
    };

    autoNext();
    expect(currentIndex).toBe(0);
    expect(isPlaying).toBe(true);

    autoNext();
    expect(currentIndex).toBe(1);
    expect(isPlaying).toBe(true);

    autoNext();
    expect(currentIndex).toBe(1);
    expect(isPlaying).toBe(false);
  });

  it("jumpTo updates playOrderPosition correctly", () => {
    const playOrder = [3, 1, 4, 0, 2];
    let playOrderPosition = 0;
    let currentIndex = playOrder[0];

    const jumpTo = (index: number) => {
      currentIndex = index;
      const pos = playOrder.indexOf(index);
      if (pos >= 0) {
        playOrderPosition = pos;
      }
    };

    jumpTo(4); // song 4 is at position 2 in play order
    expect(currentIndex).toBe(4);
    expect(playOrderPosition).toBe(2);

    jumpTo(0); // song 0 is at position 3
    expect(currentIndex).toBe(0);
    expect(playOrderPosition).toBe(3);
  });

  it("toggle shuffle preserves current song at position 0", () => {
    const queueLength = 5;
    let currentIndex = 2;
    let isShuffled = false;

    // Toggle ON
    isShuffled = true;
    const shuffled = shuffleIndices(queueLength, currentIndex);
    expect(shuffled[0]).toBe(currentIndex);
    expect(shuffled).toHaveLength(queueLength);
    expect(new Set(shuffled).size).toBe(queueLength);

    // Toggle OFF
    isShuffled = false;
    const sequential = Array.from({ length: queueLength }, (_, i) => i);
    expect(sequential).toEqual([0, 1, 2, 3, 4]);
    const seqPos = sequential.indexOf(currentIndex);
    expect(seqPos).toBe(2);
  });

  it("loadQueue with shuffle creates shuffled order", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 }), makeSong({ id: 4 })];
    const startIndex = 1;
    const isShuffled = true;

    let playOrder: number[];
    let playOrderPosition: number;

    if (isShuffled) {
      playOrder = shuffleIndices(songs.length, startIndex);
      playOrderPosition = 0;
    } else {
      playOrder = Array.from({ length: songs.length }, (_, i) => i);
      playOrderPosition = startIndex;
    }

    expect(playOrder[0]).toBe(startIndex);
    expect(playOrder).toHaveLength(songs.length);
    expect(playOrderPosition).toBe(0);
  });

  it("loadQueue without shuffle creates sequential order", () => {
    const songs = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 })];
    const startIndex = 2;
    const isShuffled = false;

    let playOrder: number[];
    let playOrderPosition: number;

    if (isShuffled) {
      playOrder = shuffleIndices(songs.length, startIndex);
      playOrderPosition = 0;
    } else {
      playOrder = Array.from({ length: songs.length }, (_, i) => i);
      playOrderPosition = startIndex;
    }

    expect(playOrder).toEqual([0, 1, 2]);
    expect(playOrderPosition).toBe(2);
  });
});
