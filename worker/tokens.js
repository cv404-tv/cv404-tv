import { currentSession } from './auth.js';
import { isAdmin } from '../lib/admin-access.js';

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...headers,
} });
class InputError extends Error {
  constructor(code, status = 400) { super(code); this.status = status; }
}
async function readBody(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') throw new InputError('invalid_content_type', 415);
  if (!request.body) throw new InputError('invalid_input');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); throw new InputError('too_large', 413); }
    text += decoder.decode(value, { stream: true });
  }
  try {
    const body = JSON.parse(text + decoder.decode());
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body;
  } catch { throw new InputError('invalid_input'); }
}
function field(value, min, max) {
  // SQLite length() counts Unicode code points; a surrogate pair is one character.
  if (typeof value !== 'string' || [...value.trim()].length < min || value.trim().length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) throw new InputError('invalid_input');
  return value.trim();
}
function amount(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1000000000) throw new InputError('invalid_input');
  return value;
}
function pagination(url) {
  const page = Number(url.searchParams.get('page') || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new InputError('invalid_input');
  return { page, offset: (page - 1) * 20 };
}
// Separate encryption key: changing the authentication secret does not lose issued keys.
async function credentialKey(env) {
  if (!/^[a-f\d]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY || '')) throw new InputError('delivery_unavailable', 503);
  const bytes = Uint8Array.from(env.TOKEN_ENCRYPTION_KEY.match(/../g), byte => parseInt(byte, 16));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function seal(value, id, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(id) }, await credentialKey(env), new TextEncoder().encode(value));
  return JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) });
}
async function unseal(value, id, env) {
  const { iv, data } = JSON.parse(value);
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv), additionalData: new TextEncoder().encode(id) }, await credentialKey(env), new Uint8Array(data)));
}
const columns = `r.id, r.project_name AS projectName, r.purpose, r.requested_tokens AS requestedTokens,
  r.status, r.created_at AS createdAt, r.reviewed_at AS reviewedAt, r.review_note AS reviewNote,
  r.granted_tokens AS grantedTokens, (r.credential IS NOT NULL) AS hasCredential`;

