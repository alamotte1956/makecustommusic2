/**
 * Test script to render ABC notation with lyrics and inspect the SVG structure.
 * This helps us understand how abcjs places lyrics in the SVG DOM.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="render"></div></body></html>', {
  pretendToBeVisual: true,
});

const { window } = dom;
const { document } = window;

// We need to set up globals for abcjs
global.window = window;
global.document = document;
Object.defineProperty(global, 'navigator', { value: window.navigator, writable: true });
global.DOMParser = window.DOMParser;

// Import abcjs
const abcjs = await import('abcjs');

const testAbc = `X:1
T:Amazing Grace
M:3/4
L:1/4
K:G
% Verse 1
"G"D|"G"G2 B|"C"A2 G|"G"E2 D|"G"G2 B|
w: A-ma-zing grace how sweet the sound that
"D"A2 z|"G"B2 d|"Em"B2 G|"C"A2 G|"G"E2 D|
w: saved a wretch like me I once was
"G"G2 B|"C"A2 G|"G"E2 D|"D"D2 z|"G"G2 z|
w: lost but now am found was blind but now I see`;

const renderTarget = document.getElementById('render');
const result = abcjs.default.renderAbc(renderTarget, testAbc, {
  staffwidth: 520,
  paddingtop: 10,
  paddingbottom: 10,
  paddingleft: 5,
  paddingright: 5,
  add_classes: true,
  wrap: { minSpacing: 1.5, maxSpacing: 2.8, preferredMeasuresPerLine: 4 },
});

const svg = renderTarget.querySelector('svg');
if (!svg) {
  console.log("No SVG rendered!");
  process.exit(1);
}

console.log("=== SVG Structure ===");
console.log("SVG viewBox:", svg.getAttribute('viewBox'));
console.log("SVG width:", svg.getAttribute('width'));
console.log("SVG height:", svg.getAttribute('height'));

// Find staff groups
const staffGroups = svg.querySelectorAll('g.abcjs-staff-group');
console.log("\nNumber of staff groups:", staffGroups.length);

// Check for lyrics elements
const lyrics = svg.querySelectorAll('.abcjs-lyric');
console.log("Number of lyric elements:", lyrics.length);

// Check where lyrics are in the DOM tree
if (lyrics.length > 0) {
  const firstLyric = lyrics[0];
  console.log("\n=== First lyric element ===");
  console.log("Tag:", firstLyric.tagName);
  console.log("Text:", firstLyric.textContent);
  console.log("Parent tag:", firstLyric.parentElement?.tagName);
  console.log("Parent class:", firstLyric.parentElement?.getAttribute('class'));
  
  // Walk up the tree
  let el = firstLyric;
  let depth = 0;
  while (el && el !== svg) {
    console.log(`  ${'  '.repeat(depth)}${el.tagName} class="${el.getAttribute('class') || ''}" `);
    el = el.parentElement;
    depth++;
  }
}

// Check for staff-wrapper elements
const staffWrappers = svg.querySelectorAll('g.abcjs-staff-wrapper');
console.log("\nNumber of staff-wrapper elements:", staffWrappers.length);

// For each staff wrapper, check if it contains lyrics
staffWrappers.forEach((wrapper, i) => {
  const wrapperLyrics = wrapper.querySelectorAll('.abcjs-lyric');
  console.log(`\nStaff wrapper ${i}: contains ${wrapperLyrics.length} lyric elements`);
  if (wrapperLyrics.length > 0) {
    const texts = Array.from(wrapperLyrics).map(l => l.textContent).join(' ');
    console.log("  Lyrics:", texts.substring(0, 80));
  }
  // Check children structure
  const children = Array.from(wrapper.children);
  const childClasses = children.map(c => c.getAttribute('class')?.split(' ')[0] || c.tagName).filter((v, i, a) => a.indexOf(v) === i);
  console.log("  Direct child types:", childClasses.join(', '));
});

// Check for lyrics OUTSIDE staff groups
const allLyrics = Array.from(svg.querySelectorAll('.abcjs-lyric'));
const lyricsInGroups = Array.from(staffGroups).flatMap(g => Array.from(g.querySelectorAll('.abcjs-lyric')));
const lyricsOutsideGroups = allLyrics.filter(l => !lyricsInGroups.includes(l));
console.log("\n=== Lyrics outside staff groups:", lyricsOutsideGroups.length, "===");
if (lyricsOutsideGroups.length > 0) {
  console.log("First outside lyric:", lyricsOutsideGroups[0].textContent);
  console.log("Parent:", lyricsOutsideGroups[0].parentElement?.getAttribute('class'));
}

// Print the outer HTML structure (first 5000 chars)
console.log("\n=== SVG HTML (first 3000 chars) ===");
console.log(svg.outerHTML.substring(0, 3000));
