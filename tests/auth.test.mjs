import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, before, after, beforeEach, mock } from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { handleAuth, cleanupAuth, normalizeEmail, digest, randomUserId } from '../worker/auth.js';

let mf, db, env, mail;
const origin = 'https://cv404.tv';
const call = (path, body = {}, { cookie = '', method = 'POST', headers = {}, url = origin } = {}) => handleAuth(new Request(`${url}${path}`, {
  method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie, ...headers },
  ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
}), env);
const cookies = response => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
const code = () => mail.at(-1).text.match(/\b\d{6}\b/)[0];
async function challenge(email = 'alice@example.com', cookie = '') {
  const response = await call('/api/auth/send-code', { email }, { cookie });
  assert.equal(response.status, 200, await response.clone().text());
  return { ...(await response.json()), cookie: cookies(response), code: code() };
}
async function login(email, cookie) {
  const c = await challenge(email, cookie);
  const response = await call('/api/auth/verify-code', { challengeId: c.challengeId, code: c.code }, { cookie: c.cookie });
  assert.equal(response.status, 200, await response.clone().text());
  return { response, cookie: cookies(response), user: (await response.json()).user };
}
const me = async cookie => (await call('/api/auth/me', {}, { method: 'GET', cookie })).json();

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test"); } }', d1Databases: ['AUTH_DB'], compatibilityDate: '2026-09-14' }));
  db = await mf.getD1Database('AUTH_DB');
  const schema = await readFile(new URL('../migrations/0001_auth.sql', import.meta.url), 'utf8');
  await db.exec(schema.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  // Exercise the upgrade with real legacy accounts, including a disabled one.
  await db.batch([
    db.prepare("INSERT INTO users (id, email, email_verified_at, created_at) VALUES ('legacy', 'legacy@example.com', 1, 1)"),
    db.prepare("INSERT INTO users (id, email, email_verified_at, created_at, status) VALUES ('disabled', 'disabled@example.com', 1, 1, 'disabled')"),
    db.prepare("INSERT INTO sessions VALUES ('legacy-session', 'legacy', 1, 9999999999)"),
  ]);
  const migration = await readFile(new URL('../migrations/0002_user_ids.sql', import.meta.url), 'utf8');
  await db.exec(migration.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  const legacy = (await db.prepare('SELECT * FROM users').all()).results;
  assert.equal(legacy.length, 2);
  for (const user of legacy) assert.match(user.public_id, /^[a-z0-9]{8}$/);
  assert.notEqual(legacy[0].public_id, legacy[1].public_id);
  assert.equal((await db.prepare('SELECT user_id FROM sessions').first()).user_id, 'legacy');
});
after(async () => { await mf?.dispose(); });
beforeEach(async () => {
  await db.batch(['sessions', 'login_challenges', 'users', 'auth_limits'].map(table => db.prepare(`DELETE FROM ${table}`)));
  mail = [];
  env = { AUTH_DB: db, AUTH_SECRET: 'local-test-secret-is-at-least-32-characters', AUTH_ORIGIN: origin, AUTH_EMAIL_FROM: 'login@cv404.tv', EMAIL: { send: async value => { mail.push(value); return { messageId: 'test' }; } } };
});

test('email normalization preserves tags, rejects malformed/header injection inputs', () => {
  assert.equal(normalizeEmail(' Alice+tag@Example.com '), 'alice+tag@example.com');
  for (const value of [null, '', 'not-an-email', 'a\r\nbcc:x@example.com', '.a@example.com', 'a..b@example.com', 'a@bad..com']) assert.throws(() => normalizeEmail(value));
});

test('registration, cookie flags, no credential leaks, nickname, logout and replay', async () => {
  const c = await challenge();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 0);
  const record = await db.prepare('SELECT * FROM login_challenges').first();
  assert.equal(record.code_hash.length, 64);
  assert.notEqual(record.code_hash, c.code);
  const r = await call('/api/auth/verify-code', { challengeId: c.challengeId, code: c.code }, { cookie: c.cookie });
  assert.equal(r.status, 200);
  const sessionCookie = cookies(r);
  assert.match(r.headers.get('Set-Cookie'), /__Host-cv404_session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure/);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const user = (await r.json()).user;
  assert.equal(user.email, 'alice@example.com');
  assert.deepEqual(Object.keys(user).sort(), ['email', 'id', 'isAdmin', 'nickname', 'userId']);
  assert.match(user.userId, /^[a-z0-9]{8}$/);
  assert.equal((await me(sessionCookie)).user.id, user.id);
  const nickname = await call('/api/account', { nickname: 'Alice' }, { cookie: sessionCookie, method: 'PATCH' });
  assert.equal((await nickname.json()).user.nickname, 'Alice');
  assert.equal((await call('/api/auth/verify-code', { challengeId: c.challengeId, code: c.code }, { cookie: c.cookie })).status, 400);
  assert.equal((await call('/api/auth/logout', {}, { cookie: sessionCookie })).status, 200);
  assert.equal((await me(sessionCookie)).user, null);
});

