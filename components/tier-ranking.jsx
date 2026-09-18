"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { usePreferences } from './preferences';
import { boardVotes } from '../lib/tier-ranking';
import { getAiSticker } from '../lib/ai-stickers';
import { rankingCopy } from '../lib/tier-ranking-copy';

const signature = votes => JSON.stringify([...votes].sort((a, b) => a.cardId.localeCompare(b.cardId)));
const scoreText = (score, digits = 0) => `${score > 0 ? '+' : score < 0 ? '−' : ''}${Math.abs(score).toFixed(digits)}`;
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), ...options });
  if (!response.ok) throw new Error(response.status === 401 ? 'unauthorized' : response.status === 429 ? 'rateLimited' : 'error');
  return response.json();
}

export default function TierRanking(props) {
  const auth = useAuth();
  return <Ranking key={auth.user?.id || 'guest'} {...props} auth={auth} />;
}

function Ranking({ board, editable, auth }) {
  const { locale } = usePreferences();
  const t = rankingCopy[locale];
  const [data, setData] = useState(null);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef(true);
  const mutation = useRef(false);
  const requestVersion = useRef(0);
  const votes = boardVotes(board);
  const changed = mine !== null && signature(mine) !== signature(votes);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setLoadError(false);
    try {
      const [ranking, own] = await Promise.allSettled([
        api('/api/tier-rankings'),
        auth.user ? api('/api/tier-rankings/mine') : Promise.resolve({ votes: [] }),
      ]);
      if (active.current && version === requestVersion.current) {
        if (ranking.status === 'fulfilled') setData(ranking.value);
        if (own.status === 'fulfilled') setMine(own.value.votes);
        else setMine(null);
        setLoadError(ranking.status === 'rejected' || own.status === 'rejected');
      }
    } catch {
      if (active.current && version === requestVersion.current) setLoadError(true);
    } finally {
      if (active.current && version === requestVersion.current) setLoading(false);
    }
  }, [auth.user?.id]);

  useEffect(() => {
    active.current = true;
    refresh();
    const onFocus = () => { if (!mutation.current) refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { active.current = false; requestVersion.current++; window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  async function publish(withdraw = false) {
    if (!auth.user) { auth.show(); return; }
    if (mutation.current) return;
    mutation.current = true; requestVersion.current++;
    setBusy(true); setMessage(''); setLoading(false);
    try {
      const result = await api('/api/tier-rankings/mine', {
        method: withdraw ? 'DELETE' : 'PUT', headers: { 'Content-Type': 'application/json' },
        ...(withdraw ? {} : { body: JSON.stringify({ votes }) }),
      });
      if (!active.current) return;
      setMine(result.votes); setMessage(withdraw ? 'withdrawn' : 'saved');
      await refresh();
    } catch (error) {
      if (!active.current) return;
      if (error.message === 'unauthorized') auth.show();
      setMessage(error.message === 'rateLimited' ? 'rateLimited' : 'saveError');
    } finally {
      mutation.current = false;
      if (active.current) setBusy(false);
    }
  }

  return <section className="tier-community" aria-labelledby="community-title">
    <div className="tier-community-heading">
      <div><p className="tier-eyebrow">{t.eyebrow}</p><h2 id="community-title">{t.title}</h2><p>{t.intro}</p></div>
      <button className="tier-quiet" onClick={refresh} disabled={loading || busy}>{loading ? t.loading : t.refresh} ↻</button>
    </div>
    <p className="tier-community-formula">{t.formula}</p>
    {editable && <div className="tier-vote-panel">
      <div><p>{t.note}</p><span>{auth.user && mine?.length > 0 ? (changed ? t.changed : t.saved) : ''}</span></div>
      <div className="tier-vote-actions">
        <button className="tier-primary" onClick={() => publish()} disabled={!auth.ready || busy || (!!auth.user && (!votes.length || (mine !== null && !changed)))}>{busy ? t.publishing : auth.user ? t.publish : t.login}</button>
        {auth.user && !!mine?.length && <button className="tier-quiet" disabled={busy} onClick={() => publish(true)}>{t.withdraw}</button>}
      </div>
    </div>}
    <p className="tier-ranking-status" role="status">{message ? t[message] : ''}</p>
    {loadError && <p role="alert">{t.error} <button className="tier-quiet" onClick={refresh} disabled={loading || busy}>{t.retry}</button></p>}
    {loading && !data && <p role="status">{t.loading}</p>}
    {data && <>
      <p className="tier-community-count">{data.participants} {t.participants}</p>
      {!data.participants && <p>{t.empty}</p>}
      <div className="tier-ranking-scroll" tabIndex={0} role="region" aria-label={t.title}>
        <table className="tier-ranking-table">
          <thead><tr><th scope="col">{t.rank}</th><th scope="col">{t.model}</th><th scope="col">{t.average}</th><th scope="col">{t.votes}</th><th scope="col">{t.distribution}</th>{auth.user && <th scope="col">{t.yours}</th>}</tr></thead>
          <tbody>{data.rankings.map(card => {
            const preset = getAiSticker(card.cardId);
            const own = mine?.find(vote => vote.cardId === card.cardId);
            return <tr key={card.cardId}>
              <td className="tier-ranking-position">{card.rank ?? '—'}</td>
              <th scope="row"><span className="tier-ranking-model">{preset?.logo && <img src={`/assets/ai-logos/${preset.logo}.svg`} width="24" height="24" alt="" />}<span>{card.name}</span></span></th>
              <td className="tier-ranking-score">{card.average === null ? <span className="tier-ranking-unrated">{t.unranked}</span> : scoreText(card.average, 2)}</td>
              <td>{card.votes}</td>
              <td><div className="tier-score-distribution">{[2, 1, 0, -1, -2].map(score => <span key={score} data-score={score}><small>{scoreText(score)}</small><strong>{card.distribution[score]}</strong></span>)}</div></td>
              {auth.user && <td>{own ? scoreText(own.score) : '—'}</td>}
            </tr>;
          })}</tbody>
        </table>
      </div>
    </>}
  </section>;
}
