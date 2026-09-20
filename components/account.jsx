"use client";
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useAuth } from './auth';
import { PreferenceSettings, usePreferences } from './preferences';
import { tokenCopy } from '../lib/token-copy';
import { managementCopy } from '../lib/management-copy';
import { TokenShell, ErrorMessage, Pager, tokenApi } from './token-shared';
import { useRemote, Stats, formatDate } from './management-shared';

export default function Account() {
  const auth = useAuth();
  const { locale } = usePreferences();
  const m = managementCopy[locale];
  const t = { ...m, ...tokenCopy[locale], errors: { ...tokenCopy[locale].errors, ...m.errors } };
  return <TokenShell title={t.accountTitle} intro={t.accountIntro} eyebrow="CLOUD VALLEY 404 / ACCOUNT">
    {!auth.ready ? <p role="status">{t.loading}</p> : !auth.user ? <section className="token-panel"><p>{t.loginHint}</p><button className="token-primary" onClick={auth.show}>{t.login}</button></section> : <AccountContent key={auth.user.id} auth={auth} t={t} locale={locale} />}
  </TokenShell>;
}
function AccountContent({ auth, t, locale }) {
  const summary = useRemote('/api/account/overview');
  const [page, setPage] = useState(1);
  const sessions = useRemote(`/api/account/sessions?page=${page}`, setPage);
  const [nickname, setNickname] = useState(auth.user.nickname);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  async function run(task) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await task(); }
    catch (e) { setError(e.message); if (e.message === 'unauthorized') await auth.refresh(); }
    finally { lock.current = false; setBusy(false); }
  }
  return <>
    <div className="token-section-heading"><h2>{t.overview}</h2><button disabled={summary.loading || busy} onClick={summary.reload}>{t.refresh}</button></div>
    <ErrorMessage error={summary.error} t={t} />
    {summary.loading ? <p role="status">{t.loading}</p> : summary.data && <><Stats data={summary.data} fields={['applications', 'pending', 'granted', 'votes']} t={{ ...t, ...managementCopy[locale] }} locale={locale} /><p className="token-hint">{t.statsHint}</p></>}
    <ErrorMessage error={error} t={t} />{message && <p className="token-success" role="status">{message}</p>}
    <div className="management-columns">
      <section className="token-panel"><h2>{t.profile}</h2><span className="token-status">{auth.user.isAdmin ? t.administrator : t.member}</span>
        <dl className="token-facts management-profile"><div><dt>{t.userId}</dt><dd>{auth.user.userId}</dd></div><div><dt>{t.email}</dt><dd>{auth.user.email}<small>{t.verified}</small></dd></div>{summary.data && <div><dt>{t.registered}</dt><dd>{formatDate(summary.data.createdAt, locale)}</dd></div>}</dl>
        <form className="token-form" onSubmit={e => { e.preventDefault(); run(async () => { const result = await tokenApi('/api/account', { nickname }, 'PATCH'); auth.updateUser(result.user); setMessage(t.saved); }); }}><fieldset disabled={busy}><label>{t.nickname}<input autoComplete="nickname" maxLength={32} value={nickname} onChange={e => setNickname(e.target.value)} /></label><button className="token-primary">{busy ? t.working : t.save}</button></fieldset></form>
      </section>
      <section className="token-panel"><h2>{t.quickLinks}</h2><div className="management-links">{[['/tokens', 'tokens'], ['/tier', 'tier'], ['/guide', 'guide']].map(([href, name]) => <Link key={name} href={href}><strong>{t[name]} <span aria-hidden="true">↗</span></strong><span>{t[`${name}Hint`]}</span></Link>)}{auth.user.isAdmin && <Link href="/admin"><strong>{t.adminTitle} ↗</strong><span>{t.adminIntro}</span></Link>}</div></section>
    </div>
    <PreferenceSettings />
    <section className="token-panel management-security"><div className="token-section-heading"><h2>{t.security}</h2><button disabled={sessions.loading || busy} onClick={sessions.reload}>{t.refresh}</button></div><p className="token-hint">{t.sessionHint}</p><ErrorMessage error={sessions.error} t={t} />
      {sessions.loading ? <p role="status">{t.loading}</p> : sessions.data && <><ul className="management-sessions">{sessions.data.sessions.map((s, i) => <li key={`${s.createdAt}-${i}`}><strong>{s.current ? t.current : t.other}</strong><span>{t.sessionStarted}: {formatDate(s.createdAt, locale)}</span><span>{t.expires}: {formatDate(s.expiresAt, locale)}</span></li>)}</ul><Pager data={sessions.data} onPage={setPage} busy={busy} t={t} /></>}
      <div className="management-actions"><button disabled={busy || !sessions.data || sessions.data.total < 2} onClick={() => { if (window.confirm(t.revokeHint)) run(async () => { await tokenApi('/api/account/sessions', {}, 'DELETE'); if (page === 1) await sessions.reload(); else setPage(1); await summary.reload(); setMessage(t.actionSaved); }); }}>{t.revokeOthers}</button><button disabled={busy} onClick={() => { if (window.confirm(t.confirmLogout)) run(async () => { await tokenApi('/api/auth/logout', {}, 'POST'); auth.updateUser(null); }); }}>{t.logout}</button></div>
    </section>
  </>;
}
