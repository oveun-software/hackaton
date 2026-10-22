export class ServiceError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
export function normalizeBase(input) {
  const url = new URL(input.includes('://') ? input : `http://${input}`);
  if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) throw new ServiceError('errors.url', 400);
  if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new ServiceError('errors.https', 400);
  url.pathname = url.pathname.replace(/\/(?:v1(?:\/(?:chat\/completions|models))?|healthz)\/?$/, '').replace(/\/$/, '') + '/v1';
  url.search = ''; url.hash = '';
  return url.toString().replace(/\/$/, '');
}
export function getProvider(env = process.env) {
  const meterless = env.AI_PROVIDER === 'meterless';
  return {
    id: meterless ? 'meterless' : 'nvidia', name: meterless ? 'Meterless Nightshift' : 'NVIDIA Nemotron',
    base: meterless ? normalizeBase(env.METERLESS_BASE_URL || 'http://127.0.0.1:8088/v1') : 'https://integrate.api.nvidia.com/v1',
    key: meterless ? env.METERLESS_RUNTIME_TOKEN : env.NVIDIA_API_KEY,
    model: meterless ? env.METERLESS_MODEL || 'meterless/deep' : env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b'
  };
}
function headers(provider) {
  return { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json',
    ...(provider.id === 'meterless' ? { 'meterless-app': 'talentlens', 'meterless-scope': 'user' } : {}) };
}
export async function checkProvider(provider, fetcher = fetch) {
  if (!provider.key || provider.key === 'rt-local') return { state: 'unconfigured', models: [] };
  try {
    const response = await fetcher(`${provider.base}/models`, { headers: headers(provider), signal: AbortSignal.timeout(5000), redirect: 'error' });
    if ([401, 403].includes(response.status)) return { state: 'unauthorized', models: [] };
    if (!response.ok) return { state: 'offline', models: [] };
    const data = await response.json();
    const models = (data.data || []).map(m => m.id).filter(id => typeof id === 'string');
    if (provider.id === 'meterless' && !models.some(id => id.startsWith('meterless/'))) return { state: 'offline', models: [] };
    return { state: 'online', models };
  } catch { return { state: 'offline', models: [] }; }
}
export async function completeJson(provider, messages, fetcher = fetch) {
  if (!provider.key || provider.key === 'rt-local') throw new ServiceError('errors.keyMissing', 503);
  let response;
  try {
    response = await fetcher(`${provider.base}/chat/completions`, {
      method: 'POST', headers: headers(provider), redirect: 'error', signal: AbortSignal.timeout(180000),
      body: JSON.stringify({ model: provider.model, messages, temperature: 0.2, max_tokens: 16384,
        stream: false, response_format: { type: 'json_object' },
        ...(provider.id === 'nvidia' ? { chat_template_kwargs: { enable_thinking: false } } : {}) })
    });
  } catch { throw new ServiceError('errors.providerNetwork'); }
  if ([401, 403].includes(response.status)) throw new ServiceError('errors.providerAuth', 503);
  if (response.status === 429) throw new ServiceError('errors.rateLimit', 429);
  if (!response.ok) throw new ServiceError('errors.providerFailed');
  const data = await response.json();
  if (data.choices?.[0]?.finish_reason === 'length') throw new ServiceError('errors.aiTruncated');
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new ServiceError('errors.aiResponse');
  try { return JSON.parse(content.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')); }
  catch { throw new ServiceError('errors.aiJson'); }
}
export async function readZetaris(env = process.env, fetcher = fetch) {
  if (!env.ZETARIS_URL || !env.ZETARIS_USER) throw new ServiceError('errors.zetarisMissing', 503);
  const base = new URL(env.ZETARIS_URL);
  if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) throw new ServiceError('errors.zetarisHttps', 400);
  const table = env.ZETARIS_TABLE || 'hackathon.recruiting.candidates';
  if (!/^[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*){2}$/.test(table)) throw new ServiceError('errors.zetarisTable', 400);
  const requestHeaders = { 'Content-Type': 'text/plain', 'X-Trino-User': env.ZETARIS_USER, 'X-Trino-Source': 'talentlens',
    ...(env.ZETARIS_TOKEN ? { Authorization: `Bearer ${env.ZETARIS_TOKEN}` } : {}) };
  let next = new URL('/v1/statement', base).href;
  let columns = []; const rows = [];
  const signal = AbortSignal.timeout(30000);
  for (let page = 0; page < 100; page++) {
    if (new URL(next).origin !== base.origin) throw new ServiceError('errors.zetarisRedirect');
    const response = await fetcher(next, { method: page ? 'GET' : 'POST', headers: requestHeaders,
      ...(!page ? { body: `SELECT candidate_id, display_name, document_name, cv_text FROM ${table} LIMIT 25` } : {}), signal, redirect: 'error' });
    if (!response.ok) throw new ServiceError('errors.zetarisQuery');
    const result = await response.json();
    if (result.error) throw new ServiceError('errors.zetarisQuery');
    if (result.columns) columns = result.columns.map(c => c.name);
    if (result.data) rows.push(...result.data);
    if (rows.length > 25) throw new ServiceError('errors.zetarisLimit');
    if (!result.nextUri) return rows.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
    next = result.nextUri;
  }
  throw new ServiceError('errors.zetarisTimeout');
}
