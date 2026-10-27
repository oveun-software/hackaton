import { translate } from './i18n.js';
export function reportMarkdown(report, language) {
  const t = (key, values) => translate(language, key, values);
  let text = `# TalentLens · ${report.vacancyTitle}\n\n${report.summary}\n\n${t('exportProvider')}: ${report.provider}\n${t('modelLabel')}: ${report.model}\n${t('exportDate')}: ${report.createdAt}\n\n${t('exportNotice')}\n`;
  if (report.dataAccess?.mode === 'zetaris') {
    const q = report.dataAccess;
    text += `\n## ${t('zetarisTraceTitle')}\n\n${t('queryTime')}: ${q.startedAt}\n${t('queryRows')}: ${q.rowCount} / ${q.limit}\n${t('queryDuration')}: ${q.durationMs} ms\n\n${q.sql}\n\n${t('queryId')}: ${q.queryId}\n${t('requestId')}: ${q.requestId}\n\n${t('queryIdsHelp')}\n\n${t('zetarisTraceHelp')}\n`;
    for (const d of q.documents || []) text += `\n- ${d.filename} · ${t('documentVersion', { version: d.version })} · ${d.documentId}\n  SHA-256: ${d.sha256}\n`;
    if (q.redacted) text += `\n${t('queryRedacted')}\n`;
  } else if (report.dataAccess) text += `\n${t('workspaceTrace')}\n`;
  if (report.hmem) {
    const recovered = report.hmem.retrieved || [], used = new Set(report.hmem.matchedMemoryIds || report.hmem.usedMemoryIds || []);
    text += `\n## ${t('hmemTitle')}\n\n- ${t('hmemRecovered', { count: recovered.length })}\n- ${t('hmemPrior', { count: recovered.filter(item => item.fromPreviousProcess).length })}\n- ${t('matchedEvidence', { count: used.size })}\n`;
    for (const item of recovered) text += `\n### ${item.memoryId}\n\n${t('documentVersion', { version: item.documentVersion })} · ${item.candidateId} · ${item.verified ? t('sourceVerified') : t('sourceUnverified')}\n\n> ${(item.evidenceText || '').replace(/\n/g, '\n> ')}\n`;
  }
  if (report.review) text += `\n## ${t('secondReview')}\n\n${report.review.summary}\n\n${t('reviewLimit')}\n`;
  if (report.clarificationQuestions?.length) text += `\n## ${t('clarifyTitle')}\n\n${report.clarificationQuestions.map(q => `- ${q}`).join('\n')}\n`;
  for (const candidate of report.candidates) {
    const source = report.sources.find(s => s.id === candidate.candidateId);
    text += `\n## ${source.name}\n\n${t('exportSource')}: ${source.filename}\n\n${t(candidate.recommendation)}\n\n${candidate.rationale}\n`;
    for (const evidence of candidate.evidence) text += `\n### ${report.requirements.find(r => r.id === evidence.requirementId).label}\n\n${t(evidence.status)}: ${evidence.explanation}\n${evidence.sourceId ? `${t('exportSource')}: ${evidence.sourceId}\n` : ''}${evidence.followUpQuestion ? `${t('nextQuestion')}: ${evidence.followUpQuestion}\n` : ''}${evidence.quote ? `\n> ${evidence.quote.replace(/\n/g, '\n> ')}\n` : ''}`;
    text += `\n${t('interviewQuestions')}:\n${candidate.interviewQuestions.map(q => `- ${q}`).join('\n')}\n`;
  }
  return text;
}
