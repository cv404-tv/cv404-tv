"use client";
import Link from "next/link";
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { Backdrop, Header, Footer } from "./site-shell";
import { usePreferences } from "./preferences";
import { initTVEffects } from "../src/tv-effects";
import { createStaticEffect } from "../lib/static-effect";

const channels = ["home", "works", "events", "about"];
const normalize = (value) => (channels.includes(value) ? value : "home");
function PowerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M12 3v8M7 6a8 8 0 1 0 10 0" />
    </svg>
  );
}
function SplitTitle({ lines }) {
  return (
    <>
      {lines[0]}
      <br />
      {lines[1]}
    </>
  );
}

export default function Television() {
  const { t } = usePreferences();
  const [current, setCurrent] = useState("home");
  const [phase, setPhase] = useState("off");
  const [reduced, setReduced] = useState(false);
  const [sound, setSound] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [foreground, setForeground] = useState(true);
  const powered = phase === "opening" || phase === "on";
  const picture = useRef(null),
    dialog = useRef(null),
    snow = useRef(null);
  const effects = useRef(null),
    staticEffect = useRef(null),
    audio = useRef(null);
  const tabs = useRef([]);
  const currentRef = useRef(current);
  currentRef.current = current;
  const sceneState = useRef({ powered, channel: current });
  sceneState.current = { powered, channel: current };

  useEffect(() => {
    setCurrent(normalize(location.hash.slice(1)));
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const motionChange = () => {
      setReduced(media.matches);
      if (media.matches) staticEffect.current?.stop();
    };
    media.addEventListener("change", motionChange);
    effects.current = initTVEffects(media);
    effects.current.setState(sceneState.current);
    staticEffect.current = createStaticEffect(snow.current, media);
    const onVisibility = () => {
      setForeground(!document.hidden);
      if (document.hidden) staticEffect.current?.stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      media.removeEventListener("change", motionChange);
      document.removeEventListener("visibilitychange", onVisibility);
      effects.current?.dispose();
      effects.current = null;
      staticEffect.current?.stop();
      staticEffect.current = null;
      audio.current?.context.close().catch(() => {});
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    effects.current?.setState({ powered, channel: current });
    if (!powered) staticEffect.current?.stop();
  }, [powered, current]);

  useLayoutEffect(() => {
    if (phase !== "opening" && phase !== "closing") return;
    const opening = phase === "opening";
    const settled = opening ? "on" : "off";
    if (reduced || !foreground || !picture.current?.animate) {
      setPhase(settled);
      return;
    }
    const keyframes = opening
      ? [
          { transform: "scale(.08,.006)", opacity: 0.3, offset: 0 },
          { transform: "scale(1,.006)", opacity: 0.8, offset: 0.2 },
          { transform: "scale(1,1)", opacity: 1, offset: 1 },
        ]
      : [
          { transform: "scale(1,1)", opacity: 1, offset: 0 },
          { transform: "scale(1,.006)", opacity: 0.8, offset: 0.72 },
          { transform: "scale(.02,.006)", opacity: 0, offset: 1 },
        ];
    const animation = picture.current.animate(keyframes, {
      duration: opening ? 540 : 360,
      easing: "cubic-bezier(.22,.7,.2,1)",
      fill: "both",
    });
    let cancelled = false;
    animation.finished
      .then(() => {
        if (!cancelled)
          setPhase((value) => (value === phase ? settled : value));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      animation.cancel();
    };
  }, [phase, reduced, foreground]);

  useEffect(() => {
    if (audio.current)
      audio.current.gain.gain.setTargetAtTime(
        sound && powered && foreground ? 0.035 : 0,
        audio.current.context.currentTime,
        0.2,
      );
  }, [sound, powered, foreground]);

  const selectChannel = useCallback(
    (value, writeHash = true) => {
      const next = normalize(value);
      if (next !== currentRef.current && powered) staticEffect.current?.play();
      currentRef.current = next;
      setCurrent(next);
      if (!powered) setPhase("opening");
      if (writeHash && location.hash !== `#${next}`) location.hash = next;
    },
    [powered],
  );
  useEffect(() => {
    const hashChange = () => {
      const next = normalize(location.hash.slice(1));
      if (next !== currentRef.current) selectChannel(next, false);
    };
    const onKey = (event) => {
      if (
        dialog.current?.open ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) ||
        event.target.isContentEditable
      )
        return;
      const onTab = event.target.getAttribute("role") === "tab";
      if (
        !["ArrowLeft", "ArrowRight"].includes(event.key) &&
        !(onTab && ["Home", "End"].includes(event.key))
      )
        return;
      event.preventDefault();
      let index =
        (channels.indexOf(currentRef.current) +
          (event.key === "ArrowLeft" ? -1 : 1) +
          4) %
        4;
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = 3;
      selectChannel(channels[index]);
      if (onTab) tabs.current[index]?.focus();
    };
    window.addEventListener("hashchange", hashChange);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", hashChange);
      document.removeEventListener("keydown", onKey);
    };
  }, [selectChannel]);
  async function toggleSound() {
    try {
      if (!audio.current) {
        const context = new AudioContext(),
          gain = context.createGain();
        gain.gain.value = 0;
        gain.connect(context.destination);
        [130.81, 196, 261.63].forEach((frequency) => {
          const oscillator = context.createOscillator();
          oscillator.frequency.value = frequency;
          oscillator.connect(gain);
          oscillator.start();
        });
        audio.current = { context, gain };
      }
      await audio.current.context.resume();
      setSound((value) => !value);
      setAudioError(false);
    } catch {
      setAudioError(true);
    }
  }
  const join = () => dialog.current?.showModal();
  const panelProps = (name) => ({
    id: `panel-${name}`,
    role: "tabpanel",
    "aria-labelledby": `tab-${name}`,
    hidden: current !== name,
  });
  const transitional = phase === "opening" || phase === "closing";

  return (
    <>
      <a className="skip-link" href="#television">
        {t.skip}
      </a>
      <Backdrop />
      <Header onHome={() => selectChannel("home")} />
      <main>
        <div className="intro">
          <span className="broadcast-dot" />
          <p>{t.intro}</p>
          <span className="intro-en">GOOD IDEAS ON AIR</span>
        </div>
        <section className="tv-stage" aria-label={t.tv}>
          <div className="tv-aerial" aria-hidden="true">
            <i />
            <i />
            <b />
          </div>
          <div className="television glass" id="television" tabIndex={-1}>
            <div className="tv-topline">
              <span>CV404 TV</span>
              <span>INDEPENDENT CREATOR TELEVISION</span>
              <span className="tiny-signal">▂▃▅▇</span>
            </div>
            <div className="tv-main">
              <div
                className={`screen${powered ? "" : " is-off"}${transitional ? " power-transition" : ""}`}
                id="screen"
                data-channel={current}
              >
                <canvas
                  ref={snow}
                  id="channel-snow"
                  className="channel-snow"
                  width="224"
                  height="128"
                  aria-hidden="true"
                  hidden
                />
                <div
                  ref={picture}
                  className="broadcast-picture"
                  id="broadcast-picture"
                  hidden={phase === "off"}
                  inert={!powered}
                  aria-hidden={!powered}
                >
                  <div className="screen-landscape" aria-hidden="true">
                    <div className="sun" />
                    <div className="mountain mountain-back" />
                    <div className="mountain mountain-front" />
                    <div className="screen-grain" />
                  </div>
                  <div className="screen-top">
                    <span id="channel-label">
                      CH.0{channels.indexOf(current) + 1} /{" "}
                      {t.channels[channels.indexOf(current)]}
                    </span>
                    <span className="screen-status">
                      <i /> {t.brand} TV
                    </span>
                  </div>
                  <div className="channel-panel" {...panelProps("home")}>
                    <div className="hero-content">
                      <span className="eyebrow">
                        A PLACE FOR PEOPLE WHO MAKE.
                      </span>
                      <h1>
                        {t.hero[0]}
                        <br />
                        {t.hero[1]} <em>404.</em>
                      </h1>
                      <p>
                        {t.heroBody[0]}
                        <br />
                        {t.heroBody[1]}
                      </p>
                      <button
                        className="screen-cta"
                        onClick={() => selectChannel("works")}
                      >
                        <span className="play-icon">▶</span>
                        {t.heroCta}
                        <span>↗</span>
                      </button>
                    </div>
                    <div className="glass-art" aria-hidden="true">
                      <div className="art-orbit orbit-one" />
                      <div className="art-orbit orbit-two" />
                      <span className="art-number">404</span>
                      <div className="art-spark">✳</div>
                      <span className="art-caption">
                        IDEAS FOUND.
                        <br />
                        MADE IN YUNGU.
                      </span>
                    </div>
                    <div className="screen-bottom">
                      <span>BUILD. PITCH. SHIP. SHOW.</span>
                      <span>
                        {t.motto} <i>↗</i>
                      </span>
                    </div>
                  </div>
                  <div
                    className="channel-panel content-panel"
                    {...panelProps("works")}
                  >
                    <span className="eyebrow">{t.worksLabel}</span>
                    <h2>
                      <SplitTitle lines={t.worksTitle} />
                    </h2>
                    <p className="panel-lede">{t.worksBody}</p>
                    <div className="work-slots">
                      {t.steps.map(([title, body], i) => (
                        <div key={i}>
                          <span>
                            0{i + 1} / {["BUILD", "PITCH", "SHIP"][i]}
                          </span>
                          <h3>{title}</h3>
                          <p>{body}</p>
                        </div>
                      ))}
                    </div>
                    <div className="panel-action">
                      <button className="screen-cta" onClick={join}>
                        {t.worksCta}
                        <span>↗</span>
                      </button>
                      <span className="quiet-note">{t.worksNote}</span>
                    </div>
                  </div>
                  <div
                    className="channel-panel content-panel"
                    {...panelProps("events")}
                  >
                    <span className="eyebrow">{t.eventsLabel}</span>
                    <div className="event-layout">
                      <div>
                        <span className="archive-label">{t.archive}</span>
                        <h2>
                          <SplitTitle lines={t.eventTitle} />
                        </h2>
                        <p className="panel-lede">{t.eventBody}</p>
                        <p className="event-meta">
                          08.29 · 14:00—16:00
                          <br />
                          {t.venue}
                        </p>
                        <Link className="screen-cta" href="/guide">
                          {t.eventCta}
                          <span>↗</span>
                        </Link>
                      </div>
                      <a
                        className="event-poster"
                        href="/assets/event-poster.png"
                        target="_blank"
                        rel="noopener"
                        aria-label={t.poster}
                      >
                        <img
                          src="/assets/event-poster.png"
                          alt={t.posterAlt}
                          loading="lazy"
                        />
                        <span>
                          VOL.001 <span>{t.poster} ↗</span>
                        </span>
                      </a>
                    </div>
                  </div>
                  <div
                    className="channel-panel content-panel"
                    {...panelProps("about")}
                  >
                    <span className="eyebrow">{t.aboutLabel}</span>
                    <h2>
                      <SplitTitle lines={t.aboutTitle} />
                    </h2>
                    <p className="panel-lede">{t.aboutBody}</p>
                    <div className="about-line">
                      <span>⌖ {t.roots}</span>
                      <span>↗ {t.makers}</span>
                    </div>
                    <button className="screen-cta" onClick={join}>
                      {t.aboutCta}
                      <span>↗</span>
                    </button>
                  </div>
                </div>
                <div className="standby" id="standby" hidden={phase !== "off"}>
                  <span>CV404</span>
                  <p>{t.standby}</p>
                  <button
                    className="screen-cta"
                    id="power-on"
                    onClick={() => {
                      setPhase("opening");
                      tabs.current[channels.indexOf(current)]?.focus({
                        preventScroll: true,
                      });
                    }}
                  >
                    {t.powerOn}
                    <span>⏻</span>
                  </button>
                </div>
              </div>
              <aside className="tv-controls" aria-label={t.controls}>
                <button
                  className="power-button control-button"
                  id="power"
                  aria-label={powered ? t.powerOff : t.powerOn}
                  aria-pressed={powered}
                  onClick={() => setPhase(powered ? "closing" : "opening")}
                >
                  <PowerIcon />
                </button>
                <span className={`power-led${powered ? "" : " off"}`} />
                <div className="control-divider" />
                <span className="control-label">CHANNEL</span>
                <button
                  className="channel-knob"
                  id="next-channel"
                  aria-label={t.next}
                  style={{
                    "--knob-angle": `${channels.indexOf(current) * 90 - 35}deg`,
                  }}
                  onClick={() =>
                    selectChannel(channels[(channels.indexOf(current) + 1) % 4])
                  }
                >
                  <span />
                </button>
                <span className="knob-caption">{t.knob}</span>
                <div className="speaker" aria-hidden="true" />
                <span className="tv-model">
                  MODEL
                  <br />
                  404—01
                </span>
              </aside>
            </div>
            <div className="tv-chin">
              <span>
                <i /> MADE FOR THE MAKERS
              </span>
              <span>
                {t.brand} <b>STEREO</b>
              </span>
            </div>
          </div>
          <div className="tv-stand" aria-hidden="true">
            <i />
            <b />
          </div>
        </section>
        <nav className="channel-dock glass" aria-label={t.channelNav}>
          <div className="dock-label">
            <span>{t.choose}</span>
            <small>TUNE INTO SOMETHING GOOD</small>
          </div>
          <div className="channel-tabs" role="tablist" aria-label={t.choose}>
            {channels.map((name, i) => (
              <button
                key={name}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`tab-${name}`}
                role="tab"
                aria-selected={current === name}
                aria-controls={`panel-${name}`}
                tabIndex={current === name ? 0 : -1}
                onClick={() => selectChannel(name)}
              >
                <span>0{i + 1}</span>
                {t.channels[i]}
              </button>
            ))}
          </div>
          <button
            className="sound-button control-button"
            id="sound"
            aria-label={sound ? t.soundOff : t.soundOn}
            aria-pressed={sound}
            onClick={toggleSound}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m11 5-5 4H3v6h3l5 4V5Z" />
              <path
                className="sound-waves"
                d="M15 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"
              />
              <path className="sound-off" d="m16 10 5 5m0-5-5 5" />
            </svg>
          </button>
        </nav>
        <div className="under-dock">
          <p>
            <span className="keyboard-hint">← →</span> {t.tuneHint}
          </p>
          <span>{t.curious}</span>
        </div>
        <div className="home-join">
          <p>{t.motto}</p>
          <button className="glass join-button" onClick={join} aria-haspopup="dialog">
            {t.join} <span aria-hidden="true">↗</span>
          </button>
        </div>
        <noscript>
          <p className="noscript-note">
            云谷404 / Cloud Valley 404 — Enable JavaScript for the interactive TV.{" "}
            <a href="/guide">创作指南 / Creator guide ↗</a>
          </p>
        </noscript>
      </main>
      <Footer />
      <dialog
        ref={dialog}
        id="join-dialog"
        className="join-dialog glass"
        aria-labelledby="join-title"
        onClick={(event) => {
          if (event.target === dialog.current) {
            const b = dialog.current.getBoundingClientRect();
            if (
              event.clientX < b.left ||
              event.clientX > b.right ||
              event.clientY < b.top ||
              event.clientY > b.bottom
            )
              dialog.current.close();
          }
        }}
      >
        <button
          className="dialog-close control-button"
          aria-label={t.close}
          onClick={() => dialog.current.close()}
        >
          ×
        </button>
        <span className="eyebrow">YOUR NEXT CHANNEL</span>
        <h2 id="join-title">{t.dialogTitle}</h2>
        <p>{t.dialogBody}</p>
        <ol>
          {t.joinSteps.map(([title, body], i) => (
            <li key={i}>
              <b>{title}</b>
              <span>{body}</span>
            </li>
          ))}
        </ol>
        <p className="contact-pending">{t.pending}</p>
        <Link
          className="screen-cta"
          href="/guide"
          onClick={() => dialog.current.close()}
        >
          {t.dialogCta}
          <span>↗</span>
        </Link>
      </dialog>
      <div className="sr-only" role="status" id="channel-announcement">
        {audioError
          ? t.soundError
          : powered
            ? t.playing + t.channels[channels.indexOf(current)]
            : t.offStatus}
      </div>
    </>
  );
}
