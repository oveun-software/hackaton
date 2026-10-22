import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequirements, validateReport, runAnalysis } from '../server/analysis.js';
import { normalizeBase, checkProvider, completeJson, readZetaris, checkZetaris, isZetarisConfigured } from '../server/providers.js';

const vacancy = { title: 'Developer', description: 'Es imprescindible experiencia profesional con React y TypeScript.' };
const requirements = [{ id: 'r1', label: 'React y TypeScript', priority: 'required', quote: 'experiencia profesional con React y TypeScript' }];
const candidates = [{ id: 'c1', text: 'Experiencia profesional con React y TypeScript durante cinco años.' }];
const valid = () => ({ summary: 'Hay evidencia de experiencia en las tecnologías solicitadas.', candidates: [{ candidateId: 'c1', recommendation: 'strong', rationale: 'El documento describe experiencia con las tecnologías solicitadas.', evidence: [{ requirementId: 'r1', status: 'supported', quote: 'React y TypeScript durante cinco años', explanation: 'Experiencia declarada en el CV.' }], interviewQuestions: ['¿Qué decisiones de arquitectura tomaste?'] }] });
test('rechaza citas inventadas y afirmaciones sin fuente', () => {
  const data = valid(); data.candidates[0].evidence[0].quote = 'React durante veinte años';
  assert.throws(() => validateReport(data, candidates, requirements), /errors.invalidQuote/);
  data.candidates[0].evidence[0].quote = null;
  assert.throws(() => validateReport(data, candidates, requirements), /errors.missingEvidence/);
});
test('no permite candidatos desconocidos, duplicados ni requisitos omitidos', () => {
  const data = valid(); data.candidates[0].candidateId = 'inventado';
  assert.throws(() => validateReport(data, candidates, requirements), /errors.unknownCandidate/);
  data.candidates[0].candidateId = 'c1';
  assert.throws(() => validateReport(data, [...candidates, { id: 'c2', text: 'Otro documento' }], requirements), /errors.missingCandidates/);
  assert.throws(() => validateReport(data, candidates, [...requirements, { ...requirements[0], id: 'r2' }]), /errors.missingRequirements/);
});
test('los requisitos también deben citar la oferta real', () => {
  assert.deepEqual(validateRequirements({ requirements, clarificationQuestions: [] }, vacancy).requirements, requirements);
  assert.throws(() => validateRequirements({ requirements: [{ ...requirements[0], quote: 'Debes dominar Java y Kubernetes' }], clarificationQuestions: [] }, vacancy), /errors.requirementQuote/);
});
test('conserva el orden del modelo y exige cobertura completa', async () => {
  let calls = 0;
  const result = await runAnalysis({ vacancy, candidates, note: 'Revisar proyectos', complete: async () => ++calls === 1 ? { requirements, clarificationQuestions: [] } : valid() });
  assert.equal(calls, 2); assert.equal(result.candidates[0].candidateId, 'c1'); assert.equal('score' in result.candidates[0], false);
});
test('normaliza las URLs de Meterless sin duplicar v1', () => {
  for (const suffix of ['', '/', '/v1', '/v1/chat/completions', '/v1/models', '/healthz']) assert.equal(normalizeBase(`127.0.0.1:8088${suffix}`), 'http://127.0.0.1:8088/v1');
  assert.throws(() => normalizeBase('http://remote.example/v1'), /errors.https/);
});
test('Meterless distingue credenciales rechazadas de servicio apagado', async () => {
  const provider = { id: 'meterless', key: 'real-token', base: 'http://127.0.0.1:8088/v1' };
  assert.equal((await checkProvider(provider, async () => ({ status: 401 }))).state, 'unauthorized');
  assert.equal((await checkProvider(provider, async () => { throw new Error(); })).state, 'offline');
  assert.equal((await checkProvider(provider, async () => ({ ok: true, json: async () => ({ data: [{ id: 'meterless/new-mode' }] }) }))).state, 'online');
});
test('envía la autenticación y cabeceras oficiales de Meterless', async () => {
  await completeJson({ id: 'meterless', base: 'http://localhost:8088/v1', key: 'secret', model: 'meterless/deep' }, [{ role: 'user', content: 'texto' }], async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer secret'); assert.equal(options.headers['meterless-app'], 'talentlens'); assert.equal(options.headers['meterless-scope'], 'user');
    assert.equal(JSON.parse(options.body).messages[0].content, 'texto');
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
  });
});
test('no confunde el modelo solicitado con el ejecutado ni usa respuestas que requieren revisión', async () => {
  const provider = { id: 'meterless', base: 'http://localhost:8088/v1', key: 'fixture-token', model: 'nvidia/nemotron-3.5-super-vl-120b-a12b' };
  const data = { choices: [{ message: { content: '{"ok":true}' } }], model: provider.model,
    meterless: { receipt_id: 'fixture-receipt', winning_route: { model: provider.model } } };
  const fetcher = async () => ({ ok: true, json: async () => data });
  let execution;
  assert.deepEqual(await completeJson(provider, [], fetcher, value => { execution = value; }), { ok: true });
  assert.equal(execution.actualModel, provider.model); assert.equal(execution.receiptId, 'fixture-receipt');
  data.meterless.winning_route.model = 'nvidia/another-model';
  await assert.rejects(() => completeJson(provider, [], fetcher), /errors.modelMismatch/);
  data.meterless.winning_route.model = provider.model; data.meterless.requires_review = true;
  await assert.rejects(() => completeJson(provider, [], fetcher), /errors.providerReview/);
});

