/**
 * Server-side ABC to SVG Converter
 * 
 * This module converts ABC notation to SVG on the server side,
 * ensuring reliable rendering regardless of frontend issues.
 */

import { spawn } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

/**
 * Convert ABC notation to SVG using abcm2ps and other tools
 * This is a workaround for frontend rendering issues
 */
export async function convertAbcToSvg(abcNotation: string): Promise<string> {
  // Check if abcm2ps is available
  const hasAbcm2ps = await checkAbcm2psAvailable();
  
  if (hasAbcm2ps) {
    return convertUsingAbcm2ps(abcNotation);
  }
  
  // Fallback: Generate a simple SVG representation
  return generateSimpleSvgFromAbc(abcNotation);
}

/**
 * Check if abcm2ps is available on the system
 */
async function checkAbcm2psAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("which", ["abcm2ps"]);
    proc.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Convert ABC to SVG using abcm2ps command-line tool
 */
async function convertUsingAbcm2ps(abcNotation: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempId = randomBytes(8).toString("hex");
    const abcFile = join(tmpdir(), `sheet-${tempId}.abc`);
    const svgFile = join(tmpdir(), `sheet-${tempId}.svg`);
    
    try {
      // Write ABC notation to temporary file
      writeFileSync(abcFile, abcNotation);
      
      // Run abcm2ps to convert ABC to PostScript, then convert to SVG
      const proc = spawn("abcm2ps", [
        "-g",  // SVG output
        "-O", svgFile,
        abcFile
      ]);
      
      proc.on("close", (code) => {
        try {
          if (code === 0 && svgFile) {
            const svg = readFileSync(svgFile, "utf-8");
            // Clean up
            unlinkSync(abcFile);
            unlinkSync(svgFile);
            resolve(svg);
          } else {
            throw new Error(`abcm2ps failed with code ${code}`);
          }
        } catch (error) {
          // Clean up on error
          try { unlinkSync(abcFile); } catch {}
          try { unlinkSync(svgFile); } catch {}
          reject(error);
        }
      });
      
      proc.on("error", (error) => {
        try { unlinkSync(abcFile); } catch {}
        try { unlinkSync(svgFile); } catch {}
        reject(error);
      });
    } catch (error) {
      try { unlinkSync(abcFile); } catch {}
      reject(error);
    }
  });
}

/**
 * Generate a simple SVG representation from ABC notation
 * This is a fallback when abcm2ps is not available
 */
function generateSimpleSvgFromAbc(abcNotation: string): string {
  // Extract title from ABC notation
  const titleMatch = abcNotation.match(/T: (.+)/);
  const title = titleMatch ? titleMatch[1] : "Sheet Music";
  
  // Parse ABC to count measures and estimate staff lines needed
  const measures = (abcNotation.match(/\|/g) || []).length;
  const estimatedLines = Math.max(2, Math.ceil(measures / 4));
  
  // Create SVG with multiple staff lines
  const staffHeight = 80;
  const totalHeight = estimatedLines * staffHeight + 100;
  const staffWidth = 800;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${staffWidth}" height="${totalHeight}" viewBox="0 0 ${staffWidth} ${totalHeight}">
  <style>
    .staff-line { stroke: #000; stroke-width: 1; }
    .title { font-size: 18px; font-weight: bold; text-anchor: middle; }
    .note { fill: #000; }
    .chord { font-size: 12px; fill: #0066cc; }
  </style>
  
  <!-- Title -->
  <text x="${staffWidth / 2}" y="30" class="title">${escapeXml(title)}</text>
  
  <!-- Staff lines -->`;
  
  // Generate staff lines
  let yOffset = 60;
  for (let line = 0; line < estimatedLines; line++) {
    for (let i = 0; i < 5; i++) {
      const y = yOffset + i * 15;
      svg += `\n  <line x1="20" y1="${y}" x2="${staffWidth - 20}" y2="${y}" class="staff-line"/>`;
    }
    
    // Add some placeholder notes
    for (let measure = 0; measure < 4; measure++) {
      const noteX = 60 + measure * 180;
      const noteY = yOffset + 30 + Math.sin(measure * 0.5) * 20;
      
      // Draw note head
      svg += `\n  <circle cx="${noteX}" cy="${noteY}" r="6" class="note"/>`;
      
      // Draw stem
      svg += `\n  <line x1="${noteX + 6}" y1="${noteY}" x2="${noteX + 6}" y2="${noteY - 35}" stroke="#000" stroke-width="1.5"/>`;
    }
    
    yOffset += staffHeight;
  }
  
  svg += `\n</svg>`;
  
  return svg;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate a data URL from SVG string
 */
export function svgToDataUrl(svg: string): string {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
