"use client";
import Link from "next/link";
import { usePreferences } from "../components/preferences";
import { Backdrop, Header, Footer } from "../components/site-shell";
export default function NotFound() {
  const { t } = usePreferences();
  return (
    <>
      <Backdrop />
      <Header guide />
      <main className="not-found-page">
        <h1>404</h1>
        <p>{t.notFound}</p>
        <Link className="screen-cta" href="/">
          {t.backHome} ↗
        </Link>
      </main>
      <Footer />
    </>
  );
}
