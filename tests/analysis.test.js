import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRequirements, validateReport, runAnalysis } from '../server/analysis.js';
import { normalizeBase, checkProvider, completeJson, readZetaris } from '../server/providers.js';

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
test('Zetaris pagina sin enviar credenciales a otro servidor', async () => {
  const env = { ZETARIS_URL: 'https://zetaris.example', ZETARIS_USER: 'reader', ZETARIS_TOKEN: 'secret', ZETARIS_TABLE: 'catalog.schema.candidates' };
  let calls = 0;
  const rows = await readZetaris(env, async (url, options) => {
    calls++;
    if (calls === 1) { assert.match(options.body, /^SELECT .* LIMIT 25$/); return { ok: true, json: async () => ({ nextUri: 'https://zetaris.example/next' }) }; }
    return { ok: true, json: async () => ({ columns: [{ name: 'candidate_id' }], data: [['c1']] }) };
  });
  assert.deepEqual(rows, [{ candidate_id: 'c1' }]);
  await assert.rejects(() => readZetaris(env, async () => ({ ok: true, json: async () => ({ nextUri: 'https://other.example/steal' }) })), /errors.zetarisRedirect/);
  await assert.rejects(() => readZetaris({ ...env, ZETARIS_TABLE: 'x;DROP TABLE records' }), /errors.zetarisTable/);
});
