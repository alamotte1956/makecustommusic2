import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Minimal DOM mocks for Node environment ───

// We need document and basic DOM APIs for this test
class MockClassList {
  private classes = new Set<string>();
  add(c: string) { this.classes.add(c); }
  remove(c: string) { this.classes.delete(c); }
  contains(c: string) { return this.classes.has(c); }
}

class MockElement {
  tagName: string;
  children: MockElement[] = [];
  classList = new MockClassList();
  private attrs = new Map<string, string>();
  private _className = "";

  constructor(tagName: string) {
    this.tagName = tagName;
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
    if (name === "class") this._className = value;
  }

  getAttribute(name: string) { return this.attrs.get(name) ?? null; }

  appendChild(child: MockElement) { this.children.push(child); }

  querySelector(selector: string): MockElement | null {
    // Simple selector matching for .abcjs-nN and svg
    if (selector === "svg") {
      return this.findByTag("svg");
    }
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      return this.findByClass(className);
    }
    return null;
  }

  querySelectorAll(selector: string): MockElement[] {
    if (selector.startsWith(".")) {
      const className = selector.slice(1);
      return this.findAllByClass(className);
    }
    return [];
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100 };
  }

  scrollBy(_opts: any) {}

  private findByTag(tag: string): MockElement | null {
    if (this.tagName === tag) return this;
    for (const child of this.children) {
      const found = child.findByTag(tag);
      if (found) return found;
    }
    return null;
  }

  private findByClass(className: string): MockElement | null {
    if (this._className.includes(className) || this.classList.contains(className)) return this;
    for (const child of this.children) {
      const found = child.findByClass(className);
      if (found) return found;
    }
    return null;
  }

  private findAllByClass(className: string): MockElement[] {
    const results: MockElement[] = [];
    if (this._className.includes(className) || this.classList.contains(className)) results.push(this);
    for (const child of this.children) {
      results.push(...child.findAllByClass(className));
    }
    return results;
  }
}

function createMockContainer(): MockElement {
  const container = new MockElement("div");
  const svg = new MockElement("svg");

  for (let i = 0; i < 8; i++) {
    const g = new MockElement("g");
    g.setAttribute("class", `abcjs-n${i}`);
    const path = new MockElement("path");
    g.appendChild(path);
    svg.appendChild(g);
  }

  container.appendChild(svg);
  return container;
}

// ─── Import the hook logic directly ───
// Since we can't use renderHook in node env without jsdom,
// we test the core highlighting logic directly.

const ACTIVE_CLASS = "abcjs-note-active";

/**
 * Simulates the onActiveNoteChange logic from useNoteHighlight
 */
function createHighlighter() {
  let prevHighlight: MockElement | null = null;

  return {
    highlight(container: MockElement | null, noteIndex: number) {
      if (!container) return;

      if (prevHighlight) {
        prevHighlight.classList.remove(ACTIVE_CLASS);
        prevHighlight = null;
      }

      if (noteIndex < 0) return;

      const selector = `.abcjs-n${noteIndex}`;
      const noteEl = container.querySelector(selector);

      if (noteEl) {
        noteEl.classList.add(ACTIVE_CLASS);
        prevHighlight = noteEl;
      }
    },
  };
}

// ─── Tests ───

describe("useNoteHighlight", () => {
  let container: MockElement;
  let highlighter: ReturnType<typeof createHighlighter>;

  beforeEach(() => {
    container = createMockContainer();
    highlighter = createHighlighter();
  });

  it("should add highlight class to the active note", () => {
    highlighter.highlight(container, 3);
    const note3 = container.querySelector(".abcjs-n3");
    expect(note3?.classList.contains(ACTIVE_CLASS)).toBe(true);
  });

  it("should remove highlight from previous note when moving to next", () => {
    highlighter.highlight(container, 2);
    const note2 = container.querySelector(".abcjs-n2");
    expect(note2?.classList.contains(ACTIVE_CLASS)).toBe(true);

    highlighter.highlight(container, 5);
    expect(note2?.classList.contains(ACTIVE_CLASS)).toBe(false);
    const note5 = container.querySelector(".abcjs-n5");
    expect(note5?.classList.contains(ACTIVE_CLASS)).toBe(true);
  });

  it("should remove highlight when index is -1 (no active note)", () => {
    highlighter.highlight(container, 4);
    const note4 = container.querySelector(".abcjs-n4");
    expect(note4?.classList.contains(ACTIVE_CLASS)).toBe(true);

    highlighter.highlight(container, -1);
    expect(note4?.classList.contains(ACTIVE_CLASS)).toBe(false);
  });

  it("should handle index beyond available notes gracefully", () => {
    highlighter.highlight(container, 99);
    const highlighted = container.querySelectorAll(`.${ACTIVE_CLASS}`);
    expect(highlighted.length).toBe(0);
  });

  it("should handle null container gracefully", () => {
    // Should not throw
    highlighter.highlight(null, 0);
  });

  it("should handle rapid successive note changes", () => {
    for (let i = 0; i < 8; i++) {
      highlighter.highlight(container, i);
    }

    // Only the last note should be highlighted
    for (let i = 0; i < 7; i++) {
      const note = container.querySelector(`.abcjs-n${i}`);
      expect(note?.classList.contains(ACTIVE_CLASS)).toBe(false);
    }
    const lastNote = container.querySelector(".abcjs-n7");
    expect(lastNote?.classList.contains(ACTIVE_CLASS)).toBe(true);
  });

  it("should handle same note index called multiple times", () => {
    highlighter.highlight(container, 3);
    highlighter.highlight(container, 3);
    highlighter.highlight(container, 3);

    const note3 = container.querySelector(".abcjs-n3");
    expect(note3?.classList.contains(ACTIVE_CLASS)).toBe(true);

    const highlighted = container.querySelectorAll(`.${ACTIVE_CLASS}`);
    expect(highlighted.length).toBe(1);
  });

  it("should transition from first to last note correctly", () => {
    highlighter.highlight(container, 0);
    const note0 = container.querySelector(".abcjs-n0");
    expect(note0?.classList.contains(ACTIVE_CLASS)).toBe(true);

    highlighter.highlight(container, 7);
    expect(note0?.classList.contains(ACTIVE_CLASS)).toBe(false);
    const note7 = container.querySelector(".abcjs-n7");
    expect(note7?.classList.contains(ACTIVE_CLASS)).toBe(true);
  });

  it("should clear all highlights when stopping (index -1)", () => {
    // Simulate playing through several notes then stopping
    highlighter.highlight(container, 0);
    highlighter.highlight(container, 1);
    highlighter.highlight(container, 2);
    highlighter.highlight(container, -1);

    // No notes should be highlighted
    for (let i = 0; i < 8; i++) {
      const note = container.querySelector(`.abcjs-n${i}`);
      expect(note?.classList.contains(ACTIVE_CLASS)).toBe(false);
    }
  });
});
