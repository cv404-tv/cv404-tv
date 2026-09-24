'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePreferences } from './preferences';
import { BrandMark } from './brand-mark';
import { jevSlidesCopy } from '../lib/jev-slides-copy';

function Multiline({ value }) {
  return value.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>);
}

const partnerMarks = [
  '/assets/jev-partner-ai-workshop.png',
  '/assets/jev-partner-hackers-and-painters.png',
  '/assets/jev-partner-your-space.png',
];

function SlideBody({ slide, t, locale }) {
  switch (slide.kind) {
    case 'cover':
      return <div className={`jev-slide-cover-layout ${locale === 'en' ? 'is-en' : ''}`}>
        <div className="jev-slide-cover-copy"><div className="jev-slide-cover-brand" aria-label={locale === 'zh' ? '云谷404' : 'Cloud Valley 404'}><BrandMark /><strong>{locale === 'zh' ? '云谷' : 'CLOUD VALLEY'}<span>404</span></strong></div><h1><Multiline value={slide.title} /></h1><p className="jev-slide-cover-tagline">{slide.lead}</p><div className="jev-slide-cover-details"><strong>{slide.detail}</strong><span>{slide.secondary}</span></div></div>
        <div className="jev-slide-cover-art" aria-hidden="true" />
      </div>;
    case 'partners':
      return <div className="jev-slide-partners-layout">
        <h2>{slide.title}</h2>
        <div className="jev-partner-group jev-partner-organizer"><span className="jev-partner-role">{slide.organizerLabel}</span><div className="jev-partner-organizer-mark">{locale === 'zh' ? <img src="/assets/jev-partner-cloud404.png" alt={slide.organizer} /> : <strong>{slide.organizer}</strong>}</div></div>
        <div className="jev-partner-group jev-partner-coorganizers"><span className="jev-partner-role">{slide.coorganizerLabel}</span><div className="jev-partner-grid">{slide.coorganizers.map((name, index) => <div className={`jev-partner-mark jev-partner-mark-${index}`} key={name}><img src={partnerMarks[index]} alt={name} /></div>)}</div></div>
      </div>;
    case 'mission':
      return <><h2><Multiline value={slide.title} /></h2><p className="jev-slide-lead">{slide.lead}</p><div className="jev-slide-process">{slide.stages.map(([name, body], index) => <div key={name}><small>0{index + 1} / {name}</small><strong>{body}</strong></div>)}</div></>;
    case 'model':
      return <><h2>{slide.title}</h2><p className="jev-slide-lead">{slide.lead}</p><div className="jev-slide-primitives">{slide.primitives.map(([name, body]) => <div key={name}><strong>{name}</strong><span>{body}</span></div>)}</div></>;
    case 'example':
      return <><h2>{slide.title}</h2><blockquote>{slide.quote}</blockquote><div className="jev-slide-example-flow">{slide.flow.map(([label, body], index) => <div key={label}><small>0{index + 1} / {label}</small><strong>{body}</strong></div>)}</div></>;
    case 'tracks':
      return <><h2>{slide.title}</h2><div className="jev-slide-tracks-list">{slide.tracks.map(([number, title, body]) => <div key={number}><span>{number}</span><div><strong>{title}</strong><p>{body}</p></div></div>)}</div></>;
    case 'deliver':
      return <><h2><Multiline value={slide.title} /></h2><div className="jev-slide-deliver-list">{slide.items.map(([number, body]) => <div key={number}><span>{number}</span><strong>{body}</strong></div>)}</div></>;
    case 'timeline':
      return <><h2>{slide.title}</h2><div className="jev-slide-timeline-grid">{slide.timeline.map(([time, body]) => <div key={time}><time>{time}</time><strong>{body}</strong></div>)}</div></>;
    case 'showcase':
      return <><h2><Multiline value={slide.title} /></h2><p className="jev-slide-lead">{slide.lead}</p><div className="jev-slide-scores">{slide.scores.map(([score, label]) => <div key={label}><strong>{score}</strong><span>{label}</span></div>)}</div></>;
    case 'closing':
      return <div className="jev-slide-closing-layout"><h2>{slide.title}</h2><p className="jev-slide-lead">{slide.lead}</p><div className="jev-slide-closing-footer"><div><strong>{slide.detail}</strong><span>{slide.secondary}</span></div><Link href="/events/jev">{slide.action} ↗</Link></div></div>;
    default:
      return null;
  }
}

