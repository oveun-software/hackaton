import { languages, resolveLanguage, translate } from './i18n.js';
import { evidenceView, evidenceDetail, escapeHtml as esc } from './evidence-view.js';
let language = resolveLanguage(new URLSearchParams(location.search).get('lang') || 'en'), selected = 0, recording;
const t = (key, values) => esc(translate(language, key, values));
const report = () => { const r = recording.reports[selected]; return r.translations?.[language] ? { ...r, ...r.translations[language] } : r; };
function comparisonView(r) {
  const pair = recording.memoryComparison;
  if (selected !== 2 || !pair) return '';
  const name = r.sources.find(s => s.id === pair.candidateId)?.name || pair.candidateId;
  return `<section class="panel panel-pad evidence-matrix"><h3>${t('memoryComparisonTitle')} · ${esc(name)}</h3><p>${t('memoryComparisonHelp')}</p><div class="table-wrap"><table><thead><tr><th>${t('requirement')}</th><th>${t('currentCvOnly')}</th><th>${t('withEarlierContext')}</th></tr></thead><tbody>${r.requirements.map(req => `<tr><th>${esc(req.label)}</th><td>${t(pair.withoutMemory.find(e => e.requirementId === req.id).status)}</td><td>${t(pair.withMemory.find(e => e.requirementId === req.id).status)}</td></tr>`).join('')}</tbody></table></div><p class="small-note">${t('singleComparisonLimit')}</p></section>`;
}
function render() {
  document.documentElement.lang = language; document.title = `TalentLens · ${translate(language, 'exploreRecorded')}`;
  document.querySelector('#languages').setAttribute('aria-label', translate(language, 'languageSelector'));
  document.querySelector('#languages').innerHTML = Object.entries(languages).map(([id, value]) => `<button data-language="${id}" aria-pressed="${id === language}"><img src="flags/${value.flag}.svg" alt="">${esc(value.name)}</button>`).join('');
  const r = report();
  document.querySelector('#recorded-main').innerHTML = `<div class="showcase-intro"><span class="eyebrow">${t('recordedLabel')}</span><h1>${t('productNoteTitle')}</h1><p>${t('recordedHelp')}</p><a class="button button-outline" href="pilot.html?lang=${language}">${t('pilotTitle')}</a></div><div class="showcase-tabs">${recording.reports.map((_, i) => `<button class="button button-outline" data-step="${i}" aria-pressed="${selected === i}">${t(['recordedBefore', 'recordedAfter', 'recordedRecall'][i])}</button>`).join('')}</div><div class="panel panel-pad"><h2>${t(selected === 2 ? 'recordedPlatformRole' : 'recordedProductRole')}</h2><p>${esc(r.summary)}</p>${r.language !== language ? `<p class="small-note">${t('originalReportLanguage')}</p>` : ''}<p class="small-note">${t('humanDecision')}</p></div>${comparisonView(r)}${evidenceView(r, language, { recorded: true })}<details class="panel panel-pad showcase-proof"><summary>${t('executionProof')}</summary><p>${esc(recording.verifiedAt)} · ${esc(r.model)}</p><p>${t('memoryCaveat')}</p><pre>${esc(JSON.stringify({ executions: r.executions, memoriesProvided: r.hmem?.retrieved?.length || 0, citationsAlsoInMemory: r.hmem?.matchedMemoryIds?.length || 0 }, null, 2))}</pre></details>`;
}
document.addEventListener('click', event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.language) { language = resolveLanguage(button.dataset.language); const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url); render(); }
  if (button.dataset.step !== undefined) { selected = Number(button.dataset.step); render(); }
  if (button.dataset.evidenceCandidate) { const dialog = document.querySelector('#evidence-dialog'); dialog.innerHTML = `<div class="dialog-top"><span class="eyebrow">${t('recordedLabel')}</span><button type="button" class="icon-button" data-close aria-label="${t('close')}">×</button></div>${evidenceDetail(report(), button.dataset.evidenceCandidate, button.dataset.evidenceRequirement, language, { recorded: true })}`; dialog.showModal(); }
  if (button.hasAttribute('data-close')) button.closest('dialog').close();
});
try { const response = await fetch('recorded/verified-review-workflow.json'); if (!response.ok) throw new Error(); recording = await response.json(); render(); }
catch { document.querySelector('#recorded-main').textContent = translate(language, 'recordedUnavailable'); }
