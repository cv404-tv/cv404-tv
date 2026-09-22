"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Backdrop, Footer, Header } from "./site-shell";
import { usePreferences } from "./preferences";
import { CHANNELS, GAME_DURATION, ISSUE, LOCK_DURATION, advanceGame, formatFrequency, newGame, scoreGame, signalReading, startGame, tickGame, tune } from "../lib/signal-game";
import { signalCopy } from "../lib/signal-copy";
import { createSignalCard } from "../lib/signal-card";

function SignalScope({ game, reduced }) {
  const canvas = useRef(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const width = 800, height = 440;
    const reading = signalReading(game);
    const finished = ["captured", "won"].includes(game.phase);
    const strength = finished ? 1 : game.phase === "ready" ? 0.18 : reading.strength;
    const time = reduced ? 0 : game.roundTime;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = "#b8c9a914";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 40) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
    for (let y = 0; y < height; y += 40) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
    const noise = (1 - strength) * (reading.interference ? 75 : 45);
    // Three traces converge as the receiver gets closer to the carrier frequency.
    for (let line = 0; line < 3; line++) {
      context.beginPath();
      context.strokeStyle = line === 1 ? `rgba(206,225,169,${0.38 + strength * 0.5})` : "#9caf8150";
      context.lineWidth = line === 1 ? 2 : 1;
      for (let x = 0; x <= width; x += 2) {
        const envelope = Math.sin(x / width * Math.PI);
        const carrier = Math.sin(x / 38 - time * 2) * 36 * envelope;
        const distortion = (Math.sin(x * 1.7 + time * 14 + line * 5) + Math.cos(x * 0.27 - time * 9)) * noise;
        const y = 260 + carrier + distortion + (line - 1) * (1 - strength) * 55;
        if (x === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    }
    if (!reduced && !finished) {
      context.fillStyle = `rgba(203,219,175,${(1 - strength) * 0.1})`;
      for (let i = 0; i < 900; i++) context.fillRect(Math.random() * width, Math.random() * height, 2, 1);
    }
  }, [game, reduced]);
  return <canvas className="signal-scope" ref={canvas} width="800" height="440" aria-hidden="true" />;
}

