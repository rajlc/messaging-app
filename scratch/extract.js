const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Bagmati Traders\\.gemini\\antigravity-ide\\brain\\f48a6728-2f70-4042-a659-f9fa2197f290\\.system_generated\\logs\\transcript.jsonl';
const rl = require('readline').createInterface({
  input: fs.createReadStream(logPath),
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.step_index === 1647) {
      let chunks = data.tool_calls[0].args.ReplacementChunks;
      if (typeof chunks === 'string') {
        chunks = JSON.parse(chunks);
      }
      fs.writeFileSync('scratch/chunks.json', JSON.stringify(chunks, null, 2), 'utf8');
      console.log('Successfully wrote scratch/chunks.json');
      process.exit(0);
    }
  } catch (e) {
    // Ignore parse errors on other lines
  }
});
