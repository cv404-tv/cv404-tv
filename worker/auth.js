import { cleanEmail, isValidEmail, isValidCode } from '../lib/auth-validation.js';

const MINUTE = 60;
const SESSION_TTL = 30 * 24 * 60 * MINUTE;
const CODE_TTL = 10 * MINUTE;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();

class AuthError extends Error {
  constructor(code, status = 400, retryAfter) {
    super(code);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow', ...headers,
  } });
}

export function normalizeEmail(value) {
  // Deliberately do not strip dots or +tags: these may identify different mailboxes.
  if (!isValidEmail(value)) throw new AuthError('invalid_email');
  return cleanEmail(value);
}

const hex = bytes => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export function randomUserId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  while (id.length < 8) {
    for (const byte of crypto.getRandomValues(new Uint8Array(8))) {
      // 252 is divisible by 36, so every character is equally likely.
      if (byte < 252) id += alphabet[byte % alphabet.length];
      if (id.length === 8) break;
    }
  }
  return id;
}
export const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
export async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export function randomCode() {
  // Rejection sampling avoids modulo bias.
  const bytes = new Uint32Array(1);
  do { crypto.getRandomValues(bytes); } while (bytes[0] >= 4294000000);
  return String(bytes[0] % 1000000).padStart(6, '0');
}

function isLocal(url) { return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); }
function cookieName(url, purpose) { return `${isLocal(url) ? '' : '__Host-'}cv404_${purpose}`; }
function cookie(request, purpose) {
  const name = cookieName(new URL(request.url), purpose);
  return request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1) || '';
}
function setCookie(url, purpose, value, ttl) {
  return `${cookieName(url, purpose)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}${isLocal(url) && url.protocol === 'http:' ? '' : '; Secure'}`;
}

async function readBody(request) {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') throw new AuthError('invalid_content_type', 415);
  if (Number(request.headers.get('Content-Length')) > 2048) throw new AuthError('too_large', 413);
  if (!request.body) throw new AuthError('invalid_request');
  const reader = request.body.getReader();
  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2048) { await reader.cancel(); throw new AuthError('too_large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return body;
  } catch { throw new AuthError('invalid_request'); }
}

async function reserveLimits(db, limits, now) {
  try {
    await db.batch(limits.map(([key, maximum, ttl]) => db.prepare(`
      INSERT INTO auth_limits (key, count, maximum, expires_at) VALUES (?, 1, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        count = CASE WHEN auth_limits.expires_at <= ? THEN 1 ELSE auth_limits.count + 1 END,
        maximum = excluded.maximum,
        expires_at = CASE WHEN auth_limits.expires_at <= ? THEN excluded.expires_at ELSE auth_limits.expires_at END
    `).bind(key, maximum, now + ttl, now, now)));
  } catch (error) {
    if (!String(error.message).includes('auth_quota')) throw error;
    const rows = await db.batch(limits.map(([key]) => db.prepare('SELECT expires_at FROM auth_limits WHERE key = ? AND count >= maximum AND expires_at > ?').bind(key, now)));
    const retry = Math.max(1, ...rows.flatMap(row => row.results.map(value => value.expires_at - now)));
    throw new AuthError('rate_limited', 429, retry);
  }
}

