import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../server/store.js';
import { TalentMemoryService } from '../server/hmem.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'data', 'hmem-demo');
rmSync(directory, { recursive: true, force: true }); mkdirSync(directory, { recursive: true });
const organizationId = 'hackathon-fictional';
const candidates = [
  ['alex', 'Alex Rivera', 'Built Python APIs with FastAPI and PostgreSQL for three years.'],
  ['sam', 'Sam Torres', 'Created financial forecasts with advanced Excel and Power BI.'],
  ['dani', 'Dani Vega', 'Maintained SQL data pipelines and automated ETL workflows.']
];
function seed(store, service) {
  for (const [id, name, text] of candidates) {
    const documentId = `document-${id}-v1`, candidate = { id, name, filename: `${id}.txt`, text, source: 'fictional-demo', documentId, documentVersion: 1 };
    store.put('candidate_document', { id: documentId, organizationId, candidateId: id, version: 1, filename: candidate.filename, text, source: candidate.source, status: 'current' });
    service.ingestAnalysis({ vacancy: { id: 'python-role' }, reportId: `report-${id}`, requirements: [{ id: 'r1', label: text.includes('Excel') ? 'Power BI Excel finance' : text.includes('ETL') ? 'SQL ETL' : 'Python API', quote: 'fictional requirement' }], candidates: [candidate],
      reportCandidates: [{ candidateId: id, evidence: [{ requirementId: 'r1', status: 'supported', quote: text }] }] });
  }
}

console.log('\n1) First process: three fictional CVs become source-backed H-MEM records.');
let store = new Store(directory), service = new TalentMemoryService(store, { organizationId }); seed(store, service);
console.log(service.status()); store.close();

console.log('\n2) Simulated restart: SQLite is reopened and a different role asks for Python/SQL APIs.');
store = new Store(directory); service = new TalentMemoryService(store, { organizationId });
const recalled = service.retrieve({ vacancy: { id: 'data-role', title: 'Data Engineer', description: 'Python, SQL and backend APIs.' }, requirements: [{ id: 'r1', label: 'Python SQL APIs', quote: 'Python, SQL and backend APIs' }], candidateIds: candidates.map(([id]) => id) });
for (const item of recalled.trace.retrieved) console.log(`- ${item.candidateId}: ${item.evidenceText} (${item.memoryId}, relevance ${item.relevance.toFixed(3)})`);
console.log(`Ready for Nemotron input: ${recalled.trace.retrieved.filter(item => item.providedToNemotron).length}; prior process: ${recalled.trace.retrieved.filter(item => item.fromPreviousProcess).length}. This deterministic demo makes no model calls. Use npm run verify:live for real inference.`);

console.log('\n3) Every result keeps document/version evidence and an append-only Trust Ledger.');
console.log({ traceId: recalled.trace.traceId, ledgerEntries: service.hmem.ledger.all().length, ranker: recalled.trace.rankerVersion });
store.close();
console.log(`\nDemo data remains in ${directory} so the SQLite persistence can be inspected.`);
