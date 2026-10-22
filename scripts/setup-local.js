import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, '.env');
if (!fs.existsSync(target)) {
  fs.copyFileSync(path.join(root, '.env.example'), target);
  console.log('Created your private .env from the shared template.');
}
let text = fs.readFileSync(target, 'utf8');
const env = parseEnv(text);
const stateDir = process.env.METERLESS_STATE_DIR || (process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ai.meterless.runtime')
  : process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'ai.meterless.runtime') : '/var/lib/meterless');
const tokenPath = path.join(stateDir, 'proxy-token');
if ((!env.METERLESS_RUNTIME_TOKEN || process.argv.includes('--refresh-token')) && fs.existsSync(tokenPath)) {
  const token = fs.readFileSync(tokenPath, 'utf8').trim();
  if (!token || token === 'rt-local' || /\s/.test(token)) throw new Error('Nightshift has not supplied a valid runtime token.');
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex(line => line.startsWith('METERLESS_RUNTIME_TOKEN='));
  const assignment = `METERLESS_RUNTIME_TOKEN=${token}`;
  if (index < 0) lines.push(assignment); else lines[index] = assignment;
  text = lines.join('\n');
  fs.writeFileSync(target, text, { mode: 0o600 });
  console.log('Imported the Nightshift token from this computer. No token was printed.');
} else if (env.METERLESS_RUNTIME_TOKEN) {
  console.log('Kept your existing Nightshift token. Use --refresh-token after rotating it.');
} else {
  console.log('Start Nightshift first, then run npm run setup again to import its local token.');
}
console.log('Set your own Zetaris organization ID and read-only API key in .env, then run npm run doctor.');

