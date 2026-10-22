import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { demoCandidates, demoVacancy } from '../server/demo.js';
import { getProvider, completeJson, readZetaris } from '../server/providers.js';
import { runAnalysis } from '../server/analysis.js';

// Never send arbitrary database contents during an integration check.
// Require an exact match to the public, fictional fixture before inference.
const provider = getProvider();
const executions = [];
try {
  if (provider.id !== 'meterless') throw new Error('Use Nightshift for the hackathon verification.');
  const rows = await readZetaris();
  const candidates = demoCandidates.map((expected, index) => {
    const id = `fictional-${index}`;
    const row = rows.find(item => item.candidate_id === id);
    if (!row || row.display_name !== expected.name || row.document_name !== expected.filename || row.cv_text !== expected.text.replace(/\r?\n/g, ' ')) {
      throw new Error('Candidate view does not exactly match the public fictional fixtures. No CVs were sent.');
    }
    return { id, text: row.cv_text };
  });
  if (rows.length !== candidates.length) throw new Error('Candidate view has additional records. No CVs were sent.');
  console.log('Verified the three fictional Zetaris inputs. Starting Nightshift/Nemotron analysis.');
  const result = await runAnalysis({ vacancy: demoVacancy, candidates, note: 'Fictional demonstration only.', language: 'en',
    complete: messages => completeJson(provider, messages, fetch, execution => {
      executions.push(execution);
      console.log(JSON.stringify({ completedStage: executions.length, ...execution }));
    }) });
  const output = new URL('../data/live-verification.json', import.meta.url);
  fs.mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ verifiedAt: new Date().toISOString(), synthetic: true, executions, result }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ status: 'passed', requirements: result.requirements.length, candidates: result.candidates.length, literalQuotesValidated: true, output: fileURLToPath(output) }));
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', reason: error.message.startsWith('errors.') ? error.message : 'Integration check failed. Check the fixture view and local configuration.', completedStages: executions.length }));
  process.exitCode = 1;
}