export async function handleTokens(request, env) {
  const url = new URL(request.url);
  const own = url.pathname === '/api/token-requests';
  const users = url.pathname === '/api/admin/users';
  const requests = url.pathname === '/api/admin/token-requests';
  const review = url.pathname.match(/^\/api\/admin\/token-requests\/([a-f\d-]{36})$/);
  const delivery = url.pathname.match(/^\/api\/token-requests\/([a-f\d-]{36})\/credential$/);
  if (!own && !users && !requests && !review && !delivery) return json({ error: 'not_found' }, 404);
  const methods = own ? ['GET', 'POST'] : review ? ['PATCH'] : ['GET'];
  if (!methods.includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { Allow: methods.join(', ') });
  try {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((!local && url.origin !== env.AUTH_ORIGIN) || request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
      (request.method !== 'GET' && request.headers.get('Origin') !== url.origin)) return json({ error: 'forbidden' }, 403);
    if (!env.AUTH_DB) return json({ error: 'unavailable' }, 503);
    const user = await currentSession(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if ((users || requests || review) && !isAdmin(user, env)) return json({ error: 'forbidden' }, 403);
    if (delivery) {
      const row = await env.AUTH_DB.prepare("SELECT credential FROM token_requests WHERE id = ? AND user_id = ? AND status = 'approved'").bind(delivery[1], user.id).first();
      if (!row?.credential) return json({ error: 'not_found' }, 404);
      return json({ apiKey: await unseal(row.credential, delivery[1], env) });
    }
    if (request.method === 'GET') {
      const { page, offset } = pagination(url);
      if (users) {
        const query = field(url.searchParams.get('q') || '', 0, 100);
        const filter = "(? = '' OR instr(lower(email), lower(?)) > 0 OR instr(lower(nickname), lower(?)) > 0 OR instr(public_id, lower(?)) > 0)";
        const args = [query, query, query, query];
        const [count, rows] = await env.AUTH_DB.batch([
          env.AUTH_DB.prepare(`SELECT COUNT(*) AS total FROM users WHERE ${filter}`).bind(...args),
          env.AUTH_DB.prepare(`SELECT public_id AS userId, email, nickname, status, created_at AS createdAt,
            (SELECT COUNT(*) FROM token_requests r WHERE r.user_id = users.id) AS requestCount
            FROM users WHERE ${filter} ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET ?`).bind(...args, offset),
        ]);
        return json({ users: rows.results, total: count.results[0].total, page, pageSize: 20 });
      }
      const status = url.searchParams.get('status') || 'all';
      if (!['all', 'pending', 'approved', 'rejected'].includes(status)) throw new InputError('invalid_input');
      const where = own ? 'r.user_id = ?' : "(? = 'all' OR r.status = ?)";
      const args = own ? [user.id] : [status, status];
      const [count, rows] = await env.AUTH_DB.batch([
        env.AUTH_DB.prepare(`SELECT COUNT(*) AS total FROM token_requests r WHERE ${where}`).bind(...args),
        env.AUTH_DB.prepare(`SELECT ${columns}${own ? '' : ', u.public_id AS userId, u.email, u.nickname, u.status AS userStatus, reviewer.email AS reviewerEmail'}
          FROM token_requests r ${own ? '' : 'JOIN users u ON u.id = r.user_id LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by'}
          WHERE ${where} ORDER BY r.created_at DESC, r.id DESC LIMIT 20 OFFSET ?`).bind(...args, offset),
      ]);
      const eligibility = own ? await env.AUTH_DB.prepare("SELECT status FROM token_requests WHERE user_id = ? AND status IN ('pending', 'approved')").bind(user.id).first() : null;
      return json({ requests: rows.results, total: count.results[0].total, page, pageSize: 20, ...(own ? { canApply: !eligibility } : {}) });
    }
    const { success } = await env.SHARE_LIMITER.limit({ key: `token-requests:${user.id}` });
    if (!success) return json({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
    const body = await readBody(request);
    const now = Math.floor(Date.now() / 1000);
    if (own) {
      const projectName = field(body.projectName, 1, 80);
      const purpose = field(body.purpose, 10, 2000);
      const requestedTokens = amount(body.requestedTokens);
      const id = crypto.randomUUID();
      const result = await env.AUTH_DB.prepare(`INSERT INTO token_requests (id, user_id, project_name, purpose, requested_tokens, created_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`).bind(id, user.id, projectName, purpose, requestedTokens, now).run();
      if (!result.meta.changes) return json({ error: 'already_applied' }, 409);
      return json({ id, status: 'pending' }, 201);
    }
    if (!['approved', 'rejected'].includes(body.status)) throw new InputError('invalid_input');
    const note = field(body.reviewNote, 1, 2000);
    const granted = body.status === 'approved' ? amount(body.grantedTokens) : null;
    const apiKey = body.status === 'approved' ? field(body.apiKey, 1, 4096) : '';
    const credential = apiKey ? await seal(apiKey, review[1], env) : null;
    // Compare-and-set keeps concurrent reviewers from overwriting or issuing twice.
    const result = await env.AUTH_DB.prepare(`UPDATE token_requests SET status = ?, review_note = ?, granted_tokens = ?,
      credential = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ? AND status = 'pending'
      AND EXISTS (SELECT 1 FROM users WHERE id = token_requests.user_id AND status = 'active')`)
      .bind(body.status, note, granted, credential, now, user.id, review[1]).run();
    if (!result.meta.changes) return json({ error: 'review_conflict' }, 409);
    return json({ success: true });
  } catch (error) {
    return json({ error: error instanceof InputError ? error.message : 'unavailable' }, error instanceof InputError ? error.status : 503);
  }
}
