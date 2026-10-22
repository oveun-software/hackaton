import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { catalogs, languages, translate, resolveLanguage } from '../public/i18n.js';
import { reportMarkdown } from '../public/report-export.js';
import { validateTranslation } from '../server/report-translation.js';
import { runAnalysis } from '../server/analysis.js';
import { Store } from '../server/store.js';

test('all four languages have complete messages and matching interpolation parameters', () => {
  const keys = Object.keys(catalogs.en).sort();
  for (const [language, catalog] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), keys);
    for (const key of keys) {
      assert.ok(catalog[key]?.trim(), `${language}: ${key}`);
      assert.deepEqual((catalog[key].match(/\{\w+\}/g) || []).sort(), (catalogs.en[key].match(/\{\w+\}/g) || []).sort(), `${language}: ${key}`);
    }
    assert.equal(translate(language, 'cvCount', { count: 3 }).includes('{count}'), false);
  }
  assert.equal(resolveLanguage('de-DE,de;q=0.8'), 'de');
  assert.equal(resolveLanguage('unknown'), 'en');
});
const report = {
  id: 'report', language: 'en', vacancyTitle: 'Frontend Developer', provider: 'Test provider', model: 'fixture', createdAt: '2026-10-22T12:00:00Z',
  summary: 'A profile with documented professional experience.', clarificationQuestions: [],
  requirements: [{ id: 'r1', label: 'React experience', priority: 'required', quote: 'Experience with React' }],
  sources: [{ id: 'c1', name: 'Alex', filename: 'alex.txt', text: 'Experiencia profesional con React.' }],
  candidates: [{ candidateId: 'c1', recommendation: 'possible', rationale: 'The profile documents React experience.', evidence: [{ requirementId: 'r1', status: 'supported', quote: 'Experiencia profesional con React', explanation: 'Experience is declared.' }], interviewQuestions: ['What was your contribution?'] }]
};
const translated = () => ({ summary: 'Un profil avec une expérience professionnelle documentée.', requirements: [{ id: 'r1', label: 'Expérience React' }], clarificationQuestions: [], candidates: [{ candidateId: 'c1', rationale: 'Le profil documente une expérience avec React.', evidence: [{ requirementId: 'r1', explanation: 'Une expérience est déclarée.' }], interviewQuestions: ['Quelle a été votre contribution ?'] }] });
test('report translations preserve exact source quotations, recommendation, status and order', () => {
  const result = validateTranslation(report, translated(), 'fr');
  assert.equal(result.language, 'fr'); assert.equal(result.candidates[0].evidence[0].quote, report.candidates[0].evidence[0].quote);
  assert.equal(result.requirements[0].quote, report.requirements[0].quote);
  assert.equal(result.candidates[0].recommendation, 'possible'); assert.equal(result.candidates[0].evidence[0].status, 'supported');
  assert.equal(report.language, 'en'); assert.equal(report.summary, 'A profile with documented professional experience.');
  const tampered = translated(); tampered.candidates[0].evidence[0].quote = 'A newly invented citation';
  assert.throws(() => validateTranslation(report, tampered, 'fr'), /errors.translation/);
  const unknown = translated(); unknown.candidates[0].candidateId = 'other';
  assert.throws(() => validateTranslation(report, unknown, 'fr'), /errors.translation/);
});
test('exports localize headings and statuses while preserving document quotes', () => {
  for (const language of Object.keys(languages)) {
    const markdown = reportMarkdown(report, language);
    assert.ok(markdown.includes(translate(language, 'exportSource')));
    assert.ok(markdown.includes(translate(language, 'supported')));
    assert.ok(markdown.includes(translate(language, 'interviewQuestions')));
    assert.ok(markdown.includes('> Experiencia profesional con React'));
    assert.ok(markdown.includes('TalentLens'));
  }
});
test('both model calls receive the selected output language and preserve source quotations', async () => {
  for (const [language, config] of Object.entries(languages)) {
    let calls = 0;
    const result = await runAnalysis({ vacancy: { title: 'Frontend', description: 'Experience with React is essential for this role.' }, candidates: [{ id: 'c1', text: report.sources[0].text }], language,
      complete: async messages => { calls++; assert.ok(messages[0].content.includes(config.modelName)); assert.match(messages[0].content, /Never translate quotations/); return calls === 1 ? { requirements: report.requirements, clarificationQuestions: [] } : { summary: report.summary, candidates: report.candidates }; } });
    assert.equal(result.language, language); assert.equal(calls, 2);
  }
});
test('database rebranding preserves existing documents and reports', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'talentlens-migration-'));
  try {
    const legacy = new DatabaseSync(path.join(directory, 'atlas.sqlite'));
    legacy.exec('CREATE TABLE records (kind TEXT NOT NULL, id TEXT PRIMARY KEY, body TEXT NOT NULL)');
    legacy.prepare('INSERT INTO records VALUES(?,?,?)').run('report', 'report', JSON.stringify(report)); legacy.close();
    const store = new Store(directory);
    assert.deepEqual(store.get('report', 'report'), report); store.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
