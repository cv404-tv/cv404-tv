"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { usePreferences } from './preferences';
import { tokenCopy } from '../lib/token-copy';
import { ErrorMessage, Pager, RequestDetails, TokenShell, tokenApi } from './token-shared';

export default function Admin() {
  const auth = useAuth();
  const { locale } = usePreferences();
  const t = tokenCopy[locale];
  return <TokenShell title={t.adminTitle} intro={t.adminIntro} eyebrow="CLOUD VALLEY 404 / ADMIN">
    {!auth.ready ? <p role="status">{t.loading}</p> : !auth.user ? <section className="token-panel"><p>{t.adminSignIn}</p><button className="token-primary" onClick={auth.show}>{t.signIn}</button></section> : !auth.user.isAdmin ? <p className="token-panel" role="alert">{t.forbidden}</p> : <Dashboard key={auth.user.id} t={t} locale={locale} />}
  </TokenShell>;
}
function Dashboard({ t, locale }) {
  const [tab, setTab] = useState('requests');
  return <><nav className="token-tabs" aria-label={t.adminTitle}>{['requests', 'users'].map(value => <button key={value} aria-pressed={tab === value} className={tab === value ? 'is-selected' : ''} onClick={() => setTab(value)}>{t[value]}</button>)}</nav><AdminList key={tab} tab={tab} t={t} locale={locale} /></>;
}
function AdminList({ tab, t, locale }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const version = useRef(0);
  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError(''); setData(null);
    try {
      const path = tab === 'users' ? `/api/admin/users?page=${page}&q=${encodeURIComponent(search)}` : `/api/admin/token-requests?page=${page}&status=${status}`;
      const result = await tokenApi(path);
      if (current === version.current) {
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (page > lastPage) setPage(lastPage);
        else setData(result);
      }
    } catch (e) { if (current === version.current) setError(e.message); }
    finally { if (current === version.current) setLoading(false); }
  }, [tab, page, search, status, revision]);
  useEffect(() => { load(); return () => { version.current++; }; }, [load]);
  return <><div className="token-toolbar">{tab === 'users' ? <form onSubmit={e => { e.preventDefault(); setPage(1); setSearch(query); }}><label className="sr-only" htmlFor="admin-search">{t.search}</label><input id="admin-search" type="search" placeholder={t.search} maxLength={100} value={query} onChange={e => setQuery(e.target.value)} /><button>{t.searchButton}</button></form> : <label>{t.requests}<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); setMessage(''); }}>{['pending', 'approved', 'rejected', 'all'].map(value => <option key={value} value={value}>{t[value]}</option>)}</select></label>}<button disabled={loading} onClick={load}>{t.refresh}</button></div>
    <ErrorMessage error={error} t={t} />{message && <p className="token-success" role="status">{message}</p>}
    {loading ? <p role="status">{t.loading}</p> : data && <>{tab === 'users' ? <div className="token-table-wrap" tabIndex={0} role="region" aria-label={t.users}><table className="token-table"><thead><tr>{['userId', 'email', 'nickname', 'accountStatus', 'registered', 'requestCount'].map(key => <th key={key} scope="col">{t[key]}</th>)}</tr></thead><tbody>{data.users.map(u => <tr key={u.userId}><td><code>{u.userId}</code></td><td>{u.email}</td><td>{u.nickname || '—'}</td><td>{t[u.status]}</td><td>{new Date(u.createdAt * 1000).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}</td><td>{u.requestCount}</td></tr>)}</tbody></table>{!data.users.length && <p>{t.noUsers}</p>}</div> : <div className="token-admin-requests">{!data.requests.length && <p className="token-panel">{t.noRequests}</p>}{data.requests.map(r => <article key={r.id} className="token-panel"><div className="token-applicant"><strong>{r.nickname || r.email}</strong><span>{r.email} · {r.userId} · {t[r.userStatus]}</span></div><RequestDetails request={r} t={t} locale={locale} />{r.reviewerEmail && <p className="token-hint">{t.reviewer}: {r.reviewerEmail}</p>}{r.status === 'pending' && r.userStatus === 'active' && <ReviewForm request={r} t={t} onSaved={() => { setMessage(t.reviewSaved); setRevision(value => value + 1); }} />}</article>)}</div>}<Pager data={data} busy={loading} onPage={setPage} t={t} /></>}
  </>;
}
function ReviewForm({ request, t, onSaved }) {
  const [decision, setDecision] = useState('approved');
  const [grantedTokens, setGrantedTokens] = useState(String(request.requestedTokens));
  const [apiKey, setApiKey] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  async function submit(e) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      await tokenApi(`/api/admin/token-requests/${request.id}`, { status: decision, grantedTokens: Number(grantedTokens), apiKey, reviewNote }, 'PATCH');
      setApiKey(''); await onSaved();
    } catch (e) { setError(e.message); }
    finally { locked.current = false; setBusy(false); }
  }
  return <form className="token-form token-review" onSubmit={submit}><fieldset disabled={busy}><legend>{t.requests}</legend><div className="token-decision">{['approved', 'rejected'].map(value => <label key={value}><input type="radio" name={`decision-${request.id}`} value={value} checked={decision === value} onChange={() => setDecision(value)} />{t[value]}</label>)}</div>
    {decision === 'approved' && <div className="token-review-fields"><label>{t.granted}<input type="number" min={1} max={1000000000} step={1} required value={grantedTokens} onChange={e => setGrantedTokens(e.target.value)} /></label><label>{t.apiKey}<input type="password" required maxLength={4096} autoComplete="off" spellCheck={false} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={t.keyPlaceholder} /></label></div>}
    <label>{t.reviewNote}<textarea required rows={3} maxLength={2000} value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder={t.notePlaceholder} /></label><button className={decision === 'approved' ? 'token-primary' : 'token-decline'}>{busy ? t.working : decision === 'approved' ? t.approve : t.reject}</button></fieldset><ErrorMessage error={error} t={t} /></form>;
}