async function sendCode(request, env, body, now) {
  if (!env.EMAIL || !env.AUTH_EMAIL_FROM) throw new AuthError('unavailable', 503);
  const email = normalizeEmail(body.email);
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const [emailKey, ipKey] = await Promise.all([hmac(env.AUTH_SECRET, `email:${email}`), hmac(env.AUTH_SECRET, `ip:${ip}`)]);
  await reserveLimits(env.AUTH_DB, [
    [`send:cooldown:${emailKey}`, 1, 60], [`send:email:${emailKey}`, 5, 3600],
    [`send:ip:${ipKey}`, 20, 600], ['send:global:hour', 100, 3600], ['send:global:day', 500, 86400],
  ], now);
  const id = randomToken();
  const clientToken = TOKEN_PATTERN.test(cookie(request, 'login')) ? cookie(request, 'login') : randomToken();
  const code = randomCode();
  const codeHash = await hmac(env.AUTH_SECRET, `${id}:${email}:${code}`);
  await env.AUTH_DB.prepare(`INSERT INTO login_challenges (id, email, code_hash, client_hash, expires_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET id = excluded.id, code_hash = excluded.code_hash,
    client_hash = excluded.client_hash, expires_at = excluded.expires_at, attempts = 0, ready = 0, consumed_token = NULL`
  ).bind(id, email, codeHash, await digest(clientToken), now + CODE_TTL).run();
  const en = body.locale === 'en';
  try {
    await env.EMAIL.send({
      from: env.AUTH_EMAIL_FROM, to: email,
      subject: en ? 'Your Cloud Valley 404 sign-in code' : '云谷404 · 登录验证码',
      text: en
        ? `Your sign-in code is: ${code}\n\nValid for 10 minutes. Enter it on cv404.tv in the browser where you requested it. Never share this code. If you did not request it, ignore this email.\n\nCloud Valley 404 · https://cv404.tv`
        : `你的登录验证码是：${code}\n\n10 分钟内有效，请回到发起登录的浏览器，在 cv404.tv 输入。请勿将验证码告诉他人。如果不是你本人操作，请忽略此邮件。\n\n云谷404 · https://cv404.tv`,
    });
    await env.AUTH_DB.prepare('UPDATE login_challenges SET ready = 1 WHERE id = ?').bind(id).run();
  } catch {
    await env.AUTH_DB.prepare('DELETE FROM login_challenges WHERE id = ?').bind(id).run();
    throw new AuthError('email_unavailable', 503, 60);
  }
  return json({ challengeId: id, email, expiresIn: CODE_TTL, retryAfter: 60 }, 200, {
    'Set-Cookie': setCookie(new URL(request.url), 'login', clientToken, CODE_TTL),
  });
}

function publicUser(row) { return { id: row.id, userId: row.public_id, email: row.email, nickname: row.nickname }; }

async function verifyCode(request, env, body, now) {
  if (!TOKEN_PATTERN.test(body.challengeId || '') || !isValidCode(body.code)) throw new AuthError('invalid_code');
  const client = cookie(request, 'login');
  if (!TOKEN_PATTERN.test(client)) throw new AuthError('invalid_code');
  const challenge = await env.AUTH_DB.prepare('SELECT email FROM login_challenges WHERE id = ? AND client_hash = ?').bind(body.challengeId, await digest(client)).first();
  if (!challenge) throw new AuthError('invalid_code');
  const emailKey = await hmac(env.AUTH_SECRET, `email:${challenge.email}`);
  await reserveLimits(env.AUTH_DB, [[`verify:email:${emailKey}`, 20, 3600]], now);
  const codeHash = await hmac(env.AUTH_SECRET, `${body.challengeId}:${challenge.email}:${body.code}`);
  const claim = randomToken();
  const token = randomToken();
  const tokenHash = await digest(token);
  // One atomic D1 batch: only the request which claims this challenge can create a session.
  // A SELECT followed by an unconditional DELETE would permit concurrent code reuse.
  let result;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      result = await env.AUTH_DB.batch([
        env.AUTH_DB.prepare(`UPDATE login_challenges SET attempts = attempts + 1,
          consumed_token = CASE WHEN code_hash = ? THEN ? ELSE NULL END
          WHERE id = ? AND client_hash = ? AND ready = 1 AND consumed_token IS NULL AND expires_at > ? AND attempts < 5`
        ).bind(codeHash, claim, body.challengeId, await digest(client), now),
        env.AUTH_DB.prepare(`INSERT INTO users (id, public_id, email, email_verified_at, created_at)
          SELECT ?, ?, email, ?, ? FROM login_challenges WHERE id = ? AND consumed_token = ?
          ON CONFLICT(email) DO NOTHING`).bind(crypto.randomUUID(), randomUserId(), now, now, body.challengeId, claim),
        env.AUTH_DB.prepare(`INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
          SELECT ?, u.id, ?, ? FROM users u JOIN login_challenges c ON c.email = u.email
          WHERE c.id = ? AND c.consumed_token = ? AND u.status = 'active'`
        ).bind(tokenHash, now, now + SESSION_TTL, body.challengeId, claim),
        env.AUTH_DB.prepare(`SELECT u.id, u.public_id, u.email, u.nickname FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ?`).bind(tokenHash),
      ]);
      break;
    } catch (error) {
      // D1 rolls back the whole batch, including the challenge claim, on collision.
      if (!String(error.message).includes('UNIQUE constraint failed: users.public_id') || attempt === 4) throw error;
    }
  }
  const user = result[3].results[0];
  if (!user) throw new AuthError('invalid_code');
  const response = json({ user: publicUser(user) });
  const url = new URL(request.url);
  response.headers.append('Set-Cookie', setCookie(url, 'session', token, SESSION_TTL));
  response.headers.append('Set-Cookie', setCookie(url, 'login', '', 0));
  return response;
}

