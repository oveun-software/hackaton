import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { translate } from '../public/i18n.js';

test('complete workflow: upload, role, consent, AI evidence, and persistent review', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'talentlens-test-'));
  const seenCalls = [];
  let gate;
  const mock = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: [{ id: 'meterless/deep' }] }));
    let body = ''; for await (const chunk of req) body += chunk;
    const request = JSON.parse(body); seenCalls.push(request);
    assert.equal(req.headers.authorization, 'Bearer fixture-token');
    const data = request.messages[1].content;
    const translating = request.messages[0].content.startsWith('You translate recruiting reports');
    if (gate && (translating ? 'translation' : data.startsWith('Extract only') ? 'requirements' : 'comparison') === gate.stage) {
      gate.started(); await gate.released;
    }
    const answer = request.messages[0].content.startsWith('You translate recruiting reports')
      ? { ...JSON.parse(data), summary: 'A translated analysis for reviewing professional experience.' }
      : data.startsWith('Extract only')
      ? { requirements: [{ id: 'r1', label: 'React and TypeScript', priority: 'required', quote: 'React and TypeScript' }], clarificationQuestions: [] }
      : { summary: 'PRIVATE_NARRATIVE: The document contains relevant professional experience that should be discussed in an interview.', candidates: JSON.parse(data.split('DATA: ')[1]).candidates.map(c => ({ candidateId: c.id, recommendation: 'possible', rationale: 'PRIVATE_NARRATIVE: The CV states professional experience with the technologies in the role.', evidence: [{ requirementId: 'r1', status: 'supported', quote: 'React and TypeScript', explanation: 'The experience is described in the document.' }], interviewQuestions: ['What did you contribute to that project?'] })) };
    res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(answer) } }] }));
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  const child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: '0', DATA_DIR: directory, AI_PROVIDER: 'meterless', METERLESS_BASE_URL: `http://127.0.0.1:${mock.address().port}/v1`, METERLESS_RUNTIME_TOKEN: 'fixture-token' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverErrors = '';
  child.stderr.on('data', chunk => { serverErrors += chunk; });
  t.after(() => { if (serverErrors.replace(/\(node:\d+\) ExperimentalWarning: SQLite[^\n]*\n[^\n]*\n/g, '').trim()) console.error(serverErrors); });
  t.after(async () => { child.kill(); await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)); await new Promise(resolve => mock.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('The server did not start')), 10000);
    child.stdout.on('data', chunk => { const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timeout); resolve(match[0]); } });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
  });
  const call = async (url, body, headers = {}) => fetch(`${base}${url}`, { method: 'POST', headers: { 'X-TalentLens-Client': 'workspace', ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body instanceof FormData ? body : JSON.stringify(body) });
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(`${base}/api/state`, { headers: { 'X-TalentLens-Organization': 'other-organization' } })).status, 403);
  assert.equal((await call('/api/demo', {}, { Origin: 'https://untrusted.example' })).status, 403);
  const description = 'Professional experience with React and TypeScript is required for B2B tools.';
  const vacancyResponse = await call('/api/vacancies', { title: 'Frontend Developer', company: 'Fictional Corp', location: 'Remote', description });
  assert.equal(vacancyResponse.status, 201); const vacancy = await vacancyResponse.json();
  const docx = zipSync({ '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Fictional profile. Professional experience with React and TypeScript in B2B products for five years.</w:t></w:r></w:p></w:body></w:document>') });
  const pdfObjects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream = 'BT /F1 12 Tf 50 700 Td (Fictional profile. Professional experience with React and TypeScript for five years.) Tj ET';
  pdfObjects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  pdfObjects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const files = new FormData();
  files.append('files', new Blob(['Fictional profile. Professional experience with React and TypeScript for five years.']), 'profile.txt');
  files.append('files', new Blob([docx]), 'profile.docx');
  files.append('files', new Blob([pdf]), 'profile.pdf');
  const upload = await call('/api/candidates', files); assert.equal(upload.status, 201);
  const uploaded = await upload.json(); assert.equal(uploaded.added.length, 3); assert.equal(uploaded.errors.length, 0);
  const invalid = new FormData(); invalid.append('files', new Blob(['Not a PDF']), 'fake.pdf');
  assert.equal((await call('/api/candidates', invalid)).status, 422);
  for (const language of ['en', 'es', 'fr', 'de']) {
    const failure = await call('/api/vacancies/missing/analyze', { consent: true }, { 'Accept-Language': language });
    const payload = await failure.json(); assert.equal(payload.code, 'errors.roleNotFound'); assert.equal(payload.error, translate(language, payload.code));
  }
  const dtd = new FormData();
  dtd.append('files', new Blob([zipSync({ 'word/document.xml': strToU8('<!DOCTYPE document [<!ENTITY x "unsafe">]><document><t>&x;</t></document>') })]), 'dtd.docx');
  assert.equal((await call('/api/candidates', dtd)).status, 422);
  assert.equal((await call(`/api/vacancies/${vacancy.id}/analyze`, { consent: false })).status, 400); assert.equal(seenCalls.length, 0);
  const response = await call(`/api/vacancies/${vacancy.id}/analyze`, { consent: true, note: 'Review projects.' });
  assert.equal(response.status, 200); const report = await response.json();
  assert.equal(report.candidates.length, 3); assert.equal(report.sources.length, 3); assert.equal(seenCalls.length, 2);
  assert.equal(report.hmem.stored.created.length, 3);
  assert.deepEqual(report.hmem.usedMemoryIds, []);
  assert.equal(report.language, 'en');
  assert.equal((await call(`/api/reports/${report.id}/translate`, { consent: false, language: 'fr' })).status, 400);
  const translation = await call(`/api/reports/${report.id}/translate`, { consent: true, language: 'fr' });
  assert.equal(translation.status, 200);
  const translatedReport = await translation.json(); assert.equal(translatedReport.translations.fr.language, 'fr');
  assert.deepEqual(translatedReport.sources, report.sources);
  assert.equal(translatedReport.translations.fr.candidates[0].evidence[0].quote, report.candidates[0].evidence[0].quote);
  await call(`/api/reports/${report.id}/translate`, { consent: true, language: 'fr' }); assert.equal(seenCalls.length, 3);
  const review = await call('/api/reviews', { reportId: report.id, candidateId: report.candidates[0].candidateId, status: 'interview' }); assert.equal(review.status, 200);
  const state = await (await fetch(`${base}/api/state`)).json(); assert.equal(state.reports.length, 1); assert.equal(state.reviews[0].status, 'interview');
  assert.equal(JSON.stringify(state).includes('fixture-token'), false);
  const deletedCandidateId = report.candidates[0].candidateId;
  const pause = stage => {
    let started, release;
    const ready = new Promise(resolve => { started = resolve; });
    const released = new Promise(resolve => { release = resolve; });
    gate = { stage, started, released };
    return { ready, release: () => { release(); gate = null; } };
  };
  const translationPause = pause('translation');
  const pendingTranslation = call(`/api/reports/${report.id}/translate`, { consent: true, language: 'de' });
  await translationPause.ready;
  const deletion = await fetch(`${base}/api/candidates/${deletedCandidateId}`, { method: 'DELETE', headers: { 'X-TalentLens-Client': 'workspace', 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'candidate privacy deletion request' }) });
  assert.equal(deletion.status, 200);
  translationPause.release();
  const rejectedTranslation = await pendingTranslation;
  assert.equal(rejectedTranslation.status, 409);
  assert.equal((await rejectedTranslation.json()).code, 'errors.contextChanged');
  const redacted = await (await fetch(`${base}/api/state`)).json();
  assert.equal(redacted.candidates.some(candidate => candidate.id === deletedCandidateId), false);
  const redactedReport = redacted.reports[0], redactedSource = redactedReport.sources.find(source => source.id === deletedCandidateId);
  assert.equal(redactedSource.text, null); assert.equal(redactedSource.name, 'Deleted candidate');
  assert.equal(redactedReport.candidates.find(candidate => candidate.candidateId === deletedCandidateId).evidence[0].quote, null);
  assert.equal((redactedReport.hmem.retrieved || []).some(item => item.candidateId === deletedCandidateId), false);
  assert.equal(JSON.stringify(redactedReport).includes('PRIVATE_NARRATIVE'), false);
  assert.equal(redactedReport.translations.de, undefined);
  assert.equal(redactedReport.translations.fr.summary, translate('fr', 'privacy.reportRedacted'));

  const deleteRequest = candidateId => fetch(`${base}/api/candidates/${candidateId}`, { method: 'DELETE', headers: { 'X-TalentLens-Client': 'workspace', 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'privacy deletion while inference is running' }) });
  const comparisonPause = pause('comparison');
  const pendingAnalysis = call(`/api/vacancies/${vacancy.id}/analyze`, { consent: true });
  await comparisonPause.ready;
  assert.equal((await deleteRequest(report.candidates[1].candidateId)).status, 200);
  comparisonPause.release();
  assert.equal((await pendingAnalysis).status, 409);
  const afterRace = await (await fetch(`${base}/api/state`)).json();
  assert.equal(afterRace.reports.length, 1, 'an in-flight analysis cannot recreate deleted CV data');
  assert.equal(afterRace.candidates.length, 1);

  const updatePause = pause('comparison');
  const pendingUpdateAnalysis = call(`/api/vacancies/${vacancy.id}/analyze`, { consent: true });
  await updatePause.ready;
  const update = new FormData();
  update.append('file', new Blob(['Updated fictional CV. React and TypeScript experience with new source content.']), 'updated.txt');
  assert.equal((await call(`/api/candidates/${afterRace.candidates[0].id}/documents`, update)).status, 200);
  updatePause.release();
  assert.equal((await pendingUpdateAnalysis).status, 409, 'an old document version cannot commit a report');

  const callsBefore = seenCalls.length;
  const requirementsPause = pause('requirements');
  const pendingRequirements = call(`/api/vacancies/${vacancy.id}/analyze`, { consent: true });
  await requirementsPause.ready;
  assert.equal((await deleteRequest(afterRace.candidates[0].id)).status, 200);
  requirementsPause.release();
  assert.equal((await pendingRequirements).status, 409);
  assert.equal(seenCalls.length, callsBefore + 1, 'deleted CVs must not be sent in a subsequent comparison call');
});
