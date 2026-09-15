"use client";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
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
export function Header({ onHome, guide = false, tool = false }) {
  const { t, locale } = usePreferences();
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
        <BrandMark />
        <span>
          {t.brandName}{locale === "en" ? " " : ""}<span className="brand-number">404</span>
          <small>CREATOR TELEVISION</small>
        </span>
      </Link>
      {!guide && (
        <span className="header-location">
          <span className="location-cross">⌖</span> {t.location}
        </span>
      )}
      <div className="header-actions">
        {guide && <Link className="site-back-link" href="/#events">{t.back}</Link>}
        <PreferenceControls />
        {!tool && <Link className="glass join-button" href="/tier-list">
          {t.rate} <span aria-hidden="true">↗</span>
        </Link>}
      </div>
    </header>
  );
}
export function Footer() {
  const { t, locale } = usePreferences();
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} {t.brand}</span>
      <span>{t.footer}</span>
      <Link href="/tier-list">{locale === "zh" ? "锐评小工具" : "Hot Take Tool"} ↗</Link>
      <Link href="/guide">{t.guideLink} ↗</Link>
    </footer>
  );
}