test('Zetaris usa Lightning REST con identidad de organización y consultas acotadas de lectura', async () => {
  const env = { ZETARIS_REST_URL: 'https://zetaris.example/api/v1.0/', ZETARIS_ORG_ID: '7', ZETARIS_API_KEY: 'fixture-key', ZETARIS_TABLE: 'talentlens.candidates' };
  const rows = await readZetaris(env, async (url, options) => {
    assert.equal(url, 'https://zetaris.example/api/v1.0/sql-editor/sqls/run');
    assert.equal(options.headers.Authorization, 'Bearer fixture-key');
    assert.equal(options.headers['X-Org-ID'], '7');
    assert.match(options.headers['X-Request-ID'], /^[\da-f-]{36}$/);
    assert.equal(options.redirect, 'error');
    const body = JSON.parse(options.body);
    assert.equal(body.sql, 'SELECT candidate_id, display_name, document_name, cv_text FROM talentlens.candidates LIMIT 25');
    assert.equal(body.limit, 25); assert.equal(body.source, 'SqlEditor');
    return { ok: true, json: async () => ({ data: [['c1', 'Fictional candidate', 'cv.txt', 'Fictional professional experience.']] }) };
  });
  assert.deepEqual(rows, [{ candidate_id: 'c1', display_name: 'Fictional candidate', document_name: 'cv.txt', cv_text: 'Fictional professional experience.' }]);
  let sent = false;
  await assert.rejects(() => readZetaris({ ...env, ZETARIS_TABLE: 'x;DROP TABLE records' }, async () => { sent = true; }), /errors.zetarisTable/);
  assert.equal(sent, false);
  assert.equal(isZetarisConfigured({ ...env, ZETARIS_REST_URL: 'http://remote.example/api/v1.0' }), false);
  assert.equal(isZetarisConfigured({ ...env, ZETARIS_REST_URL: 'https://zetaris.example/api/v1.0?key=unsafe' }), false);
  assert.equal(isZetarisConfigured({ ...env, ZETARIS_ORG_ID: 'not-an-org' }), false);
});

test('Zetaris no presenta errores, respuestas malformadas ni excesos como importaciones válidas', async () => {
  const env = { ZETARIS_REST_URL: 'http://localhost:8888', ZETARIS_ORG_ID: '1', ZETARIS_API_KEY: 'fixture-key' };
  for (const result of [{ error: 'query failed', data: [] }, { success: false, data: [] }, {}, { data: [['c1']] }]) {
    await assert.rejects(() => readZetaris(env, async () => ({ ok: true, json: async () => result })), /errors.zetarisQuery/);
  }
  await assert.rejects(() => readZetaris(env, async () => ({ ok: true, json: async () => ({ data: Array(26).fill([]) }) })), /errors.zetarisLimit/);
  await assert.rejects(() => readZetaris(env, async () => ({ status: 403 })), /errors.zetarisAuth/);
  assert.equal((await checkZetaris(env, async () => ({ status: 401 }))).state, 'unauthorized');
  assert.equal((await checkZetaris(env, async () => { throw new Error('fixture-key'); })).state, 'offline');
  assert.equal((await checkZetaris({})).state, 'unconfigured');
  assert.equal((await checkZetaris(env, async (_url, options) => {
    assert.equal(JSON.parse(options.body).sql, 'SELECT 1 AS talentlens_check');
    return { ok: true, json: async () => ({ data: [[1]] }) };
  })).state, 'online');
});