test('verification is bound to initiating browser and wrong code consumes an attempt', async () => {
  const c = await challenge();
  assert.equal((await call('/api/auth/verify-code', { challengeId: c.challengeId, code: c.code })).status, 400);
  const bad = c.code === '000000' ? '000001' : '000000';
  assert.equal((await call('/api/auth/verify-code', { challengeId: c.challengeId, code: bad }, { cookie: c.cookie })).status, 400);
  assert.equal((await db.prepare('SELECT attempts FROM login_challenges').first()).attempts, 1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 0);
});

test('concurrent verification succeeds exactly once', async () => {
  const c = await challenge();
  const results = await Promise.all(Array.from({ length: 8 }, () => call('/api/auth/verify-code', { challengeId: c.challengeId, code: c.code }, { cookie: c.cookie })));
  assert.equal(results.filter(r => r.status === 200).length, 1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM sessions').first()).n, 1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 1);
});

test('concurrent guesses never exceed five attempts or allow a locked code', async () => {
  const c = await challenge();
  const bad = c.code === '000000' ? '000001' : '000000';
  await Promise.all(Array.from({ length: 8 }, () => call('/api/auth/verify-code', { challengeId: c.challengeId, code: bad }, { cookie: c.cookie })));
  assert.equal((await db.prepare('SELECT attempts FROM login_challenges').first()).attempts, 5);
  assert.equal((await call('/api/auth/verify-code', { challengeId: c.challengeId, code: c.code }, { cookie: c.cookie })).status, 400);
});

test('resending invalidates previous challenge without resetting email failure quota', async () => {
  const a = await challenge();
  await db.prepare('UPDATE auth_limits SET expires_at = 0 WHERE key LIKE ?').bind('send:cooldown:%').run();
  const b = await challenge('alice@example.com', a.cookie);
  assert.notEqual(a.challengeId, b.challengeId);
  assert.equal((await call('/api/auth/verify-code', { challengeId: a.challengeId, code: a.code }, { cookie: a.cookie })).status, 400);
  await db.prepare("INSERT INTO auth_limits VALUES (?,20,20,?)").bind(`verify:email:${await (await import('../worker/auth.js')).hmac(env.AUTH_SECRET, 'email:alice@example.com')}`, Math.floor(Date.now()/1000)+3600).run();
  assert.equal((await call('/api/auth/verify-code', { challengeId: b.challengeId, code: b.code }, { cookie: b.cookie })).status, 429);
});

test('concurrent sends honor strict cooldown and roll back other quotas', async () => {
  const responses = await Promise.all(Array.from({ length: 6 }, () => call('/api/auth/send-code', { email: 'alice@example.com' })));
  assert.equal(responses.filter(r => r.status === 200).length, 1);
  assert.equal(responses.filter(r => r.status === 429).length, 5);
  assert.equal(mail.length, 1);
  assert.equal((await db.prepare("SELECT count FROM auth_limits WHERE key = 'send:global:hour'").first()).count, 1);
  assert.ok(Number(responses.find(r => r.status === 429).headers.get('Retry-After')) > 0);
});

test('mail failure is recoverable, never creates a user or leaves usable challenge', async () => {
  env.EMAIL.send = async () => { throw new Error('private provider detail'); };
  const r = await call('/api/auth/send-code', { email: 'alice@example.com' });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, 'email_unavailable');
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM login_challenges').first()).n, 0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM users').first()).n, 0);
});

test('existing users retain identity; sign out everywhere revokes both devices', async () => {
  const a = await login('alice@example.com');
  await db.prepare('UPDATE auth_limits SET expires_at = 0 WHERE key LIKE ?').bind('send:cooldown:%').run();
  const b = await login('ALICE@example.com');
  assert.equal(a.user.id, b.user.id);
  assert.equal(a.user.userId, b.user.userId);
  assert.equal((await me(a.cookie)).user.id, a.user.id);
  assert.equal((await call('/api/auth/logout-all', {}, { cookie: b.cookie })).status, 200);
  assert.equal((await me(a.cookie)).user, null);
  assert.equal((await me(b.cookie)).user, null);
});

test('expired challenges and sessions fail; disabled users cannot sign in', async () => {
  const c = await challenge();
  await db.prepare('UPDATE login_challenges SET expires_at = 0').run();
  assert.equal((await call('/api/auth/verify-code', { challengeId: c.challengeId, code: c.code }, { cookie: c.cookie })).status, 400);
  const loggedIn = await login('bob@example.com');
  await db.prepare('UPDATE sessions SET expires_at = 0').run();
  assert.equal((await me(loggedIn.cookie)).user, null);
  await db.prepare("UPDATE users SET status = 'disabled'").run();
  await db.prepare('UPDATE auth_limits SET expires_at = 0').run();
  const d = await challenge('bob@example.com');
  assert.equal((await call('/api/auth/verify-code', { challengeId: d.challengeId, code: d.code }, { cookie: d.cookie })).status, 400);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > 0').first()).n, 0);
});

