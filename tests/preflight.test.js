import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reviewFixture } from './review-fixture.js';

async function workspace(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'talentlens-preflight-'));
  const calls = [], gates = new Set();
  let nextGate, catalogStatus = 200, available = true;
  const mock = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/models') {
      const gate = nextGate; nextGate = null;
      if (gate) { gate.started(); await gate.released; }
      res.statusCode = catalogStatus;
      return res.end(JSON.stringify({ data: [{ id: available ? 'meterless/deep' : 'meterless/other' }] }));
    }
    let body = ''; for await (const chunk of req) body += chunk;
    const request = JSON.parse(body); calls.push(request);
    const prompt = request.messages[1].content;
    let answer;
    if (request.messages[0].content.startsWith('You translate recruiting reports')) answer = JSON.parse(prompt);
    else if (prompt.startsWith('Extract only')) answer = { requirements: [{ id: 'r', label: 'React and TypeScript', priority: 'required', quote: 'React and TypeScript' }], clarificationQuestions: [] };
    else if (prompt.startsWith('Perform an independent')) answer = reviewFixture(request.messages);
    else answer = { summary: 'A fictional source-backed report for review.', candidates: JSON.parse(prompt.split('DATA: ')[1]).candidates.map(c => ({
      candidateId: c.id, recommendation: 'possible', rationale: 'The fictional document states professional experience.',
      evidence: [{ requirementId: 'r', status: 'supported', quote: 'React and TypeScript', sourceId: c.sources[0].id, explanation: 'The source describes relevant professional experience.' }], interviewQuestions: []
    })) };
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }));
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  const child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: '0', DATA_DIR: directory,
    TALENTLENS_ORG_ID: 'preflight-test', AI_PROVIDER: 'meterless', METERLESS_MODEL: 'meterless/deep',
    METERLESS_BASE_URL: `http://127.0.0.1:${mock.address().port}`, METERLESS_RUNTIME_TOKEN: 'fixture-token' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr.resume();
  t.after(async () => {
    for (const release of gates) release();
    child.kill(); if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
    mock.closeAllConnections(); await new Promise(resolve => mock.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('App startup timeout')), 10000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`App exited: ${code}`)); });
    child.stdout.on('data', bytes => { const match = String(bytes).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } });
  });
  const read = async route => (await fetch(base + route)).json();
  const call = (route, body, method = 'POST') => {
    const pending = fetch(base + route, { method, headers: { 'X-TalentLens-Client': 'workspace', ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
      body: body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    pending.catch(() => {}); return pending;
  };
  const job = await (await call('/api/vacancies', { title: 'Fictional developer', company: '', location: '', description: 'Professional experience with React and TypeScript is required.' })).json();
  const files = new FormData(); files.append('files', new Blob(['FICTIONAL CV. PRIVATE_PREFLIGHT_SOURCE. Professional experience with React and TypeScript for two years.']), 'fictional.txt');
  const uploaded = await call('/api/candidates', files); assert.equal(uploaded.status, 201);
  const candidate = (await uploaded.json()).added[0];
  return { calls, call, read, candidate,
    analyze: () => call(`/api/vacancies/${job.id}/analyze`, { consent: true }),
    remove: () => call(`/api/candidates/${candidate.id}`, { reason: 'Delete fictional test source during readiness check' }, 'DELETE'),
    catalog: (status, hasModel = true) => { catalogStatus = status; available = hasModel; },
    holdCatalog: () => {
      let started, release;
      const ready = new Promise(resolve => { started = resolve; });
      const released = new Promise(resolve => { release = resolve; });
      gates.add(release); nextGate = { started, released }; return { ready, release };
    }
  };
}

test('readiness check owns the inference lock before awaiting the provider', { timeout: 20000 }, async t => {
  const w = await workspace(t);
  const initial = await w.analyze(); assert.equal(initial.status, 200); const report = await initial.json();
  const gate = w.holdCatalog(), pending = w.analyze(); await gate.ready;
  assert.equal((await w.analyze()).status, 409, 'a second analysis must not pass a pending preflight');
  assert.equal((await w.call(`/api/reports/${report.id}/translate`, { consent: true, language: 'fr' })).status, 409);
  assert.equal((await w.read('/api/analysis/progress')).running, true);
  gate.release(); assert.equal((await pending).status, 200);
  const translationGate = w.holdCatalog();
  const translation = w.call(`/api/reports/${report.id}/translate`, { consent: true, language: 'fr' }); await translationGate.ready;
  assert.equal((await w.analyze()).status, 409, 'translation preflight must hold the same lock');
  translationGate.release(); assert.equal((await translation).status, 200);
});

test('CV deletion during preflight sends no stale source and creates no report', { timeout: 20000 }, async t => {
  const w = await workspace(t), gate = w.holdCatalog(), pending = w.analyze(); await gate.ready;
  assert.equal((await w.remove()).status, 200); gate.release();
  assert.equal((await pending).status, 409); assert.equal(w.calls.length, 0, 'no inference after consented sources changed');
  const state = await w.read('/api/state'); assert.equal(state.candidates.length, 0); assert.equal(state.reports.length, 0);
  assert.equal((await w.read('/api/analysis/progress')).running, false);
});

test('CV replacement during preflight invalidates the captured input', { timeout: 20000 }, async t => {
  const w = await workspace(t), gate = w.holdCatalog(), pending = w.analyze(); await gate.ready;
  const update = new FormData(); update.append('file', new Blob(['FICTIONAL UPDATED CV. React and TypeScript experience with a new project and responsibilities.']), 'updated.txt');
  assert.equal((await w.call(`/api/candidates/${w.candidate.id}/documents`, update)).status, 200); gate.release();
  assert.equal((await pending).status, 409); assert.equal(w.calls.length, 0);
  assert.equal((await w.analyze()).status, 200, 'a new request uses the new version after lock release');
});

test('translation preflight cannot send a report redacted while checking readiness', { timeout: 20000 }, async t => {
  const w = await workspace(t); const report = await (await w.analyze()).json(); const before = w.calls.length;
  const gate = w.holdCatalog(), pending = w.call(`/api/reports/${report.id}/translate`, { consent: true, language: 'de' }); await gate.ready;
  assert.equal((await w.remove()).status, 200); gate.release();
  assert.equal((await pending).status, 409); assert.equal(w.calls.length, before, 'redacted report must never leave the app');
  assert.equal(JSON.stringify((await w.read('/api/state')).reports).includes('PRIVATE_PREFLIGHT_SOURCE'), false);
});

test('offline, unauthorized and unavailable-model preflights release the lock without sending CVs', { timeout: 20000 }, async t => {
  const w = await workspace(t);
  for (const [status, model, code] of [[503, true, 'errors.providerOffline'], [401, true, 'errors.providerAuth'], [200, false, 'errors.modelUnavailable']]) {
    w.catalog(status, model); const response = await w.analyze(); assert.equal(response.status, 503); assert.equal((await response.json()).code, code);
    assert.equal(w.calls.length, 0); assert.equal((await w.read('/api/analysis/progress')).running, false);
  }
  w.catalog(200); assert.equal((await w.analyze()).status, 200);
});
