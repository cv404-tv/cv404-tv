'use client';
import { useState, useRef } from 'react';
import { useRemote, formatDate } from './management-shared';
import { tokenApi, Pager } from './token-shared';
import { hackathonCopy } from '../lib/hackathon-copy';
export default function HackathonAdmin({ locale, t: common }) {
  const t = hackathonCopy[locale];
  const zh = locale === 'zh';
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const remote = useRemote(`/api/admin/hackathon?page=${page}&status=${status}`, setPage);
  return <><div className="token-section-heading"><h2>{zh ? '第二期 Jev 黑客松报名' : 'Jev Hackathon applications'}</h2><button disabled={remote.loading} onClick={remote.reload}>{common.refresh}</button></div><div className="token-toolbar"><label>{common.filterStatus}<select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">{common.all}</option>{Object.entries(t.statuses).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>{remote.error && <p role="alert" className="token-error">{t.errors[remote.error] || t.errors.unavailable}</p>}{remote.loading ? <p role="status">{common.loading}</p> : remote.data && <><div className="token-admin-requests">{!remote.data.applications.length && <p className="token-panel">{zh ? '暂无符合条件的报名。' : 'No matching applications.'}</p>}{remote.data.applications.map(r => <article key={r.id} className="token-panel"><div className="token-card-heading"><h3>{r.name}</h3><span className={`token-status is-${r.status}`}>{t.statuses[r.status]}</span></div><p>{r.email}</p><dl className="token-facts"><div><dt>{t.contact}</dt><dd>{r.contact || '—'}</dd></div><div><dt>{t.role}</dt><dd>{t.roles[r.role]}</dd></div><div><dt>{t.track}</dt><dd>{t.trackLabels[r.track]}</dd></div><div><dt>{common.submitted}</dt><dd>{formatDate(r.createdAt, locale)}</dd></div></dl><p className="token-prose">{r.idea}</p>{r.reviewNote && <div className="token-note"><strong>{t.feedback}</strong><p className="token-prose">{r.reviewNote}</p></div>}{r.status === 'pending' && <Review id={r.id} t={t} zh={zh} onSaved={remote.reload} />}</article>)}</div><Pager data={remote.data} onPage={setPage} busy={remote.loading} t={common} /></>}</>;
}
function Review({ id, t, zh, onSaved }) {
  const [status, setStatus] = useState('approved');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function submit(e) {
    e.preventDefault(); if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await tokenApi(`/api/admin/hackathon/${id}`, { status, reviewNote: note }, 'PATCH'); await onSaved(); }
    catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form className="token-form token-review" onSubmit={submit}><fieldset disabled={busy}><label>{zh ? '审核结果' : 'Decision'}<select value={status} onChange={e => setStatus(e.target.value)}><option value="approved">{zh ? '通过' : 'Approve'}</option><option value="rejected">{zh ? '不通过' : 'Decline'}</option></select></label><label>{t.feedback}<textarea rows={2} required maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder={zh ? '填写申请人可见的反馈或后续安排。' : 'Feedback or next steps visible to the applicant.'} /></label><p className="token-hint">{zh ? '结果会显示在申请人的报名页；此操作不会自动发送邮件。' : 'The result appears on the applicant’s page. This action does not send email.'}</p><button className="token-primary">{busy ? t.submitting : zh ? '保存审核结果' : 'Save decision'}</button></fieldset>{error && <p className="token-error" role="alert">{t.errors[error] || t.errors.unavailable}</p>}</form>;
}
