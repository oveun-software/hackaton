import { getProvider, checkProvider, checkZetaris, completeJson } from '../server/providers.js';

const provider = getProvider();
const [ai, zetaris] = await Promise.all([checkProvider(provider), checkZetaris()]);
const modelAvailable = ai.models.includes(provider.model);
const result = { ai: { provider: provider.id, model: provider.model, state: ai.state, modelAvailable }, zetaris };
if (process.argv.includes('--infer') && ai.state === 'online' && modelAvailable) {
  try {
    const answer = await completeJson(provider, [{ role: 'user', content: 'Return only this JSON object: {"status":"connected"}.' }], fetch, execution => { result.ai.execution = execution; });
    result.ai.inference = answer.status === 'connected' ? 'passed' : 'unexpected_response';
  } catch (error) { result.ai.inference = 'failed'; result.ai.errorCode = error.message.startsWith('errors.') ? error.message : 'errors.providerFailed'; }
}
console.log(JSON.stringify(result, null, 2));
if (ai.state !== 'online' || !modelAvailable || zetaris.state !== 'online' || (result.ai.inference && result.ai.inference !== 'passed')) process.exitCode = 1;

