"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenApi } from './token-shared';

export function useRemote(path, onOutOfRange) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const version = useRef(0);
  const reload = useCallback(async () => {
    const current = ++version.current;
    setLoading(true); setError(''); setData(null);
    try { const result = await tokenApi(path); if (current === version.current) {
      const lastPage = result.pageSize ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
      if (onOutOfRange && result.page > lastPage) onOutOfRange(lastPage);
      else setData(result);
    } }
    catch (e) { if (current === version.current) setError(e.message); }
    finally { if (current === version.current) setLoading(false); }
  }, [path, onOutOfRange]);
  useEffect(() => { reload(); return () => { version.current++; }; }, [reload]);
  return { data, error, loading, reload };
}
export function Stats({ data, fields, t, locale }) {
  return <dl className="management-stats">{fields.map(key => <div key={key}><dt>{t[key]}</dt><dd>{Number(data[key] || 0).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</dd></div>)}</dl>;
}
export const formatDate = (value, locale) => new Date(value * 1000).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
