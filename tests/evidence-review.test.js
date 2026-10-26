import test from 'node:test';
import assert from 'node:assert/strict';
import { runAnalysis, validateReport } from '../server/analysis.js';
import { evidenceChanges } from '../server/report-diff.js';
import { evidenceDetail, evidenceView } from '../public/evidence-view.js';
import { validateTranslation, translateReport } from '../server/report-translation.js';

const vacancy = { id: 'job', title: 'Developer', description: 'Professional TypeScript experience is required for this role.' };
const requirements = [{ id: 'ts', label: 'Professional TypeScript experience', priority: 'required', quote: 'Professional TypeScript experience is required' }];
const candidate = { id: 'c', documentId: 'cv', text: 'Interested in learning TypeScript during a future project.' };
const draft = { summary: 'A fictional candidate for professional review.', candidates: [{ candidateId: 'c', recommendation: 'strong', rationale: 'The draft incorrectly treats interest as professional experience.', evidence: [{ requirementId: 'ts', status: 'supported', quote: candidate.text, sourceId: 'cv', explanation: 'TypeScript is mentioned.' }], interviewQuestions: [] }] };
test('second model pass can correct a literal but unsupported claim and expose the change', async () => {
  const final = structuredClone(draft); final.candidates[0].recommendation = 'insufficient_evidence'; final.candidates[0].evidence[0] = { ...final.candidates[0].evidence[0], status: 'unclear', explanation: 'Interest does not establish professional experience.', followUpQuestion: 'Which completed project demonstrates professional TypeScript work?' };
  const stages = []; let calls = 0;
  const report = await runAnalysis({ vacancy, candidates: [candidate], onStage: stage => stages.push(stage), complete: async () => {
    calls++; return calls === 1 ? { requirements, clarificationQuestions: [] } : calls === 2 ? draft : { summary: 'The review identified interest incorrectly treated as experience.', findings: [{ candidateId: 'c', requirementId: 'ts', issue: 'unsupported_claim', explanation: 'The source describes future learning rather than completed work.' }], report: final };
  } });
  assert.equal(calls, 3); assert.deepEqual(stages, ['extract', 'retrieve', 'compare', 'review']);
  assert.equal(report.candidates[0].evidence[0].status, 'unclear');
  assert.equal(report.review.changes[0].before, 'supported'); assert.equal(report.review.changes[0].after, 'unclear');
  assert.equal(report.review.findings[0].issue, 'unsupported_claim');
});
test('critical review gets a targeted bounded retry for missing source attribution', async () => {
  const incomplete = { summary: 'The review checked the fictional draft against its source.', findings: [], report: structuredClone(draft) };
  delete incomplete.report.candidates[0].evidence[0].sourceId;
  const corrected = structuredClone(incomplete); corrected.report.candidates[0].evidence[0].sourceId = 'cv';
  let calls = 0;
  const report = await runAnalysis({ vacancy, candidates: [candidate], complete: async messages => {
    calls++;
    if (calls === 1) return { requirements, clarificationQuestions: [] };
    if (calls === 2) return draft;
    if (calls < 5) {
      if (calls === 4) assert.match(messages.at(-1).content, /quote requires sourceId/);
      return incomplete;
    }
    return corrected;
  } });
  assert.equal(calls, 5); assert.equal(report.candidates[0].evidence[0].sourceId, 'cv');
});
test('source attribution cannot borrow a literal quote from another source or candidate', () => {
  const withSources = { ...candidate, evidenceSources: [{ id: 'cv', text: candidate.text }, { id: 'note', text: 'A different authorised statement from an interview.' }] };
  const bad = structuredClone(draft); bad.candidates[0].evidence[0].sourceId = 'note';
  assert.throws(() => validateReport(bad, [withSources], requirements), /errors.invalidQuote/);
});
test('history comparison records changed evidence without inventing ranking scores', () => {
  const before = { ...structuredClone(draft), requirements }, after = structuredClone(before);
  before.candidates[0].evidence[0].status = 'unclear'; after.candidates[0].evidence[0].sourceId = 'clarification';
  const changes = evidenceChanges(before, after);
  assert.deepEqual(changes, [{ candidateId: 'c', requirementId: 'ts', before: 'unclear', after: 'supported', sourceChanged: true }]);
  assert.deepEqual(evidenceChanges({ ...before, privacyRedacted: true }, after), []);
});
test('evidence UI escapes source text, preserves attribution and disables edits in replay', () => {
  const report = { ...structuredClone(draft), id: 'r', requirements, sources: [{ id: 'c', name: '<script>unsafe</script>' }], evidenceSources: [{ id: 'cv', candidateId: 'c', text: candidate.text + '<img onerror=bad>', kind: 'clarification', source: 'candidate_response', filename: 'Fictional interview' }] };
  report.candidates[0].evidence[0].followUpQuestion = 'Which documented project supports this requirement?';
  assert.ok(evidenceView(report, 'es').includes('&lt;script&gt;'));
  const detail = evidenceDetail(report, 'c', 'ts', 'es', { recorded: true });
  assert.ok(detail.includes('&lt;img onerror=bad&gt;')); assert.ok(detail.includes('<mark>')); assert.ok(detail.includes('sin verificación independiente'));
  assert.equal(detail.includes('data-add-clarification'), false);
});
test('report translation cannot silently drop follow-up questions or review observations', async () => {
  const report = { ...structuredClone(draft), requirements, clarificationQuestions: [], review: { summary: 'A critical evidence review.', findings: [{ candidateId: 'c', requirementId: 'ts', issue: 'missing_evidence', explanation: 'Professional evidence needs clarification.' }], changes: [] } };
  report.candidates[0].evidence[0].followUpQuestion = 'Which project demonstrates this professional experience?';
  const translated = { summary: 'Un informe para revisión profesional.', requirements: [{ id: 'ts', label: 'Experiencia profesional en TypeScript' }], clarificationQuestions: [], candidates: [{ candidateId: 'c', rationale: 'La experiencia necesita una aclaración.', evidence: [{ requirementId: 'ts', explanation: 'Hay dudas por aclarar.' }], interviewQuestions: [] }] };
  assert.throws(() => validateTranslation(report, translated, 'es'), /errors.translation/);
  const complete = structuredClone(translated);
  complete.candidates[0].evidence[0].followUpQuestion = '¿Qué proyecto demuestra esa experiencia profesional?';
  complete.review = { summary: 'Revisión de las evidencias profesionales.', findings: [{ candidateId: 'c', requirementId: 'ts', explanation: 'La experiencia profesional requiere aclaración.' }] };
  let calls = 0;
  const restored = await translateReport(report, 'es', async messages => {
    const response = JSON.parse(messages[1].content);
    response.translations = response.translations.map(item => ({ ...item, text: item.text === report.candidates[0].evidence[0].followUpQuestion ? complete.candidates[0].evidence[0].followUpQuestion : item.text }));
    if (++calls === 1) response.translations.pop();
    return response;
  });
  assert.equal(calls, 2); assert.equal(restored.candidates[0].evidence[0].followUpQuestion, complete.candidates[0].evidence[0].followUpQuestion);
  assert.equal(restored.candidates[0].evidence[0].quote, report.candidates[0].evidence[0].quote);
  assert.equal(restored.candidates[0].recommendation, report.candidates[0].recommendation);
  calls = 0;
  await assert.rejects(() => translateReport(report, 'es', async () => { calls++; return translated; }), /errors.translation/);
  assert.equal(calls, 2, 'invalid translations get only one correction');
});
