"use client";
import Link from "next/link";
import { Backdrop, Header, Footer } from "./site-shell";
import { usePreferences } from "./preferences";

export default function Guide() {
  const { t } = usePreferences();
  const guide = t.guide;
  return (
    <>
      <Backdrop />
      <Header guide />
      <main className="guide-page">
        <article className="glass guide-article">
          <span className="eyebrow">{guide.label}</span>
          <h1>
            {guide.title[0]}
            <br />
            {guide.title[1]}
          </h1>
          <p className="guide-intro">{guide.intro}</p>
          <p className="guide-note">{guide.note}</p>
          {guide.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {section.items &&
                (section.ordered ? (
                  <ol>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ))}
              {section.after && <p>{section.after}</p>}
              {section.platform && (
                <a
                  className="text-link"
                  href="https://creator.xiaohongshu.com/new/red-app?source=official"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {guide.platform} ↗
                </a>
              )}
            </section>
          ))}
          <blockquote>{guide.quote}</blockquote>
          <a
            className="screen-cta"
            href="/assets/first-event-guide.md"
            download
          >
            {guide.download} ↓
          </a>
          <p>
            <Link className="text-link" href="/">
              {t.backHome} ↗
            </Link>
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
