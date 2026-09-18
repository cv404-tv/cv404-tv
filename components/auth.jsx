"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePreferences } from './preferences';
import { authCopy } from '../lib/auth-copy';

const AuthContext = createContext(null);

async function api(path, body, method = 'POST') {
  let response;
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }),
      signal: AbortSignal.timeout(20000),
    });
  } catch { throw { code: 'network' }; }
  let result;
  try { result = await response.json(); } catch { throw { code: 'unavailable' }; }
  if (!response.ok) throw { code: result.error || 'unavailable', retryAfter: result.retryAfter };
  return result;
}

export function AuthProvider({ children }) {
  const { locale } = usePreferences();
  const t = authCopy[locale];
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState('');
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const dialog = useRef(null);
  const codeInput = useRef(null);
  const channel = useRef(null);
  const mutationVersion = useRef(0);
  const retryAtRef = useRef(0);

  const refresh = useCallback(async () => {
    const version = mutationVersion.current;
    try {
      const result = await api('/api/auth/me', null, 'GET');
      if (version === mutationVersion.current) setUser(result.user);
    } catch { /* Leave the login entry available so errors can be shown on interaction. */ }
    finally { setReady(true); }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => { if (!busyRef.current) refresh(); };
    window.addEventListener('focus', onFocus);
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('cv404-auth');
      channel.current.onmessage = onFocus;
    }
    return () => { window.removeEventListener('focus', onFocus); channel.current?.close(); };
  }, [refresh]);

  useEffect(() => {
    const node = dialog.current;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  useEffect(() => {
    retryAtRef.current = retryAt;
    const tick = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    tick();
    if (!retryAt) return;
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  useEffect(() => { if (open && challenge && !user) codeInput.current?.focus(); }, [challenge, open, user]);
  useEffect(() => { setNickname(user?.nickname || ''); }, [user]);

  function updateUser(value) {
    mutationVersion.current++;
    setUser(value);
    channel.current?.postMessage('changed');
  }
  function show() { setError(''); setMessage(''); setOpen(true); }
  async function run(action, task) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action); setError(''); setMessage('');
    try { await task(); }
    catch (failure) {
      if (failure.code === 'unauthorized') { updateUser(null); setChallenge(null); setCode(''); setError('expiredSession'); }
      else setError(failure.code || 'unavailable');
      if (failure.retryAfter) {
        const next = Date.now() + failure.retryAfter * 1000;
        retryAtRef.current = next;
        setRetryAt(next);
      }
    } finally { busyRef.current = false; setBusy(''); }
  }
  const send = event => {
    event?.preventDefault();
    if (Date.now() < retryAtRef.current) return;
    return run('send', async () => {
      const result = await api('/api/auth/send-code', { email, locale });
      setEmail(result.email); setChallenge(result.challengeId); setCode('');
      const next = Date.now() + result.retryAfter * 1000;
      retryAtRef.current = next; setRetryAt(next);
    });
  };
  const verify = event => {
    event.preventDefault();
    run('verify', async () => {
      const result = await api('/api/auth/verify-code', { challengeId: challenge, code });
      updateUser(result.user); setChallenge(null); setCode(''); setOpen(false);
    });
  };
  const save = event => {
    event.preventDefault();
    run('save', async () => {
      const result = await api('/api/account', { nickname }, 'PATCH');
      updateUser(result.user); setMessage('saved');
    });
  };
  const logout = all => run(all ? 'logoutAll' : 'logout', async () => {
    await api(`/api/auth/${all ? 'logout-all' : 'logout'}`);
    updateUser(null); setChallenge(null); setCode(''); setEmail(''); setOpen(false);
  });

  return <AuthContext.Provider value={{ user, ready, show }}>
    {children}
    <dialog ref={dialog} className="auth-dialog" aria-labelledby="auth-title" aria-describedby="auth-description"
      onCancel={event => { if (busyRef.current) event.preventDefault(); else setOpen(false); }}
      onClose={() => setOpen(false)}>
      <button type="button" className="auth-close" aria-label={t.close} disabled={!!busy} onClick={() => setOpen(false)}>×</button>
      <div className="auth-eyebrow"><span aria-hidden="true" /> CLOUD VALLEY 404</div>
      <h2 id="auth-title">{user ? t.account : challenge ? t.codeTitle : t.title}</h2>
      <p id="auth-description" className="auth-description">{user ? user.email : challenge ? <>{t.sent}<br /><strong>{email}</strong></> : t.subtitle}</p>
      {user ? <>
        <form onSubmit={save}>
          <label htmlFor="account-nickname">{t.nickname}</label>
          <input id="account-nickname" autoComplete="nickname" maxLength={32} value={nickname} onChange={event => setNickname(event.target.value)} placeholder={t.nicknamePlaceholder} disabled={!!busy} />
          <p className="auth-hint">{t.nicknameHelp}</p>
          <button className="auth-primary" disabled={!!busy}>{busy === 'save' ? t.saving : t.save}</button>
        </form>
        <div className="auth-account-actions">
          <button type="button" className="auth-secondary" disabled={!!busy} onClick={() => logout(false)}>{busy === 'logout' ? t.working : t.logout}</button>
          <button type="button" className="auth-link" disabled={!!busy} onClick={() => logout(true)}>{busy === 'logoutAll' ? t.working : t.logoutAll}</button>
          <p className="auth-hint">{t.logoutAllHint}</p>
        </div>
      </> : challenge ? <>
        <form onSubmit={verify}>
          <label htmlFor="login-code">{t.code}</label>
          <input ref={codeInput} id="login-code" className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} pattern="[0-9]{6}" required value={code} disabled={!!busy}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
          <button className="auth-primary" disabled={!!busy || code.length !== 6}>{busy === 'verify' ? t.verifying : t.verify}</button>
        </form>
        <div className="auth-code-actions">
          <button type="button" className="auth-link" disabled={!!busy} onClick={() => { setChallenge(null); setCode(''); setError(''); }}>{t.changeEmail}</button>
          <button type="button" className="auth-link" disabled={!!busy || seconds > 0} onClick={send}>{busy === 'send' ? t.sending : seconds ? t.resendIn(seconds) : t.resend}</button>
        </div>
        <p className="auth-hint">{t.help}</p>
      </> : <form onSubmit={send}>
        <label htmlFor="login-email">{t.email}</label>
        <input id="login-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required autoFocus
          value={email} onChange={event => setEmail(event.target.value)} placeholder={t.emailPlaceholder} disabled={!!busy} />
        <button className="auth-primary" disabled={!!busy || seconds > 0}>{busy === 'send' ? t.sending : seconds ? t.resendIn(seconds) : t.send}</button>
        <p className="auth-hint">{t.notice}</p>
      </form>}
      {error && <p className="auth-error" role="alert">{error === 'expiredSession' ? t.expiredSession : (t.errors[error] || t.errors.unavailable)}</p>}
      {message && <p className="auth-success" role="status">{t[message]}</p>}
      <div className="auth-footnote" aria-hidden="true">好想法，不再 404。<span>●</span></div>
    </dialog>
  </AuthContext.Provider>;
}

export function AccountButton() {
  const { user, ready, show } = useContext(AuthContext);
  const { locale } = usePreferences();
  const t = authCopy[locale];
  return <button type="button" className="glass account-button" onClick={show} aria-label={user ? t.account : t.login} title={user ? t.account : undefined}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="8" r="3.3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>
    <span>{ready && user ? user.nickname || t.account : t.login}</span>
  </button>;
}
