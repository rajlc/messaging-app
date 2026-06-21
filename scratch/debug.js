const fs = require('fs');
const logPath = 'C:\\Users\\Bagmati Traders\\.gemini\\antigravity-ide\\brain\\f48a6728-2f70-4042-a659-f9fa2197f290\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');
for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 1647) {
      const tc = data.tool_calls[0];
      console.log('tc name:', tc.name);
      console.log('typeof args:', typeof tc.args);
      console.log('args keys:', Object.keys(tc.args));
      console.log('typeof ReplacementChunks:', typeof tc.args.ReplacementChunks);
      console.log('chunks start:', tc.args.ReplacementChunks.substring(0, 100));
      break;
    }
  } catch (e) {
  }
}
