"use client";
import { useEffect, useRef } from 'react';
import { ErrorMessage } from './token-shared';
import { useRemote, Stats, formatDate } from './management-shared';

export function AdminInsights({ data, t, locale, navigate }) {
  const peak = Math.max(1, ...data.trend.flatMap(day => [day.users, day.applications, day.reviews]));
  return <>
    <section className="token-panel admin-workload" aria-labelledby="admin-workload-title">
      <div><p className="token-eyebrow">{t.workQueue}</p><h2 id="admin-workload-title">{data.pending ? t.waiting(data.pending) : t.queueClear}</h2><p className="token-hint">{data.oldestPendingAt ? `${t.oldestPending}: ${formatDate(data.oldestPendingAt, locale)}` : t.queueClearHint}</p></div>
      <div className="admin-workload-count"><strong>{data.overdue}</strong><span>{t.overdue}</span>{data.blockedPending > 0 && <small>{t.blockedPending(data.blockedPending)}</small>}</div>
      <button className="token-primary" onClick={() => navigate('requests', { status: 'pending', sort: 'oldest', userId: '', query: '', search: '' })}>{t.processQueue} →</button>
    </section>
    <section className="token-panel admin-trend" aria-labelledby="admin-trend-title">
      <div className="token-section-heading"><h2 id="admin-trend-title">{t.trend}</h2><span className="token-hint">{t.utcDays}</span></div>
      <div className="admin-trend-legend">{['users', 'applications', 'reviews'].map(key => <span key={key}><i className={`admin-series-${key}`} />{t[`trend_${key}`]}</span>)}</div>
      <div className="admin-trend-chart" aria-hidden="true">{data.trend.map(day => <div className="admin-trend-day" key={day.day}><div className="admin-trend-bars">{['users', 'applications', 'reviews'].map(key => <div key={key} className={`admin-series-${key}`} style={{ height: `${day[key] / peak * 100}%` }} title={`${t[`trend_${key}`]}: ${day[key]}`} />)}</div><span>{day.day.slice(5).replace('-', '/')}</span></div>)}</div>
      <details className="admin-trend-data"><summary>{t.trendData}</summary><div className="token-table-wrap"><table className="token-table"><thead><tr><th scope="col">{t.date}</th>{['users', 'applications', 'reviews'].map(key => <th scope="col" key={key}>{t[`trend_${key}`]}</th>)}</tr></thead><tbody>{data.trend.map(day => <tr key={day.day}><th scope="row">{day.day}</th><td>{day.users}</td><td>{day.applications}</td><td>{day.reviews}</td></tr>)}</tbody></table></div></details>
    </section>
  </>;
}

export function UserDetails({ userId, t, locale, onClose, navigate }) {
  const remote = useRemote(`/api/admin/users/${userId}`);
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [userId]);
  const d = remote.data;
  return <section className="token-panel admin-user-detail" aria-labelledby="admin-detail-title">
    <div className="token-section-heading"><h2 id="admin-detail-title" ref={heading} tabIndex={-1}>{t.userDetails}</h2><div className="management-actions"><button disabled={remote.loading} onClick={remote.reload}>{t.refresh}</button><button onClick={onClose}>{t.close}</button></div></div>
    <ErrorMessage error={remote.error} t={t} />
    {remote.loading ? <p role="status">{t.loading}</p> : d && <>
      <div className="admin-profile-line"><div><h3>{d.user.nickname || d.user.email}</h3><p>{d.user.email} · <code>{d.user.userId}</code></p></div><span className={`token-status is-${d.user.status}`}>{d.user.isAdmin ? `${t.administrator} · ` : ''}{t[d.user.status]}</span></div>
      <p className="token-hint">{t.registered}: {formatDate(d.user.createdAt, locale)} · {t.verified}: {formatDate(d.user.verifiedAt, locale)}</p>
      <Stats data={d} fields={['applications', 'pending', 'granted', 'sessions']} t={t} locale={locale} /><p className="token-hint">{t.statsHint} {t.sessionHint}</p>
      <div className="management-columns"><section><div className="token-section-heading"><h3>{t.recentRequests}</h3><button onClick={() => navigate('requests', { userId, status: 'all', query: '', search: '' })}>{t.viewAll} →</button></div>{!d.requests.length ? <p className="token-hint">{t.noRequests}</p> : <ul className="admin-recent-list">{d.requests.map(r => <li key={r.id}><strong>{r.projectName}</strong><span className={`token-status is-${r.status}`}>{t[r.status]}</span><small>{formatDate(r.createdAt, locale)}</small></li>)}</ul>}</section>
      <section><div className="token-section-heading"><h3>{t.recentActivity}</h3><button onClick={() => navigate('audit', { userId, action: 'all', query: '', search: '', from: '', to: '' })}>{t.viewAll} →</button></div>{!d.activity.length ? <p className="token-hint">{t.noAudit}</p> : <ul className="admin-recent-list">{d.activity.map(a => <li key={a.id}><strong>{t[a.action] || a.action}</strong><small>{formatDate(a.createdAt, locale)} · {a.actorEmail}</small><p className="token-prose">{a.detail}</p></li>)}</ul>}</section></div>
    </>}
  </section>;
}
