// Test the full pipeline: DB → sanitise → abcjs render
import { JSDOM } from 'jsdom';
import mysql from 'mysql2/promise';

// Get DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  // 1. Fetch ABC from database
  const connection = await mysql.createConnection(dbUrl);
  const [rows] = await connection.execute(
    'SELECT id, title, sheetMusicAbc FROM songs WHERE sheetMusicAbc IS NOT NULL ORDER BY id DESC LIMIT 1'
  );
  await connection.end();

  if (rows.length === 0) {
    console.log('No songs with sheet music found');
    return;
  }

  const song = rows[0];
  const abc = song.sheetMusicAbc;
  
  console.log('=== Song:', song.title, '(id:', song.id, ') ===');
  console.log('ABC length:', abc.length);
  console.log('Type:', typeof abc);
  console.log('Has real newlines:', abc.includes('\n'));
  console.log('Newline count:', (abc.match(/\n/g) || []).length);
  
  const lines = abc.split('\n');
  console.log('\nFirst 15 lines:');
  lines.slice(0, 15).forEach((line, i) => {
    console.log(`  ${i}: [${line}]`);
  });

  // 2. Apply the same sanitisation as the frontend
  let sanitised = abc;
  // Strip V: directives
  sanitised = sanitised.replace(/^V:\s*.*$/gm, '');
  // Strip standalone dynamics
  sanitised = sanitised.replace(/^\s*![a-z]+!\s*$/gm, '');
  // Convert [P:...] to comments
  sanitised = sanitised.replace(/^\[P:([^\]]*)\]$/gm, '% Section: $1');
  // Remove inline [P:...]
  sanitised = sanitised.replace(/\[P:[^\]]*\]/g, '');
  // Clean empty lines
  sanitised = sanitised.replace(/\n{3,}/g, '\n\n');
  
  console.log('\n=== After sanitisation ===');
  console.log('Length:', sanitised.length);
  const sanitisedLines = sanitised.split('\n');
  console.log('First 15 lines:');
  sanitisedLines.slice(0, 15).forEach((line, i) => {
    console.log(`  ${i}: [${line}]`);
  });

  // 3. Render with abcjs in jsdom
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="sheet"></div></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.SVGElement = dom.window.SVGElement || class {};
  global.HTMLElement = dom.window.HTMLElement;

  const abcjs = await import('abcjs');
  const renderFn = abcjs.default?.renderAbc || abcjs.renderAbc;
  
  console.log('\n=== abcjs rendering ===');
  console.log('renderAbc function:', typeof renderFn);
  
  // Test with string ID
  const result1 = renderFn('sheet', sanitised, { 
    responsive: 'resize',
    add_classes: true 
  });
  
  const container = dom.window.document.getElementById('sheet');
  const svgContent = container.innerHTML;
  const noteCount = (svgContent.match(/abcjs-n\d+/g) || []).length;
  const staffCount = (svgContent.match(/abcjs-staff/g) || []).length;
  
  console.log('SVG length:', svgContent.length);
  console.log('Note elements:', noteCount);
  console.log('Staff elements:', staffCount);
  console.log('Has SVG:', svgContent.includes('<svg'));
  console.log('Result object:', result1?.[0] ? 'TuneObject present' : 'No TuneObject');
  
  if (svgContent.length < 100) {
    console.log('\n!!! SVG content is suspiciously short:');
    console.log(svgContent);
  }
  
  // Also test with DOM element directly
  const container2 = dom.window.document.createElement('div');
  container2.id = 'sheet2';
  dom.window.document.body.appendChild(container2);
  
  const result2 = renderFn(container2, sanitised, {
    responsive: 'resize',
    add_classes: true
  });
  
  const svgContent2 = container2.innerHTML;
  console.log('\n=== DOM element method ===');
  console.log('SVG length:', svgContent2.length);
  console.log('Note elements:', (svgContent2.match(/abcjs-n\d+/g) || []).length);
  
  console.log('\n=== CONCLUSION ===');
  if (noteCount > 0 && staffCount > 0) {
    console.log('✅ Rendering works correctly with', noteCount, 'notes and', staffCount, 'staves');
  } else {
    console.log('❌ Rendering FAILED - no notes or staves found');
  }
}

main().catch(console.error);
