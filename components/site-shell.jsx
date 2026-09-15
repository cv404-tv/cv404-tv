"use client";
import Link from "next/link";
import { PreferenceControls, usePreferences } from "./preferences";

export function Backdrop() {
  return (
    <div className="ambience" aria-hidden="true">
      <i />
      <i />
      <i />
      <div className="floor-grid" />
    </div>
  );
}
export function Header({ onJoin, onHome, guide = false }) {
  const { t } = usePreferences();
  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label={t.home}
        onClick={
          onHome
            ? (event) => {
                event.preventDefault();
                onHome();
              }
            : undefined
        }
      >
        <img src="/assets/brand-header.svg" width="72" height="52" alt="" />
        <span>
          云谷<span className="brand-number">404</span>
          <small>CREATOR TELEVISION</small>
        </span>
      </Link>
      {!guide && (
        <span className="header-location">
          <span className="location-cross">⌖</span> {t.location}
        </span>
      )}
      <div className="header-actions">
        <PreferenceControls />
        {guide ? (
          <Link className="glass join-button" href="/#events">
            {t.back} <span>↗</span>
          </Link>
        ) : (
          <button className="glass join-button" onClick={onJoin}>
            {t.join} <span>↗</span>
          </button>
        )}
      </div>
    </header>
  );
}
export function Footer() {
  const { t } = usePreferences();
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} 云谷404</span>
      <span>{t.footer}</span>
      <Link href="/guide">{t.guideLink} ↗</Link>
    </footer>
  );
}
