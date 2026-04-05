# Sheet Music Rendering Issue Analysis

## Symptoms
1. Sheet music renders but appears very faint/light
2. Loading spinner never goes away

## Root Cause Analysis

### The Render Loop Problem
The rendering effect (line 259) depends on:
- `sanitisedDisplayAbc`
- `renderAttempt` 
- `containerVisible`

The ResizeObserver (line 189) sets `containerVisible` AND increments `renderAttempt` when the container becomes visible.

**The problem**: When the rendering effect runs:
1. `setIsRendered(false)` is called (line 280) — this sets opacity to 0
2. abcjs renders the notation
3. `setIsRendered(true)` is called (line 336) — this should set opacity to 100

BUT: Setting `isRendered` to false causes the skeleton overlay to appear (line 714-718).
The skeleton overlay is `absolute inset-0 z-10`, covering the sheet music.

**The infinite loop**: 
- The ResizeObserver fires when the container changes size
- The render effect changes the container content (innerHTML = "")
- This triggers a resize event
- Which sets `containerVisible` and increments `renderAttempt`
- Which triggers the render effect again
- Which calls `setIsRendered(false)` again
- Loop!

### The Faint Appearance
The container has `opacity-0` (line 725) while `isRendered` is false.
But the sheet music IS rendered in the DOM — it's just at 0 opacity.
The user sees it as "faint" because the skeleton overlay is semi-transparent.

## Fix Plan
1. Don't increment `renderAttempt` in the ResizeObserver if already rendered
2. Don't reset `isRendered` to false if the ABC hasn't changed
3. Use a ref to track whether we're already rendering to prevent re-entry
