import { languages, resolveLanguage, translate } from './i18n.js';
import { icon } from './icons.js';
import { reportMarkdown } from './report-export.js';
import { evidenceView, evidenceDetail } from './evidence-view.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let savedLanguage;
try { savedLanguage = localStorage.getItem('talentlens.language'); } catch { /* Storage can be disabled. */ }
let language = resolveLanguage(new URLSearchParams(location.search).get('lang') || savedLanguage || 'en');
const t = (key, values) => translate(language, key, values);
const tr = (key, values) => escape(t(key, values));
const number = value => Number(value).toLocaleString(languages[language].locale);
const date = value => new Date(value).toLocaleDateString(languages[language].locale, { day: 'numeric', month: 'short' });
const page = () => ['overview', 'library', 'vacancies', 'connections'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
const initials = name => name.split(/\s+/).slice(0, 2).map(s => s[0] || '').join('').toUpperCase();
let state = { candidates: [], vacancies: [], reports: [], reviews: [] }, status = {}, selectedVacancy = null, selectedReport = null;
let running = false, translating = false, errorMessage = null, consent = false, translationConsent = false, note = '', toastTimer, uploading = false, updatingCandidateId = null;

class RemoteError extends Error { constructor(payload) { super(payload.error || 'errors.generic'); this.payload = payload; } }
function errorText(error) {
  if (error?.payload?.code) return t(error.payload.code, error.payload.parameters);
  if (error?.payload?.errors?.length) return error.payload.errors.map(e => `${e.filename}: ${e.code ? t(e.code) : t('errors.parse')}`).join(' · ');
  return t(error instanceof TypeError ? 'errors.network' : 'errors.generic');
}
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'X-TalentLens-Client': 'workspace', 'Accept-Language': language, ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers } });
  const data = await response.json();
  if (!response.ok) throw new RemoteError(data);
  return data;
}
function notify(message, error = false) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').className = `toast${error ? ' error' : ''}`; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 12000 : 6000);
}
async function refresh() {
  const requestedLanguage = language;
  const data = await Promise.all([api('/api/state'), api('/api/status')]);
  if (requestedLanguage === language) [state, status] = data;
}
function renderShell() {
  document.documentElement.lang = language; document.title = t('pageTitle');
  $('meta[name="description"]').content = t('metaDescription');
  $('#brand').setAttribute('aria-label', t('homeLabel'));
  for (const [id, key] of Object.entries({ 'brand-tagline': 'brandTagline', 'workspace-name': 'teamName', 'workspace-subtitle': 'teamSubtitle', 'nav-label': 'workspace', 'product-note-label': 'productNoteLabel', 'product-note-title': 'productNoteTitle', 'product-note-body': 'productNoteBody', 'profile-name': 'yourTeam', 'profile-subtitle': 'teamSubtitle', 'workspace-crumb': 'workspace', 'footer-by': 'footerBy', 'footer-decision': 'humanDecision' })) $(`#${id}`).textContent = t(key);
  $('#navigation').setAttribute('aria-label', t('navigation'));
  $('#navigation').innerHTML = [['overview', 'grid'], ['library', 'users'], ['vacancies', 'briefcase'], ['connections', 'layers']].map(([route, shape]) => `<a href="#${route}" class="${page() === route ? 'active' : ''}" ${page() === route ? 'aria-current="page"' : ''} aria-label="${tr(route)}"><span data-icon>${icon(shape)}</span><span class="nav-text">${tr(route)}</span>${route === 'library' ? `<span class="nav-count">${number(state.candidates.length)}</span>` : ''}</a>`).join('');
  $('#page-crumb').textContent = t(page());
  $('#recorded-demo-link').textContent = t('exploreRecorded'); $('#recorded-demo-link').href = `showcase.html?lang=${language}`;
  $('#language-switch').setAttribute('aria-label', t('languageSelector'));
  $('#language-switch').innerHTML = ['es', 'en', 'fr', 'de'].map(code => `<button type="button" class="language-button ${language === code ? 'selected' : ''}" data-language="${code}" lang="${code}" aria-label="${languages[code].name}" aria-pressed="${language === code}" title="${languages[code].name}"><img src="/flags/${languages[code].flag}.svg" alt=""><span class="language-name">${languages[code].name}</span><span class="language-code">${code.toUpperCase()}</span></button>`).join('');
  $('#new-vacancy').innerHTML = `${icon('plus')}<span>${tr('newVacancy')}</span>`;
  $('#new-vacancy').setAttribute('aria-label', t('newVacancy'));
}
const heading = (eyebrow, title, text, extra = '') => `<div class="page-heading"><div><span class="eyebrow">${tr(eyebrow)}</span><h1>${tr(title)}</h1><p>${tr(text)}</p></div>${extra}</div>`;
const empty = (title, text, button = '') => `<div class="empty"><div class="empty-icon">${icon('file')}</div><h3>${tr(title)}</h3><p>${tr(text)}</p>${button}</div>`;
function vacancyRow(vacancy) {
  const report = state.reports.find(r => r.vacancyId === vacancy.id);
  return `<div class="vacancy-row"><div class="vacancy-icon">${icon('briefcase')}</div><div><div class="vacancy-title">${escape(vacancy.title)}</div><div class="vacancy-meta">${escape(vacancy.company || t('yourTeam'))} · ${escape(vacancy.location || t('noLocation'))}</div></div><div class="row-trailing"><span class="pill ${report ? 'success' : 'pending'}">${tr(report ? 'analyzed' : 'notAnalyzed')}</span><button class="arrow-button" data-vacancy="${escape(vacancy.id)}" aria-label="${tr('openRole', { title: vacancy.title })}">↗</button></div></div>`;
}
function overview() {
  return `${heading('overviewEyebrow', 'overviewTitle', 'overviewSubtitle', `<span class="page-date">${escape(new Date().toLocaleDateString(languages[language].locale, { weekday: 'long', day: 'numeric', month: 'long' }))}</span>`)}
    <section class="hero"><div class="hero-copy"><span class="eyebrow"><i></i>${tr('heroEyebrow')}</span><h2>${tr('heroStart')}<br>${tr('heroBridge')} <em>${tr('heroAccent')}</em></h2><p>${tr('heroDescription')}</p><a class="button button-accent" href="#vacancies">${tr('exploreCandidates')} ${icon('arrow')}</a></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="orbit two"></div><div class="orbit three"></div><div class="core"><img src="/logo.svg" alt=""></div><div class="art-tag one">${icon('file')} ${tr('artCv')}</div><div class="art-tag two">${icon('check')} ${tr('artEvidence')}</div><span class="art-caption">${tr('artCaption')}</span></div></section>
    <section class="stats" aria-label="${tr('workspaceSummary')}">${[['users', state.candidates.length, 'statCv', 'documentsTag'], ['briefcase', state.vacancies.length, 'statRoles', 'rolesTag'], ['spark', state.reports.length, 'statAnalysis', 'insightsTag']].map(([i, n, label, tag]) => `<div class="stat"><div class="stat-icon">${icon(i)}</div><div><div class="stat-number">${number(n).padStart(2, '0')}</div><div class="stat-label">${tr(label)}</div></div><span class="stat-side">${tr(tag)}</span></div>`).join('')}</section>
    <div class="content-grid"><section><div class="section-heading"><h2>${tr('processesTitle')}</h2><a href="#vacancies" class="button button-ghost">${tr('viewRoles')} ↗</a></div><div class="panel">${state.vacancies.length ? state.vacancies.slice(0, 4).map(vacancyRow).join('') : empty('emptyProcessTitle', 'emptyProcessBody', `<button class="button button-outline button-small" data-demo>${tr('prepareSample')}</button>`)}</div><div class="info-banner"><strong>${tr('contextTitle')}</strong><br>${tr('contextBody')}</div></section>
    <section><div class="section-heading"><h2>${tr('workflowTitle')}</h2><span class="pill neutral">${tr('workflowTag')}</span></div><div class="panel panel-pad"><div class="flow-heading">${tr('workflowHeading')}</div>${[1, 2, 3, 4].map(i => `<div class="flow-step"><span class="step-number">0${i}</span><div><h3>${tr(`step${i}Title`)}</h3><p>${tr(`step${i}Body`)}</p></div></div>`).join('')}<div class="model-note">${icon('shield')} ${tr('noScores')}</div></div></section></div>`;
}
function candidateRows(candidates) {
  return candidates.map(c => `<tr><td><div class="candidate-name"><span class="avatar">${escape(initials(c.name))}</span><div>${escape(c.name)}<small>${escape(c.filename)} · ${tr('documentVersion', { version: c.documentVersion || 1 })} · ${tr('characters', { count: number(c.characters) })}</small></div></div></td><td><span class="pill ${c.synthetic ? 'pending' : 'neutral'}">${c.synthetic ? tr('fictionalSample') : c.source === 'zetaris' ? 'Zetaris' : tr('localFile')}</span></td><td>${date(c.updatedAt || c.createdAt)}</td><td><div class="row-actions"><button class="text-link" data-document="${escape(c.id)}">${tr('viewText')} ↗</button><button class="text-link" data-memory-profile="${escape(c.id)}">${tr('viewMemory')} ↗</button><button class="text-link" data-update-candidate="${escape(c.id)}">${tr('updateCv')}</button><button class="text-link danger" data-delete-candidate="${escape(c.id)}">${tr('deleteCv')}</button></div></td></tr>`).join('');
}
function library() {
  return `${heading('libraryEyebrow', 'libraryTitle', 'librarySubtitle', `<button class="button button-outline" data-demo>${tr('sampleCvs')}</button>`)}<div class="import-zone" id="dropzone"><div class="upload-icon">${icon('upload')}</div><div><h3>${tr('uploadTitle')}</h3><p>${tr('uploadDescription')}</p></div><button class="button button-dark" data-upload>${icon('plus')} ${tr('addCvs')}</button></div><div class="toolbar"><div class="search">${icon('search')}<input id="library-filter" type="search" aria-label="${tr('fileFilter')}" placeholder="${tr('fileFilter')}"></div><span class="result-count">${tr('libraryCount', { count: number(state.candidates.length) })}</span></div><div class="panel table-wrap"><table><thead><tr>${['columnDocument', 'columnSource', 'columnAdded'].map(k => `<th scope="col">${tr(k)}</th>`).join('')}<th></th></tr></thead><tbody id="candidate-table">${candidateRows(state.candidates)}</tbody></table>${!state.candidates.length ? empty('libraryEmptyTitle', 'libraryEmptyBody') : ''}</div><p class="small-note">${tr('extractionNote')}</p>`;
}
function localizedReport(report) {
  if (resolveLanguage(report.language || 'es') === language) return report;
  return report.translations?.[language] ? { ...report, ...report.translations[language] } : null;
}
const memoryStateKey = state => ({ current: 'memoryCurrent', pending_verification: 'memoryPending', superseded: 'memorySuperseded', conflicted: 'memoryConflicted', unverified: 'memoryUnverified' }[state] || 'memoryPending');
function hmemReport(report) {
  const trace = report.hmem;
  if (!trace) return '';
  const recovered = trace.retrieved || [], used = new Set(trace.matchedMemoryIds || trace.usedMemoryIds || []), prior = recovered.filter(item => item.fromPreviousProcess).length;
  return `<section class="panel panel-pad hmem-panel"><div class="hmem-heading"><div><span class="eyebrow">${tr('hmemTitle')}</span><h3>${tr('hmemRecovered', { count: number(recovered.length) })}</h3><p class="small-note">${tr('memoryCaveat')}</p></div><span class="pill ${recovered.length ? 'success' : 'neutral'}">${escape(trace.rankerVersion || status.hmem?.rankerVersion || 'H-MEM')}</span></div><div class="trust-row"><span>${tr('hmemPrior', { count: number(prior) })}</span><span>${tr('matchedEvidence', { count: number(used.size) })}</span></div>${recovered.length ? `<details><summary>${tr('hmemTitle')}</summary><div class="memory-trace">${recovered.map(item => { const candidate = report.sources.find(source => source.id === item.candidateId); return `<div class="memory-item"><div><strong>${escape(candidate?.name || item.candidateId)}</strong><span class="pill neutral">${tr('memoryProvided')}</span>${used.has(item.memoryId) ? `<span class="pill success">${tr('memoryCoincidence')}</span>` : ''}</div><blockquote>“${escape(item.evidenceText)}”</blockquote><small>${tr('documentVersion', { version: item.documentVersion })} · ${escape(item.memoryId)}</small></div>`; }).join('')}</div></details>` : `<p class="small-note">${tr('hmemNone')}</p>`}</section>`;
}
const evidenceFromMemory = (report, candidateId, quote) => Boolean(quote && report.hmem?.retrieved?.some(item => item.candidateId === candidateId && (report.hmem.matchedMemoryIds || report.hmem.usedMemoryIds || []).includes(item.memoryId) && item.evidenceText.normalize('NFKC').includes(quote.normalize('NFKC'))));
function reportMarkup(original) {
  const report = localizedReport(original);
  if (!report) return `<div class="panel analysis-placeholder"><div class="core">${icon('layers')}</div><h2>${tr('translationTitle', { language: languages[language].name })}</h2><p>${tr('translationBody')}</p><label class="consent"><input type="checkbox" id="translation-consent" ${translationConsent ? 'checked' : ''}><span>${tr('translationConsent', { provider: status.provider })}</span></label><button class="button button-dark" data-translate="${escape(original.id)}" ${!translationConsent || translating || !status.configured ? 'disabled' : ''}>${tr(translating ? 'translating' : 'translateReport')}</button></div>`;
  return `<div class="report-summary"><span class="eyebrow">${tr('reportEyebrow')}</span><p>${escape(report.summary)}</p><div class="report-meta">${date(report.createdAt)} · ${escape(report.provider)} · ${escape(report.model)}</div></div>${evidenceView(report, language)}${hmemReport(report)}${report.clarificationQuestions.length ? `<div class="panel panel-pad"><h3>${tr('clarifyTitle')}</h3><ul class="questions">${report.clarificationQuestions.map(q => `<li>${escape(q)}</li>`).join('')}</ul></div>` : ''}<div class="report-actions"><h3>${tr('profilesReviewed', { count: number(report.candidates.length) })}</h3><button class="button button-ghost" data-export="${escape(report.id)}">${tr('downloadReport')} ↗</button></div>
    ${report.candidates.map((c, i) => {
      const source = report.sources.find(s => s.id === c.candidateId), review = state.reviews.find(r => r.reportId === report.id && r.candidateId === c.candidateId);
      return `<article class="candidate-card"><div class="candidate-card-head"><span class="avatar">${escape(initials(source.name))}</span><div><h3>${escape(source.name)}</h3><small>${escape(source.filename)}</small></div><span class="pill ${c.recommendation === 'strong' ? 'success' : 'pending'}">${tr(c.recommendation)}</span></div><p>${escape(c.rationale)}</p><button class="text-link" data-snapshot="${escape(report.id)}" data-candidate="${escape(c.candidateId)}">${tr('viewSourceCv')} ↗</button><details ${i === 0 ? 'open' : ''}><summary>${tr('reviewEvidence', { count: number(c.evidence.length) })}</summary>${c.evidence.map(e => `<div class="evidence"><div class="evidence-head"><span class="pill ${e.status === 'supported' ? 'success' : 'pending'}">${tr(e.status)}</span>${evidenceFromMemory(report, c.candidateId, e.quote) ? `<span class="pill neutral">${tr('hmemTitle')}</span>` : ''}${escape(report.requirements.find(r => r.id === e.requirementId)?.label)}</div>${e.quote ? `<blockquote>“${escape(e.quote)}”</blockquote>` : ''}<p>${escape(e.explanation)}</p></div>`).join('')}</details><details><summary>${tr('interviewQuestions')}</summary><ul class="questions">${c.interviewQuestions.map(q => `<li>${escape(q)}</li>`).join('')}</ul></details><div class="review-row"><span class="review-label">${tr('nextStep')}</span><select aria-label="${tr('reviewLabel', { name: source.name })}" data-review="${escape(c.candidateId)}" data-report="${escape(report.id)}">${[['pending', 'reviewPending'], ['interview', 'reviewInterview'], ['hold', 'reviewHold']].map(([v, key]) => `<option value="${v}" ${review?.status === v ? 'selected' : ''}>${tr(key)}</option>`).join('')}</select></div></article>`;
    }).join('')}`;
}
function vacancies() {
  if (!state.vacancies.length) return `${heading('vacanciesEyebrow', 'vacanciesTitle', 'vacanciesSubtitle')}<div class="panel">${empty('emptyRoleTitle', 'emptyRoleBody', `<button class="button button-dark" data-new-vacancy>${tr('createFirstRole')} ↗</button> <button class="button button-outline" data-demo>${tr('exploreSample')}</button>`)}</div>`;
  const vacancy = state.vacancies.find(v => v.id === selectedVacancy) || state.vacancies[0]; selectedVacancy = vacancy.id;
  const reports = state.reports.filter(r => r.vacancyId === vacancy.id), report = reports.find(r => r.id === selectedReport) || reports[0];
  return `${heading('analysisEyebrow', 'analysisTitle', 'analysisSubtitle')}<div class="vacancy-workspace"><section class="panel vacancy-config"><label for="vacancy-select">${tr('selectedRole')}</label><select id="vacancy-select">${state.vacancies.map(v => `<option value="${escape(v.id)}" ${v.id === vacancy.id ? 'selected' : ''}>${escape(v.title)}</option>`).join('')}</select><h3>${escape(vacancy.title)}</h3><div class="vacancy-meta">${escape(vacancy.company)} · ${escape(vacancy.location)}</div><div class="vacancy-description">${escape(vacancy.description)}</div><label>${tr('teamContext')}<textarea id="analysis-note" rows="3" maxlength="4000" placeholder="${tr('contextPlaceholder')}">${escape(note)}</textarea></label><label class="consent"><input type="checkbox" id="analysis-consent" ${consent ? 'checked' : ''}><span>${tr('consentAnalysis', { count: number(state.candidates.length), provider: status.provider })}</span></label><button id="analyze" class="button button-dark full-width" ${running || !consent || !status.configured || !state.candidates.length ? 'disabled' : ''}>${icon('spark')} ${tr(running ? 'analyzing' : 'analyze')}</button><p class="small-note">${tr(status.configured ? 'analysisDuration' : 'connectFirst')} ${!status.configured ? `<a href="#connections" class="text-link">${tr('viewConnections')} ↗</a>` : ''}</p><p class="small-note">${tr('privacyNote')}</p></section>
    <section>${errorMessage ? `<div role="alert" class="error-inline">${escape(errorText(errorMessage))}</div>` : ''}${running ? `<div class="panel analysis-placeholder running"><div class="core">${icon('spark')}</div><h2>${tr('runningTitle')}</h2><p id="analysis-progress" aria-live="polite">${tr('stage_extract')}</p><p>${tr('runningBody')}</p><div class="trust-row">${['read', 'compare', 'verify'].map(k => `<span>${icon('check')} ${tr(k)}</span>`).join('')}</div></div>` : report ? reportMarkup(report) : `<div class="panel analysis-placeholder"><div class="core"><img src="/logo.svg" alt=""></div><span class="eyebrow">${tr('placeholderEyebrow')}</span><h2>${tr('placeholderTitle')}</h2><p>${tr('placeholderBody')}</p><div class="trust-row">${['verifiableQuotes', 'humanReview', 'noPercentages'].map(k => `<span>${icon('check')} ${tr(k)}</span>`).join('')}</div></div>`}${reports.length ? `<div class="history"><div class="section-heading"><h2>${tr('history')}</h2></div><div class="panel">${reports.map(r => `<button data-history="${escape(r.id)}"><span>${escape(r.vacancyTitle)}</span><small>${date(r.createdAt)} · ${tr('cvCount', { count: number(r.candidates.length) })} ↗</small></button>`).join('')}</div></div>` : ''}</section></div>`;
}
function connections() {
  const viaNightshift = status.providerId === 'meterless' && status.configured && status.model.startsWith('nvidia/');
  return `${heading('connectionsEyebrow', 'connectionsTitle', 'connectionsSubtitle')}<div class="connection-grid">${[['N', 'NVIDIA Nemotron', 'nvidiaBody', (status.providerId === 'nvidia' && status.configured) || viaNightshift], ['M', 'Meterless Nightshift', 'meterlessBody', status.providerId === 'meterless' && status.configured], ['H', 'Meterless H-MEM', 'hmemBody', status.hmem?.enabled], ['Z', 'Zetaris', 'zetarisBody', status.zetarisConfigured]].map(([mark, name, body, configured]) => `<section class="panel connection"><div class="connection-logo">${mark}</div><h2>${name}</h2><p>${tr(body)}</p><span class="pill ${configured ? 'success' : 'pending'}">${tr(name === 'NVIDIA Nemotron' && viaNightshift ? 'connectionViaNightshift' : configured ? 'connectionConfigured' : 'connectionMissing')}</span><div class="connection-meta">${name === 'NVIDIA Nemotron' && configured ? `${tr('modelLabel')}<br><strong>${escape(status.model)}</strong>` : name === 'Meterless H-MEM' ? `${escape(status.hmem?.rankerVersion || '')}<br>${tr('hmemRecovered', { count: number(status.hmem?.memories || 0) })}` : tr('setupRequired')}</div>${name === 'Zetaris' ? `<button class="button button-outline button-small" id="zetaris-import" ${!configured ? 'disabled' : ''}>${tr('importZetaris')} ↗</button>` : ''}</section>`).join('')}</div><div class="info-banner"><strong>${tr('activeProvider', { provider: status.provider })}</strong><br>${tr('testNote')}</div><button class="button button-dark" id="check-provider">${tr('testConnection')}</button><div id="provider-result" aria-live="polite"></div>`;
}
function render() {
  renderShell(); $('#main').innerHTML = ({ overview, library, vacancies, connections }[page()])();
  if ($('#dropzone')) {
    $('#dropzone').addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('dragover'); });
    $('#dropzone').addEventListener('dragleave', e => e.currentTarget.classList.remove('dragover'));
    $('#dropzone').addEventListener('drop', e => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); uploadFiles(e.dataTransfer.files); });
  }
  if ($('#library-filter')) $('#library-filter').addEventListener('input', e => { $('#candidate-table').innerHTML = candidateRows(state.candidates.filter(c => `${c.name} ${c.filename}`.toLocaleLowerCase().includes(e.target.value.toLocaleLowerCase()))); });
}
function openVacancy() {
  $('#vacancy-dialog').innerHTML = `<form id="vacancy-form" novalidate><div class="dialog-top"><span class="eyebrow">${tr('newRoleEyebrow')}</span><button type="button" class="icon-button" data-close aria-label="${tr('close')}">×</button></div><h2 id="dialog-title">${tr('newRoleTitle')}</h2><p>${tr('newRoleSubtitle')}</p><div id="vacancy-error" class="error-inline" role="alert" hidden></div><label>${tr('fieldTitle')}<input name="title" required minlength="3" maxlength="160" placeholder="${tr('titlePlaceholder')}"></label><div class="form-row"><label>${tr('fieldCompany')}<input name="company" maxlength="160" placeholder="${tr('companyPlaceholder')}"></label><label>${tr('fieldLocation')}<input name="location" maxlength="160" placeholder="${tr('locationPlaceholder')}"></label></div><label>${tr('fieldDescription')}<textarea name="description" required minlength="40" maxlength="16000" rows="7" placeholder="${tr('descriptionPlaceholder')}"></textarea></label><div class="dialog-actions"><button type="button" class="button button-outline" data-close>${tr('cancel')}</button><button class="button button-dark" type="submit">${tr('createRole')} ↗</button></div></form>`;
  $('#vacancy-dialog').showModal();
}
function showDocument(candidate) {
  $('#document-dialog').innerHTML = `<div class="dialog-top"><span class="eyebrow">${tr('sourceDocument')}</span><button type="button" class="icon-button" data-close aria-label="${tr('close')}">×</button></div><h2 id="document-title">${escape(candidate.name)}</h2><p>${escape(candidate.filename)}</p><pre id="document-text"></pre>`;
  $('#document-text').textContent = candidate.text || t('sourceUnverified'); $('#document-dialog').showModal();
}
function openEvidence(report, candidateId, requirementId) {
  $('#document-dialog').innerHTML = `<div class="dialog-top"><span class="eyebrow">${tr('evidenceMatrix')}</span><button type="button" class="icon-button" data-close aria-label="${tr('close')}">×</button></div>${evidenceDetail(report, candidateId, requirementId, language)}`;
  $('#document-dialog').showModal();
}
function openClarification(report, candidateId, requirementId) {
  const question = report.candidates.find(c => c.candidateId === candidateId).evidence.find(e => e.requirementId === requirementId).followUpQuestion;
  $('#document-dialog').innerHTML = `<form id="clarification-form" data-candidate="${escape(candidateId)}" data-vacancy="${escape(report.vacancyId)}"><div class="dialog-top"><span class="eyebrow">${tr('recordClarification')}</span><button type="button" class="icon-button" data-close aria-label="${tr('close')}">×</button></div><h2 id="document-title">${tr('recordClarification')}</h2><p>${tr('clarificationHelp')}</p><label>${tr('clarificationQuestion')}<textarea name="question" required minlength="8" maxlength="600" rows="2">${escape(question)}</textarea></label><label>${tr('clarificationAnswer')}<textarea name="answer" required minlength="20" maxlength="4000" rows="5"></textarea></label><label>${tr('clarificationType')}<select name="sourceType"><option value="candidate_response">${tr('candidate_response')}</option><option value="recruiter_observation">${tr('recruiter_observation')}</option></select></label><label>${tr('clarificationSource')}<input name="sourceLabel" required minlength="3" maxlength="200" placeholder="${tr('clarificationSourceHelp')}"></label><label class="consent"><input type="checkbox" name="confirmed" required><span>${tr('clarificationConfirm')}</span></label><p class="small-note">${tr('attributedStatement')}</p><div role="alert" id="clarification-error"></div><button class="button button-dark" type="submit">${tr('saveClarification')}</button></form>`;
}
async function showMemoryProfile(candidateId) {
  const profile = await api(`/api/candidates/${encodeURIComponent(candidateId)}/memory`), candidate = state.candidates.find(item => item.id === candidateId);
  const memories = profile.memories.map(item => `<article class="memory-item"><div class="memory-item-head"><span class="pill ${item.validityState === 'current' ? 'success' : 'pending'}">${tr(memoryStateKey(item.validityState))}</span><span class="pill ${item.sourceVerified ? 'success' : 'pending'}">${tr(item.sourceVerified ? 'sourceVerified' : 'sourceUnverified')}</span></div><blockquote>“${escape(item.evidenceText || item.content)}”</blockquote><small>${tr('documentVersion', { version: item.documentVersion || 1 })} · ${tr('sourcePosition', { position: number(Math.max(0, item.sourceLocation?.start || 0)) })} · ${date(item.verifiedAt || item.createdAt || item.timestamp)}</small><div><button class="text-link danger" data-delete-memory="${escape(item.id)}" data-profile-candidate="${escape(candidateId)}">${tr('deleteMemory')}</button></div></article>`).join('');
  const conflicts = profile.conflicts.filter(item => !item.resolved).map(item => `<article class="memory-conflict"><strong>${tr('memoryConflicted')}</strong><p>${tr('conflictHelp')}</p><div class="row-actions"><button class="button button-outline button-small" data-resolve-conflict="${escape(item.id)}" data-strategy="keep_a" data-profile-candidate="${escape(candidateId)}">${tr('resolveKeepOld')}</button><button class="button button-outline button-small" data-resolve-conflict="${escape(item.id)}" data-strategy="keep_b" data-profile-candidate="${escape(candidateId)}">${tr('resolveKeepNew')}</button><button class="button button-outline button-small" data-resolve-conflict="${escape(item.id)}" data-strategy="keep_both" data-profile-candidate="${escape(candidateId)}">${tr('resolveKeepBoth')}</button></div></article>`).join('');
  const history = profile.history.slice(-20).reverse().map(item => `<li><strong>${escape(item.action)}</strong> · ${date(item.timestamp)}${item.details?.reason ? ` · ${escape(item.details.reason)}` : ''}</li>`).join('');
  $('#document-dialog').innerHTML = `<div class="dialog-top"><span class="eyebrow">${tr('memoryProfile')}</span><button type="button" class="icon-button" data-close aria-label="${tr('close')}">×</button></div><h2 id="document-title">${escape(candidate?.name || candidateId)}</h2>${memories || `<p>${tr('noMemories')}</p>`}${conflicts ? `<h3>${tr('memoryConflicts')}</h3>${conflicts}` : ''}${history ? `<details><summary>${tr('technicalHistory')}</summary><ul class="memory-history">${history}</ul></details>` : ''}`;
  $('#document-dialog').showModal();
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  try {
    if (button.dataset.language) {
      language = resolveLanguage(button.dataset.language); consent = false; translationConsent = false; errorMessage = null; $('#toast').hidden = true;
      try { localStorage.setItem('talentlens.language', language); } catch { /* Preference remains valid for this visit. */ }
      const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url);
      await refresh(); render(); return;
    }
    if (button.hasAttribute('data-close')) button.closest('dialog').close();
    if (button.dataset.evidenceCandidate) openEvidence(localizedReport(state.reports.find(r => r.id === button.dataset.evidenceReport)), button.dataset.evidenceCandidate, button.dataset.evidenceRequirement);
    if (button.dataset.addClarification) openClarification(localizedReport(state.reports.find(r => r.id === button.dataset.clarificationReport)), button.dataset.addClarification, button.dataset.clarificationRequirement);
    if (button.id === 'new-vacancy' || button.hasAttribute('data-new-vacancy')) openVacancy();
    if (button.hasAttribute('data-upload')) $('#file-input').click();
    if (button.hasAttribute('data-demo')) { button.disabled = true; await api('/api/demo', { method: 'POST', body: '{}' }); consent = false; await refresh(); render(); notify(t('sampleReady')); }
    if (button.dataset.vacancy) { selectedVacancy = button.dataset.vacancy; selectedReport = null; consent = false; translationConsent = false; location.hash = 'vacancies'; render(); }
    if (button.dataset.document) showDocument(await api(`/api/candidates/${encodeURIComponent(button.dataset.document)}`));
    if (button.dataset.memoryProfile) await showMemoryProfile(button.dataset.memoryProfile);
    if (button.dataset.updateCandidate) { updatingCandidateId = button.dataset.updateCandidate; $('#update-file-input').click(); }
    if (button.dataset.deleteCandidate) {
      const reason = window.prompt(t('deleteReason')); if (!reason) return;
      await api(`/api/candidates/${encodeURIComponent(button.dataset.deleteCandidate)}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
      consent = false; await refresh(); render(); notify(t('candidateDeleted'));
    }
    if (button.dataset.deleteMemory) {
      const reason = window.prompt(t('deleteReason')); if (!reason) return;
      await api(`/api/memories/${encodeURIComponent(button.dataset.deleteMemory)}`, { method: 'DELETE', body: JSON.stringify({ reason }) });
      await showMemoryProfile(button.dataset.profileCandidate);
    }
    if (button.dataset.resolveConflict) {
      const justification = window.prompt(t('resolutionReason')); if (!justification) return;
      await api(`/api/memory/conflicts/${encodeURIComponent(button.dataset.resolveConflict)}/resolve`, { method: 'POST', body: JSON.stringify({ strategy: button.dataset.strategy, justification }) });
      await showMemoryProfile(button.dataset.profileCandidate); notify(t('conflictResolved'));
    }
    if (button.dataset.snapshot) { const report = state.reports.find(r => r.id === button.dataset.snapshot); showDocument(report.sources.find(c => c.id === button.dataset.candidate)); }
    if (button.dataset.history) { selectedReport = button.dataset.history; translationConsent = false; render(); }
    if (button.dataset.export) exportReport(localizedReport(state.reports.find(r => r.id === button.dataset.export)));
    if (button.dataset.translate) await translateReport(button.dataset.translate);
    if (button.id === 'analyze') await analyze();
    if (button.id === 'check-provider') { button.disabled = true; const result = await api('/api/integrations/check', { method: 'POST', body: '{}' }); $('#provider-result').innerHTML = `<div class="info-banner">${tr({ online: 'providerOnline', unauthorized: 'providerUnauthorized', unconfigured: 'providerUnconfigured', offline: 'providerOffline' }[result.state])}</div>`; button.disabled = false; }
    if (button.id === 'zetaris-import') { button.disabled = true; const result = await api('/api/sources/zetaris/import', { method: 'POST', body: '{}' }); consent = false; await refresh(); render(); notify(t('zetarisImported', { count: number(result.imported) })); }
  } catch (error) { notify(errorText(error), true); button.disabled = false; }
});
document.addEventListener('input', event => { if (event.target.id === 'analysis-note') note = event.target.value; });
document.addEventListener('change', async event => {
  const target = event.target;
  if (target.id === 'vacancy-select') { selectedVacancy = target.value; selectedReport = null; consent = false; translationConsent = false; note = ''; errorMessage = null; render(); }
  if (target.id === 'analysis-consent') { consent = target.checked; $('#analyze').disabled = !consent || running || !status.configured || !state.candidates.length; }
  if (target.id === 'translation-consent') { translationConsent = target.checked; $('[data-translate]').disabled = !translationConsent || translating || !status.configured; }
  if (target.dataset.review) {
    target.disabled = true;
    try { await api('/api/reviews', { method: 'POST', body: JSON.stringify({ reportId: target.dataset.report, candidateId: target.dataset.review, status: target.value }) }); await refresh(); notify(t('reviewSaved')); }
    catch (error) { notify(errorText(error), true); render(); } finally { target.disabled = false; }
  }
  if (target.id === 'file-input') { uploadFiles(target.files); target.value = ''; }
  if (target.id === 'update-file-input') { uploadCandidateVersion(updatingCandidateId, target.files[0]); target.value = ''; updatingCandidateId = null; }
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'clarification-form') {
    event.preventDefault(); const form = event.target, button = event.submitter;
    if (!form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form)); button.disabled = true;
    try {
      await api(`/api/candidates/${encodeURIComponent(form.dataset.candidate)}/clarifications`, { method: 'POST', body: JSON.stringify({ ...fields, confirmed: fields.confirmed === 'on', vacancyId: form.dataset.vacancy }) });
      consent = false; $('#document-dialog').close(); await refresh(); render(); notify(t('clarificationSaved'));
    } catch (error) { $('#clarification-error').textContent = errorText(error); } finally { button.disabled = false; }
    return;
  }
  if (event.target.id !== 'vacancy-form') return;
  event.preventDefault(); const fields = Object.fromEntries(new FormData(event.target));
  const showFormError = message => { $('#vacancy-error').textContent = message; $('#vacancy-error').hidden = false; };
  if (fields.title.trim().length < 3) return showFormError(t('errors.titleMin'));
  if (fields.description.trim().length < 40) return showFormError(t('errors.descriptionMin'));
  const button = event.submitter; button.disabled = true;
  try { const vacancy = await api('/api/vacancies', { method: 'POST', body: JSON.stringify(fields) }); selectedVacancy = vacancy.id; selectedReport = null; note = ''; consent = false; await refresh(); event.target.reset(); $('#vacancy-dialog').close(); location.hash = 'vacancies'; render(); notify(t('vacancyCreated')); }
  catch (error) { showFormError(errorText(error)); } finally { button.disabled = false; }
});
async function uploadFiles(files) {
  if (!files.length || uploading) return;
  if (files.length > 10) return notify(t('uploadTooMany'), true);
  const data = new FormData(); for (const file of files) data.append('files', file);
  uploading = true; $('#main').classList.add('busy'); notify(t('readingDocuments'));
  try { const result = await api('/api/candidates', { method: 'POST', body: data }); consent = false; await refresh(); render(); notify(`${t('documentsAdded', { count: number(result.added.length) })}${result.errors.length ? ' ' + result.errors.map(e => `${e.filename}: ${t(e.code || 'errors.parse')}`).join(' · ') : ''}`, Boolean(result.errors.length)); }
  catch (error) { notify(errorText(error), true); } finally { uploading = false; $('#main').classList.remove('busy'); }
}
async function uploadCandidateVersion(candidateId, file) {
  if (!candidateId || !file || uploading) return;
  const data = new FormData(); data.append('file', file); uploading = true; $('#main').classList.add('busy'); notify(t('readingDocuments'));
  try { await api(`/api/candidates/${encodeURIComponent(candidateId)}/documents`, { method: 'POST', body: data }); consent = false; await refresh(); render(); notify(t('cvUpdated')); }
  catch (error) { notify(errorText(error), true); } finally { uploading = false; $('#main').classList.remove('busy'); }
}
async function analyze() {
  if (!consent || running) return;
  running = true; errorMessage = null; const vacancyId = selectedVacancy, analysisNote = note, analysisLanguage = language; render();
  const progressTimer = setInterval(async () => {
    try { const progress = await api('/api/analysis/progress'); const label = $('#analysis-progress'); if (label) label.textContent = t(`stage_${progress.stage}`); } catch { /* Analysis request reports any failure. */ }
  }, 1200);
  try { const report = await api(`/api/vacancies/${encodeURIComponent(vacancyId)}/analyze`, { method: 'POST', body: JSON.stringify({ consent: true, note: analysisNote, language: analysisLanguage }) }); await refresh(); selectedVacancy = vacancyId; selectedReport = report.id; notify(t('analysisSaved')); }
  catch (error) { errorMessage = error; notify(errorText(error), true); } finally { clearInterval(progressTimer); running = false; render(); }
}
async function translateReport(id) {
  if (!translationConsent || translating) return;
  translating = true; render();
  try { await api(`/api/reports/${encodeURIComponent(id)}/translate`, { method: 'POST', body: JSON.stringify({ consent: true, language }) }); await refresh(); notify(t('translationSaved')); }
  catch (error) { notify(errorText(error), true); } finally { translating = false; render(); }
}
function exportReport(report) {
  if (!report) return;
  const url = URL.createObjectURL(new Blob([reportMarkdown(report, language)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `talentlens-${language}-${report.id}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
try { await refresh(); render(); } catch (error) { renderShell(); $('#main').innerHTML = `${heading('brandTagline', 'startupErrorTitle', 'startupErrorBody')}<p role="alert" class="error-inline">${escape(errorText(error))}</p>`; }
