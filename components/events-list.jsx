"use client";

import Image from "next/image";
import Link from "next/link";
import { Backdrop, Footer, Header } from "./site-shell";
import { usePreferences } from "./preferences";
import { eventCatalog, eventsCopy } from "../lib/events";
import styles from "./events-list.module.css";

function EventCard({ event, locale, featured }) {
  const content = event[locale];
  return (
    <Link
      className={`${styles.card} ${featured ? styles.featured : styles.archiveCard}`}
      href={event.href}
    >
      <div className={styles.cardCopy}>
        <div className={styles.cardMeta}>
          <span>VOL.{event.edition}</span>
          <span className={featured ? styles.openStatus : styles.pastStatus}>{content.status}</span>
        </div>
        <p className={styles.category}>{content.category}</p>
        <h3>{content.title}</h3>
        <p className={styles.description}>{content.description}</p>
        <div className={styles.details}>
          <span>{content.date}</span>
          <span>{content.place}</span>
        </div>
        <span className={styles.cardAction}>{content.cta} <span aria-hidden="true">↗</span></span>
      </div>
      {event.art.type === "poster" ? (
        <div className={styles.posterArt} aria-hidden="true">
          <Image src={event.art.src} alt="" width={1054} height={1492} sizes="(max-width: 680px) 120px, 220px" />
        </div>
      ) : (
        <div className={styles.wordmarkArt} aria-hidden="true">
          <span>INPUT / DECISION / ACTION</span>
          <strong>{event.art.text}</strong>
          <span>BUILD 00{event.edition}</span>
        </div>
      )}
    </Link>
  );
}

export default function EventsList() {
  const { locale } = usePreferences();
  const text = eventsCopy[locale];
  const upcoming = eventCatalog.filter((event) => event.state === "upcoming");
  const past = eventCatalog.filter((event) => event.state === "past");

  return (
    <>
      <Backdrop />
      <Header />
      <main className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{text.label}</p>
          <div className={styles.introRow}>
            <h1>{text.title}<span aria-hidden="true">.</span></h1>
            <p>{text.intro}</p>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="upcoming-title">
          <div className={styles.sectionHeading}>
            <h2 id="upcoming-title">{text.upcoming}</h2>
            <span>{String(upcoming.length).padStart(2, "0")} / {text.count}</span>
          </div>
          {upcoming.length ? (
            <div className={styles.cardList}>
              {upcoming.map((event) => <EventCard key={event.id} event={event} locale={locale} featured />)}
            </div>
          ) : <p className={styles.empty}>{text.empty}</p>}
        </section>

        {past.length > 0 && (
          <section className={styles.section} aria-labelledby="past-title">
            <div className={styles.sectionHeading}>
              <h2 id="past-title">{text.past}</h2>
              <span>{String(past.length).padStart(2, "0")} / {text.count}</span>
            </div>
            <div className={styles.cardList}>
              {past.map((event) => <EventCard key={event.id} event={event} locale={locale} />)}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
