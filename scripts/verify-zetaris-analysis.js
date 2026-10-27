// Real sponsor smoke check. Only the repository's exact fictional fixtures may enter inference.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoCandidates } from '../server/demo.js';
import { getProvider, readZetaris, zetarisInputDigest, assertProviderReady } from '../server/providers.js';

const root = fileURLToPath(new URL('../', import.meta.url)), provider = getProvider();
let child, directory;
try {
  assert.equal(provider.id, 'meterless'); assert.ok(provider.model.startsWith('nvidia/nemotron'));
  await assertProviderReady(provider);
  const rows = await readZetaris(); assert.equal(rows.length, demoCandidates.length);
  for (const [i, c] of demoCandidates.entries()) assert.ok(rows.some(r => r.candidate_id === `fictional-${i}` && r.display_name === c.name && r.document_name === c.filename && r.cv_text === c.text.replace(/\r?\n/g, ' ')), 'Unexpected source fixture');
  directory = await mkdtemp(path.join(tmpdir(), 'talentlens-zetaris-check-'));
  child = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, PORT: '0', DATA_DIR: directory, TALENTLENS_ORG_ID: 'fictional-zetaris-check', ZETARIS_SYNTHETIC: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.resume();
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Startup timeout')), 15000);
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.once('exit', () => { clearTimeout(timer); reject(Error('Server stopped')); });
    child.stdout.on('data', bytes => { const m = String(bytes).match(/http:\/\/127\.0\.0\.1:\d+/); if (m) { clearTimeout(timer); resolve(m[0]); } });
  });
  const post = async (route, body) => {
    const r = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TalentLens-Client': 'workspace' }, body: JSON.stringify(body), signal: AbortSignal.timeout(1200000) });
    const value = await r.json(); if (!r.ok) throw Error(value.code || 'Request failed'); return value;
  };
  const vacancy = await post('/api/vacancies', { title: 'Product engineer', company: 'Fictional Studio', location: 'Remote', description: 'Professional TypeScript development experience is required. Experience developing Python APIs is preferred.' });
  console.log('Querying Zetaris inside the analysis request, then running Nemotron through Nightshift.');
  const report = await post(`/api/vacancies/${vacancy.id}/analyze`, { consent: true, language: 'en', sourceMode: 'zetaris', expectedZetarisDigest: zetarisInputDigest(rows) });
  assert.equal(report.dataAccess.mode, 'zetaris'); assert.equal(report.dataAccess.status, 'passed'); assert.equal(report.dataAccess.rowCount, 3);
  assert.equal(report.sources.length, 3); assert.equal(report.dataAccess.documents.length, 3);
  for (const s of report.sources) {
    assert.ok(rows.some(r => r.cv_text === s.text && r.display_name === s.name));
    const d = report.dataAccess.documents.find(d => d.documentId === s.documentId);
    assert.equal(d.sha256, createHash('sha256').update(s.text).digest('hex')); assert.equal(d.version, s.documentVersion);
  }
  assert.ok(report.executions.length >= 3 && report.executions.every(e => e.actualModel === provider.model && e.receiptId));
  const output = path.join(root, 'data/live-zetaris-analysis.json'); await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify({ verifiedAt: new Date().toISOString(), synthetic: true, mode: 'recorded-live-output', status: 'passed', report }, null, 2));
  console.log(JSON.stringify({ status: 'passed', candidates: 3, queryId: report.dataAccess.queryId, modelCalls: report.executions.length, output }));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', reason: error.message.startsWith('errors.') ? error.message : 'Fixture or verification assertion failed. No successful verification is claimed.' })); process.exitCode = 1;
} finally {
  if (child) { child.kill(); if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve)); }
  if (directory && path.dirname(path.resolve(directory)) === path.resolve(tmpdir()) && path.basename(directory).startsWith('talentlens-zetaris-check-')) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
