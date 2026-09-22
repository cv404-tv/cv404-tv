import { currentSession } from './auth.js';
import { isAdmin } from '../lib/admin-access.js';
import { field, InputError, pagination, readBody } from './tokens.js';

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...headers,
} });
const eventId = 'jev-002';
const columns = `r.id, r.name, r.contact, r.role, r.track, r.idea, r.status,
  r.created_at AS createdAt, r.reviewed_at AS reviewedAt, r.review_note AS reviewNote`;
export async function handleHackathon(request, env) {
  const url = new URL(request.url);
  const own = url.pathname === '/api/hackathon/applications';
  const queue = url.pathname === '/api/admin/hackathon';
  const review = url.pathname.match(/^\/api\/admin\/hackathon\/([a-f\d-]{36})$/);
  if (!own && !queue && !review) return json({ error: 'not_found' }, 404);
  const methods = own ? ['GET', 'POST'] : queue ? ['GET'] : ['PATCH'];
  if (!methods.includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { Allow: methods.join(', ') });
  try {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((!local && url.origin !== env.AUTH_ORIGIN) || request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
      (request.method !== 'GET' && request.headers.get('Origin') !== url.origin)) return json({ error: 'forbidden' }, 403);
    if (!env.AUTH_DB) return json({ error: 'unavailable' }, 503);
    const user = await currentSession(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (!own && !isAdmin(user, env)) return json({ error: 'forbidden' }, 403);
    const mine = () => env.AUTH_DB.prepare(`SELECT ${columns} FROM hackathon_applications r WHERE event_id = ? AND user_id = ?`).bind(eventId, user.id).first();
    if (own && request.method === 'GET') return json({ application: await mine() });
    if (queue) {
      const { page, offset } = pagination(url);
      const status = url.searchParams.get('status') || 'all';
      if (!['all', 'pending', 'approved', 'rejected'].includes(status)) throw new InputError('invalid_input');
      const where = "r.event_id = ? AND (? = 'all' OR r.status = ?)";
      const args = [eventId, status, status];
      const [count, rows] = await env.AUTH_DB.batch([
        env.AUTH_DB.prepare(`SELECT COUNT(*) AS total FROM hackathon_applications r WHERE ${where}`).bind(...args),
        env.AUTH_DB.prepare(`SELECT ${columns}, u.email FROM hackathon_applications r JOIN users u ON u.id = r.user_id WHERE ${where} ORDER BY r.created_at DESC, r.id LIMIT 20 OFFSET ?`).bind(...args, offset),
      ]);
      return json({ applications: rows.results, total: count.results[0].total, page, pageSize: 20 });
    }
    const body = await readBody(request);
    if (review) {
      if (!['approved', 'rejected'].includes(body.status)) throw new InputError('invalid_input');
      const note = field(body.reviewNote, 1, 1000);
      const result = await env.AUTH_DB.prepare(`UPDATE hackathon_applications SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ? AND event_id = ? AND status = 'pending'`)
        .bind(body.status, note, user.id, Math.floor(Date.now() / 1000), review[1], eventId).run();
      if (!result.meta.changes) return json({ error: 'already_reviewed' }, 409);
      return json({ saved: true });
    }
    if (body.consent !== true || !['developer', 'designer', 'product', 'curious'].includes(body.role) || !['router', 'agent', 'workflow', 'explore'].includes(body.track)) throw new InputError('invalid_input');
    const name = field(body.name, 1, 60), contact = field(body.contact ?? '', 0, 100), idea = field(body.idea, 10, 1000);
    // One application per verified account. Retries return the original receipt, even after a lost response.
    const result = await env.AUTH_DB.prepare(`INSERT INTO hackathon_applications(id, event_id, user_id, name, contact, role, track, idea, consent_version, created_at) VALUES(?, ?, ?, ?, ?, ?, ?, ?, '2026-09-22', ?) ON CONFLICT(event_id, user_id) DO NOTHING`)
      .bind(crypto.randomUUID(), eventId, user.id, name, contact, body.role, body.track, idea, Math.floor(Date.now() / 1000)).run();
    return json({ application: await mine() }, result.meta.changes ? 201 : 200);
  } catch (error) {
    return json({ error: error instanceof InputError ? error.message : 'unavailable' }, error instanceof InputError ? error.status : 503);
  }
}
