"use client";
import { useRef, useState } from 'react';
import { useAuth } from './auth';
import { usePreferences } from './preferences';
import { tokenCopy } from '../lib/token-copy';
import { managementCopy } from '../lib/management-copy';
import { ErrorMessage, Pager, RequestDetails, TokenShell, tokenApi } from './token-shared';
import { useRemote, Stats, formatDate } from './management-shared';

export default function Admin() {
  const auth = useAuth();
  const { locale } = usePreferences();
  const m = managementCopy[locale];
  const t = { ...m, ...tokenCopy[locale], errors: { ...tokenCopy[locale].errors, ...m.errors } };
  return <TokenShell title={t.adminTitle} intro={t.adminIntro} eyebrow="CLOUD VALLEY 404 / ADMIN">
    {!auth.ready ? <p role="status">{t.loading}</p> : !auth.user ? <section className="token-panel"><p>{t.adminSignIn}</p><button className="token-primary" onClick={auth.show}>{t.login}</button></section> : !auth.user.isAdmin ? <p className="token-panel" role="alert">{t.forbidden}</p> : <Dashboard key={auth.user.id} t={t} locale={locale} />}
  </TokenShell>;
}
function Dashboard({ t, locale }) {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  function navigate(value, query = '') { setSearch(query); setTab(value); }
  return <><nav className="token-tabs" aria-label={t.adminTitle}>{['overview', 'requests', 'users', 'audit'].map(value => <button key={value} aria-pressed={tab === value} className={tab === value ? 'is-selected' : ''} onClick={() => navigate(value)}>{t[value]}</button>)}</nav>
    {tab === 'overview' ? <Overview t={t} locale={locale} navigate={navigate} /> : <AdminList key={`${tab}-${search}`} initialSearch={search} tab={tab} t={t} locale={locale} navigate={navigate} />}
  </>;
}
function Overview({ t, locale, navigate }) {
  const remote = useRemote('/api/admin/overview');
  return <><div className="token-section-heading"><h2>{t.overview}</h2><button disabled={remote.loading} onClick={remote.reload}>{t.refresh}</button></div><ErrorMessage error={remote.error} t={t} />
    {remote.loading ? <p role="status">{t.loading}</p> : remote.data && <><Stats data={remote.data} fields={['users', 'newUsers', 'pending', 'granted', 'active', 'disabled', 'approved', 'rejected']} t={{ ...t, ...managementCopy[locale] }} locale={locale} /><p className="token-hint">{t.statsHint}</p><section className="token-panel management-actions"><button className="token-primary" onClick={() => navigate('requests')}>{t.requests} · {remote.data.pending}</button><button onClick={() => navigate('users')}>{t.users}</button><button onClick={() => navigate('audit')}>{t.audit}</button></section></>}
  </>;
}
function AdminList({ tab, initialSearch, t, locale, navigate }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(tab === 'requests' && !initialSearch ? 'pending' : 'all');
  const [query, setQuery] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [message, setMessage] = useState('');
  const path = `/api/admin/${tab === 'requests' ? 'token-requests' : tab}?page=${page}&status=${status}&q=${encodeURIComponent(search)}`;
  const { data, loading, error, reload } = useRemote(path, setPage);
  const [selected, setSelected] = useState(null);
  const statuses = tab === 'users' ? ['all', 'active', 'disabled'] : ['pending', 'approved', 'rejected', 'all'];
  function refresh() { setSelected(null); reload(); }
  async function saved() { setSelected(null); setMessage(t.actionSaved); if (page > 1) setPage(1); else await reload(); }
  return <><div className="token-toolbar">{tab !== 'audit' && <><form onSubmit={e => { e.preventDefault(); setPage(1); setSearch(query.trim()); setSelected(null); }}><label className="sr-only" htmlFor="admin-search">{tab === 'users' ? t.search : t.requestSearch}</label><input id="admin-search" type="search" placeholder={tab === 'users' ? t.search : t.requestSearch} maxLength={100} value={query} onChange={e => setQuery(e.target.value)} /><button>{t.searchButton}</button></form><label><span className="sr-only">{tab === 'users' ? t.accountStatus : t.requests}</span><select aria-label={tab === 'users' ? t.accountStatus : t.requests} value={status} onChange={e => { setStatus(e.target.value); setPage(1); setMessage(''); setSelected(null); }}>{statuses.map(value => <option key={value} value={value}>{t[value]}</option>)}</select></label><button onClick={() => { setQuery(''); setSearch(''); setStatus('all'); setPage(1); setSelected(null); }}>{t.clear}</button></>}<button disabled={loading} onClick={refresh}>{t.refresh}</button></div>
    <ErrorMessage error={error} t={t} />{message && <p className="token-success" role="status">{message}</p>}
    {selected && <UserAction key={`${selected.user.userId}-${selected.action}`} selection={selected} t={t} onCancel={() => setSelected(null)} onSaved={saved} />}
    {loading ? <p role="status">{t.loading}</p> : data && <>
      {tab === 'users' ? <div className="token-table-wrap" tabIndex={0} role="region" aria-label={t.users}><table className="token-table"><thead><tr>{['user', 'accountStatus', 'registered', 'requestCount', 'actions'].map(key => <th key={key} scope="col">{t[key]}</th>)}</tr></thead><tbody>{data.users.map(u => <tr key={u.userId}><td><strong>{u.nickname || '—'}</strong><span className="management-cell-note">{u.email}</span><code>{u.userId}</code></td><td><span className={`token-status is-${u.status}`}>{t[u.status]}</span>{u.isAdmin && <span className="management-cell-note">{t.administrator}</span>}</td><td>{formatDate(u.createdAt, locale)}</td><td><button onClick={() => navigate('requests', u.userId)}>{u.requestCount} ↗</button></td><td>{u.isAdmin ? <span className="token-hint">{t.protected}</span> : <div className="management-row-actions">{[u.status === 'active' ? 'disable' : 'enable', 'revoke_sessions'].map(action => <button key={action} onClick={() => { setMessage(''); setSelected({ user: u, action }); }}>{t[action]}</button>)}</div>}</td></tr>)}</tbody></table>{!data.users.length && <p>{t.noUsers}</p>}</div>
      : tab === 'audit' ? <div className="token-table-wrap" tabIndex={0} role="region" aria-label={t.audit}><table className="token-table"><thead><tr>{['time', 'actor', 'target', 'actions', 'detail'].map(key => <th key={key} scope="col">{t[key]}</th>)}</tr></thead><tbody>{data.entries.map(entry => <tr key={entry.id}><td>{formatDate(entry.createdAt, locale)}</td><td>{entry.actorEmail}</td><td>{entry.targetEmail}<span className="management-cell-note">{entry.userId}</span></td><td>{t[entry.action] || entry.action}</td><td className="token-prose">{entry.detail}</td></tr>)}</tbody></table>{!data.entries.length && <p>{t.noAudit}</p>}</div>
      : <div className="token-admin-requests">{!data.requests.length && <p className="token-panel">{t.noRequests}</p>}{data.requests.map(r => <article key={r.id} className="token-panel"><div className="token-applicant"><strong>{r.nickname || r.email}</strong><span>{r.email} · {r.userId} · {t[r.userStatus]}</span></div><RequestDetails request={r} t={t} locale={locale} />{r.reviewerEmail && <p className="token-hint">{t.reviewer}: {r.reviewerEmail}</p>}{r.status === 'pending' && r.userStatus === 'active' && <ReviewForm request={r} t={t} onSaved={saved} />}</article>)}</div>}
      <Pager data={data} busy={loading} onPage={value => { setSelected(null); setPage(value); }} t={t} />
    </>}
  </>;
}
function UserAction({ selection: { user, action }, t, onCancel, onSaved }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  async function submit(e) {
    e.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { await tokenApi(`/api/admin/users/${user.userId}`, { action, reason }, 'PATCH'); await onSaved(); }
    catch (e) { setError(e.message); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="token-panel management-confirm" aria-label={t[action]}><h2>{t[action]} · {user.email}</h2><p className="token-hint">{t[`${action}Hint`]}</p><form className="token-form" onSubmit={submit}><fieldset disabled={busy}><label>{t.reason}<textarea autoFocus required maxLength={300} rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder={t.reasonHint} /></label><div className="management-actions"><button className="token-primary">{busy ? t.working : t.confirm}</button><button type="button" onClick={onCancel}>{t.cancel}</button></div></fieldset><ErrorMessage error={error} t={t} /></form></section>;
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
