import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { dataAccessView } from '../public/evidence-view.js';
import { reportMarkdown } from '../public/report-export.js';
import { reviewFixture } from './review-fixture.js';

test('fresh Zetaris analysis excludes workspace CVs and preserves query-to-document provenance', { timeout: 20000 }, async t => {
  const w = await workspace(t);
  const response = await w.fromZetaris(); assert.equal(response.status, 200); const report = await response.json();
  assert.equal(w.queries.length, 1); assert.equal(report.sources.length, 1);
  assert.notEqual(report.sources[0].id, w.candidate.id);
  const trace = report.dataAccess, query = w.queries[0], source = report.sources[0];
  assert.equal(trace.status, 'passed'); assert.equal(trace.queryId, query.queryId); assert.equal(trace.requestId, query.requestId);
  assert.equal(trace.sql, query.sql); assert.equal(trace.rowCount, 1); assert.equal(trace.limit, 25);
  assert.ok(Date.parse(trace.completedAt) >= Date.parse(trace.startedAt)); assert.ok(trace.durationMs >= 0);
  assert.deepEqual(trace.documents[0], { candidateId: source.id, documentId: source.documentId, version: 1, filename: source.filename, sha256: createHash('sha256').update(source.text).digest('hex') });
  assert.equal(w.calls.some(c => JSON.stringify(c).includes('PRIVATE_PREFLIGHT_SOURCE')), false);
  assert.equal(JSON.stringify(report).includes('fixture-zetaris-key'), false);
  for (const language of ['en', 'es', 'fr', 'de']) {
    assert.ok(dataAccessView(trace, language).includes(query.requestId));
    assert.ok(reportMarkdown(report, language).includes(trace.documents[0].sha256));
  }
  const original = report.sources[0];
  w.setRows(w.getRows().map(r => ({ ...r, cv_text: r.cv_text + ' New project delivered in October.' })));
  const second = await (await w.fromZetaris()).json(); assert.equal(w.queries.length, 2);
  assert.equal(second.sources[0].documentVersion, 2); assert.notEqual(second.sources[0].documentId, original.documentId);
  assert.notEqual(second.dataAccess.queryId, trace.queryId);
  const state = await w.read('/api/state'); assert.equal(state.reports.find(r => r.id === report.id).sources[0].text, original.text);
  assert.ok(state.candidates.some(c => c.id === w.candidate.id), 'local upload remains available');
});

test('empty and failed Zetaris reads never fall back to cached CVs; local mode remains usable', { timeout: 20000 }, async t => {
  const w = await workspace(t); assert.equal((await w.fromZetaris()).status, 200); const count = w.calls.length;
  w.setRows([]); let response = await w.fromZetaris(); assert.equal(response.status, 422);
  assert.equal((await response.json()).code, 'errors.zetarisEmpty'); assert.equal(w.calls.length, count);
  w.setQueryStatus(401); response = await w.fromZetaris(); assert.equal(response.status, 503);
  const error = await response.json(); assert.equal(error.code, 'errors.zetarisAuth'); assert.equal(error.dataAccess.status, 'failed');
  assert.ok(error.dataAccess.sql.startsWith('SELECT ')); assert.equal(w.calls.length, count);
  assert.equal((await w.read('/api/state')).reports.length, 1); assert.equal((await w.read('/api/analysis/progress')).running, false);
  const queryCount = w.queries.length; const local = await w.analyze(); assert.equal(local.status, 200);
  assert.equal((await local.json()).dataAccess.mode, 'workspace'); assert.equal(w.queries.length, queryCount);
});

test('malformed and duplicate remote rows are rejected atomically before inference', { timeout: 20000 }, async t => {
  const w = await workspace(t), original = w.getRows()[0];
  const mismatch = await w.fromZetaris({ expectedZetarisDigest: '0'.repeat(64) });
  assert.equal(mismatch.status, 409); assert.equal(w.calls.length, 0);
  for (const rows of [[original, { ...original, candidate_id: 'bad', cv_text: 'short' }], [original, original]]) {
    w.setRows(rows); const response = await w.fromZetaris(); assert.ok([400, 422].includes(response.status));
    assert.equal(w.calls.length, 0); assert.equal((await w.read('/api/state')).candidates.length, 1);
  }
  w.setRows([original]); assert.equal((await w.fromZetaris()).status, 200);
});

