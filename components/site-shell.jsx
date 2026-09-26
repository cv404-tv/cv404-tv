"use client";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { usePreferences } from "./preferences";
import { AccountButton, useAuth } from "./auth";

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
export function Header({ guide = false, tool = false, game = false }) {
  const { t, locale } = usePreferences();
  const { user } = useAuth();
  return (
    <header className="site-header">
      <Link
        className="brand"
        href="/"
        aria-label={t.home}
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
      <nav className="header-nav" aria-label={locale === "zh" ? "主导航" : "Main navigation"}>
        <Link className="glass join-button header-events-link" href="/events">
          {guide ? t.back : locale === "zh" ? "活动" : "Events"} <span aria-hidden="true">↗</span>
        </Link>
        <Link href="/tokens">{locale === "zh" ? "免费 Token" : "Free tokens"}</Link>
        {!game && <Link className="header-game-link" href="/">
          {locale === "zh" ? "搜寻信号" : "Signal Search"}
        </Link>}
        {!tool && <Link className="header-tool-link" href="/tier">
          {locale === "zh" ? "锐评小工具" : "Hot Take Tool"}
        </Link>}
        {user?.isAdmin && <Link href="/admin">{locale === "zh" ? "管理后台" : "Admin"}</Link>}
      </nav>
      <div className="header-utilities">
        <AccountButton />
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
      <Link href="/">{locale === "zh" ? "404 信号搜寻" : "404 Signal Search"} ↗</Link>
      <Link href="/events">{locale === "zh" ? "活动" : "Events"} ↗</Link>
      <Link href="/tokens">{locale === "zh" ? "免费 Token" : "Free tokens"} ↗</Link>
      <Link href="/tier">{locale === "zh" ? "锐评小工具" : "Hot Take Tool"} ↗</Link>
      <Link href="/guide">{t.guideLink} ↗</Link>
      <Link href="/privacy">{locale === "zh" ? "App 隐私政策" : "App privacy policy"} ↗</Link>
    </footer>
  );
}
