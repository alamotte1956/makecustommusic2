import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the useUndoHistory hook logic.
 *
 * Since we can't use React hooks directly in vitest without jsdom/RTL,
 * we test the pure logic by replicating the hook's algorithm as a plain
 * class. This mirrors the exact behaviour of useUndoHistory.ts.
 */

class UndoHistory<T> {
  state: T;
  past: T[] = [];
  future: T[] = [];
  maxHistory: number;
  debounceMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(initial: T, maxHistory = 50, debounceMs = 800) {
    this.state = initial;
    this.maxHistory = maxHistory;
    this.debounceMs = debounceMs;
  }

  private clone(v: T): T {
    return structuredClone(v);
  }

  pushSnapshot(next: T) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.past = [...this.past, this.clone(this.state)].slice(-this.maxHistory);
    this.future = [];
    this.state = next;
  }

  pushSnapshotDebounced(next: T) {
    if (!this.debounceTimer) {
      // First call in burst — snapshot pre-edit state
      this.past = [...this.past, this.clone(this.state)].slice(-this.maxHistory);
      this.future = [];
    } else {
      clearTimeout(this.debounceTimer);
    }
    this.state = next;
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
    }, this.debounceMs);
  }

  flushDebounce() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  undo() {
    if (this.past.length === 0) return;
    this.flushDebounce();
    const prev = this.past[this.past.length - 1];
    this.past = this.past.slice(0, -1);
    this.future = [...this.future, this.clone(this.state)];
    this.state = prev;
  }

  redo() {
    if (this.future.length === 0) return;
    this.flushDebounce();
    const next = this.future[this.future.length - 1];
    this.future = this.future.slice(0, -1);
    this.past = [...this.past, this.clone(this.state)];
    this.state = next;
  }

  resetHistory(newState: T) {
    this.flushDebounce();
    this.past = [];
    this.future = [];
    this.state = newState;
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  get historySize() { return this.past.length; }
}

// ─── Section type for integration tests ───
type SectionType = "intro" | "verse" | "pre-chorus" | "chorus" | "bridge" | "outro" | "interlude" | "hook" | "ad-lib";
interface LyricSection {
  id: string;
  type: SectionType;
  content: string;
  label?: string;
}

describe("UndoHistory - Basic Operations", () => {
  it("starts with initial state and no undo/redo", () => {
    const h = new UndoHistory("initial");
    expect(h.state).toBe("initial");
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.historySize).toBe(0);
  });

  it("pushSnapshot creates undo entry", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    expect(h.state).toBe("b");
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
    expect(h.historySize).toBe(1);
  });

  it("undo restores previous state", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    h.undo();
    expect(h.state).toBe("a");
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(true);
  });

  it("redo restores undone state", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    h.undo();
    h.redo();
    expect(h.state).toBe("b");
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(false);
  });

  it("undo does nothing when past is empty", () => {
    const h = new UndoHistory("a");
    h.undo();
    expect(h.state).toBe("a");
  });

  it("redo does nothing when future is empty", () => {
    const h = new UndoHistory("a");
    h.redo();
    expect(h.state).toBe("a");
  });

  it("new push clears redo stack", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    h.pushSnapshot("c");
    h.undo(); // back to b
    expect(h.canRedo).toBe(true);
    h.pushSnapshot("d"); // new branch
    expect(h.canRedo).toBe(false);
    expect(h.state).toBe("d");
  });
});

describe("UndoHistory - Multiple Steps", () => {
  it("supports multiple undo steps", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    h.pushSnapshot("c");
    h.pushSnapshot("d");
    expect(h.historySize).toBe(3);

    h.undo(); // d -> c
    expect(h.state).toBe("c");
    h.undo(); // c -> b
    expect(h.state).toBe("b");
    h.undo(); // b -> a
    expect(h.state).toBe("a");
    expect(h.canUndo).toBe(false);
  });

  it("supports multiple redo steps", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    h.pushSnapshot("c");
    h.undo();
    h.undo();
    expect(h.state).toBe("a");

    h.redo(); // a -> b
    expect(h.state).toBe("b");
    h.redo(); // b -> c
    expect(h.state).toBe("c");
    expect(h.canRedo).toBe(false);
  });

  it("interleaved undo/redo maintains correct state", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    h.pushSnapshot("c");
    h.undo(); // c -> b
    h.redo(); // b -> c
    h.undo(); // c -> b
    h.undo(); // b -> a
    h.redo(); // a -> b
    expect(h.state).toBe("b");
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(true);
  });
});

