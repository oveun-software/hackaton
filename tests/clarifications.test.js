import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reviewFixture } from './review-fixture.js';

test('clarifications change evidence, persist with attribution and disappear from reports on source deletion', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'talentlens-clarification-'));
  const mock = createServer(async (req, res) => {
    if (req.url === '/v1/models') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ data: [{ id: 'meterless/deep' }] }));
    }
    let body = ''; for await (const chunk of req) body += chunk;
    const request = JSON.parse(body), prompt = request.messages[1].content;
    let answer;
    if (prompt.startsWith('Extract only')) answer = { requirements: [{ id: 'ts', label: 'TypeScript development', priority: 'required', quote: 'TypeScript development experience is required' }], clarificationQuestions: [] };
    else if (prompt.startsWith('Perform an independent')) answer = reviewFixture(request.messages);
    else {
      const data = JSON.parse(prompt.split('DATA: ')[1]);
      answer = { summary: 'A source-backed assessment for a fictional role.', candidates: data.candidates.map(c => {
        const note = c.sources.find(s => s.kind === 'clarification');
        return { candidateId: c.id, recommendation: note ? 'possible' : 'insufficient_evidence', rationale: 'Review professional evidence and the attributed interview statement.', evidence: [{ requirementId: 'ts', status: note ? 'supported' : 'missing', quote: note?.text || null, sourceId: note?.id || null, explanation: 'An attributed statement is available when recorded.', followUpQuestion: note ? null : 'Which completed TypeScript project demonstrates professional experience?' }], interviewQuestions: [] };
      }) };
    }
    res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }));
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  const child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: '0', DATA_DIR: directory, TALENTLENS_ORG_ID: 'clarification-test', AI_PROVIDER: 'meterless', METERLESS_MODEL: 'meterless/deep', METERLESS_BASE_URL: `http://127.0.0.1:${mock.address().port}`, METERLESS_RUNTIME_TOKEN: 'fixture-token' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { child.kill(); if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve)); await new Promise(resolve => mock.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Server startup timeout')), 10000); child.stdout.on('data', bytes => { const match = String(bytes).match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timer); resolve(match[0]); } }); });
  const call = (route, body, method = 'POST') => fetch(base + route, { method, headers: { 'X-TalentLens-Client': 'workspace', ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) }, body: body instanceof FormData ? body : JSON.stringify(body) });
  const job = await (await call('/api/vacancies', { title: 'Developer', company: 'Fictional', location: '', description: 'Professional TypeScript development experience is required.' })).json();
  const files = new FormData(); files.append('files', new Blob(['FICTIONAL CV. Built JavaScript interfaces and studied frontend engineering.']), 'fictional.txt');
  const candidate = (await (await call('/api/candidates', files)).json()).added[0];
  const first = await (await call(`/api/vacancies/${job.id}/analyze`, { consent: true })).json();
  assert.equal(first.candidates[0].evidence[0].status, 'missing');
  const fields = { vacancyId: job.id, question: 'Which TypeScript project did you complete?', answer: 'FICTIONAL_INTERVIEW_SOURCE: Built a TypeScript billing dashboard for two years.', sourceLabel: 'Fictional interview transcript', sourceType: 'candidate_response', confirmed: true };
  assert.equal((await call(`/api/candidates/${candidate.id}/clarifications`, { ...fields, confirmed: false })).status, 400);
  assert.equal((await call('/api/candidates/unrelated/clarifications', fields)).status, 404);
  const added = await call(`/api/candidates/${candidate.id}/clarifications`, fields); assert.equal(added.status, 201); const source = await added.json();
  const secondResponse = await call(`/api/vacancies/${job.id}/analyze`, { consent: true }); assert.equal(secondResponse.status, 200); const second = await secondResponse.json();
  assert.equal(second.candidates[0].evidence[0].status, 'supported'); assert.equal(second.candidates[0].evidence[0].sourceId, source.id);
  assert.equal(second.changes.previousReportId, first.id); assert.equal(second.changes.evidence[0].before, 'missing');
  assert.equal(second.evidenceSources.find(s => s.id === source.id).attribution, 'recruiter_recorded_statement');
  assert.equal(second.hmem.stored.created.length, 1);
  assert.equal((await call(`/api/candidates/${candidate.id}/documents/${source.id}`, { reason: 'Remove fictional interview source for privacy test' }, 'DELETE')).status, 200);
  const state = await (await fetch(base + '/api/state')).json();
  assert.equal(state.candidates.length, 1, 'deleting a clarification does not delete the current CV');
  assert.equal(JSON.stringify(state.reports).includes('FICTIONAL_INTERVIEW_SOURCE'), false);
  assert.equal(state.reports.find(r => r.id === second.id).review, null);
  const memory = await (await fetch(`${base}/api/candidates/${candidate.id}/memory`)).json(); assert.equal(memory.memories.length, 0);
});
