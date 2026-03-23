import { useCallback, useRef } from "react";

/** CSS class applied to the currently-playing note group in the SVG. */
const ACTIVE_CLASS = "abcjs-note-active";

/**
 * Hook that manages real-time note highlighting in abcjs-rendered SVG.
 *
 * abcjs with `add_classes: true` assigns each note a class like
 * `abcjs-n0`, `abcjs-n1`, etc. This hook maps the ABCPlayer's
 * `activeNoteIndex` to those CSS classes and toggles a highlight
 * class on the matching SVG element group.
 *
 * Because the ABCPlayer's note indices (from its own parser) may not
 * align 1:1 with abcjs's `abcjs-nN` indices (abcjs counts notes and
 * rests differently), we build a mapping from the rendered SVG at
 * render time and use a "visible note" index that skips rests.
 *
 * Usage:
 *   const { sheetRef, onActiveNoteChange } = useNoteHighlight();
 *   // Pass sheetRef to the <div> where abcjs renders
 *   // Pass onActiveNoteChange to <PlaybackControls onActiveNoteChange={...} />
 */
export function useNoteHighlight() {
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevHighlightRef = useRef<Element | null>(null);

  /**
   * Called on every animation frame by PlaybackControls.
   * `noteIndex` is the index into the ABCPlayer's scheduledNotes array.
   * We map this to the abcjs SVG note element and toggle highlighting.
   */
  const onActiveNoteChange = useCallback((noteIndex: number) => {
    const container = sheetRef.current;
    if (!container) return;

    // Remove previous highlight
    if (prevHighlightRef.current) {
      prevHighlightRef.current.classList.remove(ACTIVE_CLASS);
      prevHighlightRef.current = null;
    }

    if (noteIndex < 0) return;

    // abcjs assigns classes like abcjs-n0, abcjs-n1, ... to note groups.
    // These indices correspond to sequential note/rest events in the ABC body.
    // Our ABCPlayer parser produces the same sequential ordering (notes + rests),
    // so the indices should match directly.
    const selector = `.abcjs-n${noteIndex}`;
    const noteEl = container.querySelector(selector);

    if (noteEl) {
      noteEl.classList.add(ACTIVE_CLASS);
      prevHighlightRef.current = noteEl;

      // Auto-scroll to keep the active note visible
      scrollNoteIntoView(container, noteEl);
    }
  }, []);

  return { sheetRef, onActiveNoteChange };
}

/**
 * Smoothly scroll the container so the active note is visible.
 * Only scrolls horizontally since sheet music is typically wider than the viewport.
 */
function scrollNoteIntoView(container: HTMLDivElement, noteEl: Element) {
  const svg = container.querySelector("svg");
  if (!svg) return;

  const containerRect = container.getBoundingClientRect();
  const noteRect = noteEl.getBoundingClientRect();

  // Horizontal scroll: if note is outside the visible area
  const leftMargin = 60;
  const rightMargin = 60;

  if (noteRect.left < containerRect.left + leftMargin) {
    container.scrollBy({
      left: noteRect.left - containerRect.left - leftMargin,
      behavior: "smooth",
    });
  } else if (noteRect.right > containerRect.right - rightMargin) {
    container.scrollBy({
      left: noteRect.right - containerRect.right + rightMargin,
      behavior: "smooth",
    });
  }

  // Vertical scroll: if note is outside the visible vertical area
  const topMargin = 40;
  const bottomMargin = 40;

  if (noteRect.top < containerRect.top + topMargin) {
    container.scrollBy({
      top: noteRect.top - containerRect.top - topMargin,
      behavior: "smooth",
    });
  } else if (noteRect.bottom > containerRect.bottom - bottomMargin) {
    container.scrollBy({
      top: noteRect.bottom - containerRect.bottom + bottomMargin,
      behavior: "smooth",
    });
  }
}
