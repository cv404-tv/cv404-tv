"use client";
import HackathonAdmin from './hackathon-admin';
import { useCallback, useRef, useState } from 'react';
import { useAuth } from './auth';
import { usePreferences } from './preferences';
import { tokenCopy } from '../lib/token-copy';
import { managementCopy } from '../lib/management-copy';
import { ErrorMessage, Pager, RequestDetails, TokenShell, tokenApi } from './token-shared';
import { useRemote, Stats, formatDate } from './management-shared';
import { AdminInsights, UserDetails } from './admin-insights';

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
  const [filters, setFilters] = useState({});
  function navigate(value, changes) {
    if (changes) setFilters(previous => ({ ...previous, [value]: { ...listDefaults(value), ...previous[value], ...changes, page: 1 } }));
    setTab(value);
  }
  return <><nav className="token-tabs" aria-label={t.adminTitle}>{['overview', 'requests', 'hackathon', 'users', 'audit'].map(value => <button key={value} aria-pressed={tab === value} className={tab === value ? 'is-selected' : ''} onClick={() => navigate(value)}>{value === "hackathon" ? (locale === "zh" ? "黑客松报名" : "Hackathon") : t[value]}</button>)}</nav>
    {tab === 'hackathon' ? <HackathonAdmin locale={locale} t={t} /> : tab === 'overview' ? <Overview t={t} locale={locale} navigate={navigate} /> : <AdminList key={tab} filters={filters[tab] || listDefaults(tab)} setFilters={setFilters} tab={tab} t={t} locale={locale} navigate={navigate} />}
  </>;
}
function Overview({ t, locale, navigate }) {
  const remote = useRemote('/api/admin/overview');
  return <><div className="token-section-heading"><h2>{t.overview}</h2><button disabled={remote.loading} onClick={remote.reload}>{t.refresh}</button></div><ErrorMessage error={remote.error} t={t} />
    {remote.loading ? <p role="status">{t.loading}</p> : remote.data && <><Stats data={remote.data} fields={['users', 'newUsers', 'pending', 'granted', 'active', 'disabled', 'approved', 'rejected']} t={{ ...t, ...managementCopy[locale] }} locale={locale} /><p className="token-hint">{t.statsHint} · {t.updatedAt}: {formatDate(remote.data.asOf, locale)}</p><AdminInsights data={remote.data} t={t} locale={locale} navigate={navigate} /><section className="token-panel management-actions"><button className="token-primary" onClick={() => navigate('requests', { status: 'pending', sort: 'oldest', userId: '', query: '', search: '' })}>{t.requests} · {remote.data.pending}</button><button onClick={() => navigate('users')}>{t.users}</button><button onClick={() => navigate('audit')}>{t.audit}</button></section></>}
  </>;
}
function listDefaults(tab) {
  return { page: 1, status: tab === 'requests' ? 'pending' : 'all', query: '', search: '', action: 'all', from: '', to: '', userId: '', sort: 'oldest' };
}
function AdminList({ tab, filters, setFilters, t, locale, navigate }) {
  const { page, status, query, search, action, from, to, userId, sort } = filters;
  const update = useCallback(changes => setFilters(previous => ({ ...previous, [tab]: { ...listDefaults(tab), ...previous[tab], ...changes } })), [setFilters, tab]);
  const setPage = useCallback(page => update({ page }), [update]);
  const [message, setMessage] = useState('');
  const params = new URLSearchParams({ page, status, q: search, action, from, to, userId, sort });
  const path = `/api/admin/${tab === 'requests' ? 'token-requests' : tab}?${params}`;
  const { data, loading, error, reload } = useRemote(path, setPage);
  const [selected, setSelected] = useState(null);
  const [detailId, setDetailId] = useState('');
  const detailTrigger = useRef(null);
  const statuses = tab === 'users' ? ['all', 'active', 'disabled'] : ['pending', 'approved', 'rejected', 'all'];
  function change(changes) { update({ ...changes, page: 1 }); setSelected(null); setDetailId(''); setMessage(''); }
  function refresh() { setSelected(null); setDetailId(''); reload(); }
  function closeDetail() { setDetailId(''); detailTrigger.current?.focus(); }
  function showDetail(id, event) { detailTrigger.current = event.currentTarget; setDetailId(id); setSelected(null); }
  async function saved() { setSelected(null); setDetailId(''); setMessage(t.actionSaved); await reload(); }
  const searchLabel = tab === 'audit' ? t.auditSearch : tab === 'users' ? t.search : t.requestSearch;
  return <><div className="token-section-heading"><h2>{t[tab]}</h2>{data && <span className="token-hint">{t.total(data.total)}</span>}</div>
    <div className="token-toolbar admin-toolbar"><form onSubmit={e => { e.preventDefault(); change({ search: query.trim() }); }}><label className="sr-only" htmlFor="admin-search">{searchLabel}</label><input id="admin-search" type="search" placeholder={searchLabel} maxLength={100} value={query} onChange={e => update({ query: e.target.value })} /><button>{t.searchButton}</button></form>
    {tab === 'audit' ? <><label>{t.actionType}<select value={action} onChange={e => change({ action: e.target.value })}>{['all', 'enable', 'disable', 'revoke_sessions', 'token_approved', 'token_rejected', 'hackathon_approved', 'hackathon_rejected'].map(value => <option key={value} value={value}>{value === 'all' ? t.allActions : t[value]}</option>)}</select></label><label>{t.fromDate}<input type="date" aria-label={t.fromDate} value={from} max={to || '9999-12-31'} onChange={e => change({ from: e.target.value })} /></label><label>{t.toDate}<input type="date" aria-label={t.toDate} value={to} min={from || undefined} max="9999-12-31" onChange={e => change({ to: e.target.value })} /></label><span className="token-hint">{t.utcDates}</span></>
    : <label>{t.filterStatus}<select aria-label={t.filterStatus} value={status} onChange={e => change({ status: e.target.value })}>{statuses.map(value => <option key={value} value={value}>{t[value]}</option>)}</select></label>}
    {tab === 'requests' && <label>{t.sortOrder}<select value={sort} onChange={e => change({ sort: e.target.value })}><option value="oldest">{t.oldestFirst}</option><option value="newest">{t.newestFirst}</option></select></label>}
    <button onClick={() => change({ ...listDefaults(tab), status: 'all' })}>{t.clear}</button><button disabled={loading} onClick={refresh}>{t.refresh}</button></div>
    {userId && <div className="admin-filter-chip"><span>{t.filteredUser}: <code>{userId}</code></span><button onClick={() => change({ userId: '' })}>{t.removeFilter}</button></div>}
    <ErrorMessage error={error} t={t} />{message && <p className="token-success" role="status">{message}</p>}
    {detailId && <UserDetails key={detailId} userId={detailId} t={t} locale={locale} navigate={(tab, changes) => { setDetailId(''); navigate(tab, changes); }} onClose={closeDetail} />}
    {selected && <UserAction key={`${selected.user.userId}-${selected.action}`} selection={selected} t={t} onCancel={() => setSelected(null)} onSaved={saved} />}
    {loading ? <p role="status">{t.loading}</p> : data && <>
      {tab === 'users' ? <div className="token-table-wrap" tabIndex={0} role="region" aria-label={t.users}><table className="token-table"><thead><tr>{['user', 'accountStatus', 'registered', 'requestCount', 'actions'].map(key => <th key={key} scope="col">{t[key]}</th>)}</tr></thead><tbody>{data.users.map(u => <tr key={u.userId}><td><button className="admin-user-link" onClick={e => showDetail(u.userId, e)}>{u.nickname || u.email} ↗</button><span className="management-cell-note">{u.email}</span><code>{u.userId}</code></td><td><span className={`token-status is-${u.status}`}>{t[u.status]}</span>{u.isAdmin && <span className="management-cell-note">{t.administrator}</span>}</td><td>{formatDate(u.createdAt, locale)}</td><td><button onClick={() => navigate('requests', { userId: u.userId, status: 'all', search: '', query: '' })}>{u.requestCount} ↗</button></td><td>{u.isAdmin ? <span className="token-hint">{t.protected}</span> : <div className="management-row-actions">{[u.status === 'active' ? 'disable' : 'enable', 'revoke_sessions'].map(action => <button key={action} onClick={() => { setMessage(''); setDetailId(''); setSelected({ user: u, action }); }}>{t[action]}</button>)}</div>}</td></tr>)}</tbody></table>{!data.users.length && <p>{t.noUsers}</p>}</div>
      : tab === 'audit' ? <div className="token-table-wrap" tabIndex={0} role="region" aria-label={t.audit}><table className="token-table"><thead><tr>{['time', 'actor', 'target', 'actions', 'detail'].map(key => <th key={key} scope="col">{t[key]}</th>)}</tr></thead><tbody>{data.entries.map(entry => <tr key={entry.id}><td>{formatDate(entry.createdAt, locale)}</td><td>{entry.actorEmail}</td><td><button className="admin-user-link" onClick={e => showDetail(entry.userId, e)}>{entry.targetEmail} ↗</button><span className="management-cell-note">{entry.userId}</span></td><td>{t[entry.action] || entry.action}</td><td className="token-prose">{entry.detail}</td></tr>)}</tbody></table>{!data.entries.length && <p>{t.noAudit}</p>}</div>
      : <div className="token-admin-requests">{!data.requests.length && <p className="token-panel">{t.noRequests}</p>}{data.requests.map(r => <article key={r.id} className="token-panel"><div className="token-applicant"><button className="admin-user-link" onClick={e => showDetail(r.userId, e)}>{r.nickname || r.email} ↗</button><span>{r.email} · {r.userId} · {t[r.userStatus]}</span></div><RequestDetails request={r} t={t} locale={locale} />{r.reviewerEmail && <p className="token-hint">{t.reviewer}: {r.reviewerEmail}</p>}{r.status === 'pending' && r.userStatus !== 'active' && <p className="token-hint">{t.disabledReviewHint}</p>}{r.status === 'pending' && r.userStatus === 'active' && <ReviewForm request={r} t={t} onSaved={saved} />}</article>)}</div>}
      <Pager data={data} busy={loading} onPage={value => { setSelected(null); setDetailId(''); setPage(value); }} t={t} />
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
