import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../server/store.js';
import { HMEM, TalentMemoryService } from '../server/hmem.js';

const quote = {
  python: 'Built Python APIs with FastAPI and PostgreSQL for three years.',
  excel: 'Prepared financial forecasts with advanced Excel and Power BI.',
  sap2: 'Worked with SAP in logistics projects for two years.',
  sap4: 'Worked with SAP in logistics projects for four years.',
  sap1: 'Worked with SAP in logistics projects for one year.'
};
function fixtureDirectory() { return mkdtempSync(path.join(tmpdir(), 'talentlens-hmem-')); }
function document(store, organizationId, candidateId, version, text) {
  const id = `doc-${organizationId}-${candidateId}-${version}`;
  store.put('candidate_document', { id, organizationId, candidateId, version, filename: `${candidateId}-v${version}.txt`, text, hash: `hash-${version}`, source: 'test', status: 'current' });
  return { id: candidateId, organizationId, documentId: id, documentVersion: version, filename: `${candidateId}-v${version}.txt`, text, source: 'test' };
}
function ingest(service, candidate, requirement, evidenceText, vacancyId = 'vacancy-a') {
  return service.ingestAnalysis({ vacancy: { id: vacancyId }, reportId: `report-${vacancyId}-${candidate.documentVersion}`,
    requirements: [{ id: 'r1', label: requirement, priority: 'required', quote: requirement }], candidates: [candidate],
    reportCandidates: [{ candidateId: candidate.id, evidence: [{ requirementId: 'r1', status: 'supported', quote: evidenceText }] }] });
}

test('H-MEM rejects sourceless records and writes canonical persistent records', () => {
  const hmem = new HMEM({ organizationId: 'org-a' });
  assert.throws(() => hmem.add({ content: 'No source', source: '' }), /source/);
  const memory = hmem.add({ content: quote.python, source: 'document:fixture', type: 'factual', layer: 'long_term' });
  for (const field of ['id', 'content', 'type', 'layer', 'timestamp', 'lastAccessed', 'accessCount', 'tags', 'embedding', 'confidence', 'source', 'provenance', 'domain', 'namespace', 'entities', 'relatedTo', 'derivedFrom']) assert.ok(field in memory, field);
});

