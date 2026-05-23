# Lyrics Investigation - CONFIRMED ROOT CAUSE

## The SVG structure in abcjs 6.6.2:

The class is `abcjs-staff-wrapper` (NOT `abcjs-staff-group`).

From abcjs source code (draw.js):
```js
groupClasses.klass = "abcjs-staff-wrapper abcjs-l" + classes.lineNumber
```

There is NO `abcjs-staff-group` class anywhere in abcjs 6.6.2!

## Impact:

The print code queries `g.abcjs-staff-group` which ALWAYS returns 0 results.
This means the code ALWAYS falls to the else branch (lines 1072-1079) which uses 
the full SVG without splitting. This is why lyrics show up (the full SVG includes them),
but the page-break-inside:avoid on individual staff systems NEVER works.

## The REAL problem:

Since the selector never matches, the code uses the full SVG as one block.
This means:
1. Lyrics DO appear (they're in the full SVG)
2. But page breaks can happen ANYWHERE, including mid-staff-system
3. The user's complaint "doesn't print the words logically" likely means:
   - Words are cut off at page boundaries (staff + lyrics split across pages)
   - OR the LLM's w: line alignment is poor

## Fix needed:

1. Change `g.abcjs-staff-group` to `g.abcjs-staff-wrapper` in BOTH:
   - SheetMusicViewer.tsx (handlePrint)
   - PrintPreviewModal.tsx
2. This will enable proper per-staff-system splitting WITH lyrics included
3. The getBBox() will now correctly include lyrics since they're children of the wrapper
