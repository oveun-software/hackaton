import express from 'express';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Store } from './store.js';
import { runAnalysis } from './analysis.js';
import { getProvider, completeJson, checkProvider, readZetaris, ServiceError } from './providers.js';
import { demoCandidates, demoVacancy, localizeDemoCandidate, localizeDemoVacancy } from './demo.js';
import { errorPayload, resolveLanguage } from './localization.js';
import { translateReport } from './report-translation.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const store = new Store(path.resolve(root, process.env.DATA_DIR || './data'));
const provider = getProvider();
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  req.language = resolveLanguage(req.get('Accept-Language'));
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'" });
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(req.hostname)) return res.status(403).json(errorPayload(new Error('errors.localOnly'), req.language));
  if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('X-TalentLens-Client') !== 'workspace' || (req.get('Origin') && req.get('Origin') !== `${req.protocol}://${req.get('host')}`)) return res.status(403).json(errorPayload(new Error('errors.origin'), req.language));
  }
  next();
});
app.use(express.json({ limit: '100kb' }));
const vacancySchema = z.object({ title: z.string().trim().min(3).max(160), company: z.string().trim().max(160), location: z.string().trim().max(160), description: z.string().trim().min(40).max(16000) });
const publicCandidate = ({ text, hash, ...candidate }) => ({ ...candidate, characters: text.length });
const state = language => ({ candidates: store.list('candidate').map(c => publicCandidate(localizeDemoCandidate(c, language))), vacancies: store.list('vacancy').map(v => localizeDemoVacancy(v, language)), reports: store.list('report'), reviews: store.list('review') });
app.get('/api/state', (req, res) => res.json(state(req.language)));
app.get('/api/status', (req, res) => res.json({ provider: provider.name, providerId: provider.id, model: provider.model, configured: Boolean(provider.key && provider.key !== 'rt-local'), zetarisConfigured: Boolean(process.env.ZETARIS_URL && process.env.ZETARIS_USER), limits: { candidates: 25, totalCharacters: 200000 } }));
app.post('/api/integrations/check', async (req, res) => res.json(await checkProvider(provider)));
app.post('/api/vacancies', (req, res) => res.status(201).json(store.put('vacancy', vacancySchema.parse(req.body))));
app.get('/api/candidates/:id', (req, res) => {
  const candidate = store.get('candidate', req.params.id);
  if (!candidate) return res.status(404).json(errorPayload(new Error('errors.cvNotFound'), req.language));
  const { hash, ...safe } = localizeDemoCandidate(candidate, req.language); res.json(safe);
});
app.post('/api/demo', (req, res) => {
  store.transaction(() => {
    if (!store.get('vacancy', 'demo-vacancy')) store.put('vacancy', { ...demoVacancy, id: 'demo-vacancy', synthetic: true });
    for (let i = 0; i < demoCandidates.length; i++) {
      const id = `demo-candidate-${i}`;
      if (!store.get('candidate', id) && store.list('candidate').length < 25) store.put('candidate', { ...demoCandidates[i], id, source: 'demo', synthetic: true });
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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 10, fields: 0 } });
let uploading = false;
app.post('/api/candidates', (req, res, next) => {
  if (uploading) return res.status(409).json(errorPayload(new Error('errors.uploadBusy'), req.language));
  uploading = true; res.once('close', () => { uploading = false; }); next();
}, upload.array('files', 10), async (req, res) => {
  if (!req.files?.length) throw new ServiceError('errors.chooseCv', 400);
  if (store.list('candidate').length + req.files.length > 25) throw new ServiceError('errors.cvLimit', 400);
  const added = [], errors = [];
  for (const file of req.files) {
    const filename = path.basename(Buffer.from(file.originalname, 'latin1').toString('utf8')).slice(0, 180);
    try {
      const extension = path.extname(filename).toLowerCase();
      if (!['.pdf', '.docx', '.txt'].includes(extension)) throw new ServiceError('errors.format', 422);
      const hash = createHash('sha256').update(file.buffer).digest('hex');
      if (store.list('candidate').some(c => c.hash === hash)) throw new ServiceError('errors.duplicate', 409);
      const text = await extract(file, extension);
      added.push(publicCandidate(store.put('candidate', { name: filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), filename, text, hash, source: 'upload', synthetic: false })));
    } catch (error) { errors.push({ filename, ...errorPayload(error, req.language, 'errors.parse') }); }
  }
  res.status(added.length ? 201 : 422).json({ added, errors });
});
app.post('/api/sources/zetaris/import', async (req, res) => {
  let rows;
  try { rows = await readZetaris(); } catch (error) { throw error.status ? error : new ServiceError('errors.zetarisNetwork'); }
  const rowSchema = z.object({ candidate_id: z.union([z.string().min(1), z.number()]), display_name: z.string().min(1).max(160), document_name: z.string().min(1).max(180), cv_text: z.string().min(40).max(40000) });
  const parsed = rows.map(row => rowSchema.parse(row));
  const mapped = parsed.map(row => ({ id: `zetaris-${createHash('sha256').update(String(row.candidate_id)).digest('hex').slice(0, 24)}`, name: row.display_name, filename: row.document_name, text: row.cv_text, source: 'zetaris', synthetic: false }));
  if (store.list('candidate').length + mapped.filter(c => !store.get('candidate', c.id)).length > 25) throw new ServiceError('errors.zetarisLimit', 400);
  store.transaction(() => { for (const item of mapped) store.put('candidate', item); });
  res.json({ imported: mapped.length });
});
let analyzing = false;
app.post('/api/vacancies/:id/analyze', async (req, res) => {
  const input = z.object({ consent: z.literal(true), note: z.string().max(4000).default(''), language: z.enum(['en', 'es', 'fr', 'de']).optional() }).parse(req.body);
  const language = input.language || req.language;
  const savedVacancy = store.get('vacancy', req.params.id), vacancy = savedVacancy && localizeDemoVacancy(savedVacancy, language), candidates = store.list('candidate').map(c => localizeDemoCandidate(c, language));
  if (!vacancy) throw new ServiceError('errors.roleNotFound', 404);
  if (!candidates.length) throw new ServiceError('errors.noCvs', 400);
  if (candidates.reduce((total, c) => total + c.text.length, 0) > 200000) throw new ServiceError('errors.totalText', 400);
  if (analyzing) throw new ServiceError('errors.analysisBusy', 409);
  analyzing = true;
  try {
    const result = await runAnalysis({ vacancy, candidates, note: input.note, language, complete: messages => completeJson(provider, messages) });
    const report = store.put('report', { id: randomUUID(), vacancyId: vacancy.id, vacancyTitle: vacancy.title, ...result,
      provider: provider.name, model: provider.model, recruiterNote: input.note,
      sources: candidates.map(c => ({ id: c.id, name: c.name, filename: c.filename, source: c.source, text: c.text })),
      vacancySnapshot: vacancy });
    res.json(report);
  } finally { analyzing = false; }
});
app.post('/api/reports/:id/translate', async (req, res) => {
  const input = z.object({ consent: z.literal(true), language: z.enum(['en', 'es', 'fr', 'de']) }).parse(req.body);
  const report = store.get('report', req.params.id);
  if (!report) throw new ServiceError('errors.reportNotFound', 404);
  if ((report.language || 'es') === input.language || report.translations?.[input.language]) return res.json(report);
  if (analyzing) throw new ServiceError('errors.analysisBusy', 409);
  analyzing = true;
  try {
    const translation = await translateReport(report, input.language, messages => completeJson(provider, messages));
    const current = store.get('report', req.params.id);
    res.json(store.put('report', { ...current, translations: { ...current.translations, [input.language]: translation } }));
  } finally { analyzing = false; }
});
app.post('/api/reviews', (req, res) => {
  const input = z.object({ reportId: z.string(), candidateId: z.string(), status: z.enum(['pending', 'interview', 'hold']), note: z.string().max(2000).default('') }).parse(req.body);
  const report = store.get('report', input.reportId);
  if (!report?.candidates.some(c => c.candidateId === input.candidateId)) throw new ServiceError('errors.reviewMismatch', 400);
  res.json(store.put('review', { ...input, id: `review-${input.reportId}-${input.candidateId}`, updatedAt: new Date().toISOString() }));
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
