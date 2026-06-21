const fs = require('fs');
const path = require('path');
const logPath = 'C:\\Users\\Bagmati Traders\\.gemini\\antigravity-ide\\brain\\f48a6728-2f70-4042-a659-f9fa2197f290\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 1647) {
      let chunks = data.tool_calls[0].args.ReplacementChunks;
      while (typeof chunks === 'string') {
        chunks = JSON.parse(chunks);
      }
      fs.writeFileSync('scratch/chunks.json', JSON.stringify(chunks, null, 2), 'utf8');
      console.log('Successfully wrote scratch/chunks.json');
      break;
    }
  } catch (e) {
    // ignore
  }
}