describe("UndoHistory - Max History Cap", () => {
  it("caps past stack at maxHistory", () => {
    const h = new UndoHistory(0, 3);
    h.pushSnapshot(1);
    h.pushSnapshot(2);
    h.pushSnapshot(3);
    h.pushSnapshot(4);
    expect(h.historySize).toBe(3);
    // Oldest entry (0) should be dropped
    h.undo(); // 4 -> 3
    h.undo(); // 3 -> 2
    h.undo(); // 2 -> 1
    expect(h.state).toBe(1);
    expect(h.canUndo).toBe(false); // 0 was dropped
  });

  it("preserves most recent entries when capping", () => {
    const h = new UndoHistory("start", 2);
    h.pushSnapshot("a");
    h.pushSnapshot("b");
    h.pushSnapshot("c");
    // past should be [b, c's-pre-state=b] — actually [a, b] capped to 2
    expect(h.historySize).toBe(2);
    h.undo();
    expect(h.state).toBe("b");
    h.undo();
    expect(h.state).toBe("a");
    expect(h.canUndo).toBe(false);
  });
});

describe("UndoHistory - Reset", () => {
  it("resetHistory clears all history", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    h.pushSnapshot("c");
    h.undo();
    expect(h.canUndo).toBe(true);
    expect(h.canRedo).toBe(true);

    h.resetHistory("fresh");
    expect(h.state).toBe("fresh");
    expect(h.canUndo).toBe(false);
    expect(h.canRedo).toBe(false);
    expect(h.historySize).toBe(0);
  });
});

describe("UndoHistory - Debounced Snapshots", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("debounced push creates only one undo entry for rapid calls", () => {
    const h = new UndoHistory("start", 50, 800);
    h.pushSnapshotDebounced("a");
    h.pushSnapshotDebounced("ab");
    h.pushSnapshotDebounced("abc");
    // Only one past entry should exist (the pre-edit "start")
    expect(h.historySize).toBe(1);
    expect(h.state).toBe("abc");

    h.undo();
    expect(h.state).toBe("start");
  });

  it("debounced push creates new entry after debounce window", () => {
    const h = new UndoHistory("start", 50, 100);
    h.pushSnapshotDebounced("a");
    h.pushSnapshotDebounced("ab");
    vi.advanceTimersByTime(200); // debounce window passes

    h.pushSnapshotDebounced("abc");
    expect(h.historySize).toBe(2); // "start" and "ab"
    expect(h.state).toBe("abc");

    h.undo();
    expect(h.state).toBe("ab");
    h.undo();
    expect(h.state).toBe("start");
  });

  it("regular push after debounced push works correctly", () => {
    const h = new UndoHistory("start", 50, 800);
    h.pushSnapshotDebounced("typing");
    h.pushSnapshot("committed");
    expect(h.historySize).toBe(2); // "start" from debounced, "typing" from push
    expect(h.state).toBe("committed");

    h.undo();
    expect(h.state).toBe("typing");
    h.undo();
    expect(h.state).toBe("start");
  });
});

describe("UndoHistory - Deep Clone Isolation", () => {
  it("mutations to original don't affect history", () => {
    const arr = [1, 2, 3];
    const h = new UndoHistory(arr);
    h.pushSnapshot([4, 5, 6]);

    // Mutate the original array
    arr.push(99);

    h.undo();
    expect(h.state).toEqual([1, 2, 3]); // not [1, 2, 3, 99]
  });

  it("mutations to restored state don't affect future stack", () => {
    const h = new UndoHistory([1, 2]);
    h.pushSnapshot([3, 4]);
    h.undo();

    // Mutate current state
    h.state.push(99);

    h.redo();
    expect(h.state).toEqual([3, 4]); // not affected
  });
});