test('pending Zetaris query holds the lock and a deletion cannot be undone by its response', { timeout: 20000 }, async t => {
  const w = await workspace(t); const prior = await (await w.fromZetaris()).json(); const count = w.calls.length;
  const gate = w.holdQuery(), pending = w.fromZetaris(); await gate.ready;
  assert.equal((await w.analyze()).status, 409);
  assert.equal((await w.call('/api/sources/zetaris/import', {})).status, 409);
  assert.equal((await w.call(`/api/reports/${prior.id}/translate`, { consent: true, language: 'fr' })).status, 409);
  assert.equal((await w.read('/api/analysis/progress')).stage, 'zetaris');
  assert.equal((await w.call(`/api/candidates/${prior.sources[0].id}`, { reason: 'Delete fictional remote candidate while the query is pending' }, 'DELETE')).status, 200);
  gate.release(); assert.equal((await pending).status, 409); assert.equal(w.calls.length, count);
  const state = await w.read('/api/state'); assert.equal(state.candidates.length, 1);
  assert.deepEqual(state.reports[0].dataAccess.documents, []); assert.equal(state.reports[0].dataAccess.redacted, true);
  assert.equal((await w.read('/api/analysis/progress')).running, false);
});

test('a changed query result excludes candidates absent from the new result', { timeout: 20000 }, async t => {
  const w = await workspace(t), firstRow = w.getRows()[0];
  const first = await (await w.fromZetaris()).json();
  w.setRows([{ ...firstRow, candidate_id: 'remote-2', display_name: 'Another fictional candidate' }]);
  const second = await (await w.fromZetaris()).json();
  assert.equal(second.sources.length, 1); assert.notEqual(second.sources[0].id, first.sources[0].id);
  assert.equal(second.dataAccess.documents[0].candidateId, second.sources[0].id);
});

test('trace rendering escapes remote file names and SQL', () => {
  const html = dataAccessView({ mode: 'zetaris', status: 'passed', sql: '<script>alert(1)</script>', documents: [{ filename: '<img src=x>', documentId: 'doc', sha256: 'hash', version: 1 }] }, 'en');
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img src=x>')); assert.ok(html.includes('&lt;script&gt;'));
});

async function workspace(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'talentlens-preflight-'));
  const calls = [], gates = new Set();
  let rows = [{ candidate_id: "remote-1", display_name: "Fictional Remote", document_name: "remote.txt", cv_text: "FICTIONAL CV. Professional experience with React and TypeScript on customer projects." }], zetarisStatus = 200;
  const queries = []; let queryGate;
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
    const request = JSON.parse(body);
    if (req.url === '/api/v1.0/sql-editor/sqls/run') {
      queries.push({ ...request, requestId: req.headers['x-request-id'] });
      const gate = queryGate; queryGate = null; if (gate) { gate.started(); await gate.released; }
      res.statusCode = zetarisStatus; return res.end(JSON.stringify({ data: rows }));
    }
    calls.push(request);
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
    METERLESS_BASE_URL: `http://127.0.0.1:${mock.address().port}`, METERLESS_RUNTIME_TOKEN: 'fixture-token', ZETARIS_REST_URL: `http://127.0.0.1:${mock.address().port}/api/v1.0`, ZETARIS_API_KEY: 'fixture-zetaris-key', ZETARIS_ORG_ID: '1' },
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
  return { calls, call, read, candidate, queries,
    setRows: value => { rows = value; }, getRows: () => rows.map(r => ({ ...r })),
    setQueryStatus: value => { zetarisStatus = value; },
    fromZetaris: (extra = {}) => call(`/api/vacancies/${job.id}/analyze`, { consent: true, sourceMode: 'zetaris', ...extra }),
    holdQuery: () => { let started, release; const ready = new Promise(r => { started = r; }); const released = new Promise(r => { release = r; }); gates.add(release); queryGate = { started, released }; return { ready, release }; },
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