export async function currentSession(request, env, now = Math.floor(Date.now() / 1000)) {
  const token = cookie(request, 'session');
  if (!TOKEN_PATTERN.test(token)) return null;
  const hash = await digest(token);
  const row = await env.AUTH_DB.prepare(`SELECT u.id, u.public_id, u.email, u.nickname FROM sessions s
    JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'active'`).bind(hash, now).first();
  return row ? { ...row, tokenHash: hash } : null;
}

export async function handleAuth(request, env) {
  const url = new URL(request.url);
  const routes = {
    '/api/auth/send-code': 'POST', '/api/auth/verify-code': 'POST', '/api/auth/me': 'GET',
    '/api/auth/logout': 'POST', '/api/auth/logout-all': 'POST', '/api/account': 'PATCH',
  };
  const method = routes[url.pathname];
  if (!method) return json({ error: 'not_found' }, 404);
  if (request.method !== method) return json({ error: 'method_not_allowed' }, 405, { Allow: method });
  try {
    if (!isLocal(url) && url.origin !== env.AUTH_ORIGIN) throw new AuthError('forbidden', 403);
    if (request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new AuthError('forbidden', 403);
    if (method !== 'GET' && request.headers.get('Origin') !== url.origin) throw new AuthError('forbidden', 403);
    if (!env.AUTH_DB || typeof env.AUTH_SECRET !== 'string' || env.AUTH_SECRET.length < 32) throw new AuthError('unavailable', 503);
    const now = Math.floor(Date.now() / 1000);
    const body = method === 'GET' ? null : await readBody(request);
    if (url.pathname === '/api/auth/send-code') return await sendCode(request, env, body, now);
    if (url.pathname === '/api/auth/verify-code') return await verifyCode(request, env, body, now);
    const session = await currentSession(request, env, now);
    if (url.pathname === '/api/auth/me') return json({ user: session ? publicUser(session) : null });
    if (url.pathname === '/api/auth/logout') {
      const token = cookie(request, 'session');
      if (TOKEN_PATTERN.test(token)) await env.AUTH_DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(token)).run();
    } else {
      if (!session) throw new AuthError('unauthorized', 401);
      if (url.pathname === '/api/auth/logout-all') {
        await env.AUTH_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(session.id).run();
      } else {
        if (typeof body.nickname !== 'string' || body.nickname.trim().length > 32 || /[\p{Cc}\p{Cf}]/u.test(body.nickname)) throw new AuthError('invalid_nickname');
        const nickname = body.nickname.trim();
        await env.AUTH_DB.prepare('UPDATE users SET nickname = ? WHERE id = ?').bind(nickname, session.id).run();
        return json({ user: publicUser({ ...session, nickname }) });
      }
    }
    return json({ success: true }, 200, { 'Set-Cookie': setCookie(url, 'session', '', 0) });
  } catch (error) {
    if (error instanceof AuthError) return json({ error: error.message, ...(error.retryAfter ? { retryAfter: error.retryAfter } : {}) }, error.status, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
    // Never log request bodies, email addresses, credentials or provider error payloads.
    console.error('auth_request_failed');
    return json({ error: 'unavailable' }, 503);
  }
}

export async function cleanupAuth(env) {
  if (!env.AUTH_DB) return;
  const now = Math.floor(Date.now() / 1000);
  await env.AUTH_DB.batch([
    env.AUTH_DB.prepare('DELETE FROM login_challenges WHERE expires_at <= ?').bind(now),
    env.AUTH_DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    env.AUTH_DB.prepare('DELETE FROM auth_limits WHERE expires_at <= ?').bind(now),
  ]);
}
