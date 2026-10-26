import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from './store.js';
import { runAnalysis } from './analysis.js';
import { getProvider, completeJson, checkProvider, readZetaris, isZetarisConfigured, ServiceError } from './providers.js';
import { demoCandidates, demoVacancy, localizeDemoCandidate, localizeDemoVacancy } from './demo.js';
import { errorPayload, resolveLanguage } from './localization.js';
import { translate } from '../public/i18n.js';
import { translateReport } from './report-translation.js';
import { TalentMemoryService } from './hmem.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const store = new Store(path.resolve(root, process.env.DATA_DIR || './data'));
const organizationId = process.env.TALENTLENS_ORG_ID?.trim() || 'talentlens-local';
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/.test(organizationId)) throw new Error('TALENTLENS_ORG_ID must be a safe stable identifier');
const memory = new TalentMemoryService(store, { organizationId });
const provider = getProvider();
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  req.language = resolveLanguage(req.get('Accept-Language'));
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(req.hostname)) return res.status(403).json(errorPayload(new Error('errors.localOnly'), req.language));
  if (req.get('X-TalentLens-Organization') && req.get('X-TalentLens-Organization') !== organizationId) return res.status(403).json(errorPayload(new Error('errors.organization'), req.language));
  if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('X-TalentLens-Client') !== 'workspace' || (req.get('Origin') && req.get('Origin') !== `${req.protocol}://${req.get('host')}`)) return res.status(403).json(errorPayload(new Error('errors.origin'), req.language));
  }
  next();
});
app.use(express.json({ limit: '100kb' }));
const vacancySchema = z.object({ title: z.string().trim().min(3).max(160), company: z.string().trim().max(160), location: z.string().trim().max(160), description: z.string().trim().min(40).max(16000) });
const owned = item => Boolean(item && item.organizationId === organizationId);
// In-flight inference must never restore a deleted or superseded source.
let contextRevision = 0;
function assertCurrentContext(revision) {
  if (revision !== contextRevision) throw new ServiceError('errors.contextChanged', 409);
}
const publicCandidate = ({ text, hash, organizationId: _organizationId, ...candidate }) => ({ ...candidate, characters: text.length });
function ensureLegacyOwnership() {
  store.transaction(() => {
    for (const kind of ['candidate', 'vacancy', 'report', 'review']) for (const item of store.list(kind)) {
      if (item.organizationId && (kind !== 'candidate' || item.documentId)) continue;
      if (kind !== 'candidate') { store.put(kind, { ...item, organizationId: item.organizationId || organizationId }); continue; }
      const documentId = item.documentId || `doc-${randomUUID()}`, documentVersion = item.documentVersion || 1;
      store.put('candidate_document', { id: documentId, organizationId: item.organizationId || organizationId, candidateId: item.id, version: documentVersion,
        filename: item.filename, text: item.text, hash: item.hash || createHash('sha256').update(item.text).digest('hex'), source: item.source, status: 'current' });
      store.put('candidate', { ...item, organizationId: item.organizationId || organizationId, documentId, documentVersion });
    }
  });
}
ensureLegacyOwnership();
const state = language => ({ candidates: store.list('candidate').filter(owned).map(c => publicCandidate(localizeDemoCandidate(c, language))), vacancies: store.list('vacancy').filter(owned).map(v => localizeDemoVacancy(v, language)), reports: store.list('report').filter(owned), reviews: store.list('review').filter(owned) });
app.get('/api/state', (req, res) => res.json(state(req.language)));
app.get('/api/status', (req, res) => res.json({ provider: provider.name, providerId: provider.id, model: provider.model, configured: Boolean(provider.key && provider.key !== 'rt-local'), zetarisConfigured: isZetarisConfigured(), hmem: memory.status(), limits: { candidates: 25, totalCharacters: 200000 } }));
app.post('/api/integrations/check', async (req, res) => res.json(await checkProvider(provider)));
app.post('/api/vacancies', (req, res) => res.status(201).json(store.put('vacancy', { ...vacancySchema.parse(req.body), organizationId })));
app.get('/api/candidates/:id', (req, res) => {
  const candidate = store.get('candidate', req.params.id);
  if (!owned(candidate)) return res.status(404).json(errorPayload(new Error('errors.cvNotFound'), req.language));
  const { hash, ...safe } = localizeDemoCandidate(candidate, req.language); res.json(safe);
});
app.post('/api/demo', (req, res) => {
  store.transaction(() => {
    if (!store.get('vacancy', 'demo-vacancy')) store.put('vacancy', { ...demoVacancy, id: 'demo-vacancy', organizationId, synthetic: true });
    for (let i = 0; i < demoCandidates.length; i++) {
      const id = `demo-candidate-${i}`;
      if (!store.get('candidate', id) && store.list('candidate').filter(owned).length < 25) {
        contextRevision++;
        const documentId = `demo-document-${i}`;
        store.put('candidate_document', { id: documentId, organizationId, candidateId: id, version: 1, filename: demoCandidates[i].filename,
          text: demoCandidates[i].text, hash: createHash('sha256').update(demoCandidates[i].text).digest('hex'), source: 'demo', status: 'current' });
        store.put('candidate', { ...demoCandidates[i], id, organizationId, documentId, documentVersion: 1, source: 'demo', synthetic: true });
      }
    }
  });
  res.json(state(req.language));
});
function extract(file, extension) {
  return new Promise((resolve, reject) => {
    const reader = fork(fileURLToPath(new URL('./extractor.js', import.meta.url)), [], {
      execArgv: ['--max-old-space-size=128'], stdio: ['ignore', 'ignore', 'ignore', 'ipc'], serialization: 'advanced',
      env: Object.fromEntries(['PATH', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP'].filter(key => process.env[key]).map(key => [key, process.env[key]]))
    });
    const timer = setTimeout(() => { reader.kill(); finish(new ServiceError('errors.readerTimeout', 422)); }, 20000);
    let settled = false;
    const finish = (error, text) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(text); };
    reader.once('message', result => finish(result.error ? new ServiceError(result.error, 422) : null, result.text));
    reader.once('error', () => finish(new ServiceError('errors.readerStart', 422)));
    reader.once('exit', code => { if (!settled) finish(new ServiceError('errors.readerExit', 422)); });
    reader.send({ buffer: file.buffer, extension });
  });
}
function addCandidateDocument(candidateInput, { id = randomUUID(), version = 1 } = {}) {
  contextRevision++;
  const documentId = `doc-${randomUUID()}`;
  const candidate = { ...candidateInput, id, organizationId, documentId, documentVersion: version };
  store.put('candidate_document', { id: documentId, organizationId, candidateId: id, version, filename: candidate.filename,
    text: candidate.text, hash: candidate.hash || createHash('sha256').update(candidate.text).digest('hex'), source: candidate.source, status: 'current' });
  return store.put('candidate', candidate);
}
function updateCandidateDocument(candidate, input) {
  const current = store.get('candidate', candidate.id);
  if (!owned(current) || current.documentId !== candidate.documentId) throw new ServiceError('errors.contextChanged', 409);
  contextRevision++;
  const previous = store.get('candidate_document', candidate.documentId);
  if (previous) store.put('candidate_document', { ...previous, status: 'superseded', supersededAt: new Date().toISOString() });
  const documentId = `doc-${randomUUID()}`, version = (candidate.documentVersion || 1) + 1;
  store.put('candidate_document', { id: documentId, organizationId, candidateId: candidate.id, version, filename: input.filename,
    text: input.text, hash: input.hash, source: input.source, status: 'current' });
  const updated = store.put('candidate', { ...candidate, ...input, organizationId, documentId, documentVersion: version, updatedAt: new Date().toISOString() });
  memory.markDocumentChanged(candidate.id, documentId); return updated;
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 0 } });
let uploading = false;
app.post('/api/candidates', (req, res, next) => {
  if (uploading) return res.status(409).json(errorPayload(new Error('errors.uploadBusy'), req.language));
  uploading = true; res.once('close', () => { uploading = false; }); next();
}, upload.array('files', 10), async (req, res) => {
  if (!req.files?.length) throw new ServiceError('errors.chooseCv', 400);
  if (store.list('candidate').filter(owned).length + req.files.length > 25) throw new ServiceError('errors.cvLimit', 400);
  const added = [], errors = [];
  for (const file of req.files) {
    const filename = path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8')).slice(0, 180);
    try {
      const extension = path.extname(filename).toLowerCase();
      if (!['.pdf', '.docx', '.txt'].includes(extension)) throw new ServiceError('errors.format', 422);
      const hash = createHash('sha256').update(file.buffer).digest('hex');
      if (store.list('candidate').filter(owned).some(c => c.hash === hash)) throw new ServiceError('errors.duplicate', 409);
      const text = await extract(file, extension);
      let candidate;
      store.transaction(() => { candidate = addCandidateDocument({ name: filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), filename, text, hash, source: 'upload', synthetic: false }); });
      added.push(publicCandidate(candidate));
    } catch (error) { errors.push({ filename, ...errorPayload(error, req.language, 'errors.parse') }); }
  }
  res.status(added.length ? 201 : 422).json({ added, errors });
});
app.post('/api/candidates/:id/documents', upload.single('file'), async (req, res) => {
  const candidate = store.get('candidate', req.params.id);
  if (!owned(candidate)) throw new ServiceError('errors.cvNotFound', 404);
  if (!req.file) throw new ServiceError('errors.chooseCv', 400);
  const filename = path.basename(Buffer.from(req.file.originalname, 'latin1').toString('utf8')).slice(0, 180), extension = path.extname(filename).toLowerCase();
  if (!['.pdf', '.docx', '.txt'].includes(extension)) throw new ServiceError('errors.format', 422);
  const hash = createHash('sha256').update(req.file.buffer).digest('hex');
  if (hash === candidate.hash) throw new ServiceError('errors.duplicate', 409);
  const text = await extract(req.file, extension); let updated;
  store.transaction(() => { updated = updateCandidateDocument(candidate, { name: candidate.name, filename, text, hash, source: candidate.source, synthetic: candidate.synthetic }); });
  res.json(publicCandidate(updated));
});
app.post('/api/sources/zetaris/import', async (req, res) => {
  let rows;
  try { rows = await readZetaris(); } catch (error) { throw error.status ? error : new ServiceError('errors.zetarisNetwork'); }
  const rowSchema = z.object({ candidate_id: z.union([z.string().min(1), z.number()]), display_name: z.string().min(1).max(160), document_name: z.string().min(1).max(180), cv_text: z.string().min(40).max(40000) });
  const parsed = rows.map(row => rowSchema.parse(row));
  const mapped = parsed.map(row => ({ id: `zetaris-${createHash('sha256').update(`${organizationId}:${row.candidate_id}`).digest('hex').slice(0, 24)}`, name: row.display_name, filename: row.document_name,
    text: row.cv_text, hash: createHash('sha256').update(row.cv_text).digest('hex'), source: 'zetaris', synthetic: process.env.ZETARIS_SYNTHETIC === 'true' }));
  if (store.list('candidate').filter(owned).length + mapped.filter(c => !store.get('candidate', c.id)).length > 25) throw new ServiceError('errors.zetarisLimit', 400);
  store.transaction(() => { for (const item of mapped) { const existing = store.get('candidate', item.id); if (!existing) addCandidateDocument(item, { id: item.id }); else if (existing.hash !== item.hash) updateCandidateDocument(existing, item); } });
  res.json({ imported: mapped.length });
});
let analyzing = false;
let analysisProgress = { stage: 'idle', startedAt: null };
app.get('/api/analysis/progress', (req, res) => res.json({ ...analysisProgress, running: analyzing }));
app.post('/api/candidates/:id/clarifications', (req, res) => {
  const input = z.object({ vacancyId: z.string(), question: z.string().trim().min(8).max(600), answer: z.string().trim().min(20).max(4000),
    sourceLabel: z.string().trim().min(3).max(200), sourceType: z.enum(['candidate_response', 'recruiter_observation']), confirmed: z.literal(true) }).parse(req.body);
  const candidate = store.get('candidate', req.params.id), vacancy = store.get('vacancy', input.vacancyId);
  if (!owned(candidate) || !owned(vacancy)) throw new ServiceError('errors.reviewMismatch', 404);
  if (store.list('candidate_document').filter(d => owned(d) && d.candidateId === candidate.id && d.kind === 'clarification').length >= 20) throw new ServiceError('errors.clarificationLimit', 400);
  const document = store.put('candidate_document', { id: `clarification-${randomUUID()}`, organizationId, candidateId: candidate.id,
    version: 1, kind: 'clarification', source: input.sourceType, status: 'current', filename: input.sourceLabel, text: input.answer,
    question: input.question, vacancyId: input.vacancyId, recordedAt: new Date().toISOString(), attribution: 'recruiter_recorded_statement',
    hash: createHash('sha256').update(input.answer).digest('hex') });
  contextRevision++;
  res.status(201).json(document);
});
app.post('/api/vacancies/:id/analyze', async (req, res) => {
  const input = z.object({ consent: z.literal(true), note: z.string().max(4000).default(''), language: z.enum(['en', 'es', 'fr', 'de']).optional() }).parse(req.body);
  const language = input.language || req.language;
  const savedVacancy = store.get('vacancy', req.params.id), vacancy = owned(savedVacancy) && localizeDemoVacancy(savedVacancy, language);
  const candidates = store.list('candidate').filter(owned).map(record => {
    const candidate = localizeDemoCandidate(record, language);
    if (!candidate.synthetic || candidate.text === record.text) return candidate;
    const documentId = `${record.documentId}-${language}`;
    if (!store.get('candidate_document', documentId)) store.put('candidate_document', { id: documentId, organizationId, candidateId: record.id, version: record.documentVersion,
      filename: record.filename, text: candidate.text, hash: createHash('sha256').update(candidate.text).digest('hex'), source: record.source, status: 'current' });
    return { ...candidate, documentId };
  });
  if (!vacancy) throw new ServiceError('errors.roleNotFound', 404);
  for (const candidate of candidates) {
    const clarifications = store.list('candidate_document').filter(d => owned(d) && d.candidateId === candidate.id && d.kind === 'clarification' && d.status === 'current' && d.vacancyId === vacancy.id);
    candidate.evidenceSources = [{ id: candidate.documentId, kind: 'cv', text: candidate.text, version: candidate.documentVersion, filename: candidate.filename, source: candidate.source },
      ...clarifications.map(d => ({ id: d.id, kind: 'clarification', text: d.text, question: d.question, version: d.version, filename: d.filename, source: d.source, recordedAt: d.recordedAt, attribution: d.attribution }))];
  }
  if (!candidates.length) throw new ServiceError('errors.noCvs', 400);
  if (candidates.reduce((total, c) => total + c.evidenceSources.reduce((n, s) => n + s.text.length, 0), 0) > 200000) throw new ServiceError('errors.totalText', 400);
  if (analyzing) throw new ServiceError('errors.analysisBusy', 409);
  analyzing = true;
  analysisProgress = { stage: 'extract', startedAt: new Date().toISOString() };
  try {
    const revision = contextRevision;
    const executions = [], reportId = randomUUID();
    const previousReport = store.list('report').filter(owned).find(r => r.vacancyId === vacancy.id && r.language === language && !r.privacyRedacted);
    const result = await runAnalysis({ vacancy, candidates, note: input.note, language, previousReport,
      onStage: stage => { analysisProgress = { ...analysisProgress, stage }; },
      retrieveMemory: requirements => {
        assertCurrentContext(revision);
        return memory.retrieve({ vacancy, requirements, candidateIds: candidates.map(candidate => candidate.id) });
      },
      complete: messages => {
        assertCurrentContext(revision);
        return completeJson(provider, messages, fetch, execution => executions.push(execution));
      } });
    let report;
    store.transaction(() => {
      assertCurrentContext(revision);
      analysisProgress = { ...analysisProgress, stage: 'save' };
      const stored = { created: [], reused: [], conflicts: [] };
      for (const candidate of candidates) for (const source of candidate.evidenceSources) {
        const match = result.candidates.find(c => c.candidateId === candidate.id);
        const saved = memory.ingestAnalysis({ vacancy, reportId, requirements: result.requirements,
          candidates: [{ ...candidate, text: source.text, documentId: source.id, documentVersion: source.version, filename: source.filename, source: source.source }],
          reportCandidates: [{ ...match, evidence: match.evidence.filter(e => e.sourceId === source.id) }] });
        for (const key of Object.keys(stored)) stored[key].push(...saved[key]);
      }
      report = store.put('report', { id: reportId, organizationId, vacancyId: vacancy.id, vacancyTitle: vacancy.title, ...result,
        hmem: result.hmem ? { ...result.hmem, stored } : { retrieved: [], matchedMemoryIds: [], stored },
        provider: provider.name, model: provider.model, executions, recruiterNote: input.note,
        evidenceSources: [...new Map([...candidates.flatMap(c => c.evidenceSources.map(s => ({ ...s, candidateId: c.id }))),
          ...(result.hmem?.retrieved || []).map(item => { const d = store.get('candidate_document', item.documentId); return d && owned(d) ? { id: d.id, candidateId: d.candidateId, kind: d.kind || 'cv', text: d.text, question: d.question, version: d.version, filename: d.filename, source: d.source, recordedAt: d.recordedAt, attribution: d.attribution } : null; }).filter(Boolean)].map(s => [s.id, s])).values()],
        sources: candidates.map(c => ({ id: c.id, name: c.name, filename: c.filename, source: c.source, text: c.text, documentId: c.documentId, documentVersion: c.documentVersion })),
        vacancySnapshot: vacancy });
    });
    res.json(report);
  } finally { analyzing = false; analysisProgress = { ...analysisProgress, stage: 'idle' }; }
});
app.post('/api/reports/:id/translate', async (req, res) => {
  const input = z.object({ consent: z.literal(true), language: z.enum(['en', 'es', 'fr', 'de']) }).parse(req.body);
  const report = store.get('report', req.params.id);
  if (!owned(report)) throw new ServiceError('errors.reportNotFound', 404);
  if ((report.language || 'es') === input.language || report.translations?.[input.language]) return res.json(report);
  if (analyzing) throw new ServiceError('errors.analysisBusy', 409);
  analyzing = true;
  try {
    const translation = await translateReport(report, input.language, messages => completeJson(provider, messages));
    const current = store.get('report', req.params.id);
    if (JSON.stringify(current) !== JSON.stringify(report)) throw new ServiceError('errors.contextChanged', 409);
    res.json(store.put('report', { ...current, translations: { ...current.translations, [input.language]: translation } }));
  } finally { analyzing = false; }
});
app.post('/api/reviews', (req, res) => {
  const input = z.object({ reportId: z.string(), candidateId: z.string(), status: z.enum(['pending', 'interview', 'hold']), note: z.string().max(2000).default('') }).parse(req.body);
  const report = store.get('report', input.reportId);
  if (!owned(report) || !report.candidates.some(c => c.candidateId === input.candidateId)) throw new ServiceError('errors.reviewMismatch', 400);
  res.json(store.put('review', { ...input, organizationId, id: `review-${input.reportId}-${input.candidateId}`, updatedAt: new Date().toISOString() }));
});
app.get('/api/candidates/:id/memory', (req, res) => {
  const candidate = store.get('candidate', req.params.id);
  if (!owned(candidate)) throw new ServiceError('errors.cvNotFound', 404);
  res.json(memory.profile(candidate.id));
});
app.post('/api/memory/conflicts/:id/resolve', (req, res) => {
  const input = z.object({ strategy: z.enum(['keep_a', 'keep_b', 'keep_both']), justification: z.string().trim().min(8).max(1000) }).parse(req.body);
  try { const result = memory.resolveConflict(req.params.id, input.strategy, input.justification); contextRevision++; res.json(result); }
  catch (error) { throw new ServiceError(error.message.startsWith('errors.') ? error.message : 'errors.memoryConflictNotFound', 404); }
});
app.post('/api/memories/:id/feedback', (req, res) => {
  const input = z.object({ kind: z.enum(['helpful', 'not_helpful', 'wrong']) }).parse(req.body);
  const item = memory.hmem.store.get(req.params.id); if (!item) throw new ServiceError('errors.memoryNotFound', 404);
  memory.hmem.feedback(item.id, input.kind); contextRevision++; res.json({ ok: true });
});
app.patch('/api/memories/:id', (req, res) => {
  const input = z.object({ documentId: z.string().min(1), evidenceText: z.string().min(8).max(1500), justification: z.string().trim().min(8).max(1000) }).parse(req.body);
  try { const result = memory.correctMemory(req.params.id, input); contextRevision++; res.json(result); }
  catch (error) { throw new ServiceError(error.message.startsWith('errors.') ? error.message : 'errors.memoryNotFound', 400); }
});
app.delete('/api/memories/:id', (req, res) => {
  const input = z.object({ reason: z.string().trim().min(8).max(1000) }).parse(req.body);
  try { memory.deleteMemory(req.params.id, input.reason); contextRevision++; res.json({ deleted: true }); }
  catch { throw new ServiceError('errors.memoryNotFound', 404); }
});
function scrubReports({ candidateId, documentId }) {
  for (const report of store.list('report').filter(owned)) {
    const sourceMatch = source => source.id === candidateId && (!documentId || source.documentId === documentId);
    const traceMatch = item => item.candidateId === candidateId && (!documentId || item.documentId === documentId);
    const affected = report.sources?.some(sourceMatch) || report.hmem?.retrieved?.some(traceMatch) || report.evidenceSources?.some(s => s.candidateId === candidateId && (!documentId || s.id === documentId));
    if (!affected) continue;
    // Any generated narrative can mention another candidate, including summaries
    // and translations. Clear it throughout the affected report.
    const scrubCandidates = (list, language) => list?.map(item => ({ ...item,
      ...(item.candidateId === candidateId ? { recommendation: 'insufficient_evidence' } : {}),
      rationale: translate(language, 'privacy.reportRedacted'),
      evidence: item.evidence.map(evidence => ({ ...evidence,
        ...(item.candidateId === candidateId ? { status: 'unclear', quote: null } : {}),
        explanation: translate(language, 'privacy.reportRedacted'), followUpQuestion: null })), interviewQuestions: [] }));
    const translations = Object.fromEntries(Object.entries(report.translations || {}).map(([language, value]) => [language, { ...value,
      summary: translate(language, 'privacy.reportRedacted'), clarificationQuestions: [], review: null, candidates: scrubCandidates(value.candidates, language) }]));
    const removedMemoryIds = new Set((report.hmem?.retrieved || []).filter(traceMatch).map(item => item.memoryId));
    const hmem = report.hmem ? { ...report.hmem, retrieved: (report.hmem.retrieved || []).filter(item => !traceMatch(item)),
      matchedMemoryIds: (report.hmem.matchedMemoryIds || []).filter(id => !removedMemoryIds.has(id)),
      usedMemoryIds: (report.hmem.usedMemoryIds || []).filter(id => !removedMemoryIds.has(id)) } : report.hmem;
    const sources = report.sources.map(source => !sourceMatch(source) ? source : documentId ? { ...source, text: null, deleted: true } : {
      id: source.id, name: translate(report.language, 'privacy.deletedCandidate'), filename: null, source: null, text: null, documentId: null, documentVersion: null, deleted: true });
    store.put('report', { ...report, sources, summary: translate(report.language, 'privacy.reportRedacted'), recruiterNote: '', clarificationQuestions: [],
      evidenceSources: (report.evidenceSources || []).filter(s => s.candidateId !== candidateId || (documentId && s.id !== documentId)),
      review: null, changes: null, candidates: scrubCandidates(report.candidates, report.language), translations, hmem, privacyRedacted: true });
  }
}
function deleteCandidateData(candidate, reason) {
  contextRevision++;
  memory.deleteCandidate(candidate.id, reason);
  store.removeWhere('candidate_document', document => owned(document) && document.candidateId === candidate.id);
  scrubReports({ candidateId: candidate.id });
  store.removeWhere('review', review => owned(review) && review.candidateId === candidate.id);
  store.remove('candidate', candidate.id);
}
app.delete('/api/candidates/:id/documents/:documentId', (req, res) => {
  const input = z.object({ reason: z.string().trim().min(8).max(1000) }).parse(req.body);
  const candidate = store.get('candidate', req.params.id), document = store.get('candidate_document', req.params.documentId);
  if (!owned(candidate) || !owned(document) || document.candidateId !== candidate.id) throw new ServiceError('errors.cvNotFound', 404);
  let candidateDeleted = false;
  store.transaction(() => {
    if (candidate.documentId === document.id) { deleteCandidateData(candidate, input.reason); candidateDeleted = true; }
    else { contextRevision++; memory.deleteDocument(candidate.id, document.id, input.reason); store.remove('candidate_document', document.id); scrubReports({ candidateId: candidate.id, documentId: document.id }); }
  });
  res.json({ deleted: true, candidateDeleted });
});
app.delete('/api/candidates/:id', (req, res) => {
  const input = z.object({ reason: z.string().trim().min(8).max(1000) }).parse(req.body);
  const candidate = store.get('candidate', req.params.id); if (!owned(candidate)) throw new ServiceError('errors.cvNotFound', 404);
  store.transaction(() => deleteCandidateData(candidate, input.reason));
  res.json({ deleted: true });
});
app.use(express.static(path.join(root, 'public')));
app.use((error, req, res, next) => {
  const validation = error instanceof z.ZodError;
  const uploadError = error instanceof multer.MulterError;
  const status = validation || uploadError || error.type === 'entity.too.large' ? 400 : error.status || 500;
  const fallback = validation || error.type === 'entity.too.large' ? 'errors.validation' : uploadError ? 'errors.uploadLimit' : 'errors.generic';
  res.status(status).json(errorPayload(error, req.language, fallback));
});
const port = Number(process.env.PORT || 4317);
const server = app.listen(port, '127.0.0.1', () => console.log(`TalentLens ready at http://127.0.0.1:${server.address().port}`));
server.requestTimeout = 420000;
function shutdown() { server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
