import { currentSession } from './auth.js';
import { normalizeVotes, rankModels } from '../lib/tier-ranking.js';

const json = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});

async function readVotes(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') return { error: 'invalid_content_type', status: 415 };
  if (!request.body) return { error: 'invalid_votes', status: 400 };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0, body = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 8192) { await reader.cancel(); return { error: 'too_large', status: 413 }; }
    body += decoder.decode(value, { stream: true });
  }
  try { return { votes: normalizeVotes(JSON.parse(body + decoder.decode())) }; }
  catch { return { error: 'invalid_votes', status: 400 }; }
}

export async function handleTierRanking(request, env) {
  const url = new URL(request.url);
  const mine = url.pathname === '/api/tier-rankings/mine';
  if (!mine && url.pathname !== '/api/tier-rankings') return json({ error: 'not_found' }, 404);
  const methods = mine ? ['GET', 'PUT', 'DELETE'] : ['GET'];
  if (!methods.includes(request.method)) return json({ error: 'method_not_allowed' }, 405, { Allow: methods.join(', ') });
  try {
    if (!env.AUTH_DB) return json({ error: 'unavailable' }, 503);
    if (!mine) {
      const [scores, participants] = await env.AUTH_DB.batch([
        env.AUTH_DB.prepare(`SELECT v.card_id, v.score, COUNT(*) AS count FROM tier_votes v
          JOIN users u ON u.id = v.user_id WHERE u.status = 'active' GROUP BY v.card_id, v.score`),
        env.AUTH_DB.prepare(`SELECT COUNT(DISTINCT v.user_id) AS count FROM tier_votes v
          JOIN users u ON u.id = v.user_id WHERE u.status = 'active'`),
      ]);
      return json({ rankings: rankModels(scores.results), participants: participants.results[0].count });
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((!local && url.origin !== env.AUTH_ORIGIN) || request.headers.get('Sec-Fetch-Site') === 'cross-site' ||
        (request.method !== 'GET' && request.headers.get('Origin') !== url.origin)) return json({ error: 'forbidden' }, 403);
    const user = await currentSession(request, env);
    if (!user) return json({ error: 'unauthorized' }, 401);
    if (request.method === 'GET') {
      const { results } = await env.AUTH_DB.prepare('SELECT card_id AS cardId, score FROM tier_votes WHERE user_id = ? ORDER BY card_id').bind(user.id).all();
      return json({ votes: results });
    }
    const { success } = await env.SHARE_LIMITER.limit({ key: `tier-votes:${user.id}` });
    if (!success) return json({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
    const input = request.method === 'DELETE' ? { votes: [] } : await readVotes(request);
    if (input.error) return json({ error: input.error }, input.status);
    // D1 batches are atomic: replacement never exposes a partially updated ballot.
    await env.AUTH_DB.batch([
      env.AUTH_DB.prepare('DELETE FROM tier_votes WHERE user_id = ?').bind(user.id),
      ...input.votes.map(vote => env.AUTH_DB.prepare('INSERT INTO tier_votes (user_id, card_id, score, updated_at) VALUES (?, ?, ?, ?)')
        .bind(user.id, vote.cardId, vote.score, Math.floor(Date.now() / 1000))),
    ]);
    return json({ votes: input.votes });
  } catch { return json({ error: 'unavailable' }, 503); }
}
