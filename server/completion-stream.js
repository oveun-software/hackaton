const MAX_BYTES = 4 * 1024 * 1024;

// Buffer only the final answer and execution metadata. Reasoning deltas
// are deliberately neither retained nor exposed to the application.
export async function readCompletionStream(response) {
  const decoder = new TextDecoder();
  let pending = '', content = '', model, meterless, finishReason, done = false, bytes = 0;
  const tools = new Map();
  const invalid = () => { throw new Error('errors.aiResponse'); };
  function frame(raw) {
    const text = raw.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!text) return;
    if (done) invalid();
    if (text === '[DONE]') { done = true; return; }
    let data;
    try { data = JSON.parse(text); } catch { invalid(); }
    if (data.error) throw new Error('errors.providerFailed');
    if (typeof data.model === 'string') model = data.model;
    if (data.meterless) meterless = { ...meterless, ...data.meterless };
    const choice = data.choices?.[0];
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    if (typeof choice?.delta?.content === 'string') content += choice.delta.content;
    for (const [position, part] of (choice?.delta?.tool_calls || []).entries()) {
      // Nightshift 1.2.1 emits whole native tool calls in its final delta,
      // without the index used by incremental OpenAI tool-call fragments.
      const atomic = part.index === undefined && typeof part.function?.name === 'string' && typeof part.function?.arguments === 'string';
      const index = atomic ? position : part.index;
      if (!Number.isInteger(index) || index < 0 || index > 3) invalid();
      const tool = tools.get(index) || { type: 'function', function: { name: '', arguments: '' } };
      if (typeof part.function?.name === 'string') tool.function.name += part.function.name;
      if (typeof part.function?.arguments === 'string') tool.function.arguments += part.function.arguments;
      tools.set(index, tool);
    }
  }
  try {
    for await (const part of response.body) {
      bytes += part.byteLength;
      if (bytes > MAX_BYTES) invalid();
      pending += decoder.decode(part, { stream: true });
      let delimiter;
      while ((delimiter = /\r?\n\r?\n/.exec(pending))) {
        frame(pending.slice(0, delimiter.index));
        pending = pending.slice(delimiter.index + delimiter[0].length);
      }
    }
  } catch (error) {
    if (error.message?.startsWith('errors.')) throw error;
    throw new Error('errors.providerNetwork');
  }
  if (!done || !finishReason) invalid();
  return { model, meterless, choices: [{ finish_reason: finishReason,
    message: { content, ...(tools.size ? { tool_calls: [...tools.values()] } : {}) } }] };
}
