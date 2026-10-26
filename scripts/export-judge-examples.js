import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { evaluationGroups, groupCandidates } from '../evaluation/cases.js';

// Export existing real outputs unchanged; this command never calls a provider.
const evaluation = JSON.parse(await readFile(new URL('../evaluation/results.json', import.meta.url), 'utf8'));
assert.equal(evaluation.mode, 'live');
assert.equal(evaluation.synthetic, true);
assert.equal(evaluation.datasetSha256, createHash('sha256').update(JSON.stringify(evaluationGroups)).digest('hex'));
for (const group of evaluationGroups) {
  const result = evaluation.groups.find(item => item.id === group.id);
  assert.ok(result?.report && result.executions.length, `No recorded output for ${group.id}`);
  const directory = new URL(`../examples/judges/${group.id}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const input = { synthetic: true, language: 'en', vacancy: { id: group.id, title: group.title, description: group.description }, candidates: groupCandidates(group) };
  const { translations, ...report } = result.report;
  const output = { synthetic: true, mode: 'recorded-live-output', evaluatedAt: evaluation.evaluatedAt, model: evaluation.model,
    datasetSha256: evaluation.datasetSha256, limitation: evaluation.limitation, ...result, report };
  await writeFile(new URL('input.json', directory), JSON.stringify(input, null, 2) + '\n');
  await writeFile(new URL('output.json', directory), JSON.stringify(output, null, 2) + '\n');
  await writeFile(new URL('job.txt', directory), `${group.title}\n\n${group.description}\n`);
}
console.log('Four paired judge examples exported from the existing real evaluation; no inference performed.');
