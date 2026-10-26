import { mkdir, writeFile } from 'node:fs/promises';
import { evaluationGroups } from '../evaluation/cases.js';
await mkdir(new URL('../examples/pilot/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/recorded/', import.meta.url), { recursive: true });
for (const group of evaluationGroups) for (const candidate of group.candidates) {
  const text = `TALENTLENS — FICTIONAL CV FOR A CONTROLLED TEST\nCandidate code: ${candidate.id}\nRole family: ${group.title}\n\n${candidate.text}\n\nSynthetic test material. No real person, contact details or hiring outcome.\n`;
  await writeFile(new URL(`../examples/pilot/${candidate.id}.txt`, import.meta.url), text);
  if (candidate.clarification) await writeFile(new URL(`../examples/pilot/${candidate.id}-clarification.txt`, import.meta.url),
    `FICTIONAL INTERVIEW STATEMENT — ADD AS A SEPARATE CLARIFICATION, NOT A CV\nCandidate code: ${candidate.id}\nSource: candidate response recorded by recruiter\n\n${candidate.clarification}\n\nSynthetic test material. No real participant.\n`);
}
await writeFile(new URL('../public/recorded/pilot-cases.json', import.meta.url), JSON.stringify({ synthetic: true, groups: evaluationGroups.filter(g => ['frontend', 'data'].includes(g.id)) }, null, 2));
console.log('16 fictional CV files and two guided pilot task sets prepared.');
