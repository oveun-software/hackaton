import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { translate } from '../public/i18n.js';

test('flujo completo: carga, vacante, consentimiento, IA, evidencias y revisión persistente', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'talentlens-test-'));
  const seenCalls = [];
  const mock = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/v1/models') return res.end(JSON.stringify({ data: [{ id: 'meterless/deep' }] }));
    let body = ''; for await (const chunk of req) body += chunk;
    const request = JSON.parse(body); seenCalls.push(request);
    assert.equal(req.headers.authorization, 'Bearer fixture-token');
    const data = request.messages[1].content;
    const answer = request.messages[0].content.startsWith('You translate recruiting reports')
      ? { ...JSON.parse(data), summary: 'Une analyse traduite pour examiner les expériences professionnelles.' }
      : seenCalls.length === 1
      ? { requirements: [{ id: 'r1', label: 'React y TypeScript', priority: 'required', quote: 'React y TypeScript' }], clarificationQuestions: [] }
      : { summary: 'El documento contiene una experiencia profesional relevante que se debe contrastar en entrevista.', candidates: JSON.parse(data.split('DATA: ')[1]).candidates.map(c => ({ candidateId: c.id, recommendation: 'possible', rationale: 'El CV declara experiencia profesional con las tecnologías de la oferta.', evidence: [{ requirementId: 'r1', status: 'supported', quote: 'React y TypeScript', explanation: 'La experiencia está descrita en el documento.' }], interviewQuestions: ['¿Qué aportaste a ese proyecto?'] })) };
    res.end(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(answer) } }] }));
  });
  await new Promise(resolve => mock.listen(0, '127.0.0.1', resolve));
  const child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: '0', DATA_DIR: directory, AI_PROVIDER: 'meterless', METERLESS_BASE_URL: `http://127.0.0.1:${mock.address().port}/v1`, METERLESS_RUNTIME_TOKEN: 'fixture-token' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverErrors = '';
  child.stderr.on('data', chunk => { serverErrors += chunk; });
  t.after(() => { if (serverErrors.replace(/\(node:\d+\) ExperimentalWarning: SQLite[^\n]*\n[^\n]*\n/g, '').trim()) console.error(serverErrors); });
  t.after(async () => { child.kill(); await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve)); await new Promise(resolve => mock.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('El servidor no arrancó')), 10000);
    child.stdout.on('data', chunk => { const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/); if (match) { clearTimeout(timeout); resolve(match[0]); } });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Servidor cerrado: ${code}`)); });
  });
  const call = async (url, body, headers = {}) => fetch(`${base}${url}`, { method: 'POST', headers: { 'X-TalentLens-Client': 'workspace', ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body instanceof FormData ? body : JSON.stringify(body) });
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await call('/api/demo', {}, { Origin: 'https://untrusted.example' })).status, 403);
  const description = 'Es imprescindible experiencia profesional con React y TypeScript para herramientas B2B.';
  const vacancyResponse = await call('/api/vacancies', { title: 'Frontend Developer', company: 'Ficticia', location: 'Remoto', description });
  assert.equal(vacancyResponse.status, 201); const vacancy = await vacancyResponse.json();
  const docx = zipSync({ '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Perfil ficticio. Experiencia profesional con React y TypeScript en productos B2B durante cinco años.</w:t></w:r></w:p></w:body></w:document>') });
  const pdfObjects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream = 'BT /F1 12 Tf 50 700 Td (Perfil ficticio. Experiencia profesional con React y TypeScript durante cinco anos.) Tj ET';
  pdfObjects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  pdfObjects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const files = new FormData();
  files.append('files', new Blob(['Perfil ficticio. Experiencia profesional con React y TypeScript durante cinco años.']), 'perfil.txt');
  files.append('files', new Blob([docx]), 'perfil.docx');
  files.append('files', new Blob([pdf]), 'perfil.pdf');
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
  const response = await call(`/api/vacancies/${vacancy.id}/analyze`, { consent: true, note: 'Revisar proyectos.' });
  assert.equal(response.status, 200); const report = await response.json();
  assert.equal(report.candidates.length, 3); assert.equal(report.sources.length, 3); assert.equal(seenCalls.length, 2);
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
});
