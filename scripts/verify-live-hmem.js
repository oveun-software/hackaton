import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { demoCandidates, demoVacancy } from '../server/demo.js';
import { getProvider, readZetaris } from '../server/providers.js';

// Real application API, real services, isolated DB, exact public fictional CVs.
const root = fileURLToPath(new URL('../', import.meta.url));
let child, directory;
const reports = [];
async function stop() {
  if (!child) return;
  const current = child; child = null;
  current.kill();
  if (current.exitCode === null) await new Promise(resolve => current.once('exit', resolve));
}
async function start() {
  child = spawn(process.execPath, ['server/index.js'], { cwd: root,
    env: { ...process.env, PORT: '0', DATA_DIR: directory, TALENTLENS_ORG_ID: 'fictional-live-verification', ZETARIS_SYNTHETIC: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.on('data', () => {});
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Verification server startup timeout')), 15000);
    child.stdout.on('data', chunk => {
      const match = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Verification server exited')); });
  });
}
async function call(base, route, body) {
  const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TalentLens-Client': 'workspace' }, body: JSON.stringify(body), signal: AbortSignal.timeout(780000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.code || 'Application API check failed');
  return result;
}
try {
  const provider = getProvider();
  assert.equal(provider.id, 'meterless', 'Use Nightshift for hackathon verification');
  const rows = await readZetaris();
  assert.equal(rows.length, demoCandidates.length, 'Unexpected candidate rows. No inference allowed');
  demoCandidates.forEach((expected, index) => {
    const row = rows.find(item => item.candidate_id === `fictional-${index}`);
    assert.ok(row && row.display_name === expected.name && row.document_name === expected.filename && row.cv_text === expected.text.replace(/\r?\n/g, ' '), 'Zetaris view differs from the public fictional fixtures. No inference allowed');
  });
  directory = await mkdtemp(path.join(tmpdir(), 'talentlens-live-'));
  let base = await start();
  assert.equal((await call(base, '/api/sources/zetaris/import', {})).imported, 3);
  const state = await (await fetch(base + '/api/state')).json();
  for (const candidate of state.candidates) {
    const full = await (await fetch(base + `/api/candidates/${candidate.id}`)).json();
    assert.ok(rows.some(row => row.display_name === full.name && row.document_name === full.filename && row.cv_text === full.text), 'Imported source changed. No inference allowed');
  }
  assert.equal(state.candidates.length, 3);
  console.log('Three exact fictional sources imported from Zetaris. Running role one through Nightshift.');
  const role = await call(base, '/api/vacancies', demoVacancy);
  const first = await call(base, `/api/vacancies/${role.id}/analyze`, { consent: true, language: 'en', note: 'Fictional demonstration only.' });
  reports.push(first);
  assert.ok(first.hmem.stored.created.length > 0, 'First analysis must create source-backed memory');
  await stop();
  base = await start();
  const persisted = await (await fetch(base + '/api/state')).json();
  assert.equal(persisted.reports[0].id, first.id);
  const secondRole = await call(base, '/api/vacancies', { ...demoVacancy, title: 'Frontend Engineer, design systems', description: demoVacancy.description + '\nThis second hiring process focuses on reusable components and accessible interfaces.' });
  console.log('Application restarted. Running a second hiring process with H-MEM recall.');
  const second = await call(base, `/api/vacancies/${secondRole.id}/analyze`, { consent: true, language: 'en', note: 'Fictional demonstration only. Check current CVs and any verified prior evidence.' });
  reports.push(second);
  assert.ok(second.hmem.retrieved.some(item => item.verified && item.fromPreviousProcess && item.providedToNemotron), 'Second process must reinject verified evidence from the first');
  for (const report of reports) {
    assert.equal(report.candidates.length, 3);
    assert.ok(report.executions.length >= 2);
    assert.ok(report.executions.every(item => item.actualModel === provider.model && item.receiptId), 'Actual Nemotron model and Nightshift receipt required');
    console.log(JSON.stringify({ role: report.vacancyTitle, executions: report.executions, retrievedMemories: report.hmem.retrieved.length, usedMemoryIds: report.hmem.usedMemoryIds.length }));
  }
  const output = new URL('../data/live-verification-hmem.json', import.meta.url);
  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  await writeFile(output, JSON.stringify({ verifiedAt: new Date().toISOString(), synthetic: true, applicationRestarted: true, source: 'Zetaris Lightning REST join view', reports }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ status: 'passed', processes: 2, candidatesPerProcess: 3, literalQuotesValidated: true, persistedMemoryReinjected: true, output: fileURLToPath(output) }));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', reason: error.message.startsWith('errors.') ? error.message : 'Live verification failed. Check services and the exact fictional fixture view.', completedReports: reports.length }));
  process.exitCode = 1;
} finally {
  await stop();
  if (directory && path.dirname(path.resolve(directory)) === path.resolve(tmpdir()) && path.basename(directory).startsWith('talentlens-live-')) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
