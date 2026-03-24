import { JSDOM } from 'jsdom';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Set up a DOM environment like a browser
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="sheet1"></div><div id="sheet2"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost',
});

// Set globals that abcjs expects
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, writable: true, configurable: true });
global.SVGElement = dom.window.SVGElement || class SVGElement {};
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.DOMParser = dom.window.DOMParser;

const SAMPLE_ABC = `X: 1
T: Test Song
M: 4/4
L: 1/8
Q: 1/4=120
K: C
"C"C2 E2 G2 c2 | "F"A2 F2 "G"G2 E2 | "Am"A2 c2 "F"A2 F2 | "G"G4 z4 |
"C"e2 d2 c2 B2 | "F"A2 G2 F2 E2 | "G"D2 E2 F2 G2 | "C"c8 |]`;

// Test with the actual stored ABC from the database
const DB_ABC = `X: 1
T: Forward Moving Song
C: Folk Melody
M: 4/4
L: 1/8
Q: 1/4=80
K: Am
% Intro
z8 | z8 |
% Verse 1
"Am"A,2 C2 E2 A2 | "F"F2 A2 c2 A2 | "C"G2 E2 C2 E2 | "G"G2 B2 d2 B2 |
w: Walk-ing through the morn-ing light, Shad-ows fad-ing out of sight, Ev-ery step a new be-gin-ning, Hear the song the world is sing-ing
"Am"A,2 C2 E2 A2 | "Dm"D2 F2 A2 F2 | "E"E2 ^G2 B2 e2 | "Am"A4 z4 |
w: Ris-ing up with hope in-side, Arms stretched o-pen far and wide, Let the rhy-thm car-ry for-ward, Mov-ing on-ward ev-er on-ward`;

async function test() {
  console.log("=== Testing abcjs rendering ===\n");
  
  // Import abcjs
  const abcjsMod = await import('abcjs');
  console.log("Module keys:", Object.keys(abcjsMod));
  console.log("mod.default type:", typeof abcjsMod.default);
  console.log("mod.renderAbc type:", typeof abcjsMod.renderAbc);
  console.log("mod.default?.renderAbc type:", typeof abcjsMod.default?.renderAbc);
  
  const abcjs = abcjsMod.default || abcjsMod;
  console.log("\nResolved abcjs type:", typeof abcjs);
  console.log("abcjs.renderAbc type:", typeof abcjs.renderAbc);
  
  if (typeof abcjs.renderAbc !== 'function') {
    console.log("\n!!! renderAbc is NOT a function !!!");
    console.log("Trying other patterns...");
    console.log("mod.default.default:", typeof abcjsMod.default?.default);
    console.log("mod.default.default?.renderAbc:", typeof abcjsMod.default?.default?.renderAbc);
    return;
  }
  
  // Test 1: String ID
  console.log("\n--- Test 1: String ID 'sheet1' ---");
  try {
    const result1 = abcjs.renderAbc("sheet1", SAMPLE_ABC, {
      responsive: "resize",
      staffwidth: 700,
      add_classes: true,
    });
    console.log("Returned:", result1?.length, "tune objects");
    if (result1?.[0]?.warnings?.length) {
      console.log("Warnings:", JSON.stringify(result1[0].warnings));
    }
    const el1 = document.getElementById("sheet1");
    const svg1 = el1?.querySelector("svg");
    console.log("SVG found:", !!svg1);
    console.log("SVG children:", svg1?.children?.length || 0);
    console.log("SVG innerHTML length:", svg1?.innerHTML?.length || 0);
    if (svg1) {
      // Check for staff lines and notes
      const staffLines = el1.querySelectorAll("[class*='staff']");
      const notes = el1.querySelectorAll("[class*='note']");
      console.log("Staff elements:", staffLines.length);
      console.log("Note elements:", notes.length);
      console.log("First 200 chars of SVG:", svg1.outerHTML.slice(0, 200));
    }
  } catch (err) {
    console.log("ERROR:", err.message);
    console.log("Stack:", err.stack);
  }
  
  // Test 2: DOM element
  console.log("\n--- Test 2: DOM element ---");
  try {
    const el2 = document.getElementById("sheet2");
    const result2 = abcjs.renderAbc(el2, SAMPLE_ABC, {
      responsive: "resize",
      staffwidth: 700,
      add_classes: true,
    });
    console.log("Returned:", result2?.length, "tune objects");
    const svg2 = el2?.querySelector("svg");
    console.log("SVG found:", !!svg2);
    console.log("SVG children:", svg2?.children?.length || 0);
    console.log("SVG innerHTML length:", svg2?.innerHTML?.length || 0);
  } catch (err) {
    console.log("ERROR:", err.message);
    console.log("Stack:", err.stack);
  }
  
  // Test 3: DB ABC with string ID
  console.log("\n--- Test 3: DB ABC with string ID ---");
  try {
    // Clear sheet1
    document.getElementById("sheet1").innerHTML = "";
    const result3 = abcjs.renderAbc("sheet1", DB_ABC, {
      responsive: "resize",
      staffwidth: 700,
      add_classes: true,
    });
    console.log("Returned:", result3?.length, "tune objects");
    if (result3?.[0]?.warnings?.length) {
      console.log("Warnings:", JSON.stringify(result3[0].warnings));
    }
    const el3 = document.getElementById("sheet1");
    const svg3 = el3?.querySelector("svg");
    console.log("SVG found:", !!svg3);
    console.log("SVG children:", svg3?.children?.length || 0);
    console.log("SVG innerHTML length:", svg3?.innerHTML?.length || 0);
  } catch (err) {
    console.log("ERROR:", err.message);
    console.log("Stack:", err.stack);
  }
}

test().catch(err => console.error("Fatal:", err));
