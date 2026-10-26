import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { demoCandidates } from '../server/demo.js';
import { getProvider, readZetaris, completeJson } from '../server/providers.js';
import { runAnalysis } from '../server/analysis.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const provider = getProvider(), reports = [];
let child, directory, base;
const output = new URL('../data/live-review-workflow.json', import.meta.url);
async function stop() { if (!child) return; const current = child; child = null; current.kill(); if (current.exitCode === null) await new Promise(resolve => current.once('exit', resolve)); }
async function start() {
  child = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: '0', DATA_DIR: directory, TALENTLENS_ORG_ID: 'fictional-evidence-review', ZETARIS_SYNTHETIC: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', () => {});
  base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 15000);
    child.stdout.on('data', bytes => { const match = String(bytes).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Verification server stopped')); });
  });
}
async function get(route) { const r = await fetch(base + route); if (!r.ok) throw new Error('Read failed'); return r.json(); }
async function post(route, body) {
  const r = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TalentLens-Client': 'workspace' }, body: JSON.stringify(body), signal: AbortSignal.timeout(1200000) });
  const result = await r.json(); if (!r.ok) throw new Error(result.code || 'Application request failed'); return result;
}
const record = () => ({ verifiedAt: new Date().toISOString(), synthetic: true, applicationRestarted: reports.length >= 3,
  source: 'Real Zetaris Lightning REST import; fictional attributed clarification', model: provider.model, reports });
async function save() { await mkdir(new URL('../data/', import.meta.url), { recursive: true }); await writeFile(output, JSON.stringify(record(), null, 2)); }
function verify(report) {
  assert.equal(report.pipelineVersion, 2); assert.ok(report.review);
  assert.ok(report.executions.length >= 2);
  assert.ok(report.executions.every(e => e.actualModel === provider.model && e.receiptId), 'Actual Nemotron execution and Nightshift receipt are required');
}
try {
  assert.equal(provider.id, 'meterless'); assert.ok(provider.model.startsWith('nvidia/nemotron'));
  const rows = await readZetaris(); assert.equal(rows.length, demoCandidates.length);
  for (const [i, expected] of demoCandidates.entries()) assert.ok(rows.some(row => row.candidate_id === `fictional-${i}` && row.display_name === expected.name && row.document_name === expected.filename && row.cv_text === expected.text.replace(/\r?\n/g, ' ')), 'Only exact public fictional fixtures may be sent');
  directory = await mkdtemp(path.join(tmpdir(), 'talentlens-review-'));
  await start(); await post('/api/sources/zetaris/import', {});
  const state = await get('/api/state'), sam = state.candidates.find(c => c.name === 'Sam Torres'); assert.ok(sam);
  const job = await post('/api/vacancies', { title: 'Product engineer', company: 'Fictional Studio', location: 'Remote', description: 'Professional TypeScript development experience is required. Experience developing Python APIs is preferred.' });
  console.log('1/4: analysing the fictional profiles before clarification.');
  const before = await post(`/api/vacancies/${job.id}/analyze`, { consent: true, language: 'en' }); verify(before); reports.push(before); await save();
  const ts = before.requirements.find(r => /typescript/i.test(r.label)); assert.ok(ts);
  assert.notEqual(before.candidates.find(c => c.candidateId === sam.id).evidence.find(e => e.requirementId === ts.id).status, 'supported');
  const clarification = await post(`/api/candidates/${sam.id}/clarifications`, { vacancyId: job.id,
    question: 'Which completed TypeScript project demonstrates your professional experience?',
    answer: 'FICTIONAL INTERVIEW STATEMENT. I built and maintained a TypeScript billing dashboard for a client from January 2024 to January 2026. I implemented typed API contracts and automated tests. The old CV omitted this completed project.',
    sourceLabel: 'Fictional candidate interview, 26 October 2026', sourceType: 'candidate_response', confirmed: true });
  console.log('2/4: analysing the attributed clarification and comparing evidence states.');
  const after = await post(`/api/vacancies/${job.id}/analyze`, { consent: true, language: 'en' }); verify(after); reports.push(after); await save();
  assert.ok(after.changes.evidence.some(c => c.candidateId === sam.id && c.requirementId === ts.id && c.after === 'supported'));
  assert.equal(after.candidates.find(c => c.candidateId === sam.id).evidence.find(e => e.requirementId === ts.id).sourceId, clarification.id);
  await stop(); await start();
  const next = await post('/api/vacancies', { title: 'Platform engineer', company: 'Fictional Studio', location: 'Remote', description: job.description });
  console.log('3/4: another role after restart, using source-backed historical memory.');
  const recall = await post(`/api/vacancies/${next.id}/analyze`, { consent: true, language: 'en' }); verify(recall); reports.push(recall); await save();
  assert.ok(recall.hmem.retrieved.some(m => m.documentId === clarification.id && m.fromPreviousProcess));
  const sameCandidates = await Promise.all(state.candidates.map(c => get(`/api/candidates/${c.id}`)));
  const baselineExecutions = [];
  console.log('4/4: comparison without H-MEM, with the same role, CVs and requirements.');
  const baseline = await runAnalysis({ vacancy: next, candidates: sameCandidates, language: 'en', previousReport: recall,
    complete: messages => completeJson(provider, messages, fetch, execution => baselineExecutions.push(execution)) });
  assert.ok(baselineExecutions.length && baselineExecutions.every(e => e.receiptId && e.actualModel === provider.model));
  const memoryComparison = { description: 'Same current CVs, role, extracted requirements and model; only H-MEM supplies the earlier role’s clarification. One stochastic run per condition; no general causal or productivity claim.',
    candidateId: sam.id, historicalClarificationId: clarification.id,
    withMemory: recall.candidates.find(c => c.candidateId === sam.id).evidence,
    withoutMemory: baseline.candidates.find(c => c.candidateId === sam.id).evidence,
    baseline: { ...baseline, executions: baselineExecutions } };
  await writeFile(output, JSON.stringify({ ...record(), status: 'passed', memoryComparison }, null, 2));
  console.log(JSON.stringify({ status: 'passed', reports: reports.length, sourceAttributionVerified: true, restartVerified: true, memoryComparisonRecorded: true, output: fileURLToPath(output) }));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', error: error.message.startsWith('errors.') ? error.message : 'Live workflow assertion failed; inspect the saved fictional reports.', completedReports: reports.length })); process.exitCode = 1;
} finally {
  await stop();
  if (directory && path.dirname(path.resolve(directory)) === path.resolve(tmpdir()) && path.basename(directory).startsWith('talentlens-review-')) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
