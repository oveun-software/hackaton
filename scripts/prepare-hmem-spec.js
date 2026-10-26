import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const revision = '1742dec56a66e58eef9dda2d2b865823758ca8cd';
const files = {
  'conformance/runner.ts': 'd6724860761c4846a0bce3080d25115bcb0ba1d9d0d2e933438f5683a7a9b7c5',
  'conformance/vectors/vectors.json': '10afb5a07233466576ba6feb0d88408488909ba2721ee9157fdb932132917029'
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function prepareSpec(directory) {
  for (const [relative, expected] of Object.entries(files)) {
    const target = path.join(directory, relative);
    let bytes;
    try { bytes = await readFile(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!bytes) {
      const response = await fetch(`https://raw.githubusercontent.com/Meterless/Meterless/${revision}/engines/hmem/${relative}`, { signal: AbortSignal.timeout(30000), redirect: 'error' });
      if (!response.ok) throw new Error(`Official H-MEM download failed (${response.status})`);
      bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 250000) throw new Error('Unexpected H-MEM specification size');
      if (hash(bytes) !== expected) throw new Error(`Official H-MEM integrity check failed: ${relative}`);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
    if (hash(bytes) !== expected) throw new Error(`Cached H-MEM file differs from the pinned official revision: ${relative}`);
  }
  console.log(`Official H-MEM conformance files verified at ${revision}.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareSpec(fileURLToPath(new URL('../data/meterless-official/Meterless-main/engines/hmem/', import.meta.url)));
}
