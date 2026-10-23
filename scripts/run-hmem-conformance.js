import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const officialRoot = process.env.HMEM_SPEC_DIR
  ? path.resolve(process.env.HMEM_SPEC_DIR)
  : path.join(root, 'data', 'meterless-official', 'Meterless-main', 'engines', 'hmem');
const runner = path.join(officialRoot, 'conformance', 'runner.ts');
if (!existsSync(runner)) {
  console.error(`Official H-MEM conformance runner not found at ${runner}.`);
  console.error('Download Meterless/Meterless main.zip into data/meterless-official, or set HMEM_SPEC_DIR to engines/hmem.');
  process.exit(2);
}
const implementation = path.join(root, 'server', 'hmem.js');
const result = spawnSync(process.execPath, ['--experimental-strip-types', runner], {
  cwd: root, stdio: 'inherit', env: { ...process.env, HMEM_IMPL: implementation }
});
process.exit(result.status ?? 2);
