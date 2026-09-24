'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Header, Footer } from './site-shell';
import { useAuth } from './auth';
import { usePreferences } from './preferences';
import { tokenApi } from './token-shared';
import { useRemote } from './management-shared';
import { hackathonCopy } from '../lib/hackathon-copy';

export default function Hackathon() {
  const { locale } = usePreferences();
  const t = hackathonCopy[locale];
  const auth = useAuth();
  const [example, setExample] = useState(0);
  const [track, setTrack] = useState('explore');
  const sample = t.examples[example];
  return <div className="jev-site"><a className="skip-link" href="#jev-main">{locale === 'zh' ? '跳转到内容' : 'Skip to content'}</a><Header />
    <main id="jev-main" className="jev-page">
      <div className="jev-edition"><span>{t.label}</span><Link href="/events">{t.back} ↗</Link></div>
      <section className="jev-hero">
        <div className="jev-hero-copy"><span className="jev-badge"><i />{t.badge}</span><h1>{t.title[0]}<br /><em>{t.title[1]}</em></h1><p>{t.intro}</p><div className="jev-actions"><a className="jev-button" href="#apply">{t.apply}<span>↗</span></a><a className="jev-text-link" href="#about">{t.learn} ↓</a><Link className="jev-text-link" href="/events/jev/slides">{locale === 'zh' ? '观看活动 PPT' : 'View event slides'} ↗</Link></div></div>
        <div className="jev-art" aria-hidden="true"><div className="jev-art-top"><span>SYSTEM ONE / BUILD 002</span><span>● JEV</span></div><div className="jev-art-input">context + question</div><div className="jev-wire" /><div className="jev-core"><span>Jev<span className="jev-core-dot">.</span></span><small>THE DECISION ENGINE</small></div><div className="jev-branches"><span>choice</span><span>score</span><span>noul</span></div><div className="jev-art-bottom"><span>MAKE A CHOICE.<br />MAKE SOMETHING.</span><b>02</b></div></div>
      </section>
      <section className="jev-logistics" aria-label={t.label}>{[t.date,t.place,t.capacity].map(label => <div key={label}><span>{label}</span><strong>{t.tba}</strong></div>)}<p>{t.pendingInfo}</p></section>
      <section id="about" className="jev-section"><div className="jev-section-heading"><span className="jev-kicker">01 / MEET JEV</span><h2>{t.about}</h2><p>{t.aboutBody}</p></div><div className="jev-primitives">{t.primitives.map(([name,title,body]) => <article key={name}><span className="jev-primitive-name">{name}<span>↗</span></span><h3>{title}</h3><p>{body}</p></article>)}</div><p className="jev-note">{t.limit} <a href="https://docs.typesafe.ai/introduction" target="_blank" rel="noreferrer">{locale === 'zh' ? '官方说明' : 'Official documentation'} ↗</a></p></section>
      <section className="jev-lab"><div className="jev-lab-heading"><span className="jev-kicker">DECISION PLAYGROUND</span><h2>{t.lab}</h2><p>{t.labHint}</p></div><div className="jev-demo-tabs" aria-label={t.lab}>{t.examples.map((item,i) => <button type="button" aria-pressed={example === i} key={item.name} onClick={() => setExample(i)}>{item.name}</button>)}</div><div className="jev-demo" aria-live="polite"><div><span className="jev-kicker">01 / {t.input}</span><p className="jev-ticket">“{sample.text}”</p><code>state: ticket.message</code></div><div className="jev-demo-result"><span className="jev-kicker">02 / CHOICE</span><h3>{t.question}</h3>{['billing','technical','other'].map((name,i) => <div className="jev-prob" key={name}><div><span>{name}</span><span>{sample.values[i]}%</span></div><i style={{'--value': `${sample.values[i]}%`}} /></div>)}</div><div className="jev-demo-action"><span className="jev-kicker">03 / {t.output}</span><span className="jev-action-icon">↗</span><h3>{sample.action}</h3><code>confidence: {sample.confidence}</code></div></div><p className="jev-demo-caption">{t.demo}</p></section>
      <section className="jev-section"><div className="jev-section-heading"><span className="jev-kicker">02 / BUILD SOMETHING</span><h2>{t.tracksTitle}</h2><p>{t.tracksIntro}</p></div><div className="jev-tracks">{t.tracks.map(([id,number,title,body,code]) => <a href="#apply" onClick={() => setTrack(id)} key={id}><span className="jev-track-number">{number}<i>↗</i></span><h3>{title}</h3><p>{body}</p><code>{code}</code></a>)}</div></section>
      <section className="jev-section jev-plan"><div className="jev-section-heading"><span className="jev-kicker">03 / THE FORMAT</span><h2>{t.plan}</h2><p>{t.planIntro}</p></div><ol>{t.steps.map(([title,body],i) => <li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol><aside><span>↳</span><h3>{t.deliver}</h3><p>{t.deliverBody}</p></aside></section>
      <section id="apply" className="jev-registration"><div><span className="jev-kicker">04 / JOIN THE NEXT CHAPTER</span><h2>{t.registration}<br /><em>{t.registrationAccent}</em></h2><p>{t.registrationBody}</p><div className="jev-registration-note"><span className="jev-badge"><i />{t.badge}</span><p>{t.pendingInfo}</p></div></div><div className="jev-form-card">{!auth.ready ? <p role="status">{t.loading}</p> : !auth.user ? <><span className="jev-form-index">APPLICATION / 002</span><h3>{t.apply}</h3><p>{t.loginHint}</p><button className="jev-button" onClick={auth.show}>{t.login} ↗</button></> : <Application key={auth.user.id} user={auth.user} t={t} track={track} showLogin={auth.show} />}</div></section>
      <section className="jev-section jev-faq"><div><span className="jev-kicker">GOOD TO KNOW</span><h2>{t.faq}</h2></div><div>{t.faqs.map(([q,a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
      <div className="jev-sources"><div><span className="jev-kicker">{t.sources}</span><p>{t.checked}</p></div><a href="https://typesafe.ai/" target="_blank" rel="noreferrer">TypeSafe AI ↗</a><a href="https://docs.typesafe.ai/introduction" target="_blank" rel="noreferrer">Introduction ↗</a><a href="https://docs.typesafe.ai/primitives" target="_blank" rel="noreferrer">Primitives ↗</a><a href="https://docs.typesafe.ai/confidence" target="_blank" rel="noreferrer">Confidence ↗</a></div>
    </main><Footer /></div>;
}
function Application({ user, t, track, showLogin }) {
  const remote = useRemote('/api/hackathon/applications');
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const heading = useRef(null);
  const [direction, setDirection] = useState(track);
  useEffect(() => setDirection(track), [track]);
  useEffect(() => { if (receipt) heading.current?.focus(); }, [receipt]);
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    lock.current = true; setBusy(true); setError('');
    try { const data = await tokenApi('/api/hackathon/applications', { name: form.get('name'), contact: form.get('contact'), role: form.get('role'), track: form.get('track'), idea: form.get('idea'), consent: form.get('consent') === 'on' }, 'POST'); setReceipt(data.application); }
    catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  }
  const saved = receipt || remote.data?.application;
  if (saved) return <div className="jev-receipt"><span className="jev-receipt-mark">✓</span><h3 tabIndex={-1} ref={heading}>{t.received}</h3><span className={`token-status is-${saved.status}`}>{t.statuses[saved.status]}</span><p>{t.receiptHint}</p><dl><dt>{t.email}</dt><dd>{user.email}</dd><dt>{t.name}</dt><dd>{saved.name}</dd><dt>{t.track}</dt><dd>{t.trackLabels[saved.track]}</dd><dt>{t.idea}</dt><dd className="jev-preserve">{saved.idea}</dd><dt>{t.receipt}</dt><dd><code>{saved.id}</code></dd></dl>{saved.reviewNote && <div className="jev-feedback"><strong>{t.feedback}</strong><p className="jev-preserve">{saved.reviewNote}</p></div>}<p className="jev-note">{t.privacy}</p><button className="jev-text-link" disabled={remote.loading} onClick={() => { setReceipt(null); remote.reload(); }}>{t.retry} ↻</button></div>;
  if (remote.loading) return <p role="status">{t.loading}</p>;
  if (remote.error) return <><p role="alert">{t.errors[remote.error] || t.errors.unavailable}</p><button className="jev-button" onClick={remote.error === 'unauthorized' ? showLogin : remote.reload}>{remote.error === 'unauthorized' ? t.login : t.retry}</button></>;
  return <form className="jev-form" onSubmit={submit}><span className="jev-form-index">APPLICATION / 002</span><p className="jev-form-email">{t.email} · {user.email}</p><fieldset disabled={busy}><label>{t.name}<input name="name" autoComplete="name" required maxLength={60} defaultValue={user.nickname || ''} /></label><label>{t.contact}<input name="contact" maxLength={100} /></label><div className="jev-form-row"><label>{t.role}<select name="role" defaultValue="developer">{Object.entries(t.roles).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>{t.track}<select name="track" value={direction} onChange={e => setDirection(e.target.value)}>{Object.entries(t.trackLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><label>{t.idea}<textarea name="idea" required minLength={10} maxLength={1000} rows={4} placeholder={t.ideaHint} /></label><label className="jev-consent"><input type="checkbox" name="consent" required /><span>{t.consent}</span></label><button className="jev-button" type="submit">{busy ? t.submitting : t.submit}<span>↗</span></button></fieldset>{error && <p className="token-error" role="alert">{t.errors[error] || t.errors.unavailable}</p>}{error === 'unauthorized' && <button type="button" className="jev-text-link" onClick={showLogin}>{t.login}</button>}</form>;
}
