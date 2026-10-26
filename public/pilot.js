import { languages, resolveLanguage, translate } from './i18n.js';
import { evidenceView, evidenceDetail, escapeHtml as esc } from './evidence-view.js';
let language = resolveLanguage(new URLSearchParams(location.search).get('lang') || 'en');
let tasks, results, index = 0, started = null, finished = false;
const rows = [], participant = crypto.randomUUID().slice(0, 8), assignment = crypto.getRandomValues(new Uint8Array(1))[0] % 4;
const orders = [[['frontend', 'manual'], ['data', 'assisted']], [['data', 'manual'], ['frontend', 'assisted']], [['frontend', 'assisted'], ['data', 'manual']], [['data', 'assisted'], ['frontend', 'manual']]];
const t = (key, values) => esc(translate(language, key, values));
const group = () => tasks.groups.find(g => g.id === orders[assignment][index][0]);
function report() {
  const g = group(), result = results.groups.find(r => r.id === g.id).report;
  return { ...result, ...result.translations?.[language], id: `pilot-${g.id}`, sources: g.candidates.map(c => ({ id: c.id, name: c.id })), evidenceSources: g.candidates.map(c => ({ id: c.documentId, candidateId: c.id, kind: 'cv', text: c.text })) };
}
function render() {
  document.documentElement.lang = language; document.title = `TalentLens · ${translate(language, 'pilotTitle')}`;
  document.querySelector('#languages').setAttribute('aria-label', translate(language, 'languageSelector'));
  document.querySelector('#languages').innerHTML = Object.entries(languages).map(([id, value]) => `<button data-language="${id}" ${started && !finished ? 'disabled' : ''} aria-pressed="${id === language}"><img src="flags/${value.flag}.svg" alt="">${esc(value.name)}</button>`).join('');
  const main = document.querySelector('#pilot-main');
  if (finished) {
    main.innerHTML = `<span class="eyebrow">${t('pilotSession')}</span><h1>${t('pilotResults')}</h1><p>${t('pilotCaveat')}</p><div class="panel table-wrap"><table><thead><tr><th>${t('pilotCondition')}</th><th>${t('pilotTask')}</th><th>${t('pilotSeconds')}</th><th>${t('pilotErrors')}</th></tr></thead><tbody>${rows.map(r => `<tr><td>${t(r.condition === 'manual' ? 'pilotManual' : 'pilotAssisted')}</td><td>${t(`pilot_${r.taskSet}Title`)}</td><td>${r.elapsedSeconds}</td><td>${r.errors} / 4</td></tr>`).join('')}</tbody></table></div><p class="small-note">${t('pilotInterpretation')}</p><button class="button button-dark" id="download-pilot">${t('pilotDownload')}</button> <a class="button button-outline" href="showcase.html?lang=${language}">${t('exploreRecorded')}</a>`; return;
  }
  const g = group(), condition = orders[assignment][index][1];
  main.innerHTML = `<span class="eyebrow">${t('pilotSession')}</span><h1>${t('pilotTitle')}</h1><p>${t('pilotHelp')}</p><p>${t('pilotRound', { count: index + 1 })} · <strong>${t(condition === 'manual' ? 'pilotManual' : 'pilotAssisted')}</strong></p>${!started ? `<div class="panel panel-pad"><h2>${t('pilotReady')}</h2><p>${t('pilotLocal')}</p><button class="button button-dark" id="start-pilot">${t('pilotStart')}</button></div>` : `<div class="panel panel-pad"><h2>${t(`pilot_${g.id}Title`)}</h2><p>${t(`pilot_${g.id}Description`)}</p><p class="small-note">${t('pilotOriginalSources')}</p></div>${condition === 'assisted' ? `<p class="small-note">${t('recordedLabel')}</p>${evidenceView(report(), language, { recorded: true })}` : g.candidates.map(c => `<details class="panel panel-pad" open><summary>${esc(c.id)}</summary><pre class="source-context">${esc(c.text)}</pre></details>`).join('')}<form id="pilot-form" class="panel panel-pad"><h2>${t('pilotAssess')}</h2><p>${t('pilotCriterion')}</p>${g.candidates.map(c => `<label>${esc(c.id)}<select name="${esc(c.id)}" required><option value="">${t('pilotChoose')}</option>${['supported', 'unclear', 'missing'].map(status => `<option value="${status}">${t(status)}</option>`).join('')}</select></label>`).join('')}<label>${t('pilotQuestion')}<textarea name="question" maxlength="600" rows="3" required minlength="8"></textarea></label><button class="button button-dark" type="submit">${t('pilotFinish')}</button></form>`}`;
}
document.addEventListener('click', event => {
  const b = event.target.closest('button'); if (!b) return;
  if (b.dataset.language && !started) { language = resolveLanguage(b.dataset.language); render(); }
  if (b.id === 'start-pilot') { started = performance.now(); render(); }
  if (b.hasAttribute('data-close')) b.closest('dialog').close();
  if (b.dataset.evidenceCandidate) { const d = document.querySelector('#evidence-dialog'); d.innerHTML = `<div class="dialog-top"><span>${t('recordedLabel')}</span><button class="icon-button" data-close aria-label="${t('close')}">×</button></div>${evidenceDetail(report(), b.dataset.evidenceCandidate, b.dataset.evidenceRequirement, language, { recorded: true })}`; d.showModal(); }
  if (b.id === 'download-pilot') {
    const record = { participantCode: participant, participantRoleVerified: false, syntheticTasks: true, assignment, language, recordedAt: new Date().toISOString(),
      limitation: 'Self-guided session with two different task sets and maintainer-authored expectations. Not a measured population productivity gain or verified recruiter study.', rows };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `talentlens-pilot-${participant}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'pilot-form') return; event.preventDefault(); if (!event.target.reportValidity()) return;
  const answers = Object.fromEntries(new FormData(event.target)), g = group(), criterion = g.criteria.find(c => c.priority === 'required');
  rows.push({ taskSet: g.id, condition: orders[assignment][index][1], taskOrder: index + 1, elapsedSeconds: Math.round((performance.now() - started) / 100) / 10,
    errors: g.candidates.filter(c => !c.expected[criterion.key].includes(answers[c.id])).length, answers, expectedCriterion: criterion.key });
  index++; started = null; finished = index === 2; render(); window.scrollTo(0, 0);
});
try { [tasks, results] = await Promise.all(['recorded/pilot-cases.json', 'recorded/evaluation-results.json'].map(async url => { const r = await fetch(url); if (!r.ok) throw new Error(); return r.json(); })); render(); }
catch { document.querySelector('#pilot-main').textContent = translate(language, 'recordedUnavailable'); }
