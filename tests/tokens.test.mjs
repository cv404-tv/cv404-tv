import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, before, after, beforeEach } from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { handleManagement } from '../worker/management.js';
import { handleTokens } from '../worker/tokens.js';
import { handleAuth, digest } from '../worker/auth.js';

let mf, db, env;
const origin = 'https://cv404.tv';
const tokens = { alice: 'a'.repeat(64), bob: 'b'.repeat(64), admin: 'c'.repeat(64) };
const call = (path, { user = 'alice', method = 'GET', body, headers, raw } = {}) => (path.startsWith('account/') || /^admin\/(overview|audit|users\/)/.test(path) ? handleManagement : handleTokens)(new Request(`${origin}/api/${path}`, {
  method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(tokens[user] ? { Cookie: `__Host-cv404_session=${tokens[user]}` } : {}), ...headers },
  ...(method === 'GET' ? {} : { body: raw ?? JSON.stringify(body) }),
}), env);
const input = { projectName: 'AI learning tool', purpose: 'Help learners practice conversational Chinese.', requestedTokens: 1000000 };
const approval = { status: 'approved', grantedTokens: 500000, apiKey: 'sk-test-private-key', reviewNote: 'Use https://api.example.com/v1 with the test model. Valid for 30 days.' };
const apply = (user = 'alice', body = input) => call('token-requests', { user, method: 'POST', body });
const review = (id, body = approval, user = 'admin') => call(`admin/token-requests/${id}`, { user, method: 'PATCH', body });
const list = async (path, user = 'alice') => (await call(path, { user })).json();

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test"); } }', d1Databases: ['AUTH_DB'], compatibilityDate: '2026-09-14' }));
  db = await mf.getD1Database('AUTH_DB');
  for (const name of ['0001_auth', '0002_user_ids', '0003_tier_votes', '0004_token_requests', '0005_management']) {
    const sql = await readFile(new URL(`../migrations/${name}.sql`, import.meta.url), 'utf8');
    await db.exec(sql.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  }
});
after(async () => { await mf?.dispose(); });
beforeEach(async () => {
  await db.batch(['admin_audit', 'token_requests', 'tier_votes', 'sessions', 'login_challenges', 'users'].map(table => db.prepare(`DELETE FROM ${table}`)));
  for (const [id, token] of Object.entries(tokens)) {
    await db.prepare('INSERT INTO users (id, public_id, email, nickname, email_verified_at, created_at) VALUES (?, ?, ?, ?, 1, 1)').bind(id, `${id}00000000`.slice(0, 8), `${id}@example.com`, id).run();
    await db.prepare('INSERT INTO sessions VALUES (?, ?, 1, ?)').bind(await digest(token), id, Math.floor(Date.now() / 1000) + 3600).run();
  }
  env = { AUTH_DB: db, AUTH_ORIGIN: origin, AUTH_SECRET: 'test-auth-secret-at-least-32-characters', ADMIN_EMAILS: ' Admin@Example.com ', TOKEN_ENCRYPTION_KEY: '12'.repeat(32), SHARE_LIMITER: { limit: async () => ({ success: true }) } };
});

