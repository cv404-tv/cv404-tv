import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, before, after, beforeEach } from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { handleTokens } from '../worker/tokens.js';
import { handleAuth, digest } from '../worker/auth.js';

let mf, db, env;
const origin = 'https://cv404.tv';
const tokens = { alice: 'a'.repeat(64), bob: 'b'.repeat(64), admin: 'c'.repeat(64) };
const call = (path, { user = 'alice', method = 'GET', body, headers, raw } = {}) => handleTokens(new Request(`${origin}/api/${path}`, {
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
  for (const name of ['0001_auth', '0002_user_ids', '0003_tier_votes', '0004_token_requests']) {
    const sql = await readFile(new URL(`../migrations/${name}.sql`, import.meta.url), 'utf8');
    await db.exec(sql.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  }
});
after(async () => { await mf?.dispose(); });
beforeEach(async () => {
  await db.batch(['token_requests', 'sessions', 'users'].map(table => db.prepare(`DELETE FROM ${table}`)));
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