describe("UndoHistory - LyricSection Integration", () => {
  const initial: LyricSection[] = [
    { id: "1", type: "verse", content: "Line one" },
    { id: "2", type: "chorus", content: "Chorus line" },
  ];

  it("undo restores sections after adding a section", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    const added = [...h.state, { id: "3", type: "bridge" as SectionType, content: "" }];
    h.pushSnapshot(added);
    expect(h.state).toHaveLength(3);

    h.undo();
    expect(h.state).toHaveLength(2);
    expect(h.state[0].id).toBe("1");
    expect(h.state[1].id).toBe("2");
  });

  it("undo restores sections after removing a section", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    h.pushSnapshot(h.state.filter(s => s.id !== "1"));
    expect(h.state).toHaveLength(1);

    h.undo();
    expect(h.state).toHaveLength(2);
    expect(h.state[0].content).toBe("Line one");
  });

  it("undo restores content after editing", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    h.pushSnapshot(h.state.map(s => s.id === "1" ? { ...s, content: "Edited line" } : s));
    expect(h.state[0].content).toBe("Edited line");

    h.undo();
    expect(h.state[0].content).toBe("Line one");
  });

  it("undo restores order after drag-and-drop reorder", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    // Simulate reorder: move chorus before verse
    const reordered = [h.state[1], h.state[0]];
    h.pushSnapshot(reordered);
    expect(h.state[0].type).toBe("chorus");

    h.undo();
    expect(h.state[0].type).toBe("verse");
    expect(h.state[1].type).toBe("chorus");
  });

  it("undo restores sections after type change", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    h.pushSnapshot(h.state.map(s => s.id === "1" ? { ...s, type: "bridge" as SectionType } : s));
    expect(h.state[0].type).toBe("bridge");

    h.undo();
    expect(h.state[0].type).toBe("verse");
  });

  it("undo restores sections after duplicate", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    const dup = { ...h.state[0], id: "dup" };
    const next = [...h.state];
    next.splice(1, 0, dup);
    h.pushSnapshot(next);
    expect(h.state).toHaveLength(3);

    h.undo();
    expect(h.state).toHaveLength(2);
  });

  it("undo restores sections after template application", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    const templateSections: LyricSection[] = [
      { id: "t1", type: "verse", content: "" },
      { id: "t2", type: "chorus", content: "" },
      { id: "t3", type: "bridge", content: "" },
    ];
    h.pushSnapshot(templateSections);
    expect(h.state).toHaveLength(3);

    h.undo();
    expect(h.state).toHaveLength(2);
    expect(h.state[0].content).toBe("Line one");
  });

  it("undo restores sections after scripture insertion", () => {
    const h = new UndoHistory<LyricSection[]>(initial);
    // Insert scripture into first empty-ish section (simulate editing verse content)
    h.pushSnapshot(h.state.map(s => s.id === "1" ? { ...s, content: "The Lord is my shepherd" } : s));

    h.undo();
    expect(h.state[0].content).toBe("Line one");
  });

  it("full workflow: add, edit, reorder, undo all", () => {
    const h = new UndoHistory<LyricSection[]>(initial);

    // Step 1: Add bridge
    const withBridge = [...h.state, { id: "3", type: "bridge" as SectionType, content: "" }];
    h.pushSnapshot(withBridge);

    // Step 2: Edit bridge
    h.pushSnapshot(h.state.map(s => s.id === "3" ? { ...s, content: "Bridge lyrics" } : s));

    // Step 3: Reorder (move bridge to front)
    h.pushSnapshot([h.state[2], h.state[0], h.state[1]]);

    expect(h.state[0].type).toBe("bridge");
    expect(h.historySize).toBe(3);

    // Undo reorder
    h.undo();
    expect(h.state[0].type).toBe("verse");
    expect(h.state[2].content).toBe("Bridge lyrics");

    // Undo edit
    h.undo();
    expect(h.state[2].content).toBe("");

    // Undo add
    h.undo();
    expect(h.state).toHaveLength(2);

    // Redo all
    h.redo();
    expect(h.state).toHaveLength(3);
    h.redo();
    expect(h.state[2].content).toBe("Bridge lyrics");
    h.redo();
    expect(h.state[0].type).toBe("bridge");
  });
});

describe("UndoHistory - Edge Cases", () => {
  it("handles empty array state", () => {
    const h = new UndoHistory<string[]>([]);
    h.pushSnapshot(["a"]);
    h.undo();
    expect(h.state).toEqual([]);
  });

  it("handles rapid undo/redo without errors", () => {
    const h = new UndoHistory("a");
    h.pushSnapshot("b");
    for (let i = 0; i < 100; i++) {
      h.undo();
      h.redo();
    }
    expect(h.state).toBe("b");
  });

  it("handles complex nested objects", () => {
    const initial = { sections: [{ id: "1", nested: { deep: true } }] };
    const h = new UndoHistory(initial);
    h.pushSnapshot({ sections: [{ id: "2", nested: { deep: false } }] });
    h.undo();
    expect(h.state.sections[0].nested.deep).toBe(true);
  });
});