test('application, encrypted approval and private collection form a complete workflow', async () => {
  const response = await apply();
  assert.equal(response.status, 201);
  const { id } = await response.json();
  assert.equal((await list('token-requests')).canApply, false);
  assert.equal((await list('token-requests', 'bob')).requests.length, 0);
  const queue = await list('admin/token-requests?status=pending', 'admin');
  assert.equal(queue.total, 1);
  assert.equal(queue.requests[0].email, 'alice@example.com');
  assert.equal((await review(id)).status, 200);
  const row = await db.prepare('SELECT * FROM token_requests WHERE id = ?').bind(id).first();
  assert.equal(row.reviewed_by, 'admin');
  assert.ok(row.reviewed_at);
  assert.doesNotMatch(row.credential, /sk-test-private-key/);
  const own = await list('token-requests');
  assert.equal(own.requests[0].grantedTokens, 500000);
  assert.equal(own.requests[0].reviewNote, approval.reviewNote);
  assert.equal(own.requests[0].hasCredential, 1);
  assert.doesNotMatch(JSON.stringify(own), /sk-test|reviewed_by|admin@example.com/);
  const credential = await call(`token-requests/${id}/credential`);
  assert.equal(credential.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await credential.json(), { apiKey: approval.apiKey });
  for (const user of ['bob', 'admin']) assert.equal((await call(`token-requests/${id}/credential`, { user })).status, 404);
  assert.doesNotMatch(JSON.stringify(await list('admin/token-requests', 'admin')), /sk-test|credential"/);
  assert.equal((await apply()).status, 409);
});

test('admin role is fail-closed, server-enforced and refreshed from configuration', async () => {
  for (const path of ['admin/users', 'admin/token-requests']) {
    assert.equal((await call(path, { user: 'guest' })).status, 401);
    assert.equal((await call(path)).status, 403);
  }
  const { id } = await (await apply()).json();
  assert.equal((await review(id, approval, 'alice')).status, 403);
  const me = async () => (await handleAuth(new Request(`${origin}/api/auth/me`, { headers: { Cookie: `__Host-cv404_session=${tokens.admin}` } }), env)).json();
  assert.equal((await me()).user.isAdmin, true);
  delete env.ADMIN_EMAILS;
  assert.equal((await call('admin/users', { user: 'admin' })).status, 403);
  assert.equal((await me()).user.isAdmin, false);
  env.ADMIN_EMAILS = 'notadmin@example.com';
  assert.equal((await review(id)).status, 403);
});

test('simultaneous submissions and reviews have exactly one winner', async () => {
  const responses = await Promise.all([apply(), apply()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
  const id = (await list('token-requests')).requests[0].id;
  const outcomes = await Promise.all([review(id), review(id, { status: 'rejected', reviewNote: 'Please describe the project in more detail.' })]);
  assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 409]);
  const row = await db.prepare('SELECT * FROM token_requests WHERE id = ?').bind(id).first();
  assert.equal(row.review_note, row.status === 'approved' ? approval.reviewNote : 'Please describe the project in more detail.');
  assert.equal((await review(id)).status, 409);
});

test('decline preserves history and permits a revised application', async () => {
  const { id } = await (await apply()).json();
  assert.equal((await review(id, { status: 'rejected', reviewNote: 'Please add details.' })).status, 200);
  assert.equal((await list('token-requests')).canApply, true);
  assert.equal((await call(`token-requests/${id}/credential`)).status, 404);
  assert.equal((await apply()).status, 201);
  assert.equal((await list('token-requests')).total, 2);
  assert.equal((await list('admin/token-requests?status=rejected', 'admin')).total, 1);
});

test('short Unicode purposes return validation errors instead of database failures', async () => {
  assert.equal((await apply('alice', { ...input, purpose: '😀'.repeat(5) })).status, 400);
  assert.equal((await list('token-requests')).total, 0);
  assert.equal((await apply('alice', { ...input, purpose: '😀'.repeat(10) })).status, 201);
});

test('validation, CSRF, body limits and unavailable encryption never partially approve', async () => {
  for (const body of [null, [], {}, { ...input, purpose: 'short' }, { ...input, requestedTokens: -1 }, { ...input, requestedTokens: 1.5 }, { ...input, requestedTokens: '100' }, { ...input, projectName: ' '.repeat(10) }]) assert.equal((await apply('alice', body)).status, 400);
  assert.equal((await call('token-requests', { method: 'POST', raw: '{' })).status, 400);
  assert.equal((await call('token-requests', { method: 'POST', raw: 'x'.repeat(16385) })).status, 413);
  assert.equal((await call('token-requests', { method: 'POST', body: input, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  for (const headers of [{ Origin: 'https://evil.example' }, { Origin: '' }, { 'Sec-Fetch-Site': 'cross-site' }]) assert.equal((await call('token-requests', { method: 'POST', body: input, headers })).status, 403);
  const { id } = await (await apply()).json();
  for (const body of [{ ...approval, apiKey: '' }, { ...approval, reviewNote: '' }, { ...approval, grantedTokens: 0 }, { ...approval, status: 'pending' }]) assert.equal((await review(id, body)).status, 400);
  delete env.TOKEN_ENCRYPTION_KEY;
  assert.equal((await review(id)).status, 503);
  assert.equal((await list('token-requests')).requests[0].status, 'pending');
  env.SHARE_LIMITER.limit = async () => ({ success: false });
  assert.equal((await apply('bob')).status, 429);
  assert.equal((await review(id)).status, 429);
});

test('users include non-applicants and disabled accounts, with search and pagination', async () => {
  await db.prepare("UPDATE users SET status = 'disabled' WHERE id = 'bob'").run();
  assert.equal((await list('admin/users', 'admin')).total, 3);
  assert.equal((await list('admin/users?q=bob', 'admin')).users[0].status, 'disabled');
  assert.equal((await list('admin/users?q=alice000', 'admin')).total, 1);
  assert.equal((await list('admin/users?q=%25', 'admin')).total, 0);
  for (let i = 0; i < 21; i++) await db.prepare('INSERT INTO users (id, public_id, email, email_verified_at, created_at) VALUES (?, ?, ?, 1, 1)').bind(`extra${i}`, `e${String(i).padStart(7, '0')}`, `extra${i}@example.com`).run();
  const first = await list('admin/users', 'admin');
  const second = await list('admin/users?page=2', 'admin');
  assert.equal(first.users.length, 20); assert.equal(second.users.length, 4);
  assert.equal(new Set([...first.users, ...second.users].map(u => u.userId)).size, 24);
  assert.doesNotMatch(JSON.stringify(first), /token_hash|AUTH_SECRET|credential/);
  for (const path of ['admin/users?page=-1', 'admin/users?page=1.5', 'admin/token-requests?status=bad']) assert.equal((await call(path, { user: 'admin' })).status, 400);
});

test('disabled/expired sessions and disabled applicants cannot review or collect', async () => {
  const { id } = await (await apply()).json();
  await db.prepare("UPDATE users SET status = 'disabled' WHERE id = 'alice'").run();
  assert.equal((await review(id)).status, 409);
  assert.equal((await call('token-requests')).status, 401);
  await db.prepare("UPDATE users SET status = 'disabled' WHERE id = 'admin'").run();
  assert.equal((await call('admin/users', { user: 'admin' })).status, 401);
  await db.prepare('UPDATE sessions SET expires_at = 1').run();
  assert.equal((await apply('bob')).status, 401);
  assert.equal((await call('admin/users', { user: 'admin', method: 'POST', body: {} })).status, 405);
  assert.equal((await call('admin/missing', { user: 'admin' })).status, 404);
  delete env.AUTH_DB;
  assert.equal((await call('token-requests')).status, 503);
});

test('management protects administrators and rejects untrusted and malformed changes', async () => {
  for (const path of ['admin/overview', 'admin/audit']) {
    assert.equal((await call(path)).status, 403);
    assert.equal((await call(path, { user: 'guest' })).status, 401);
  }
  const patch = { user: 'admin', method: 'PATCH', body: { action: 'disable', reason: 'Abuse report verified' } };
  assert.equal((await call('admin/users/alice000', { ...patch, user: 'alice' })).status, 403);
  assert.equal((await call('admin/users/admin000', patch)).status, 409);
  env.ADMIN_EMAILS += ',bob@example.com';
  assert.equal((await call('admin/users/bob00000', patch)).status, 409);
  assert.equal((await call('admin/users/missing0', patch)).status, 404);
  assert.equal((await call('admin/users/alice000', { ...patch, headers: { Origin: 'https://evil.test' } })).status, 403);
  assert.equal((await call('admin/users/alice000', { ...patch, body: { ...patch.body, reason: '' } })).status, 400);
  assert.equal((await call('admin/users/alice000', { ...patch, body: { ...patch.body, action: 'delete' } })).status, 400);
  assert.equal((await call('admin/users/alice000', { ...patch, raw: 'x'.repeat(17000) })).status, 413);
  assert.equal((await call('admin/overview', { user: 'admin', method: 'POST', body: {} })).status, 405);
  assert.equal((await call('account/overview', { user: 'guest' })).status, 401);
  env.SHARE_LIMITER.limit = async () => ({ success: false });
  assert.equal((await call('admin/users/alice000', patch)).status, 429);
});

test('disable, re-enable and forced sign-out are audited and revoke access permanently for old sessions', async () => {
  const patch = action => call('admin/users/alice000', { user: 'admin', method: 'PATCH', body: { action, reason: 'Support case 404' } });
  assert.equal((await patch('disable')).status, 200);
  assert.equal((await call('account/overview')).status, 401);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'alice'").first()).n, 0);
  assert.equal((await list('admin/users?status=disabled', 'admin')).total, 1);
  assert.equal((await patch('enable')).status, 200);
  assert.equal((await call('account/overview')).status, 401);
  await db.prepare('INSERT INTO sessions VALUES (?, ?, 1, ?)').bind(await digest(tokens.alice), 'alice', Math.floor(Date.now() / 1000) + 3600).run();
  assert.equal((await call('account/overview')).status, 200);
  assert.equal((await patch('revoke_sessions')).status, 200);
  assert.equal((await call('account/overview')).status, 401);
  const audit = await list('admin/audit', 'admin');
  assert.equal(audit.total, 3);
  assert.deepEqual(audit.entries.map(e => e.action).sort(), ['disable', 'enable', 'revoke_sessions']);
  assert.ok(audit.entries.every(e => e.actorEmail === 'admin@example.com' && e.targetEmail === 'alice@example.com'));
  assert.doesNotMatch(JSON.stringify(audit), /token_hash|sk-test|credential/);
});

test('overview, request search and review audit reflect real data without exposing keys', async () => {
  const { id } = await (await apply()).json();
  await apply('bob', { ...input, projectName: 'A different project' });
  assert.equal((await list('admin/token-requests?q=alice000', 'admin')).total, 1);
  assert.equal((await list('admin/token-requests?q=different', 'admin')).total, 1);
  assert.equal((await list('admin/token-requests?q=%25', 'admin')).total, 0);
  assert.equal((await review(id)).status, 200);
  const data = await list('admin/overview', 'admin');
  assert.equal(data.users, 3); assert.equal(data.pending, 1); assert.equal(data.approved, 1); assert.equal(data.granted, approval.grantedTokens);
  const own = await list('account/overview');
  assert.equal(own.applications, 1); assert.equal(own.pending, 0); assert.equal(own.granted, approval.grantedTokens); assert.equal(own.sessions, 1);
  const audit = await list('admin/audit', 'admin');
  assert.equal(audit.total, 1); assert.equal(audit.entries[0].action, 'token_approved'); assert.equal(audit.entries[0].detail, id);
  assert.doesNotMatch(JSON.stringify(audit), /sk-test|credential/);
  assert.equal((await list('admin/users?q=admin', 'admin')).users[0].isAdmin, true);
  assert.equal((await call('admin/users?status=oops', { user: 'admin' })).status, 400);
});

test('session list stays private and signing out others preserves only the current session', async () => {
  const otherHash = await digest('d'.repeat(64));
  await db.prepare('INSERT INTO sessions VALUES (?, ?, 2, ?)').bind(otherHash, 'alice', Math.floor(Date.now() / 1000) + 3600).run();
  await db.prepare('INSERT INTO sessions VALUES (?, ?, 1, 1)').bind('expired-hash', 'alice').run();
  const result = await list('account/sessions');
  assert.equal(result.total, 2); assert.equal(result.sessions[0].current, 1);
  assert.doesNotMatch(JSON.stringify(result), /token_hash|expired-hash|aaaaaa/);
  assert.equal((await list('account/sessions', 'bob')).total, 1);
  assert.equal((await call('account/sessions', { method: 'DELETE', body: {}, headers: { Origin: '' } })).status, 403);
  assert.equal((await call('account/sessions', { method: 'DELETE', body: {} })).status, 200);
  assert.equal((await list('account/sessions')).total, 1);
  assert.equal((await list('account/sessions', 'bob')).total, 1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?').bind(otherHash).first()).n, 0);
  assert.equal((await call('account/sessions?page=-1')).status, 400);
});

test('failed audit storage rolls back account changes and token approval', async () => {
  const { id } = await (await apply()).json();
  await db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT, 'test audit unavailable'); END;");
  try {
    assert.equal((await call('admin/users/alice000', { user: 'admin', method: 'PATCH', body: { action: 'disable', reason: 'Atomic rollback test' } })).status, 503);
    assert.equal((await call('account/overview')).status, 200);
    assert.equal((await db.prepare("SELECT status FROM users WHERE id = 'alice'").first()).status, 'active');
    assert.equal((await review(id)).status, 503);
    assert.equal((await list('token-requests')).requests[0].status, 'pending');
  } finally { await db.exec('DROP TRIGGER reject_audit;'); }
});

test('audit and session pages are bounded and do not duplicate records', async () => {
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 22; i++) {
    await db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').bind(`extra-session-${i}`, 'alice', now - i, now + 3600).run();
    await db.prepare('INSERT INTO admin_audit VALUES (?, ?, ?, ?, ?, ?)').bind(`audit-${i}`, 'admin', 'alice', 'revoke_sessions', `Reason ${i}`, now).run();
  }
  const first = await list('account/sessions');
  const second = await list('account/sessions?page=2');
  assert.equal(first.total, 23); assert.equal(first.sessions.length, 20); assert.equal(second.sessions.length, 3);
  assert.equal(first.sessions.filter(s => s.current).length, 1); assert.equal(second.sessions.filter(s => s.current).length, 0);
  const a = await list('admin/audit', 'admin');
  const b = await list('admin/audit?page=2', 'admin');
  assert.equal(a.entries.length, 20); assert.equal(b.entries.length, 2);
  assert.equal(new Set([...a.entries, ...b.entries].map(e => e.id)).size, 22);
  assert.equal((await call('admin/audit?page=1.5', { user: 'admin' })).status, 400);
});

test('admin user details scope recent records, count live sessions and never disclose credentials', async () => {
  for (const user of ['guest', 'alice']) assert.equal((await call('admin/users/alice000', { user })).status, user === 'guest' ? 401 : 403);
  const { id } = await (await apply()).json();
  await review(id);
  await apply('bob');
  await db.prepare('INSERT INTO sessions VALUES (?, ?, 1, 1)').bind('expired-detail-session', 'alice').run();
  const response = await call('admin/users/alice000', { user: 'admin' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const data = await response.json();
  assert.equal(data.user.userId, 'alice000'); assert.equal(data.user.isAdmin, false);
  assert.equal(data.applications, 1); assert.equal(data.approved, 1); assert.equal(data.granted, approval.grantedTokens);
  assert.equal(data.sessions, 1); assert.equal(data.requests[0].id, id); assert.equal(data.activity[0].detail, id);
  assert.equal(data.user.id, undefined);
  assert.doesNotMatch(JSON.stringify(data), /sk-test|credential|token_hash|expired-detail-session|bob@example/);
  assert.equal((await list('admin/users/admin000', 'admin')).user.isAdmin, true);
  assert.equal((await call('admin/users/missing0', { user: 'admin' })).status, 404);
  for (let i = 0; i < 7; i++) await db.prepare('INSERT INTO admin_audit VALUES (?, ?, ?, ?, ?, ?)').bind(`detail-${i}`, 'admin', 'alice', 'enable', 'Case', 100 + i).run();
  assert.equal((await list('admin/users/alice000', 'admin')).activity.length, 5);
  env.ADMIN_EMAILS = '';
  assert.equal((await call('admin/users/alice000', { user: 'admin' })).status, 403);
});

test('overview zero-fills UTC days and reports aged and disabled pending applications', async () => {
  const now = Math.floor(Date.now() / 1000);
  const start = Math.floor(now / 86400) * 86400 - 6 * 86400;
  const { id } = await (await apply()).json();
  await db.prepare('UPDATE token_requests SET created_at = ? WHERE id = ?').bind(now - 49 * 3600, id).run();
  await apply('bob');
  await db.prepare("UPDATE users SET created_at = ? WHERE id = 'alice'").bind(start).run();
  await db.prepare("UPDATE users SET created_at = ?, status = 'disabled' WHERE id = 'bob'").bind(start - 1).run();
  const data = await list('admin/overview', 'admin');
  assert.equal(data.overdue, 1); assert.equal(data.blockedPending, 1); assert.equal(data.oldestPendingAt, now - 49 * 3600);
  assert.equal(data.trend.length, 7); assert.equal(data.newUsers, 1); assert.equal(data.trend[0].users, 1);
  assert.equal(data.trend[0].day, new Date(start * 1000).toISOString().slice(0, 10));
  assert.equal(data.trend.reduce((n, d) => n + d.applications, 0), 2);
  assert.equal(data.trend.reduce((n, d) => n + d.reviews, 0), 0);
  assert.deepEqual(data.trend[1], { day: new Date((start + 86400) * 1000).toISOString().slice(0, 10), users: 0, applications: 0, reviews: 0 });
  await review(id);
  const updated = await list('admin/overview', 'admin');
  assert.equal(updated.overdue, 0); assert.equal(updated.trend[6].reviews, 1);
});

test('audit combines action, literal search, exact target and inclusive UTC date filters', async () => {
  const day = Date.parse('2026-09-20T00:00:00Z') / 1000;
  for (const [id, target, action, detail, timestamp] of [
    ['before', 'alice', 'disable', 'Case 404', day - 1],
    ['start', 'alice', 'disable', 'Case 404', day],
    ['end', 'alice', 'disable', 'Case 404', day + 86399],
    ['after', 'alice', 'disable', 'Case 404', day + 86400],
    ['bob', 'bob', 'disable', 'Case 404', day],
    ['enable', 'alice', 'enable', 'Case 404', day],
    ['other', 'alice', 'disable', 'Other reason', day],
  ]) await db.prepare('INSERT INTO admin_audit VALUES (?, ?, ?, ?, ?, ?)').bind(id, 'admin', target, action, detail, timestamp).run();
  const path = 'admin/audit?from=2026-09-20&to=2026-09-20&action=disable&userId=alice000&q=cAsE';
  const data = await list(path, 'admin');
  assert.equal(data.total, 2); assert.deepEqual(data.entries.map(e => e.id), ['end', 'start']);
  assert.equal((await list('admin/audit?q=ADMIN@EXAMPLE.COM', 'admin')).total, 7);
  assert.equal((await list('admin/audit?q=bob00000', 'admin')).total, 1);
  assert.equal((await list('admin/audit?q=%25', 'admin')).total, 0);
  assert.equal((await list('admin/audit?userId=missing0', 'admin')).total, 0);
  for (const query of ['from=2026-02-30', 'from=bad', 'from=2026-09-21&to=2026-09-20', 'action=delete', 'userId=alice', `q=${'a'.repeat(101)}`]) assert.equal((await call(`admin/audit?${query}`, { user: 'admin' })).status, 400, query);
});

test('application sorting is stable and exact user filters cannot match another project name', async () => {
  const { id: alice } = await (await apply()).json();
  const { id: bob } = await (await apply('bob', { ...input, projectName: 'alice000' })).json();
  await db.prepare('UPDATE token_requests SET created_at = 10 WHERE id = ?').bind(alice).run();
  await db.prepare('UPDATE token_requests SET created_at = 20 WHERE id = ?').bind(bob).run();
  assert.deepEqual((await list('admin/token-requests?sort=oldest', 'admin')).requests.map(r => r.id), [alice, bob]);
  assert.deepEqual((await list('admin/token-requests?sort=newest', 'admin')).requests.map(r => r.id), [bob, alice]);
  assert.equal((await list('admin/token-requests?q=alice000', 'admin')).total, 2);
  const scoped = await list('admin/token-requests?userId=alice000&sort=oldest', 'admin');
  assert.equal(scoped.total, 1); assert.equal(scoped.requests[0].id, alice);
  assert.equal((await list('admin/token-requests?userId=alice000&status=approved', 'admin')).total, 0);
  for (const query of ['sort=random', 'sort=ASC%3BDROP', 'userId=bad']) assert.equal((await call(`admin/token-requests?${query}`, { user: 'admin' })).status, 400);
  // Applicant routes must never allow an administrative user filter to escape ownership.
  assert.equal((await list('token-requests?userId=bob00000&sort=oldest')).requests[0].id, alice);
});
