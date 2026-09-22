import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, before, after, beforeEach } from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { handleHackathon } from '../worker/hackathon.js';
import { handleManagement } from '../worker/management.js';
import { digest } from '../worker/auth.js';
let mf, db, env;
const origin = 'https://cv404.tv';
const tokens = { alice: 'a'.repeat(64), bob: 'b'.repeat(64), admin: 'c'.repeat(64) };
const input = { name: 'Test Builder', contact: '', role: 'developer', track: 'router', idea: 'Route community support requests with human review.', consent: true };
const call = (path = 'hackathon/applications', { user = 'alice', method = 'GET', body, headers, raw } = {}) => handleHackathon(new Request(`${origin}/api/${path}`, {
  method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(tokens[user] ? { Cookie: `__Host-cv404_session=${tokens[user]}` } : {}), ...headers },
  ...(method === 'GET' ? {} : { body: raw ?? JSON.stringify(body) }),
}), env);
const apply = (body = input, user = 'alice') => call(undefined, { method: 'POST', body, user });
const review = (id, user = 'admin', status = 'approved') => call(`admin/hackathon/${id}`, { user, method: 'PATCH', body: { status, reviewNote: 'Please check your email for event arrangements.' } });
before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test"); } }', d1Databases: ['AUTH_DB'], compatibilityDate: '2026-09-14' }));
  db = await mf.getD1Database('AUTH_DB');
  for (const name of ['0001_auth','0002_user_ids','0004_token_requests','0005_management','0006_hackathon']) {
    const sql = await readFile(new URL(`../migrations/${name}.sql`, import.meta.url), 'utf8');
    await db.exec(sql.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  }
});
after(async () => { await mf?.dispose(); });
beforeEach(async () => {
  await db.batch(['admin_audit','hackathon_applications','sessions','users'].map(table => db.prepare(`DELETE FROM ${table}`)));
  for (const [id, token] of Object.entries(tokens)) {
    await db.prepare('INSERT INTO users(id, public_id, email, nickname, email_verified_at, created_at) VALUES(?, ?, ?, ?, 1, 1)').bind(id, `${id}00000000`.slice(0,8), `${id}@example.com`, id).run();
    await db.prepare('INSERT INTO sessions VALUES(?, ?, 1, ?)').bind(await digest(token), id, Math.floor(Date.now()/1000)+3600).run();
  }
  env = { AUTH_DB: db, AUTH_ORIGIN: origin, ADMIN_EMAILS: 'admin@example.com' };
});
test('application persists, belongs to verified user, and is privately reviewed with an audit', async () => {
  assert.deepEqual(await (await call()).json(), { application: null });
  const response = await apply({ ...input, user_id: 'bob', status: 'approved', email: 'forged@example.com' });
  assert.equal(response.status, 201);
  const { application: a } = await response.json();
  assert.equal(a.status, 'pending');
  assert.equal((await (await call()).json()).application.id, a.id);
  assert.equal((await (await call(undefined, { user: 'bob' })).json()).application, null);
  const queue = await (await call('admin/hackathon', { user: 'admin' })).json();
  assert.equal(queue.total, 1); assert.equal(queue.applications[0].email, 'alice@example.com');
  assert.equal((await review(a.id)).status, 200);
  const saved = (await (await call()).json()).application;
  assert.equal(saved.status, 'approved'); assert.match(saved.reviewNote, /email/);
  const audit = await db.prepare('SELECT * FROM admin_audit').first();
  assert.equal(audit.actor_id, 'admin'); assert.equal(audit.target_id, 'alice'); assert.equal(audit.action, 'hackathon_approved');
  const filtered = await handleManagement(new Request(`${origin}/api/admin/audit?action=hackathon_approved`, { headers: { Cookie: `__Host-cv404_session=${tokens.admin}` } }), env);
  assert.equal(filtered.status, 200); assert.equal((await filtered.json()).total, 1);
});
test('concurrent retries create only one application and preserve the original data', async () => {
  const responses = await Promise.all([apply(),apply(),apply()]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200,200,201]);
  const ids = await Promise.all(responses.map(async r => (await r.json()).application.id));
  assert.equal(new Set(ids).size, 1);
  const retry = await apply({ ...input, name: 'Changed' });
  assert.equal((await retry.json()).application.name, input.name);
});
test('anonymous, non-admin and cross-site requests cannot read or change applications', async () => {
  assert.equal((await apply(input, 'anonymous')).status, 401);
  assert.equal((await call(undefined, { user: 'anonymous' })).status, 401);
  const { application } = await (await apply()).json();
  assert.equal((await call('admin/hackathon')).status, 403);
  assert.equal((await review(application.id, 'bob')).status, 403);
  for (const headers of [{ Origin: 'https://evil.example' }, { Origin: '' }, { 'Sec-Fetch-Site': 'cross-site' }]) {
    assert.equal((await call(undefined, { method: 'POST', body: input, headers })).status, 403);
  }
});
test('invalid fields, missing consent, wrong media type and oversized bodies are rejected', async () => {
  for (const patch of [{ name: '' }, { idea: 'short' }, { idea: 'x'.repeat(1001) }, { consent: false }, { consent: 'true' }, { role: 'admin' }, { track: 'bad' }, { contact: 'x'.repeat(101) }]) {
    assert.equal((await apply({ ...input, ...patch })).status, 400);
  }
  assert.equal((await call(undefined, { method: 'POST', raw: '{' })).status, 400);
  assert.equal((await call(undefined, { method: 'POST', raw: 'x'.repeat(17000) })).status, 413);
  assert.equal((await call(undefined, { method: 'POST', body: input, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await call(undefined, { method: 'DELETE' })).status, 405);
});
test('review conflict is atomic and status filtering reflects the saved decision', async () => {
  const { application } = await (await apply()).json();
  const results = await Promise.all([review(application.id),review(application.id, 'admin', 'rejected')]);
  assert.deepEqual(results.map(r=>r.status).sort(), [200,409]);
  const result = await (await call('admin/hackathon?status=pending', { user: 'admin' })).json();
  assert.equal(result.total, 0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM admin_audit').first()).n, 1);
  assert.equal((await call('admin/hackathon?page=-1', { user: 'admin' })).status, 400);
});
test('disabled accounts and a missing database fail without accepting data', async () => {
  await db.prepare("UPDATE users SET status='disabled' WHERE id='alice'").run();
  assert.equal((await apply()).status, 401);
  env.AUTH_DB = null;
  assert.equal((await call()).status, 503);
});
