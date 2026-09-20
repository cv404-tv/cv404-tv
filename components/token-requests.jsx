"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { usePreferences } from './preferences';
import { tokenCopy } from '../lib/token-copy';
import { Credential, ErrorMessage, Pager, RequestDetails, TokenShell, tokenApi } from './token-shared';

export default function TokenRequests() {
  const auth = useAuth();
  const { locale } = usePreferences();
  const t = tokenCopy[locale];
  return <TokenShell title={t.title} intro={t.intro} eyebrow={t.eyebrow}>
    {!auth.ready ? <p role="status">{t.loading}</p> : !auth.user ? <section className="token-panel"><p>{t.signInHint}</p><button className="token-primary" onClick={auth.show}>{t.signIn}</button></section> : <Applications key={auth.user.id} t={t} locale={locale} />}
  </TokenShell>;
}
function Applications({ t, locale }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [projectName, setProjectName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestedTokens, setRequestedTokens] = useState('1000000');
  const version = useRef(0);
  const load = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError(''); setData(null);
    try { const result = await tokenApi(`/api/token-requests?page=${page}`); if (current === version.current) setData(result); }
    catch (e) { if (current === version.current) setError(e.message); }
    finally { if (current === version.current) setLoading(false); }
  }, [page]);
  useEffect(() => { load(); return () => { version.current++; }; }, [load]);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await tokenApi('/api/token-requests', { projectName, purpose, requestedTokens: Number(requestedTokens) }, 'POST');
      setProjectName(''); setPurpose(''); setMessage(t.queued);
      if (page === 1) await load(); else setPage(1);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <><ErrorMessage error={error} t={t} />{message && <p className="token-success" role="status">{message}</p>}
    <div className="token-application-layout"><section className="token-panel"><h2>{t.apply}</h2><p className="token-hint">{t.cannotApply}</p>
      {data?.canApply && <form onSubmit={submit} className="token-form"><fieldset disabled={busy || loading}>
        <label>{t.projectName}<input required maxLength={80} value={projectName} onChange={e => setProjectName(e.target.value)} placeholder={t.projectPlaceholder} /></label>
        <label>{t.purpose}<textarea required minLength={10} maxLength={2000} rows={6} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder={t.purposePlaceholder} /></label>
        <label>{t.requestedTokens}<input required type="number" min={1} max={1000000000} step={1} value={requestedTokens} onChange={e => setRequestedTokens(e.target.value)} aria-describedby="token-amount-hint" /></label>
        <p id="token-amount-hint" className="token-hint">{t.amountHint}</p><button className="token-primary">{busy ? t.working : t.apply}</button>
      </fieldset></form>}
    </section><section className="token-history"><div className="token-section-heading"><h2>{t.history}</h2><button disabled={loading || busy} onClick={load}>{t.refresh}</button></div>
      {loading ? <p role="status">{t.loading}</p> : data && <>{!data.requests.length && <p className="token-panel">{t.empty}</p>}{data.requests.map(r => <article key={r.id} className="token-panel"><RequestDetails request={r} t={t} locale={locale} />{r.status === 'approved' && !!r.hasCredential && <Credential id={r.id} t={t} />}</article>)}<Pager data={data} busy={busy} onPage={setPage} t={t} /></>}
    </section></div></>;
}