function indexFromHash(total) {
  const match = /^#slide-(\d+)$/.exec(window.location.hash);
  return match ? Math.min(Math.max(Number(match[1]) - 1, 0), total - 1) : 0;
}

export default function JevSlides() {
  const { locale } = usePreferences();
  const t = jevSlidesCopy[locale];
  const deckRef = useRef(null);
  const touchStart = useRef(null);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const goTo = useCallback((next) => {
    const bounded = Math.min(Math.max(next, 0), jevSlidesCopy.zh.slides.length - 1);
    setIndex(bounded);
    window.history.replaceState(null, '', `#slide-${bounded + 1}`);
  }, []);

  useEffect(() => {
    const readHash = () => setIndex(indexFromHash(jevSlidesCopy.zh.slides.length));
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); goTo(index + 1); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); goTo(index - 1); }
      if (event.key === 'Home') { event.preventDefault(); goTo(0); }
      if (event.key === 'End') { event.preventDefault(); goTo(t.slides.length - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, index, t.slides.length]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(document.fullscreenElement === deckRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await deckRef.current?.requestFullscreen();
    } catch { /* Browser may disallow fullscreen; slides remain usable. */ }
  }

  function onTouchEnd(event) {
    if (!touchStart.current) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.current.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) goTo(index + (deltaX < 0 ? 1 : -1));
    touchStart.current = null;
  }

  return <div className="jev-deck" ref={deckRef}>
    <header className="jev-deck-toolbar"><Link href="/events/jev">← {t.back}</Link><span>JEV / HACKATHON 002</span><button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? t.exitFullscreen : t.fullscreen}>{fullscreen ? '↙' : '⛶'} <span>{fullscreen ? t.exitFullscreen : t.fullscreen}</span></button></header>
    <main className="jev-deck-stage" onTouchStart={event => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={onTouchEnd} aria-label={locale === 'zh' ? '黑客松活动演示文稿' : 'Hackathon presentation'}>
      {t.slides.map((slide, slideIndex) => <section key={slide.kind} className={`jev-slide jev-slide-${slide.kind}`} hidden={slideIndex !== index} aria-label={`${t.page} ${slideIndex + 1}: ${slide.title.replace('\n', ' ')}`}>
        {slide.kind !== 'cover' && <div className="jev-slide-heading"><span>{slide.eyebrow}</span><span>JEV / 002</span></div>}
        <div className="jev-slide-content"><SlideBody slide={slide} t={t} locale={locale} /></div>
        {slide.foot && <p className="jev-slide-foot">{slide.foot}</p>}
        {slide.kind === 'timeline' && <p className="jev-slide-draft">{t.draft}</p>}
        {slide.kind === 'cover' && <span className="jev-slide-poster-note">{t.posterDetails}</span>}
      </section>)}
    </main>
    <nav className="jev-deck-controls" aria-label={locale === 'zh' ? '幻灯片导航' : 'Slide navigation'}><span className="jev-deck-hint">{t.navigationHint}</span><div className="jev-deck-progress" aria-hidden="true"><span style={{ width: `${(index + 1) / t.slides.length * 100}%` }} /></div><span className="jev-deck-counter" aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(t.slides.length).padStart(2, '0')}</span><button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t.previous}>←</button><button type="button" onClick={() => goTo(index + 1)} disabled={index === t.slides.length - 1} aria-label={t.next}>→</button></nav>
  </div>;
}
