import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, before, after, beforeEach } from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { boardVotes, normalizeVotes, rankModels } from '../lib/tier-ranking.js';
import { handleTierRanking } from '../worker/tier-ranking.js';
import { digest } from '../worker/auth.js';

let mf, db, env;
const origin = 'https://cv404.tv';
const alice = 'a'.repeat(64), bob = 'b'.repeat(64);
const vote = (cardId, score) => ({ cardId, score });
const call = (path = '', { token, method = 'GET', votes, headers, raw } = {}) => handleTierRanking(new Request(`${origin}/api/tier-rankings${path}`, {
  method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Cookie: `__Host-cv404_session=${token}` } : {}), ...headers },
  ...(method === 'GET' ? {} : { body: raw ?? JSON.stringify({ votes }) }),
}), env);
const put = (token, votes) => call('/mine', { token, method: 'PUT', votes });
const leaderboard = async () => (await call()).json();

before(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test"); } }', d1Databases: ['AUTH_DB'], compatibilityDate: '2026-09-14' }));
  db = await mf.getD1Database('AUTH_DB');
  for (const name of ['0001_auth', '0002_user_ids', '0003_tier_votes']) {
    const sql = await readFile(new URL(`../migrations/${name}.sql`, import.meta.url), 'utf8');
    await db.exec(sql.replace(/^--.*$/gm, '').replace(/\n/g, ' '));
  }
});
after(async () => { await mf?.dispose(); });
beforeEach(async () => {
  await db.batch(['tier_votes', 'sessions', 'users'].map(table => db.prepare(`DELETE FROM ${table}`)));
  for (const [id, token] of [['alice', alice], ['bob', bob]]) {
    await db.prepare('INSERT INTO users (id, public_id, email, email_verified_at, created_at) VALUES (?, ?, ?, 1, 1)').bind(id, `${id}00000`.slice(0, 8), `${id}@example.com`).run();
    await db.prepare('INSERT INTO sessions VALUES (?, ?, 1, ?)').bind(await digest(token), id, Math.floor(Date.now() / 1000) + 3600).run();
  }
  env = { AUTH_DB: db, AUTH_ORIGIN: origin, SHARE_LIMITER: { limit: async () => ({ success: true }) } };
});

test('board tiers map to +2 through -2; tray, custom cards and site logo are excluded', () => {
  assert.deepEqual(boardVotes({ stickers: [
    ...['s', 'a', 'b', 'c', 'd'].map((zone, i) => ({ type: 'ai', presetId: ['claude-v1', 'chatgpt-v1', 'gemini-v1', 'deepseek-v1', 'qwen-v1'][i], zone })),
    { type: 'ai', presetId: 'kimi-v1', zone: 'tray' }, { type: 'ai', presetId: 'yungu404-v1', zone: 's' },
    { type: 'text', text: 'Claude', zone: 's' }, { type: 'image', text: 'Logo', zone: 'a' },
  ] }).map(v => v.score), [2, 1, 0, -1, -2]);
  for (const votes of [[vote('unknown', 2)], [vote('yungu404-v1', 2)], [vote('claude-v1', 3)], [vote('claude-v1', 0.5)], [vote('claude-v1', '2')], [vote('claude-v1', 2), vote('claude-v1', -2)]]) {
    assert.throws(() => normalizeVotes({ votes }));
  }
});

test('averages sort positive, neutral, negative, then unrated; equal averages share rank', () => {
  const ranked = rankModels([
    { card_id: 'claude-v1', score: 2, count: 2 }, { card_id: 'claude-v1', score: -2, count: 1 },
    { card_id: 'gemini-v1', score: 2, count: 4 }, { card_id: 'gemini-v1', score: -2, count: 2 },
    { card_id: 'chatgpt-v1', score: 0, count: 1 }, { card_id: 'deepseek-v1', score: -2, count: 1 },
  ]);
  assert.deepEqual(ranked.slice(0, 4).map(r => r.rank), [1, 1, 3, 4]);
  assert.equal(ranked[0].average, 2 / 3);
  assert.equal(ranked[2].average, 0);
  assert.equal(ranked[3].average, -2);
  assert.equal(ranked[4].rank, null);
  assert.equal(ranked[4].average, null);
});

