import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { getProvider, completeJson } from '../server/providers.js';
import { translateReport } from '../server/report-translation.js';
const source = JSON.parse(await readFile(new URL('../data/live-review-workflow.json', import.meta.url), 'utf8'));
if (source.status !== 'passed' || source.synthetic !== true || source.reports.length !== 3 || source.reports.some(r => r.sources.some(s => !s.text.startsWith('FICTIONAL PROFILE FOR DEMONSTRATION')))) throw new Error('Only the verified fictional workflow can be published');
const provider = getProvider();
const evaluation = JSON.parse(await readFile(new URL('../evaluation/results.json', import.meta.url), 'utf8'));
if (evaluation.synthetic !== true || evaluation.mode !== 'live' || evaluation.groups.length !== 4 || evaluation.groups.some(g => !g.report)) throw new Error('A complete fictional live evaluation is required');
for (const [index, report] of source.reports.entries()) {
  report.translations ||= {};
  for (const language of ['es', 'fr', 'de']) {
    if (report.translations[language]) continue;
    console.log(`Translating recorded report ${index + 1}/3 into ${language}.`);
    report.translations[language] = await translateReport(report, language, messages => completeJson(provider, messages));
    await writeFile(new URL('../data/live-review-workflow.json', import.meta.url), JSON.stringify(source, null, 2));
  }
}
for (const group of evaluation.groups.filter(g => ['frontend', 'data'].includes(g.id))) {
  group.report.translations ||= {};
  for (const language of ['es', 'fr', 'de']) {
    if (group.report.translations[language]) continue;
    console.log(`Translating guided task ${group.id} into ${language}.`);
    group.report.translations[language] = await translateReport(group.report, language, messages => completeJson(provider, messages));
    await writeFile(new URL('../evaluation/results.json', import.meta.url), JSON.stringify(evaluation, null, 2));
  }
}
await mkdir(new URL('../public/recorded/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/recorded/evaluation-results.json', import.meta.url), JSON.stringify({ evaluatedAt: evaluation.evaluatedAt, synthetic: true, mode: 'live', model: evaluation.model, datasetSha256: evaluation.datasetSha256, limitation: evaluation.limitation, includedTaskGroups: ['frontend', 'data'], groups: evaluation.groups.filter(g => ['frontend', 'data'].includes(g.id)) }, null, 2));
await writeFile(new URL('../public/recorded/verified-review-workflow.json', import.meta.url), JSON.stringify(source, null, 2));
await writeFile(new URL('../examples/zetaris/verified-review-workflow.json', import.meta.url), JSON.stringify(source, null, 2));
console.log('Verified fictional recording published in English, Spanish, French and German.');
