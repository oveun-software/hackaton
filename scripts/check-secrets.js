import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const suspect = new Set();
for (const file of files) {
  if (/(?:^|\/)\.env(?:\..*)?$/.test(file) && !file.endsWith('.env.example')) suspect.add(file);
  if (/\.(?:dpapi|key|p12|pfx)$/.test(file) || /(?:^|\/)(?:proxy-token|secret\.key|credentials\.json)$/.test(file)) suspect.add(file);
  const fullPath = new URL('../' + file, import.meta.url);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size > 2 * 1024 * 1024) continue;
  const text = fs.readFileSync(fullPath, 'utf8');
  if (/nvapi-[A-Za-z0-9_-]{40,}/.test(text) || /Bearer [A-Za-z0-9_.-]{40,}/.test(text) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) suspect.add(file);
}
if (suspect.size) {
  console.error('Potential credentials found. Values are intentionally hidden:');
  for (const file of suspect) console.error(file);
  process.exitCode = 1;
} else console.log('No credential files or recognized secret values found in shared source files.');