test('public results aggregate users without exposing identities; repeat votes replace, never multiply', async () => {
  assert.equal((await put(alice, [vote('claude-v1', 2), vote('chatgpt-v1', -1)])).status, 200);
  assert.equal((await put(bob, [vote('claude-v1', -2), vote('gemini-v1', 1)])).status, 200);
  const data = await leaderboard();
  assert.equal(data.participants, 2);
  const claude = data.rankings.find(r => r.cardId === 'claude-v1');
  assert.equal(claude.average, 0);
  assert.equal(claude.votes, 2);
  assert.equal(claude.distribution['2'], 1);
  assert.equal(claude.distribution['-2'], 1);
  assert.equal(data.rankings[0].cardId, 'gemini-v1');
  assert.doesNotMatch(JSON.stringify(data), /alice|bob|example.com|token|user_id/);
  await put(alice, [vote('claude-v1', 1)]);
  await put(alice, [vote('claude-v1', 1)]);
  const updated = await leaderboard();
  assert.equal(updated.rankings.find(r => r.cardId === 'claude-v1').average, -0.5);
  assert.equal(updated.rankings.find(r => r.cardId === 'claude-v1').votes, 2);
  assert.equal(updated.rankings.find(r => r.cardId === 'chatgpt-v1').votes, 0);
  assert.deepEqual((await (await call('/mine', { token: alice })).json()).votes, [vote('claude-v1', 1)]);
  assert.deepEqual((await (await call('/mine', { token: bob })).json()).votes, [vote('claude-v1', -2), vote('gemini-v1', 1)]);
  assert.equal((await call('/mine', { token: alice, method: 'DELETE' })).status, 200);
  assert.equal((await leaderboard()).participants, 1);
  await put(bob, []);
  assert.equal((await leaderboard()).participants, 0);
});

test('sessions and origins protect writes, malformed payloads preserve existing votes', async () => {
  assert.equal((await put(undefined, [vote('claude-v1', 2)])).status, 401);
  assert.equal((await call('/mine')).status, 401);
  await put(alice, [vote('claude-v1', 2)]);
  assert.equal((await call('/mine', { token: alice, method: 'PUT', votes: [], headers: { Origin: 'https://other.example' } })).status, 403);
  assert.equal((await call('/mine', { token: alice, method: 'PUT', votes: [], headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await call('/mine', { token: alice, method: 'PUT', votes: [], headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await put(alice, [vote('claude-v1', 2), vote('claude-v1', -1)])).status, 400);
  assert.equal((await put(alice, [vote('claude-v1', 4)])).status, 400);
  assert.equal((await call('/mine', { token: alice, method: 'PUT', raw: '{' })).status, 400);
  assert.equal((await call('/mine', { token: alice, method: 'PUT', raw: 'x'.repeat(8193) })).status, 413);
  assert.equal((await leaderboard()).rankings[0].average, 2);
  env.SHARE_LIMITER.limit = async () => ({ success: false });
  assert.equal((await put(alice, [])).status, 429);
  await db.prepare('UPDATE sessions SET expires_at = 1').run();
  assert.equal((await put(alice, [])).status, 401);
});

test('concurrent replacements never mix ballots and a failed transaction keeps the previous votes', async () => {
  const responses = await Promise.all([
    put(alice, [vote('claude-v1', 2), vote('gemini-v1', 1)]),
    put(alice, [vote('deepseek-v1', -1)]),
  ]);
  assert.ok(responses.every(response => response.status === 200));
  const own = (await (await call('/mine', { token: alice })).json()).votes;
  assert.ok(JSON.stringify(own) === JSON.stringify([vote('claude-v1', 2), vote('gemini-v1', 1)]) || JSON.stringify(own) === JSON.stringify([vote('deepseek-v1', -1)]));
  await db.exec("CREATE TRIGGER test_vote_failure BEFORE INSERT ON tier_votes WHEN NEW.card_id = 'kimi-v1' BEGIN SELECT RAISE(ABORT, 'test'); END;");
  try {
    assert.equal((await put(alice, [vote('claude-v1', 0), vote('kimi-v1', 2)])).status, 503);
    assert.deepEqual((await (await call('/mine', { token: alice })).json()).votes, own);
  } finally { await db.exec('DROP TRIGGER test_vote_failure;'); }
});

test('disabled and deleted accounts stop contributing; method and storage failures are explicit', async () => {
  await put(alice, [vote('claude-v1', 2)]);
  await put(bob, [vote('claude-v1', -2)]);
  await db.prepare("UPDATE users SET status = 'disabled' WHERE id = 'alice'").run();
  assert.equal((await leaderboard()).rankings.find(r => r.cardId === 'claude-v1').average, -2);
  assert.equal((await put(alice, [])).status, 401);
  await db.prepare("DELETE FROM users WHERE id = 'bob'").run();
  assert.equal((await leaderboard()).participants, 0);
  assert.equal((await call('', { method: 'POST' })).status, 405);
  assert.equal((await call('/missing')).status, 404);
  env.AUTH_DB = null;
  assert.equal((await call()).status, 503);
});
