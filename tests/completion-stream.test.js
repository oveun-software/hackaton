import test from 'node:test';
import assert from 'node:assert/strict';
import { completeJson } from '../server/providers.js';

const provider = { id: 'meterless', base: 'http://localhost:8088/v1', key: 'fixture-token', model: 'nvidia/nemotron-3.5-lightning-30b-a3b' };
const frame = data => `data: ${JSON.stringify(data)}\r\n\r\n`;
function streamed(text) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    // Include splits inside JSON, event delimiters and multi-byte characters.
    for (let index = 0; index < bytes.length; index += 7) controller.enqueue(bytes.slice(index, index + 7));
    controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream' } });
}
const terminal = (finish = 'tool_calls') => frame({ model: provider.model, choices: [{ delta: {}, finish_reason: finish }], meterless: { routed_model: provider.model, receipt_id: 'fixture-receipt' } });
const tool = (name, args) => frame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { name, arguments: args } }] } }] });

test('streaming reconstructs structured answers and UTF-8, preserving real model proof without reasoning', async () => {
  const data = ': heartbeat\r\n\r\n'
    + frame({ choices: [{ delta: { reasoning_content: 'Private reasoning must not be retained.' } }] })
    + tool('emit_', '{"résumé":') + tool('structured_result', '"Experiencia técnica 🇪🇸"}')
    + terminal() + 'data: [DONE]\r\n\r\n';
  let execution;
  const answer = await completeJson(provider, [], async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.stream, true); assert.equal(body.tools[0].function.name, 'emit_structured_result');
    assert.equal(body.tool_choice.function.name, 'emit_structured_result'); assert.equal('response_format' in body, false);
    return streamed(data);
  }, value => { execution = value; });
  assert.deepEqual(answer, { résumé: 'Experiencia técnica 🇪🇸' });
  assert.equal(execution.actualModel, provider.model); assert.equal(execution.receiptId, 'fixture-receipt');
  assert.equal(JSON.stringify({ answer, execution }).includes('Private reasoning'), false);
});

test('accepts the complete tool-call delta emitted by Nightshift 1.2.1 without an incremental index', async () => {
  const text = frame({ choices: [{ delta: { tool_calls: [{ id: 'fixture-call', type: 'function', function: { name: 'emit_structured_result', arguments: '{"ok":true}' } }] } }] })
    + terminal() + 'data: [DONE]\n\n';
  assert.deepEqual(await completeJson(provider, [], async () => streamed(text)), { ok: true });
});

test('streaming rejects provider error frames, interrupted answers, review gates and unexpected tools', async () => {
  const validTool = tool('emit_structured_result', '{"ok":true}');
  for (const [text, code] of [
    [frame({ error: { code: 'provider_error', message: 'Must not leak provider details.' } }) + 'data: [DONE]\n\n', 'errors.providerFailed'],
    [validTool + terminal(), 'errors.aiResponse'],
    [validTool + terminal('requires_review') + 'data: [DONE]\n\n', 'errors.providerReview'],
    [tool('unexpected_action', '{"ok":true}') + terminal() + 'data: [DONE]\n\n', 'errors.aiResponse'],
    [validTool + terminal('length') + 'data: [DONE]\n\n', 'errors.aiTruncated']
  ]) await assert.rejects(() => completeJson(provider, [], async () => streamed(text)), { message: code });
});

test('streaming bounds the response instead of keeping an unlimited generation', async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4 * 1024 * 1024 + 1)); controller.close(); } });
  await assert.rejects(() => completeJson(provider, [], async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })), /errors.aiResponse/);
});
