import { translate } from './i18n.js';
export function reportMarkdown(report, language) {
  const t = (key, values) => translate(language, key, values);
  let text = `# TalentLens · ${report.vacancyTitle}\n\n${report.summary}\n\n${t('exportProvider')}: ${report.provider}\n${t('modelLabel')}: ${report.model}\n${t('exportDate')}: ${report.createdAt}\n\n${t('exportNotice')}\n`;
  if (report.clarificationQuestions?.length) text += `\n## ${t('clarifyTitle')}\n\n${report.clarificationQuestions.map(q => `- ${q}`).join('\n')}\n`;
  for (const candidate of report.candidates) {
    const source = report.sources.find(s => s.id === candidate.candidateId);
    text += `\n## ${source.name}\n\n${t('exportSource')}: ${source.filename}\n\n${t(candidate.recommendation)}\n\n${candidate.rationale}\n`;
    for (const evidence of candidate.evidence) text += `\n### ${report.requirements.find(r => r.id === evidence.requirementId).label}\n\n${t(evidence.status)}: ${evidence.explanation}\n${evidence.quote ? `\n> ${evidence.quote.replace(/\n/g, '\n> ')}\n` : ''}`;
    text += `\n${t('interviewQuestions')}:\n${candidate.interviewQuestions.map(q => `- ${q}`).join('\n')}\n`;
  }
  return text;
}
