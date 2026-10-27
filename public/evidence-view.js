import { translate } from './i18n.js';
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export function dataAccessView(trace, language) {
  if (!trace) return '';
  const e = escapeHtml, t = (key, values) => e(translate(language, key, values));
  if (trace.mode !== 'zetaris') return `<p class="small-note">${t('workspaceTrace')}</p>`;
  return `<section class="panel panel-pad data-trace"><span class="eyebrow">${t('zetarisTraceTitle')}</span><h3>${t(`zetarisTrace_${trace.status}`)}</h3><p class="small-note">${t('zetarisTraceHelp')}</p>
    <dl><dt>${t('queryTime')}</dt><dd>${e(trace.startedAt)}</dd>${trace.rowCount !== undefined ? `<dt>${t('queryRows')}</dt><dd>${e(trace.rowCount)} / ${e(trace.limit)}</dd><dt>${t('queryDuration')}</dt><dd>${e(trace.durationMs)} ms</dd>` : ''}</dl>
    ${trace.sql ? `<details><summary>${t('queryDetails')}</summary><pre class="source-context">${e(trace.sql)}</pre><p>${t('queryId')}: <code>${e(trace.queryId)}</code><br>${t('requestId')}: <code>${e(trace.requestId)}</code></p><p class="small-note">${t('queryIdsHelp')}</p></details>` : ''}
    ${trace.documents?.length ? `<details><summary>${t('queryDocuments', { count: trace.documents.length })}</summary><ul>${trace.documents.map(d => `<li><strong>${e(d.filename)}</strong> · ${t('documentVersion', { version: d.version })}<br><code>${e(d.documentId)}</code><br><small>SHA-256: ${e(d.sha256)}</small></li>`).join('')}</ul></details>` : ''}
    ${trace.redacted ? `<p class="small-note">${t('queryRedacted')}</p>` : ''}${trace.errorCode ? `<p role="alert">${t(trace.errorCode)}</p>` : ''}</section>`;
}
export function evidenceView(report, language, { recorded = false } = {}) {
  const t = (key, params) => escapeHtml(translate(language, key, params));
  const name = id => report.sources.find(source => source.id === id)?.name || id;
  const matrix = `<section class="panel panel-pad evidence-matrix"><h3>${t('evidenceMatrix')}</h3><p class="small-note">${t('matrixHelp')}</p><div class="table-wrap"><table><thead><tr><th>${t('requirement')}</th>${report.candidates.map(c => `<th scope="col">${escapeHtml(name(c.candidateId))}</th>`).join('')}</tr></thead><tbody>${report.requirements.map(r => `<tr><th scope="row">${escapeHtml(r.label)}<br><small>${t(r.priority)}</small></th>${report.candidates.map(c => { const e = c.evidence.find(e => e.requirementId === r.id); return `<td><button class="evidence-cell ${e.status}" aria-label="${escapeHtml(name(c.candidateId))} · ${escapeHtml(r.label)} · ${t(e.status)}" data-evidence-candidate="${escapeHtml(c.candidateId)}" data-evidence-requirement="${escapeHtml(r.id)}" data-evidence-report="${escapeHtml(report.id)}">${t(e.status)}<span aria-hidden="true"> ↗</span></button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  const changes = report.changes?.previousReportId ? `<section class="panel panel-pad"><h3>${t('whatChanged')}</h3>${report.changes.evidence.length ? `<ul>${report.changes.evidence.map(item => `<li><strong>${escapeHtml(name(item.candidateId))}</strong> · ${escapeHtml(report.requirements.find(r => r.id === item.requirementId)?.label)}: ${item.before !== item.after ? `${t(item.before)} → ${t(item.after)}` : t(item.after)}${item.sourceChanged ? ` · ${t('sourceChanged')}` : ''}</li>`).join('')}</ul>` : `<p>${t('noEvidenceChanges')}</p>`}<p class="small-note">${t('changesHelp')}</p></section>` : '';
  const review = report.review ? `<section class="panel panel-pad critical-review"><span class="eyebrow">${t('secondReview')}</span><h3>${t('reviewResult')}</h3><details><summary>${t('reviewExplanation')}</summary><p>${escapeHtml(report.review.summary)}</p></details><p class="small-note">${t('reviewLimit')}</p>${report.review.findings.length ? `<details><summary>${t('reviewFindings', { count: report.review.findings.length })}</summary><ul>${report.review.findings.map(f => `<li><strong>${escapeHtml(name(f.candidateId))}</strong> · ${escapeHtml(report.requirements.find(r => r.id === f.requirementId)?.label)}<p>${escapeHtml(f.explanation)}</p></li>`).join('')}</ul></details>` : ''}</section>` : '';
  return dataAccessView(report.dataAccess, language) + matrix + changes + review;
}
export function evidenceDetail(report, candidateId, requirementId, language, { recorded = false } = {}) {
  const t = (key, params) => escapeHtml(translate(language, key, params));
  const candidate = report.candidates.find(c => c.candidateId === candidateId), requirement = report.requirements.find(r => r.id === requirementId);
  const evidence = candidate?.evidence.find(e => e.requirementId === requirementId);
  if (!evidence || !requirement) return '';
  const source = report.evidenceSources?.find(s => s.id === evidence.sourceId && s.candidateId === candidateId);
  const memory = report.hmem?.retrieved?.find(s => s.documentId === evidence.sourceId && s.candidateId === candidateId);
  const text = source?.text || memory?.evidenceText;
  const at = text && evidence.quote ? text.indexOf(evidence.quote) : -1;
  const quoted = text ? at < 0 ? escapeHtml(text) : `${escapeHtml(text.slice(0, at))}<mark>${escapeHtml(evidence.quote)}</mark>${escapeHtml(text.slice(at + evidence.quote.length))}` : '';
  return `<h2 id="document-title">${escapeHtml(requirement.label)}</h2><span class="pill ${evidence.status === 'supported' ? 'success' : 'pending'}">${t(evidence.status)}</span><p>${escapeHtml(evidence.explanation)}</p>${evidence.quote ? `<blockquote>“${escapeHtml(evidence.quote)}”</blockquote>` : ''}${source?.kind === 'clarification' ? `<p class="small-note">${t('attributedStatement')} · ${t(source.source)} · ${escapeHtml(source.filename)}</p>` : ''}${quoted ? `<details open><summary>${t('sourceDocument')}</summary><pre class="source-context">${quoted}</pre></details>` : ''}${evidence.followUpQuestion ? `<div class="clarification-callout"><h3>${t('nextQuestion')}</h3><p>${escapeHtml(evidence.followUpQuestion)}</p>${!recorded && !report.privacyRedacted ? `<button class="button button-dark" data-add-clarification="${escapeHtml(candidateId)}" data-clarification-report="${escapeHtml(report.id)}" data-clarification-requirement="${escapeHtml(requirementId)}">${t('recordClarification')}</button>` : ''}</div>` : ''}`;
}
