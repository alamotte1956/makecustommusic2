import { useEffect, useRef, useState } from "react";

const SAMPLE_ABC = `X: 1
T: Test Song
M: 4/4
L: 1/8
Q: 1/4=120
K: C
"C"C2 E2 G2 c2 | "F"A2 F2 "G"G2 E2 | "Am"A2 c2 "F"A2 F2 | "G"G4 z4 |
"C"e2 d2 c2 B2 | "F"A2 G2 F2 E2 | "G"D2 E2 F2 G2 | "C"c8 |]
w: Do re mi fa sol la ti do, Sing a song of joy to-day, Mu-sic fills the air with light, Hap-py mel-o-dy!`;

export default function SheetMusicDebug() {
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const [abcjsInfo, setAbcjsInfo] = useState<string>("loading...");

  const addLog = (msg: string) => {
    console.log("[DEBUG]", msg);
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 23)} ${msg}`]);
  };

  useEffect(() => {
    // Method 1: Dynamic import with string ID
    const test1 = async () => {
      try {
        addLog("Test 1: Starting dynamic import...");
        const mod = await import("abcjs");
        addLog(`Test 1: Module keys: ${Object.keys(mod).join(", ")}`);
        addLog(`Test 1: mod.default type: ${typeof mod.default}`);
        addLog(`Test 1: mod.renderAbc type: ${typeof mod.renderAbc}`);
        addLog(`Test 1: mod.default?.renderAbc type: ${typeof mod.default?.renderAbc}`);

        const abcjs = mod.default || mod;
        addLog(`Test 1: abcjs type: ${typeof abcjs}`);
        addLog(`Test 1: abcjs.renderAbc type: ${typeof abcjs.renderAbc}`);

        if (typeof abcjs.renderAbc !== "function") {
          // Try other access patterns
          const renderFn = (mod as any).renderAbc || (mod as any).default?.default?.renderAbc;
          addLog(`Test 1: Alternative renderAbc type: ${typeof renderFn}`);
          if (typeof renderFn === "function") {
            addLog("Test 1: Using alternative renderAbc");
            const result = renderFn("debug-sheet-1", SAMPLE_ABC, { responsive: "resize" });
            addLog(`Test 1: Result: ${JSON.stringify(result?.length)} tune objects`);
          } else {
            addLog("Test 1: FAILED - No renderAbc function found anywhere");
            // Dump all keys recursively
            const allKeys = (obj: any, prefix: string): string[] => {
              if (!obj || typeof obj !== "object") return [];
              return Object.keys(obj).flatMap((k) => {
                const val = obj[k];
                const path = prefix ? `${prefix}.${k}` : k;
                return [
                  `${path}: ${typeof val}`,
                  ...(typeof val === "object" && val && !Array.isArray(val) ? allKeys(val, path).slice(0, 5) : []),
                ];
              });
            };
            addLog(`Test 1: All module paths:\n${allKeys(mod, "mod").slice(0, 30).join("\n")}`);
          }
          return;
        }

        setAbcjsInfo(`renderAbc found via ${mod.default ? "mod.default" : "mod"}`);

        // Test with string ID
        addLog("Test 1: Calling renderAbc with string ID 'debug-sheet-1'...");
        const result1 = abcjs.renderAbc("debug-sheet-1", SAMPLE_ABC, {
          responsive: "resize",
          staffwidth: 700,
          add_classes: true,
        });
        addLog(`Test 1: Returned ${result1?.length} tune objects`);
        if (result1?.[0]?.warnings?.length) {
          addLog(`Test 1: Warnings: ${JSON.stringify(result1[0].warnings)}`);
        }

        // Check if SVG was created
        const svg1 = ref1.current?.querySelector("svg");
        addLog(`Test 1: SVG element found: ${!!svg1}, SVG children: ${svg1?.children?.length || 0}`);
        if (svg1) {
          addLog(`Test 1: SVG dimensions: ${svg1.getAttribute("width")} x ${svg1.getAttribute("height")}`);
          const staffLines = svg1.querySelectorAll(".abcjs-staff");
          const noteHeads = svg1.querySelectorAll(".abcjs-note");
          addLog(`Test 1: Staff lines: ${staffLines.length}, Note elements: ${noteHeads.length}`);
        }
      } catch (err: any) {
        addLog(`Test 1: ERROR: ${err.message}\n${err.stack}`);
      }
    };

    // Method 2: Dynamic import with DOM element reference
    const test2 = async () => {
      try {
        addLog("Test 2: Starting dynamic import (DOM element method)...");
        const mod = await import("abcjs");
        const abcjs = mod.default || mod;

        if (typeof abcjs.renderAbc !== "function") {
          addLog("Test 2: SKIPPED - no renderAbc");
          return;
        }

        // Test with DOM element directly
        addLog("Test 2: Calling renderAbc with DOM element ref...");
        if (!ref2.current) {
          addLog("Test 2: ref2.current is null!");
          return;
        }
        const result2 = abcjs.renderAbc(ref2.current, SAMPLE_ABC, {
          responsive: "resize",
          staffwidth: 700,
          add_classes: true,
        });
        addLog(`Test 2: Returned ${result2?.length} tune objects`);

        const svg2 = ref2.current?.querySelector("svg");
        addLog(`Test 2: SVG element found: ${!!svg2}, SVG children: ${svg2?.children?.length || 0}`);
        if (svg2) {
          const staffLines = svg2.querySelectorAll(".abcjs-staff");
          const noteHeads = svg2.querySelectorAll(".abcjs-note");
          addLog(`Test 2: Staff lines: ${staffLines.length}, Note elements: ${noteHeads.length}`);
        }
      } catch (err: any) {
        addLog(`Test 2: ERROR: ${err.message}\n${err.stack}`);
      }
    };

    test1().then(() => test2());
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace", background: "#111", color: "#eee", minHeight: "100vh" }}>
      <h1 style={{ color: "#0f0" }}>Sheet Music Debug Page</h1>
      <p>abcjs info: {abcjsInfo}</p>

      <h2 style={{ color: "#ff0", marginTop: "20px" }}>Test 1: String ID method</h2>
      <div
        id="debug-sheet-1"
        ref={ref1}
        style={{ background: "#fff", padding: "10px", minHeight: "100px", color: "#000" }}
      />

      <h2 style={{ color: "#ff0", marginTop: "20px" }}>Test 2: DOM element method</h2>
      <div
        ref={ref2}
        style={{ background: "#fff", padding: "10px", minHeight: "100px", color: "#000" }}
      />

      <h2 style={{ color: "#0ff", marginTop: "20px" }}>Debug Log</h2>
      <pre style={{ background: "#222", padding: "10px", fontSize: "12px", maxHeight: "400px", overflow: "auto", whiteSpace: "pre-wrap" }}>
        {log.join("\n") || "Loading..."}
      </pre>
    </div>
  );
}
