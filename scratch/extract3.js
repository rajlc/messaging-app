const fs = require('fs');
const logPath = 'C:\\Users\\Bagmati Traders\\.gemini\\antigravity-ide\\brain\\f48a6728-2f70-4042-a659-f9fa2197f290\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');
for (const line of lines) {
  if (!line.trim()) continue;
  let data;
  try {
    data = JSON.parse(line);
  } catch(e) {
    continue;
  }
  if (data.step_index === 1647) {
    let chunks = data.tool_calls[0].args.ReplacementChunks;
    console.log('Initially:', typeof chunks);
    try {
      // Escape raw newlines inside the string so JSON.parse won't throw
      const escapedChunks = chunks.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      chunks = JSON.parse(escapedChunks);
      console.log('After 1st parse:', typeof chunks);
      
      // If it parsed to another string, parse again
      if (typeof chunks === 'string') {
        chunks = JSON.parse(chunks);
        console.log('After 2nd parse:', typeof chunks);
      }
    } catch (err) {
      console.error('Parsing failed:', err.message);
    }
    fs.writeFileSync('scratch/chunks.json', JSON.stringify(chunks, null, 2), 'utf8');
    break;
  }
}
