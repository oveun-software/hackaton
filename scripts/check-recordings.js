import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { evaluationGroups, groupCandidates } from '../evaluation/cases.js';
import { validateReport } from '../server/analysis.js';

const read = async path => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const recording = await read('examples/zetaris/verified-review-workflow.json');
assert.deepEqual(recording, await read('public/recorded/verified-review-workflow.json'), 'Viewer and evidence package must contain the same recording');
assert.equal(recording.status, 'passed'); assert.equal(recording.synthetic, true); assert.equal(recording.applicationRestarted, true); assert.equal(recording.reports.length, 3);
const decisions = report => ({ requirements: report.requirements.map(({ id, priority, quote }) => ({ id, priority, quote })),
  candidates: report.candidates.map(({ candidateId, recommendation, evidence }) => ({ candidateId, recommendation, evidence: evidence.map(({ requirementId, status, quote, sourceId, followUpQuestion }) => ({ requirementId, status, quote, sourceId, questionPresent: Boolean(followUpQuestion) })) })) });
function translations(report) {
  for (const language of ['es', 'fr', 'de']) {
    const translated = report.translations?.[language]; assert.ok(translated, `Missing ${language} translation`); assert.equal(translated.language, language);
    assert.deepEqual(decisions(translated), decisions(report), 'Translations must preserve all decisions and quotations');
    assert.equal(translated.review.findings.length, report.review.findings.length);
  }
}
function executions(items) { assert.ok(items.length >= 2); assert.ok(items.every(item => item.actualModel === recording.model && item.receiptId)); }
for (const report of recording.reports) {
  assert.equal(report.pipelineVersion, 2); executions(report.executions); translations(report);
  assert.ok(report.sources.every(s => s.text.startsWith('FICTIONAL PROFILE FOR DEMONSTRATION')));
  validateReport(report, report.sources.map(s => ({ ...s, evidenceSources: report.evidenceSources.filter(d => d.candidateId === s.id) })), report.requirements);
}
executions(recording.memoryComparison.baseline.executions);
const evaluation = await read('evaluation/results.json');
assert.equal(evaluation.synthetic, true); assert.equal(evaluation.mode, 'live'); assert.equal(evaluation.groups.length, evaluationGroups.length);
assert.equal(evaluation.datasetSha256, createHash('sha256').update(JSON.stringify(evaluationGroups)).digest('hex'), 'Evaluation must refer to the current authored dataset');
let cells = 0;
for (const group of evaluationGroups) {
  const result = evaluation.groups.find(item => item.id === group.id); assert.ok(result); executions(result.executions);
  const judgeInput = await read(`examples/judges/${group.id}/input.json`);
  assert.deepEqual(judgeInput, { synthetic: true, language: 'en', vacancy: { id: group.id, title: group.title, description: group.description }, candidates: groupCandidates(group) });
  const { translations: _translations, ...originalReport } = result.report;
  assert.deepEqual(await read(`examples/judges/${group.id}/output.json`), {
    synthetic: true, mode: 'recorded-live-output', evaluatedAt: evaluation.evaluatedAt, model: evaluation.model,
    datasetSha256: evaluation.datasetSha256, limitation: evaluation.limitation, ...result, report: originalReport
  }, 'Judge examples must preserve the exact recorded results and execution proof');
  validateReport(result.report, groupCandidates(group), result.report.requirements);
  assert.equal(result.cells.length, group.candidates.length * group.criteria.length);
  for (const cell of result.cells) {
    const expected = group.candidates.find(c => c.id === cell.candidateId).expected[cell.criterion];
    assert.deepEqual(cell.expected, expected); assert.equal(cell.pass, expected.includes(cell.actual)); assert.equal(cell.pass, true); cells++;
  }
}
assert.equal(cells, 32); assert.equal(evaluation.metrics.matchingEvidenceCells, cells);
const pilot = await read('public/recorded/evaluation-results.json'), tasks = await read('public/recorded/pilot-cases.json');
assert.equal(tasks.synthetic, true); assert.equal(pilot.synthetic, true); assert.equal(pilot.groups.length, 2);
for (const group of tasks.groups) {
  assert.deepEqual(group, evaluationGroups.find(g => g.id === group.id));
  const result = pilot.groups.find(g => g.id === group.id);
  assert.deepEqual(result, evaluation.groups.find(g => g.id === group.id)); translations(result.report);
}
console.log('Recorded workflow, four paired judge examples, exact source citations, dataset hash, 32 authored assessments and all 15 report translations verified offline.');