export default function SignalGame() {
  const { locale } = usePreferences();
  const t = signalCopy[locale];
  const [game, setGame] = useState(newGame);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [best, setBest] = useState(0);
  const [sound, setSound] = useState(false);
  const [notice, setNotice] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [cardUrl, setCardUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const stage = useRef(null), dial = useRef(null), dialog = useRef(null), audio = useRef(null), drag = useRef(null), nextButton = useRef(null);
  const mounted = useRef(true);
  const currentGame = useRef(game);
  currentGame.current = game;
  const reading = signalReading(game);
  const active = game.phase === "playing" && !paused;
  const finished = game.phase === "won" || game.phase === "lost";
  const found = game.phase === "captured" || game.phase === "won";
  const score = scoreGame(game);
  const strength = found ? 1 : reading.strength;

  useEffect(() => {
    mounted.current = true;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    motion();
    media.addEventListener("change", motion);
    try { const value = Number(localStorage.getItem(`cv404-signal-best-${ISSUE}`)); if (Number.isFinite(value) && value > 0) setBest(value); } catch {}
    const hidden = () => { if (document.hidden && currentGame.current.phase === "playing") setPaused(true); };
    document.addEventListener("visibilitychange", hidden);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && currentGame.current.phase === "playing") setPaused(true);
    });
    if (stage.current) observer.observe(stage.current);
    return () => {
      mounted.current = false;
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", hidden);
      observer.disconnect();
      audio.current?.context.close().catch(() => {});
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    let frame, last = performance.now();
    const tick = now => {
      if (now - last >= 1000 / 30) {
        const elapsed = (now - last) / 1000;
        last = now;
        if (!document.hidden) setGame(previous => {
          let next = previous, remaining = elapsed;
          // Integrate drift in small steps even if the browser drops a frame.
          while (remaining > 0 && next.phase === "playing") {
            const step = Math.min(remaining, 0.05);
            next = tickGame(next, step);
            remaining -= step;
          }
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  useEffect(() => {
    if (game.phase === "won") {
      setBest(previous => {
        const value = Math.max(previous, score);
        try { localStorage.setItem(`cv404-signal-best-${ISSUE}`, String(value)); } catch {}
        return value;
      });
    }
    if (["captured", "won", "lost"].includes(game.phase)) nextButton.current?.focus({ preventScroll: true });
  }, [game.phase, score]);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.gain.gain.setTargetAtTime(sound && active ? 0.012 + strength * 0.014 : 0, a.context.currentTime, 0.08);
    a.osc.frequency.setTargetAtTime(150 + strength * 440, a.context.currentTime, 0.06);
  }, [sound, active, strength]);

  useEffect(() => {
    if (!cardUrl) return;
    dialog.current?.showModal();
    return () => URL.revokeObjectURL(cardUrl);
  }, [cardUrl]);

  const changeTuning = useCallback(value => setGame(previous => tune(previous, value)), []);
  function begin() {
    setNotice(""); setManualLink(""); setPaused(false); setGame(startGame());
    dial.current?.focus({ preventScroll: true });
    stage.current?.scrollIntoView({ block: "start", behavior: reduced ? "instant" : "smooth" });
  }
  function nextChannel() {
    setGame(advanceGame); setPaused(false);
    dial.current?.focus({ preventScroll: true });
  }
  function keyTuning(event) {
    const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
    if (!(event.key in steps) && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    changeTuning(event.key === "Home" ? 0 : event.key === "End" ? 100 : game.tuning + steps[event.key]);
  }
  async function toggleSound() {
    try {
      if (!audio.current) {
        const context = new AudioContext();
        const gain = context.createGain(), osc = context.createOscillator();
        gain.gain.value = 0; osc.type = "sine"; osc.connect(gain); gain.connect(context.destination); osc.start();
        audio.current = { context, gain, osc };
      }
      await audio.current.context.resume();
      if (mounted.current) setSound(value => !value);
    } catch { setNotice("soundFailed"); }
  }
  async function copyLink() {
    const url = `${location.origin}/`;
    try { await navigator.clipboard.writeText(url); setManualLink(""); setNotice("copied"); }
    catch { setManualLink(url); setNotice("copyFailed"); }
  }
  async function exportCard() {
    setExporting(true); setNotice("");
    try {
      const blob = await createSignalCard(game, t, locale, location.origin);
      if (mounted.current) setCardUrl(URL.createObjectURL(blob));
    } catch { if (mounted.current) setNotice("exportFailed"); }
    finally { if (mounted.current) setExporting(false); }
  }
  const status = reading.interference ? t.interference : reading.locked ? t.locking : t.weak;

  return <>
    <a className="skip-link" href="#signal-game">{t.title}</a>
    <Backdrop /><Header game />
    <main className="signal-page">
      <Link className="signal-event-guide" href="/events/jev">
        <span className="signal-event-issue" aria-hidden="true">02</span>
        <span className="signal-event-copy">
          <strong>{locale === "zh" ? "第二期 Jev 黑客松" : "Jev Hackathon · Edition 02"}</strong>
          <span>{locale === "zh" ? "让 AI 做出下一步决定 · 报名意向征集中" : "Give AI a next move · Expressions of interest open"}</span>
        </span>
        <span className="signal-event-cta">{locale === "zh" ? "了解并报名" : "Explore & apply"}<span aria-hidden="true">↗</span></span>
      </Link>
      <div className="signal-intro">
        <div><p className="signal-kicker"><span />{t.eyebrow}</p><h1>{t.title}<span>SIGNAL SEARCH</span></h1><p className="signal-lede">{t.lead}</p></div>
        <div className="signal-intro-note"><p>{t.description}</p><Link href="/events">{t.back} ↗</Link></div>
      </div>

      <section className="tv-stage signal-machine" data-powered="true" ref={stage} aria-label={t.title} id="signal-game">
        <div className="television">
          <div className="cabinet-vents" aria-hidden="true" />
          <div className="tv-topline"><span>CV404 / SIGNAL RECEIVER</span><span>EXPERIMENT NO.001</span><span>FM · 88—108</span></div>
          <div className="tv-main">
            <div className="picture-surround"><div className={`screen signal-screen ${found ? "signal-found" : ""}`}>
              <SignalScope game={game} reduced={reduced} />
              <div className="crt-surface" aria-hidden="true" />
              <div className="signal-screen-top"><span><i />{found ? "SIGNAL FOUND" : "LIVE FREQUENCY"}</span><span>CH.0{game.round + 1}</span></div>
              {game.phase === "ready" ? <div className="signal-screen-content signal-ready">
                <span className="signal-screen-eyebrow">NO SIGNAL. YET.</span><div className="signal-404" aria-hidden="true">404<span>↗</span></div><h2>{t.readyTitle}</h2><p>{t.readyBody}</p><button className="signal-button" onClick={begin}>{t.start}<span>↗</span></button><small>{t.duration}</small>
              </div> : paused && game.phase === "playing" ? <div className="signal-screen-content signal-overlay"><span className="signal-screen-eyebrow">ON HOLD</span><h2>{t.paused}</h2><p>{t.pauseNote}</p><button className="signal-button" onClick={() => { setPaused(false); dial.current?.focus({ preventScroll: true }); }}>{t.resume} ↗</button></div> : finished ? <div className="signal-screen-content signal-result">
                <span className="signal-screen-eyebrow">{game.phase === "won" ? "TRANSMISSION COMPLETE" : "TRANSMISSION LOST"}</span><div className="signal-result-word">{game.phase === "won" ? "FOUND." : "404."}</div><h2>{game.phase === "won" ? t.won : t.lost}</h2><p>{game.phase === "won" ? t.wonBody : t.lostBody}</p>
                <div className="signal-result-stats"><div><small>{t.score}</small><strong>{String(score).padStart(4, "0")}</strong></div><div><small>{t.time}</small><strong>{game.elapsed.toFixed(1)}<em>s</em></strong></div></div>
                <div className="signal-result-actions">{game.phase === "won" && <button ref={nextButton} className="signal-button" onClick={exportCard} disabled={exporting}>{exporting ? t.busy : t.save} ↗</button>}<button ref={game.phase === "lost" ? nextButton : undefined} className={game.phase === "lost" ? "signal-button" : "signal-text-button"} onClick={begin}>{t.retry}</button></div>
              </div> : game.phase === "captured" ? <div className="signal-screen-content signal-captured"><span className="signal-screen-eyebrow">{t.captured} / 0{game.round + 1}</span><div className="signal-result-word">{CHANNELS[game.round].word}.</div><h2>{t.stories[game.round].title}</h2><p>{t.stories[game.round].body}</p><button ref={nextButton} className="signal-button" onClick={nextChannel}>{t.next} ↗</button></div> : <div className="signal-screen-content signal-playing">
                <span className="signal-screen-eyebrow">{t.rounds[game.round]}</span><div className="signal-hidden-word" style={{ opacity: 0.12 + strength * 0.88, filter: `blur(${(1 - strength) * 5}px)`, textShadow: reduced ? "none" : `${(1 - strength) * 12}px 0 #c8383260` }}>{CHANNELS[game.round].word}<span>.</span></div>
                <p className="signal-round-hint">{t.roundHints[game.round]}</p>
                <div className="signal-lock"><span>{status}</span><strong>{Math.round(game.lock / LOCK_DURATION * 100)}%</strong><progress aria-label={t.progress} value={game.lock} max={LOCK_DURATION} /></div>
              </div>}
              <div className="signal-screen-bottom"><span>GOOD IDEAS ON AIR.</span><span>{game.phase === "won" ? "03 / 03 FOUND" : `VOL.${ISSUE} · ${t.issue}`}</span></div>
            </div></div>

            <aside className="tv-controls signal-controls" aria-label={t.frequency}>
              <div className="signal-timer"><span>{t.remaining}</span><strong className={GAME_DURATION - game.elapsed < 10 ? "signal-time-low" : ""}>{Math.max(0, GAME_DURATION - game.elapsed).toFixed(1)}<small>s</small></strong></div>
              <div className="signal-dial-group"><span className="control-label">FINE TUNING</span><div className="tuner-scale"><div className="channel-knob signal-knob" ref={dial} role="slider" tabIndex={0} aria-label={t.knob} aria-valuemin={88} aria-valuemax={108} aria-valuenow={Number(formatFrequency(game.tuning))} aria-valuetext={`${formatFrequency(game.tuning)} MHz`} style={{ "--knob-angle": `${-135 + game.tuning * 2.7}deg` }} onKeyDown={keyTuning}
                onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.focus({ preventScroll: true }); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, tuning: game.tuning }; }}
                onPointerMove={event => { if (drag.current) changeTuning(drag.current.tuning + (event.clientX - drag.current.x - event.clientY + drag.current.y) * 0.45); }}
                onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}><span /></div></div><output className="signal-frequency">{formatFrequency(game.tuning)} <small>MHz</small></output></div>
              <div className="signal-meter"><label htmlFor="signal-strength">{t.strength}<b>{Math.round(strength * 100)}%</b></label><meter id="signal-strength" min="0" max="1" value={strength} /><div className="signal-meter-bars" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} data-lit={i / 16 < strength} />)}</div></div>
              <div className="signal-hardware-actions"><button onClick={toggleSound} aria-pressed={sound}>{sound ? t.soundOff : t.soundOn}</button><button disabled={game.phase !== "playing"} onClick={() => setPaused(value => !value)}>{paused ? t.resume : t.pause}</button></div>
              <div className="speaker" aria-hidden="true" /><span className="tv-model">CV404 <b>FINDER</b></span>
            </aside>
          </div>
          <div className="tv-chin"><span><i /> CV404 · SOLID STATE</span><span>KEEP YOUR CURIOSITY ON.</span></div>
        </div>
      </section>

      <div className="signal-tuning-strip"><div><label htmlFor="signal-tuning">{t.frequency}</label><span>{t.tuning}</span></div><div className="signal-range-wrap"><span>88</span><input id="signal-tuning" type="range" min="0" max="100" step="0.5" value={game.tuning} onChange={event => changeTuning(Number(event.target.value))} aria-valuetext={`${formatFrequency(game.tuning)} MHz`} /><span>108 MHz</span></div></div>
      <ol className="signal-channel-strip" aria-label={t.archive}>{CHANNELS.map((channel, i) => <li key={channel.word} data-found={game.captures.length > i} data-current={game.round === i}><span>0{i + 1}</span><div><strong>{channel.word}</strong><small>{t.stories[i].category}</small></div><span className="signal-channel-state">{game.captures.length > i ? t.found : t.waiting}</span></li>)}</ol>
      <div className="signal-after"><span>{best > 0 ? `${t.best} · ${best}` : "NO DOWNLOAD. JUST TUNE IN."}</span><button className="signal-text-button" onClick={copyLink}>{t.copy} ↗</button></div>
      <div className="signal-notice" role="status">{notice ? t[notice] : ""}</div>
      {manualLink && <input className="signal-manual-link" aria-label={t.copy} value={manualLink} readOnly onFocus={event => event.target.select()} />}
      <div className="sr-only" role="status">{paused ? t.paused : game.phase === "playing" ? t.rounds[game.round] : game.phase === "captured" ? `${t.captured}: ${t.stories[game.round].title}` : game.phase === "won" ? t.won : game.phase === "lost" ? t.lost : t.readyBody}</div>
      <div className="signal-instructions">{t.instructions.map((line, i) => <p key={line}><span>0{i + 1}</span>{line}</p>)}</div>
      <section className="signal-stories" aria-labelledby="signal-stories-title"><div className="signal-stories-heading"><span className="signal-kicker">{t.archive} / VOL.{ISSUE}</span><h2 id="signal-stories-title">{t.storiesHeading}</h2><p>{t.storiesNote}</p></div><div className="signal-story-grid">{CHANNELS.map((channel, i) => <Link className="signal-story" href={channel.href} key={channel.word}><span className="signal-story-meta">0{i + 1} / {t.stories[i].category}<span>↗</span></span><strong>{channel.word}<span>.</span></strong><h3>{t.stories[i].title}</h3><p>{t.stories[i].body}</p><span className="signal-story-cta">{t.read} ↗</span></Link>)}</div></section>
      <noscript>{t.noScript}</noscript>
    </main>
    <Footer />
    <dialog ref={dialog} className="signal-share-dialog" aria-labelledby="signal-card-title" onClose={() => setCardUrl("")} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current.close(); } }}><div><h2 id="signal-card-title">{t.cardTitle}</h2><button aria-label={t.close} onClick={() => dialog.current.close()}>×</button></div>{cardUrl && <img src={cardUrl} width="1080" height="1440" alt={t.cardTitle} />}<p>{t.cardHint}</p><a className="signal-button" href={cardUrl || undefined} download={`cv404-signal-${score}.png`}>{t.download} ↓</a></dialog>
  </>;
}