test('origin, content-type, payload limits and unsupported methods are enforced', async () => {
  assert.equal((await call('/api/auth/send-code', { email: 'a@example.com' }, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call('/api/auth/send-code', {}, { headers: { Origin: '' } })).status, 403);
  assert.equal((await call('/api/auth/send-code', {}, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await call('/api/auth/send-code', {}, { url: 'https://other.workers.dev', headers: { Origin: 'https://other.workers.dev' } })).status, 403);
  assert.equal((await call('/api/auth/send-code', {}, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await call('/api/auth/send-code', { x: 'a'.repeat(3000) })).status, 413);
  assert.equal((await call('/api/auth/send-code', {}, { method: 'GET' })).status, 405);
  assert.equal((await call('/api/account', { nickname: 'x' }, { method: 'PATCH' })).status, 401);
});

test('profile rejects control characters and updates only the session owner', async () => {
  const a = await login('alice@example.com');
  const b = await login('bob@example.com');
  assert.equal((await call('/api/account', { nickname: '\u0000' }, { method: 'PATCH', cookie: a.cookie })).status, 400);
  await call('/api/account', { nickname: 'Alice', userId: b.user.id }, { method: 'PATCH', cookie: a.cookie });
  assert.equal((await me(b.cookie)).user.nickname, '');
  assert.equal((await me(a.cookie)).user.nickname, 'Alice');
  assert.equal((await me(a.cookie)).user.userId, a.user.userId);
  assert.notEqual(a.user.userId, b.user.userId);
});

test('user ID generator covers all characters and rejects biased bytes', () => {
  const original = crypto.getRandomValues.bind(crypto);
  let calls = 0;
  const stub = mock.method(crypto, 'getRandomValues', bytes => {
    if (bytes.length !== 8) return original(bytes);
    bytes.fill(calls++ === 0 ? 255 : 35);
    return bytes;
  });
  try {
    assert.equal(randomUserId(), '99999999');
    assert.equal(calls, 2);
  } finally { stub.mock.restore(); }
  const ids = Array.from({ length: 200 }, randomUserId);
  for (const id of ids) assert.match(id, /^[a-z0-9]{8}$/);
  assert.equal(new Set(ids.join('')).size, 36);
});

test('user ID collision retries the atomic login without consuming the code twice', async () => {
  await db.prepare("INSERT INTO users (id, public_id, email, email_verified_at, created_at) VALUES ('existing', 'aaaaaaaa', 'existing@example.com', 1, 1)").run();
  const original = crypto.getRandomValues.bind(crypto);
  let calls = 0;
  const stub = mock.method(crypto, 'getRandomValues', bytes => {
    if (bytes.length !== 8) return original(bytes);
    bytes.fill(calls++ === 0 ? 0 : 1);
    return bytes;
  });
  try {
    const a = await login('alice@example.com');
    assert.equal(a.user.userId, 'bbbbbbbb');
    assert.equal(calls, 2);
    assert.equal((await db.prepare('SELECT attempts FROM login_challenges').first()).attempts, 1);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM sessions').first()).n, 1);
  } finally { stub.mock.restore(); }
});

test('user IDs are immutable and database rejects invalid, missing or duplicate IDs', async () => {
  const a = await login('alice@example.com');
  const response = await call('/api/account', { nickname: 'Alice', userId: 'changed1', public_id: 'changed2', id: 'changed3' }, { method: 'PATCH', cookie: a.cookie });
  assert.equal((await response.json()).user.userId, a.user.userId);
  for (const id of [null, '', 'abc1234', 'abc123456', 'ABC12345', 'abc_1234', a.user.userId]) {
    await assert.rejects(db.prepare('INSERT INTO users (id, public_id, email, email_verified_at, created_at) VALUES (?, ?, ?, 1, 1)').bind(crypto.randomUUID(), id, 'other@example.com').run());
  }
  await assert.rejects(db.prepare("UPDATE users SET public_id = 'changed1' WHERE id = ?").bind(a.user.id).run());
  assert.equal((await me(a.cookie)).user.userId, a.user.userId);
});

test('global budget blocks sending; missing configuration fails closed', async () => {
  await db.prepare('INSERT INTO auth_limits VALUES (?,?,?,?)').bind('send:global:day', 500, 500, Math.floor(Date.now()/1000)+86400).run();
  assert.equal((await call('/api/auth/send-code', { email: 'alice@example.com' })).status, 429);
  assert.equal(mail.length, 0);
  env.AUTH_SECRET = '';
  assert.equal((await call('/api/auth/send-code', { email: 'alice@example.com' })).status, 503);
});

test('cleanup removes only expired auth state, preserving users and active sessions', async () => {
  const a = await login('alice@example.com');
  await db.prepare('UPDATE login_challenges SET expires_at = 0').run();
  await db.prepare('UPDATE auth_limits SET expires_at = 0').run();
  await cleanupAuth(env);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM login_challenges').first()).n, 0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM auth_limits').first()).n, 0);
  assert.equal((await me(a.cookie)).user.id, a.user.id);
  const stored = await db.prepare('SELECT token_hash FROM sessions').first();
  const raw = a.cookie.match(/__Host-cv404_session=([a-f0-9]+)/)[1];
  assert.equal(stored.token_hash, await digest(raw));
});
