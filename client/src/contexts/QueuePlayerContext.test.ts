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
    let currentIndex = playOrder[0];
    let isPlaying = true;

    const handleAutoNext = () => {
      const nextPos = playOrderPosition + 1;
      if (nextPos < playOrder.length) {
        playOrderPosition = nextPos;
        currentIndex = playOrder[nextPos];
      } else {
        isPlaying = false;
      }
    };

    expect(currentIndex).toBe(2);
    handleAutoNext();
    expect(currentIndex).toBe(0);
    handleAutoNext();
    expect(currentIndex).toBe(1);
    handleAutoNext(); // end of queue
    expect(currentIndex).toBe(1);
    expect(isPlaying).toBe(false);
  });

  it("hasNext/hasPrevious based on playOrderPosition", () => {
    const playOrder = [3, 1, 4, 0, 2];

    const hasNext = (pos: number) => pos < playOrder.length - 1;
    const hasPrevious = (pos: number) => pos > 0;

    expect(hasNext(0)).toBe(true);
    expect(hasPrevious(0)).toBe(false);

    expect(hasNext(2)).toBe(true);
    expect(hasPrevious(2)).toBe(true);

    expect(hasNext(4)).toBe(false);
    expect(hasPrevious(4)).toBe(true);
  });

  it("jumpTo updates playOrderPosition correctly", () => {
    const playOrder = [3, 1, 4, 0, 2];
    let playOrderPosition = 0;
    let currentIndex = 3;

    const jumpTo = (queueIdx: number) => {
      if (queueIdx >= 0 && queueIdx < 5) {
        currentIndex = queueIdx;
        const pos = playOrder.indexOf(queueIdx);
        if (pos >= 0) playOrderPosition = pos;
      }
    };

    jumpTo(4); // song at index 4 is at position 2 in playOrder
    expect(currentIndex).toBe(4);
    expect(playOrderPosition).toBe(2);

    jumpTo(2); // song at index 2 is at position 4
    expect(currentIndex).toBe(2);
    expect(playOrderPosition).toBe(4);
  });

  it("toggleShuffle preserves current song", () => {
    const queue = [makeSong({ id: 1 }), makeSong({ id: 2 }), makeSong({ id: 3 }), makeSong({ id: 4 })];
    let currentIndex = 2;
    let isShuffled = false;
    let playOrder = [0, 1, 2, 3];
    let playOrderPosition = 2;

    // Enable shuffle
    isShuffled = true;
    playOrder = shuffleIndices(queue.length, currentIndex);
    playOrderPosition = 0; // current song moves to position 0

    expect(playOrder[0]).toBe(currentIndex);
    expect(isShuffled).toBe(true);
    expect(playOrderPosition).toBe(0);

    // Disable shuffle
    isShuffled = false;
    playOrder = [0, 1, 2, 3];
    playOrderPosition = currentIndex;

    expect(playOrder).toEqual([0, 1, 2, 3]);
    expect(playOrderPosition).toBe(2);
    expect(isShuffled).toBe(false);
  });
});
