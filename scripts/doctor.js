import { getProvider, checkProvider, checkZetaris, completeJson } from '../server/providers.js';

const provider = getProvider();
const [ai, zetaris] = await Promise.all([checkProvider(provider), checkZetaris()]);
const requireZetaris = process.argv.includes('--require-zetaris');
const modelAvailable = ai.modelAvailable;
const result = { ai: { provider: provider.id, model: provider.model, state: ai.state, modelAvailable }, zetaris: { ...zetaris, required: requireZetaris } };
if (process.argv.includes('--infer') && ai.state === 'online' && modelAvailable) {
  try {
    const answer = await completeJson(provider, [{ role: 'user', content: 'Return only this JSON object: {"status":"connected"}.' }], fetch, execution => { result.ai.execution = execution; });
    result.ai.inference = answer.status === 'connected' ? 'passed' : 'unexpected_response';
  } catch (error) { result.ai.inference = 'failed'; result.ai.errorCode = error.message.startsWith('errors.') ? error.message : 'errors.providerFailed'; }
}
console.log(JSON.stringify(result, null, 2));
if (ai.state !== 'online' || !modelAvailable || (requireZetaris && zetaris.state !== 'online') || (result.ai.inference && result.ai.inference !== 'passed')) process.exitCode = 1;
