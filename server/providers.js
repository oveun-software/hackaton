import { randomUUID } from 'node:crypto';

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
export async function completeJson(provider, messages, fetcher = fetch, onExecution = () => {}) {
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
  if (data.meterless?.requires_review || data.choices?.[0]?.finish_reason === 'requires_review') throw new ServiceError('errors.providerReview');
  const actualModel = data.meterless?.winning_route?.model || data.meterless?.routed_model || data.model;
  if (provider.id === 'meterless' && provider.model.startsWith('nvidia/') && actualModel !== provider.model) throw new ServiceError('errors.modelMismatch');
  if (data.choices?.[0]?.finish_reason === 'length') throw new ServiceError('errors.aiTruncated');
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new ServiceError('errors.aiResponse');
  try {
    const result = JSON.parse(content.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
    onExecution({ requestedModel: provider.model, actualModel: typeof actualModel === 'string' ? actualModel : null,
      receiptId: typeof data.meterless?.receipt_id === 'string' ? data.meterless.receipt_id : null });
    return result;
  }
  catch { throw new ServiceError('errors.aiJson'); }
}
function zetarisConfig(env) {
  if (!env.ZETARIS_REST_URL || !env.ZETARIS_API_KEY || !env.ZETARIS_ORG_ID) throw new ServiceError('errors.zetarisMissing', 503);
  const base = new URL(env.ZETARIS_REST_URL);
  if (base.username || base.password || base.search || base.hash || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) throw new ServiceError('errors.zetarisHttps', 400);
  base.pathname = base.pathname.replace(/\/+$/, '') || '/api/v1.0';
  if (!base.pathname.endsWith('/api/v1.0') || !/^\d+$/.test(env.ZETARIS_ORG_ID)) throw new ServiceError('errors.zetarisMissing', 400);
  return { base: base.href.replace(/\/$/, ''), key: env.ZETARIS_API_KEY, org: env.ZETARIS_ORG_ID };
}
export function isZetarisConfigured(env = process.env) {
  try { zetarisConfig(env); return true; } catch { return false; }
}
async function zetarisQuery(sql, limit, env, fetcher) {
  const config = zetarisConfig(env);
  let response;
  try {
    response = await fetcher(`${config.base}/sql-editor/sqls/run`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', 'X-Org-ID': config.org, 'X-Request-ID': randomUUID() },
      body: JSON.stringify({ queryId: randomUUID(), sql, source: 'SqlEditor', limit })
    });
  } catch (error) { throw new ServiceError(error.name === 'TimeoutError' ? 'errors.zetarisTimeout' : 'errors.zetarisNetwork'); }
  if ([401, 403].includes(response.status)) throw new ServiceError('errors.zetarisAuth', 503);
  if (!response.ok) throw new ServiceError('errors.zetarisQuery');
  let result;
  try { result = await response.json(); } catch { throw new ServiceError('errors.zetarisQuery'); }
  if (!result || result.error || result.success === false || !Array.isArray(result.data)) throw new ServiceError('errors.zetarisQuery');
  if (result.data.length > limit) throw new ServiceError('errors.zetarisLimit');
  return result.data;
}
export async function checkZetaris(env = process.env, fetcher = fetch) {
  if (!isZetarisConfigured(env)) return { state: 'unconfigured' };
  try {
    const rows = await zetarisQuery('SELECT 1 AS talentlens_check', 1, env, fetcher);
    const value = Array.isArray(rows[0]) ? rows[0][0] : rows[0]?.talentlens_check;
    return { state: Number(value) === 1 ? 'online' : 'offline' };
  } catch (error) { return { state: error.message === 'errors.zetarisAuth' ? 'unauthorized' : 'offline' }; }
}
export async function readZetaris(env = process.env, fetcher = fetch) {
  const table = env.ZETARIS_TABLE || 'talentlens.candidates';
  if (!/^[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*){0,2}$/.test(table)) throw new ServiceError('errors.zetarisTable', 400);
  const columns = ['candidate_id', 'display_name', 'document_name', 'cv_text'];
  const rows = await zetarisQuery(`SELECT ${columns.join(', ')} FROM ${table} LIMIT 25`, 25, env, fetcher);
  return rows.map(row => {
    if (Array.isArray(row)) {
      if (row.length !== columns.length) throw new ServiceError('errors.zetarisQuery');
      return Object.fromEntries(columns.map((name, index) => [name, row[index]]));
    }
    if (!row || typeof row !== 'object' || !columns.every(name => Object.hasOwn(row, name))) throw new ServiceError('errors.zetarisQuery');
    return Object.fromEntries(columns.map(name => [name, row[name]]));
  });
}
