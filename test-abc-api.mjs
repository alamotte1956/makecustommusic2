// Test what the tRPC API actually returns for a song's ABC notation
import http from 'http';

const DEV_URL = 'http://localhost:3000';

// Make a raw HTTP request to the tRPC endpoint to see what the frontend receives
const songId = 570003;
const url = `${DEV_URL}/api/trpc/songs.getById?input=${encodeURIComponent(JSON.stringify({ json: { id: songId } }))}`;

console.log('Fetching:', url);

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    
    try {
      const parsed = JSON.parse(data);
      const result = parsed?.result?.data?.json;
      
      if (result?.sheetMusicAbc) {
        const abc = result.sheetMusicAbc;
        console.log('\n=== ABC Notation Analysis ===');
        console.log('Length:', abc.length);
        console.log('Has newlines:', abc.includes('\n'));
        console.log('Newline count:', (abc.match(/\n/g) || []).length);
        console.log('Has \\n literal:', abc.includes('\\n'));
        console.log('\nFirst 300 chars (raw):');
        console.log(JSON.stringify(abc.substring(0, 300)));
        console.log('\nFirst 300 chars (display):');
        console.log(abc.substring(0, 300));
        
        // Check if it starts with X: on its own line
        const lines = abc.split('\n');
        console.log('\nFirst 10 lines:');
        lines.slice(0, 10).forEach((line, i) => {
          console.log(`  Line ${i}: "${line}"`);
        });
      } else {
        console.log('No sheetMusicAbc found in response');
        console.log('Response keys:', Object.keys(result || {}));
        console.log('Raw response (first 500):', data.substring(0, 500));
      }
    } catch (e) {
      console.log('Failed to parse JSON:', e.message);
      console.log('Raw response (first 500):', data.substring(0, 500));
    }
  });
}).on('error', (e) => {
  console.error('Request failed:', e.message);
});
