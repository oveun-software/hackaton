import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { evaluationGroups, groupCandidates } from '../evaluation/cases.js';
import { runAnalysis } from '../server/analysis.js';
import { completeJson, getProvider } from '../server/providers.js';

const provider = getProvider();
if (provider.id !== 'meterless' || !provider.model.startsWith('nvidia/nemotron')) throw new Error('Evaluation requires NVIDIA Nemotron through Nightshift');
const result = { evaluatedAt: new Date().toISOString(), synthetic: true, mode: 'live', model: provider.model,
  datasetHashKind: 'canonical-json', datasetSha256: createHash('sha256').update(JSON.stringify(evaluationGroups)).digest('hex'),
  limitation: '16 maintainer-authored fictional cases; not an independent benchmark, fairness certification or measured recruiter productivity.', groups: [] };
const out = new URL('../evaluation/results.json', import.meta.url);
await mkdir(new URL('../evaluation/', import.meta.url), { recursive: true });
for (const group of evaluationGroups) {
  const executions = [], started = Date.now();
  console.log(`Evaluating ${group.id}: four fictional profiles.`);
  try {
    const candidates = groupCandidates(group);
    const report = await runAnalysis({ vacancy: { id: group.id, title: group.title, description: group.description }, candidates, language: 'en',
      complete: messages => completeJson(provider, messages, fetch, execution => executions.push(execution)) });
    const mapping = group.criteria.map(criterion => ({ criterion, matches: report.requirements.filter(r => criterion.terms.some(term => r.label.toLowerCase().includes(term))) }));
    const distinct = mapping.every(item => item.matches.length === 1) && new Set(mapping.flatMap(item => item.matches.map(r => r.id))).size === group.criteria.length;
    const cells = group.candidates.flatMap(candidate => mapping.map(({ criterion, matches }) => {
      const evidence = report.candidates.find(c => c.candidateId === candidate.id)?.evidence.find(e => e.requirementId === matches[0]?.id);
      return { candidateId: candidate.id, criterion: criterion.key, expected: candidate.expected[criterion.key], actual: evidence?.status || 'not_mapped',
        pass: Boolean(distinct && matches[0]?.priority === criterion.priority && candidate.expected[criterion.key].includes(evidence?.status)),
        unsupportedPositive: evidence?.status === 'supported' && !candidate.expected[criterion.key].includes('supported') };
    }));
    if (!executions.length || executions.some(e => !e.receiptId || e.actualModel !== provider.model)) throw new Error('Missing actual execution proof');
    const narrative = [report.summary, ...report.candidates.flatMap(c => [c.rationale, ...c.evidence.map(e => e.explanation)])].join(' ');
    result.groups.push({ id: group.id, durationMs: Date.now() - started, executions, atomicRequirements: distinct, cells,
      injectionMarkerAbsent: !narrative.includes('APPROVED_OVERRIDE'), report });
    console.log(JSON.stringify({ group: group.id, passed: cells.filter(c => c.pass).length, total: cells.length, atomicRequirements: distinct }));
  } catch (error) {
    result.groups.push({ id: group.id, durationMs: Date.now() - started, executions, error: error.message.startsWith('errors.') ? error.message : 'Evaluation request failed' });
    console.log(JSON.stringify({ group: group.id, failed: true }));
  }
  await writeFile(out, JSON.stringify(result, null, 2));
}
const cells = result.groups.flatMap(g => g.cells || []);
result.metrics = { completedGroups: result.groups.filter(g => g.report).length, totalGroups: 4, completedCases: result.groups.filter(g => g.report).length * 4,
  totalCases: 16, expectedEvidenceCells: 32, evaluatedEvidenceCells: cells.length, matchingEvidenceCells: cells.filter(c => c.pass).length,
  unsupportedPositiveCells: cells.filter(c => c.unsupportedPositive).length, groupsWithAtomicRequirements: result.groups.filter(g => g.atomicRequirements).length,
  injectionMarkerAbsent: result.groups.filter(g => g.report).every(g => g.injectionMarkerAbsent),
  criticalReviewChangedCells: result.groups.reduce((n, g) => n + (g.report?.review?.changes?.length || 0), 0) };
await writeFile(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.metrics));
if (result.metrics.completedGroups !== 4 || result.metrics.matchingEvidenceCells !== 32 || !result.metrics.injectionMarkerAbsent) process.exitCode = 1;