test('A: professional memory survives a process restart and a different vacancy', () => {
  const directory = fixtureDirectory();
  let store;
  try {
    store = new Store(directory); let service = new TalentMemoryService(store, { organizationId: 'org-a' });
    const candidate = document(store, 'org-a', 'candidate-a', 1, quote.python);
    const written = ingest(service, candidate, 'Python API development', quote.python);
    assert.equal(written.created.length, 1); store.close(); store = null;

    store = new Store(directory); service = new TalentMemoryService(store, { organizationId: 'org-a' });
    const result = service.retrieve({ vacancy: { id: 'vacancy-b', title: 'Data Engineer', description: 'Python, SQL and backend data APIs are required.' },
      requirements: [{ id: 'r1', label: 'Python and SQL APIs', quote: 'Python, SQL and backend data APIs' }], candidateIds: ['candidate-a'] });
    assert.equal(result.trace.retrieved.length, 1);
    assert.equal(result.trace.retrieved[0].fromPreviousProcess, true);
    assert.equal(result.byCandidate['candidate-a'][0].evidenceText, quote.python);
    store.close(); store = null;
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});

test('attributed clarification memory preserves its provenance across roles and restart', () => {
  const directory = fixtureDirectory(); let store;
  try {
    store = new Store(directory);
    const candidate = document(store, 'org-a', 'candidate-a', 1, quote.python);
    const source = store.get('candidate_document', candidate.documentId);
    store.put('candidate_document', { ...source, kind: 'clarification', source: 'candidate_response', filename: 'Fictional interview', recordedAt: '2026-10-26T12:00:00Z', attribution: 'recruiter_recorded_statement', question: 'Which Python APIs did you build?' });
    ingest(new TalentMemoryService(store, { organizationId: 'org-a' }), candidate, 'Python APIs', quote.python);
    store.close(); store = new Store(directory);
    const recalled = new TalentMemoryService(store, { organizationId: 'org-a' }).retrieve({ vacancy: { id: 'vacancy-b', title: 'Python engineer', description: 'Python API experience required' }, requirements: [{ id: 'r1', label: 'Python APIs', priority: 'required' }], candidateIds: ['candidate-a'] });
    for (const record of [recalled.byCandidate['candidate-a'][0], recalled.trace.retrieved[0]]) {
      assert.equal(record.sourceKind, 'clarification');
      assert.equal(record.sourceType, 'candidate_response');
      assert.equal(record.sourceLabel, 'Fictional interview');
      assert.equal(record.attribution, 'recruiter_recorded_statement');
      assert.equal(record.question, 'Which Python APIs did you build?');
      assert.equal(record.recordedAt, '2026-10-26T12:00:00Z');
    }
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});

test('B: contextual retrieval is candidate and organization scoped with verified sources', () => {
  const directory = fixtureDirectory();
  let store;
  try {
    store = new Store(directory); const orgA = new TalentMemoryService(store, { organizationId: 'org-a' }), orgB = new TalentMemoryService(store, { organizationId: 'org-b' });
    const pythonCandidate = document(store, 'org-a', 'python-candidate', 1, quote.python);
    const financeCandidate = document(store, 'org-a', 'finance-candidate', 1, quote.excel);
    ingest(orgA, pythonCandidate, 'Python API development', quote.python);
    ingest(orgA, financeCandidate, 'Advanced Excel and Power BI financial analysis', quote.excel);
    const backend = orgA.retrieve({ vacancy: { id: 'backend', title: 'Backend Engineer', description: 'Python SQL backend API engineering.' }, requirements: [{ id: 'r', label: 'Python SQL backend APIs', quote: 'Python SQL backend API' }], candidateIds: ['python-candidate'] });
    assert.deepEqual([...new Set(backend.trace.retrieved.map(item => item.candidateId))], ['python-candidate']);
    assert.ok(backend.trace.retrieved.every(item => item.verified && item.documentId));
    const crossTenant = orgB.retrieve({ vacancy: { id: 'other', title: 'Backend Engineer', description: 'Python SQL backend API engineering.' }, requirements: [{ id: 'r', label: 'Python', quote: 'Python' }], candidateIds: ['python-candidate'] });
    assert.equal(crossTenant.trace.retrieved.length, 0);
    store.close(); store = null;
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});

test('C: newer cumulative experience supersedes, while an incompatible claim queues review', () => {
  const directory = fixtureDirectory();
  let store;
  try {
    store = new Store(directory); const service = new TalentMemoryService(store, { organizationId: 'org-a' });
    const v1 = document(store, 'org-a', 'candidate-a', 1, quote.sap2); ingest(service, v1, 'SAP experience', quote.sap2);
    const v2 = document(store, 'org-a', 'candidate-a', 2, quote.sap4); service.markDocumentChanged('candidate-a', v2.documentId); ingest(service, v2, 'SAP experience', quote.sap4, 'vacancy-b');
    const memoriesAfterV2 = service.profile('candidate-a').memories;
    assert.equal(memoriesAfterV2.find(item => item.documentVersion === 1).validityState, 'superseded');
    assert.equal(memoriesAfterV2.find(item => item.documentVersion === 2).validityState, 'current');

    const v3 = document(store, 'org-a', 'candidate-a', 3, quote.sap1); service.markDocumentChanged('candidate-a', v3.documentId); ingest(service, v3, 'SAP experience', quote.sap1, 'vacancy-c');
    const profile = service.profile('candidate-a');
    assert.ok(profile.conflicts.some(item => item.status === 'open'));
    assert.equal(profile.memories.find(item => item.documentVersion === 3).validityState, 'conflicted');
    const result = service.retrieve({ vacancy: { id: 'sap', title: 'SAP consultant', description: 'Professional SAP experience.' }, requirements: [{ id: 'r', label: 'SAP experience', quote: 'SAP experience' }], candidateIds: ['candidate-a'] });
    assert.equal(result.trace.retrieved.length, 0);
    // Re-running the same source must not resolve the open dispute implicitly.
    ingest(service, v3, 'SAP experience', quote.sap1, 'vacancy-c');
    assert.equal(service.profile('candidate-a').memories.find(item => item.documentVersion === 3).validityState, 'conflicted');
    assert.equal(service.hmem.conflicts.queue().length, 1);
    const repeated = service.retrieve({ vacancy: { id: 'sap', title: 'SAP consultant', description: 'Professional SAP experience.' }, requirements: [{ id: 'r', label: 'SAP experience', quote: 'SAP experience' }], candidateIds: ['candidate-a'] });
    assert.equal(repeated.trace.retrieved.length, 0);
    service.resolveConflict(service.hmem.conflicts.queue()[0].id, 'keep_b', 'Reviewed the original dated documents with the fictional candidate.');
    assert.equal(service.hmem.conflicts.queue().length, 0);
    assert.equal(service.profile('candidate-a').memories.find(item => item.documentVersion === 3).validityState, 'current');
    store.close(); store = null;
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});

test('D: deletion removes memory and indices, invalid source never reappears, ledger excludes CV text', () => {
  const directory = fixtureDirectory();
  let store;
  try {
    store = new Store(directory); const service = new TalentMemoryService(store, { organizationId: 'org-a' });
    const candidate = document(store, 'org-a', 'candidate-a', 1, quote.python); ingest(service, candidate, 'Python API development', quote.python);
    store.remove('candidate_document', candidate.documentId);
    const unverified = service.retrieve({ vacancy: { id: 'backend', title: 'Backend', description: 'Python API role.' }, requirements: [{ id: 'r', label: 'Python', quote: 'Python' }], candidateIds: ['candidate-a'] });
    assert.equal(unverified.trace.retrieved.length, 0);
    assert.equal(service.profile('candidate-a').memories[0].validityState, 'unverified');
    service.deleteCandidate('candidate-a', 'candidate privacy deletion request');
    assert.equal(service.profile('candidate-a').memories.length, 0);
    assert.equal(JSON.stringify(service.hmem.ledger.all()).includes(quote.python), false);
    assert.equal(JSON.stringify(service.hmem.ledger.all()).includes('fixture-token'), false);
    store.close(); store = null;
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});

test('D2: deleting one historical CV version removes only its memories and persisted retrieval traces', () => {
  const directory = fixtureDirectory();
  let store;
  try {
    store = new Store(directory); const service = new TalentMemoryService(store, { organizationId: 'org-a' });
    const v1 = document(store, 'org-a', 'candidate-a', 1, quote.sap2); ingest(service, v1, 'SAP experience', quote.sap2);
    service.retrieve({ vacancy: { id: 'sap-v1', title: 'SAP consultant', description: 'Professional SAP experience.' },
      requirements: [{ id: 'r', label: 'SAP experience', quote: 'SAP experience' }], candidateIds: ['candidate-a'] });
    const v2 = document(store, 'org-a', 'candidate-a', 2, quote.sap4); service.markDocumentChanged('candidate-a', v2.documentId); ingest(service, v2, 'SAP experience', quote.sap4, 'vacancy-b');
    service.retrieve({ vacancy: { id: 'sap', title: 'SAP consultant', description: 'Professional SAP experience.' },
      requirements: [{ id: 'r', label: 'SAP experience', quote: 'SAP experience' }], candidateIds: ['candidate-a'] });
    assert.equal(service.hmem.persistence.traces('org-a').length, 2);
    assert.equal(service.deleteDocument('candidate-a', v1.documentId, 'historical CV privacy deletion'), 1);
    const profile = service.profile('candidate-a');
    assert.deepEqual(profile.memories.map(item => item.documentVersion), [2]);
    assert.equal(service.hmem.persistence.traces('org-a').length, 1, 'the trace that referenced deleted v1 evidence was removed');
    assert.equal(JSON.stringify(service.hmem.ledger.all()).includes(quote.sap2), false);
    store.close(); store = null;
  } finally { store?.close(); rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});
