import { currentSession } from './auth.js';
import { isAdmin } from '../lib/admin-access.js';
import { InputError, readBody, field, pagination } from './tokens.js';

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...headers,
} });

export async function handleManagement(request, env) {
  const url = new URL(request.url);
  const overview = url.pathname === '/api/admin/overview';
  const audit = url.pathname === '/api/admin/audit';
  const account = url.pathname === '/api/account/overview';
  const sessions = url.pathname === '/api/account/sessions';
  const target = url.pathname.match(/^\/api\/admin\/users\/([a-z0-9]{8})$/);
  if (!overview && !audit && !account && !sessions && !target) return json({ error: 'not_found' }, 404);
  const methods = target ? ['GET', 'PATCH'] : sessions ? ['GET', 'DELETE'] : ['GET'];
  if (!methods.includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { Allow: methods.join(', ') });
  try {
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((!local && url.origin !== env.AUTH_ORIGIN) || request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
      (request.method !== 'GET' && request.headers.get('Origin') !== url.origin)) return json({ error: 'forbidden' }, 403);
    if (!env.AUTH_DB) return json({ error: 'unavailable' }, 503);
    const db = env.AUTH_DB;
    const user = await currentSession(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if ((overview || audit || target) && !isAdmin(user, env)) return json({ error: 'forbidden' }, 403);
    const now = Math.floor(Date.now() / 1000);
    if (request.method !== 'GET') {
      if (!(await env.SHARE_LIMITER.limit({ key: `management:${user.id}` })).success) return json({ error: 'rate_limited' }, 429);
      const body = await readBody(request);
      if (sessions) {
        await db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').bind(user.id, user.tokenHash).run();
        return json({ success: true });
      }
      if (!['enable', 'disable', 'revoke_sessions'].includes(body.action)) throw new InputError('invalid_input');
      const reason = field(body.reason, 1, 300);
      const row = await db.prepare('SELECT id, email, status FROM users WHERE public_id = ?').bind(target[1]).first();
      if (!row) return json({ error: 'not_found' }, 404);
      // Admin access is configured outside the UI. Protect every configured admin from lockout.
      if (row.id === user.id || isAdmin(row, env)) return json({ error: 'protected_account' }, 409);
      const changes = [];
      if (body.action !== 'revoke_sessions') changes.push(db.prepare('UPDATE users SET status = ? WHERE id = ?').bind(body.action === 'enable' ? 'active' : 'disabled', row.id));
      if (body.action !== 'enable') {
        changes.push(db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.id));
        changes.push(db.prepare('DELETE FROM login_challenges WHERE email = ?').bind(row.email));
      }
      changes.push(db.prepare('INSERT INTO admin_audit (id, actor_id, target_id, action, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), user.id, row.id, body.action, reason, now));
      await db.batch(changes);
      return json({ success: true });
    }
    if (account) {
      const [profile, requests, votes, active] = await db.batch([
        db.prepare('SELECT created_at AS createdAt, email_verified_at AS verifiedAt FROM users WHERE id = ?').bind(user.id),
        db.prepare("SELECT COUNT(*) AS applications, COALESCE(SUM(status = 'pending'), 0) AS pending, COALESCE(SUM(granted_tokens), 0) AS granted FROM token_requests WHERE user_id = ?").bind(user.id),
        db.prepare('SELECT COUNT(*) AS votes FROM tier_votes WHERE user_id = ?').bind(user.id),
        db.prepare('SELECT COUNT(*) AS sessions FROM sessions WHERE user_id = ? AND expires_at > ?').bind(user.id, now),
      ]);
      return json({ ...profile.results[0], ...requests.results[0], ...votes.results[0], ...active.results[0] });
    }
    if (sessions) {
      const { page, offset } = pagination(url);
      const [count, rows] = await db.batch([
        db.prepare('SELECT COUNT(*) AS total FROM sessions WHERE user_id = ? AND expires_at > ?').bind(user.id, now),
        db.prepare('SELECT created_at AS createdAt, expires_at AS expiresAt, (token_hash = ?) AS current FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY current DESC, created_at DESC, token_hash LIMIT 20 OFFSET ?').bind(user.tokenHash, user.id, now, offset),
      ]);
      return json({ sessions: rows.results, total: count.results[0].total, page, pageSize: 20 });
    }
    if (target) {
      const profile = await db.prepare('SELECT id, public_id AS userId, email, nickname, status, created_at AS createdAt, email_verified_at AS verifiedAt FROM users WHERE public_id = ?').bind(target[1]).first();
      if (!profile) return json({ error: 'not_found' }, 404);
      const [stats, sessions, votes, requests, activity] = await db.batch([
        db.prepare("SELECT COUNT(*) AS applications, COALESCE(SUM(status = 'pending'), 0) AS pending, COALESCE(SUM(status = 'approved'), 0) AS approved, COALESCE(SUM(status = 'rejected'), 0) AS rejected, COALESCE(SUM(granted_tokens), 0) AS granted FROM token_requests WHERE user_id = ?").bind(profile.id),
        db.prepare('SELECT COUNT(*) AS sessions FROM sessions WHERE user_id = ? AND expires_at > ?').bind(profile.id, now),
        db.prepare('SELECT COUNT(*) AS votes FROM tier_votes WHERE user_id = ?').bind(profile.id),
        db.prepare('SELECT id, project_name AS projectName, status, created_at AS createdAt FROM token_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5').bind(profile.id),
        db.prepare('SELECT a.id, a.action, a.detail, a.created_at AS createdAt, u.email AS actorEmail FROM admin_audit a JOIN users u ON u.id = a.actor_id WHERE a.target_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT 5').bind(profile.id),
      ]);
      const { id, ...publicProfile } = profile;
      return json({ user: { ...publicProfile, isAdmin: isAdmin(profile, env) }, ...stats.results[0], ...sessions.results[0], ...votes.results[0], requests: requests.results, activity: activity.results });
    }
    if (overview) {
      const start = Math.floor(now / 86400) * 86400 - 6 * 86400;
      const [users, requests, sessions, backlog, registrations, submissions, reviews] = await db.batch([
        db.prepare("SELECT COUNT(*) AS users, COALESCE(SUM(status = 'active'), 0) AS active, COALESCE(SUM(status = 'disabled'), 0) AS disabled, COALESCE(SUM(created_at >= ?), 0) AS newUsers FROM users").bind(start),
        db.prepare("SELECT COUNT(*) AS applications, COALESCE(SUM(status = 'pending'), 0) AS pending, COALESCE(SUM(status = 'approved'), 0) AS approved, COALESCE(SUM(status = 'rejected'), 0) AS rejected, COALESCE(SUM(granted_tokens), 0) AS granted FROM token_requests"),
        db.prepare("SELECT COUNT(DISTINCT s.user_id) AS online FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.expires_at > ? AND u.status = 'active'").bind(now),
        db.prepare("SELECT COALESCE(SUM(r.created_at <= ?), 0) AS overdue, MIN(r.created_at) AS oldestPendingAt, COALESCE(SUM(u.status = 'disabled'), 0) AS blockedPending FROM token_requests r JOIN users u ON u.id = r.user_id WHERE r.status = 'pending'").bind(now - 48 * 3600),
        db.prepare("SELECT date(created_at, 'unixepoch') AS day, COUNT(*) AS count FROM users WHERE created_at >= ? GROUP BY day").bind(start),
        db.prepare("SELECT date(created_at, 'unixepoch') AS day, COUNT(*) AS count FROM token_requests WHERE created_at >= ? GROUP BY day").bind(start),
        db.prepare("SELECT date(reviewed_at, 'unixepoch') AS day, COUNT(*) AS count FROM token_requests WHERE reviewed_at >= ? GROUP BY day").bind(start),
      ]);
      const counts = result => new Map(result.results.map(row => [row.day, row.count]));
      const joined = counts(registrations), applied = counts(submissions), reviewed = counts(reviews);
      const trend = Array.from({ length: 7 }, (_, index) => {
        const day = new Date((start + index * 86400) * 1000).toISOString().slice(0, 10);
        return { day, users: joined.get(day) || 0, applications: applied.get(day) || 0, reviews: reviewed.get(day) || 0 };
      });
      return json({ ...users.results[0], ...requests.results[0], ...sessions.results[0], ...backlog.results[0], trend, asOf: now });
    }
    const { page, offset } = pagination(url);
    const query = field(url.searchParams.get('q') || '', 0, 100);
    const action = url.searchParams.get('action') || 'all';
    const userId = url.searchParams.get('userId') || '';
    if (!['all', 'enable', 'disable', 'revoke_sessions', 'token_approved', 'token_rejected'].includes(action) || (userId && !/^[a-z0-9]{8}$/.test(userId))) throw new InputError('invalid_input');
    function dateBoundary(name) {
      const value = url.searchParams.get(name);
      if (!value) return null;
      const timestamp = Date.parse(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) throw new InputError('invalid_input');
      return timestamp / 1000;
    }
    const from = dateBoundary('from'), to = dateBoundary('to');
    if (from !== null && to !== null && from > to) throw new InputError('invalid_input');
    const filter = `(? = 'all' OR a.action = ?) AND (? = '' OR target.public_id = ?)
      AND (? IS NULL OR a.created_at >= ?) AND (? IS NULL OR a.created_at < ?)
      AND (? = '' OR instr(lower(actor.email), lower(?)) > 0 OR instr(lower(target.email), lower(?)) > 0
        OR instr(target.public_id, lower(?)) > 0 OR instr(lower(a.detail), lower(?)) > 0)`;
    const args = [action, action, userId, userId, from, from, to, to === null ? null : to + 86400, query, query, query, query, query];
    const source = 'FROM admin_audit a JOIN users actor ON actor.id = a.actor_id JOIN users target ON target.id = a.target_id';
    const [count, rows] = await db.batch([
      db.prepare(`SELECT COUNT(*) AS total ${source} WHERE ${filter}`).bind(...args),
      db.prepare(`SELECT a.id, a.action, a.detail, a.created_at AS createdAt, actor.email AS actorEmail,
        target.email AS targetEmail, target.public_id AS userId ${source} WHERE ${filter}
        ORDER BY a.created_at DESC, a.id DESC LIMIT 20 OFFSET ?`).bind(...args, offset),
    ]);
    return json({ entries: rows.results, total: count.results[0].total, page, pageSize: 20 });
  } catch (error) {
    return json({ error: error instanceof InputError ? error.message : 'unavailable' }, error instanceof InputError ? error.status : 503);
  }
}
