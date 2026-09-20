"use client";
import { useState } from 'react';
import { Backdrop, Header, Footer } from './site-shell';

export async function tokenApi(path, body, method = 'GET') {
  let response;
  try {
    response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000),
      ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } catch { throw new Error('network'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('unavailable'); }
  if (!response.ok) throw new Error(data.error || 'unavailable');
  return data;
}
export function TokenShell({ children, title, intro, eyebrow }) {
  return <><Backdrop /><Header /><main className="token-page"><header className="token-heading"><p className="token-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></header>{children}</main><Footer /></>;
}
export function ErrorMessage({ error, t }) {
  return error ? <p className="token-error" role="alert">{t.errors[error] || t.errors.unavailable}</p> : null;
}
export function Pager({ data, onPage, busy, t }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <div className="token-pager"><span>{t.total(data.total)} · {t.page(data.page, pages)}</span><div><button disabled={busy || data.page <= 1} onClick={() => onPage(data.page - 1)}>{t.previous}</button><button disabled={busy || data.page >= pages} onClick={() => onPage(data.page + 1)}>{t.next}</button></div></div>;
}
export function RequestDetails({ request: r, t, locale }) {
  const number = n => n?.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
  const date = n => new Date(n * 1000).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
  return <><div className="token-card-heading"><h3>{r.projectName}</h3><span className={`token-status is-${r.status}`}>{t[r.status]}</span></div><p className="token-prose">{r.purpose}</p>
    <dl className="token-facts"><div><dt>{t.requested}</dt><dd>{number(r.requestedTokens)}</dd></div>{r.grantedTokens && <div><dt>{t.granted}</dt><dd>{number(r.grantedTokens)}</dd></div>}<div><dt>{t.submitted}</dt><dd>{date(r.createdAt)}</dd></div>{r.reviewedAt && <div><dt>{t.reviewed}</dt><dd>{date(r.reviewedAt)}</dd></div>}</dl>
    {r.reviewNote && <div className="token-note"><strong>{t.note}</strong><p className="token-prose">{r.reviewNote}</p></div>}</>;
}
export function Credential({ id, t }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function reveal() {
    if (key) { setKey(''); setMessage(''); return; }
    setBusy(true); setError('');
    try { setKey((await tokenApi(`/api/token-requests/${id}/credential`)).apiKey); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="token-credential"><button disabled={busy} onClick={reveal}>{busy ? t.working : key ? t.hide : t.reveal}</button>{key && <><label>{t.yourKey}<textarea readOnly rows={3} value={key} spellCheck={false} /></label><button onClick={async () => { try { await navigator.clipboard.writeText(key); setMessage(t.copied); } catch { setMessage(t.copyFailed); } }}>{t.copy}</button><p className="token-hint">{t.keyHint}</p></>}<ErrorMessage error={error} t={t} />{message && <p role="status">{message}</p>}</div>;
}
