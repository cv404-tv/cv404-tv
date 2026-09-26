'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePreferences } from './preferences';
import { BrandMark } from './brand-mark';
import { jevSlidesCopy } from '../lib/jev-slides-copy';

function Multiline({ value }) {
  return value.split('\n').map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>);
}

function DiagramGlyph({ kind }) {
  const shared = { viewBox: '0 0 80 80', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (kind === 'input') return <svg {...shared}><rect x="18" y="13" width="44" height="54" rx="3" /><path d="M27 28h26M27 39h26M27 50h15" /></svg>;
  if (kind === 'judgment') return <svg {...shared}><path d="m40 9 29 31-29 31L11 40 40 9Z" /><path d="M40 27v12m0 0-11 12m11-12 11 12" /><circle cx="29" cy="54" r="2" fill="currentColor" stroke="none" /><circle cx="51" cy="54" r="2" fill="currentColor" stroke="none" /></svg>;
  if (kind === 'action') return <svg {...shared}><rect x="13" y="17" width="54" height="46" rx="3" /><path d="m23 32 8 8-8 8m17 0h17M44 28h13" /></svg>;
  return null;
}

function ModelArtwork({ slide, mobile = false }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (mobile) return <svg className="jev-model-art jev-model-art-mobile" viewBox="0 0 350 520" role="img" aria-label={slide.diagramAlt}>
    <title>{slide.diagramAlt}</title>
    <defs><radialGradient id="jev-model-glow-mobile"><stop stopColor="#ff8739" stopOpacity=".28" /><stop offset="1" stopColor="#ff8739" stopOpacity="0" /></radialGradient></defs>
    <circle cx="175" cy="210" r="115" fill="url(#jev-model-glow-mobile)" />
    <path d="M175 95v40M175 282v42M175 324H67v29M175 324v29m0-29h108v29" className="jev-model-wire" />
    <path d="m169 128 6 7 6-7M61 346l6 7 6-7m102-7 6 7 6-7m102-7 6 7 6-7" className="jev-model-arrow" />
    <g className="jev-model-art-input"><rect x="139" y="16" width="72" height="66" rx="5" {...common} /><path d="M152 35h46m-46 12h46m-46 12h29" {...common} /><text x="175" y="110" textAnchor="middle" className="jev-model-art-caption">{slide.inputHint}</text></g>
    <g className="jev-model-art-core"><circle cx="175" cy="210" r="72" /><circle cx="175" cy="210" r="57" className="jev-model-core-inner" /><text x="175" y="205" textAnchor="middle" className="jev-model-art-jevcopy">JEV</text><text x="175" y="234" textAnchor="middle" className="jev-model-art-caption">{slide.coreLabel}</text></g>
    <g className="jev-model-art-output" transform="translate(67 392)"><path d="M-25-18 0-34l25 16M-25-18v28M0-34v44M25-18v28" {...common} /><circle cy="10" r="5" /><circle cx="-25" cy="10" r="4" /><circle cx="25" cy="10" r="4" /><text y="48" textAnchor="middle" className="jev-model-art-name">Choice</text><text y="70" textAnchor="middle" className="jev-model-art-caption">{slide.artOutputs[0]}</text></g>
    <g className="jev-model-art-output" transform="translate(175 392)"><path d="M-30 13v-16m15 16v-30M0 13v-42m15 42v-23m15 23v-35" {...common} /><path d="M-36 15h72" {...common} /><text y="48" textAnchor="middle" className="jev-model-art-name">Score</text><text y="70" textAnchor="middle" className="jev-model-art-caption">{slide.artOutputs[1]}</text></g>
    <g className="jev-model-art-output" transform="translate(283 392)"><path d="M-30 4h60M-30 4c13-31 29-31 42 0" {...common} /><circle cx="12" cy="4" r="6" /><text y="48" textAnchor="middle" className="jev-model-art-name">Noul</text><text y="70" textAnchor="middle" className="jev-model-art-caption">{slide.artOutputs[2]}</text></g>
  </svg>;
  return <svg className="jev-model-art jev-model-art-desktop" viewBox="0 0 1000 390" role="img" aria-label={slide.diagramAlt}>
    <title>{slide.diagramAlt}</title>
    <defs><radialGradient id="jev-model-glow-desktop"><stop stopColor="#ff8739" stopOpacity=".27" /><stop offset="1" stopColor="#ff8739" stopOpacity="0" /></radialGradient></defs>
    <circle cx="455" cy="195" r="170" fill="url(#jev-model-glow-desktop)" />
    <path d="M196 195h113M585 195h50M635 65v260M635 65h85m-85 130h85m-85 130h85" className="jev-model-wire" />
    <path d="m300 189 9 6-9 6m411-142 9 6-9 6m-9 124 9 6-9 6m-9 124 9 6-9 6" className="jev-model-arrow" />
    <g className="jev-model-art-input"><rect x="62" y="110" width="102" height="119" rx="6" {...common} /><path d="M80 139h66m-66 19h66m-66 19h43" {...common} /><text x="113" y="267" textAnchor="middle" className="jev-model-art-caption">{slide.inputHint}</text></g>
    <g className="jev-model-art-core"><circle cx="455" cy="195" r="126" /><circle cx="455" cy="195" r="99" className="jev-model-core-inner" /><text x="455" y="190" textAnchor="middle" className="jev-model-art-jevcopy">JEV</text><text x="455" y="233" textAnchor="middle" className="jev-model-art-caption">{slide.coreLabel}</text></g>
    <g className="jev-model-art-output" transform="translate(800 65)"><path d="M-25-12 0-28l25 16M-25-12v25M0-28v41M25-12v25" {...common} /><circle cy="13" r="5" /><circle cx="-25" cy="13" r="4" /><circle cx="25" cy="13" r="4" /><text x="50" y="3" className="jev-model-art-name">Choice</text><text x="50" y="29" className="jev-model-art-caption">{slide.artOutputs[0]}</text></g>
    <g className="jev-model-art-output" transform="translate(800 195)"><path d="M-28 19v-22m14 22v-37M0 19v-49m14 49v-28m14 28v-42M-34 21h68" {...common} /><text x="50" y="3" className="jev-model-art-name">Score</text><text x="50" y="29" className="jev-model-art-caption">{slide.artOutputs[1]}</text></g>
    <g className="jev-model-art-output" transform="translate(800 325)"><path d="M-30 4h60M-30 4c13-31 29-31 42 0" {...common} /><circle cx="12" cy="4" r="6" /><text x="50" y="3" className="jev-model-art-name">Noul</text><text x="50" y="29" className="jev-model-art-caption">{slide.artOutputs[2]}</text></g>
  </svg>;
}

const partnerMarks = [
  '/assets/jev-partner-hackers-and-painters.png',
  '/assets/jev-partner-your-space.png',
];
const hostXiaohongshuUrl = 'https://www.xiaohongshu.com/user/profile/6018053f000000000101d1d4';

function SlideBody({ slide, t, locale }) {
  switch (slide.kind) {
    case 'cover':
      return <div className={`jev-slide-cover-layout ${locale === 'en' ? 'is-en' : ''}`}>
        <div className="jev-slide-cover-copy"><div className="jev-slide-cover-brand" aria-label={locale === 'zh' ? '云谷404' : 'Cloud Valley 404'}><BrandMark /><strong>{locale === 'zh' ? '云谷' : 'CLOUD VALLEY'}<span>404</span></strong></div><h1><Multiline value={slide.title} /></h1><p className="jev-slide-cover-tagline">{slide.lead}</p><div className="jev-slide-cover-details"><strong>{slide.detail}</strong><span>{slide.secondary}</span></div></div>
        <div className="jev-slide-cover-art" aria-hidden="true" />
        <aside className="jev-slide-cover-join" aria-label={locale === 'zh' ? '扫码加入活动群' : 'Scan to join the event group'}>
          <span>{locale === 'zh' ? '扫码加入活动群' : 'SCAN TO JOIN THE GROUP'}</span>
          <div className="jev-slide-cover-qr">
            <img src="/assets/jev-hackathon-group-qr.png" alt={locale === 'zh' ? '第二期活动微信群二维码' : 'Second edition WeChat group QR code'} />
          </div>
        </aside>
      </div>;
    case 'host':
      return <div className="jev-host-layout">
        <div className="jev-host-copy">
          <div className="jev-host-intro">
            <img className="jev-host-avatar" src="/assets/jev-host-avatar.png" alt={slide.avatarAlt} />
            <div className="jev-host-intro-copy"><p className="jev-host-role">{slide.role}</p><h2>{slide.title}</h2></div>
          </div>
          <div className="jev-host-experience">{slide.experience.map(([years, label]) => <div key={label}><strong>{years}</strong><span>{label}</span></div>)}</div>
          <div className="jev-host-achievements">{slide.achievements.map(([count, label]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}</div>
        </div>
        <a className="jev-host-follow" href={hostXiaohongshuUrl} target="_blank" rel="noopener noreferrer" aria-label={slide.followLabel}>
          <span className="jev-host-qr"><img src="/assets/jev-host-xiaohongshu-qr.png" alt={slide.qrAlt} /></span>
          <strong>{slide.followTitle}</strong>
          <span>{slide.followHint}</span>
        </a>
      </div>;
    case 'partners':
      return <div className="jev-slide-partners-layout">
        <h2>{slide.title}</h2>
        <div className="jev-partner-group jev-partner-organizer"><span className="jev-partner-role">{slide.organizerLabel}</span><div className="jev-partner-organizer-grid">
          <div className="jev-partner-organizer-mark"><img src="/assets/jev-partner-cloud404.png" alt={slide.organizers[0]} /></div>
          <div className="jev-partner-organizer-mark"><img src="/assets/jev-partner-ai-workshop.png" alt={slide.organizers[1]} /></div>
        </div></div>
        <div className="jev-partner-group jev-partner-coorganizers"><span className="jev-partner-role">{slide.coorganizerLabel}</span><div className="jev-partner-grid">
          {slide.coorganizers.map((name, index) => <div className={`jev-partner-mark jev-partner-mark-${index}`} key={name}><img src={partnerMarks[index]} alt={name} /></div>)}
          <aside className="jev-partner-community" aria-label={locale === 'zh' ? '魔搭社区及二维码' : 'ModelScope community and QR code'}>
            <div className="jev-partner-community-mark"><img src="/assets/jev-partner-modelscope.ico" alt="" /><strong>{locale === 'zh' ? '魔搭社区' : 'ModelScope'}</strong></div>
            <div className="jev-partners-community-qr"><img src="/assets/modelscope-community-qr.png" alt={locale === 'zh' ? '魔搭社区二维码' : 'ModelScope community QR code'} /></div>
          </aside>
        </div></div>
      </div>;
    case 'origin':
      return <div className="jev-origin-layout">
        <div className="jev-origin-copy">
          <h2>{slide.title}</h2>
          <p className="jev-origin-context">{slide.context}</p>
          <p className="jev-origin-observation">{slide.observation}</p>
          <p className="jev-origin-idea">{slide.idea}</p>
          <a className="jev-origin-source" href={slide.sourceUrl} target="_blank" rel="noopener noreferrer">{slide.source} ↗</a>
        </div>
        <div className="jev-origin-mark" aria-hidden="true"><strong>JEV</strong><span>{slide.namesake}</span></div>
      </div>;
    case 'mission':
      return <div className="jev-mission-layout">
        <div className="jev-mission-intro"><h2><Multiline value={slide.title} /></h2><p>{slide.lead}</p></div>
        <ol className="jev-mission-flow" aria-label={slide.flowLabel}>
          {slide.stages.map(([kind, name, body], index) => <li key={kind}>
            <span className="jev-mission-number">0{index + 1}</span>
            <div className="jev-mission-glyph"><DiagramGlyph kind={kind} /></div>
            <strong>{name}</strong><span>{body}</span>
          </li>)}
        </ol>
        <div className="jev-mission-fallback"><span aria-hidden="true">↳</span>{slide.fallback}</div>
      </div>;
    case 'model':
      return <div className="jev-model-layout">
        <h2>{slide.title}</h2>
        <ModelArtwork slide={slide} />
        <ModelArtwork slide={slide} mobile />
        <p className="jev-model-note">{slide.sampleNote}</p>
      </div>;
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
      </section>)}
    </main>
    <nav className="jev-deck-controls" aria-label={locale === 'zh' ? '幻灯片导航' : 'Slide navigation'}><span className="jev-deck-hint">{t.navigationHint}</span><div className="jev-deck-progress" aria-hidden="true"><span style={{ width: `${(index + 1) / t.slides.length * 100}%` }} /></div><span className="jev-deck-counter" aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(t.slides.length).padStart(2, '0')}</span><button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label={t.previous}>←</button><button type="button" onClick={() => goTo(index + 1)} disabled={index === t.slides.length - 1} aria-label={t.next}>→</button></nav>
  </div>;
}
