"use client";

import Image from "next/image";
import Link from "next/link";
import { Backdrop, Footer, Header } from "./site-shell";
import { usePreferences } from "./preferences";
import styles from "./first-hackathon.module.css";

export default function FirstHackathon() {
  const { t } = usePreferences();
  const event = t.eventDetail;

  return (
    <>
      <Backdrop />
      <Header guide />
      <main className={styles.page}>
        <div className={styles.topline}>
          <span>{event.index}</span>
          <span>{event.status}</span>
        </div>

        <section className={styles.hero} aria-labelledby="event-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{event.kicker}</p>
            <h1 id="event-title">
              {event.title[0]}
              <br />
              <span>{event.title[1]}</span>
            </h1>
            <p className={styles.lede}>{event.lede}</p>
            <div className={styles.actions}>
              <Link className={styles.primaryAction} href="/events/xhs-xgj/slides">
                {event.slidesCta} <span aria-hidden="true">↗</span>
              </Link>
              <Link className={styles.secondaryAction} href="/guide">
                {event.guideCta} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <a
            className={styles.poster}
            href="/assets/event-poster.png"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={event.posterLabel}
          >
            <Image
              src="/assets/event-poster.png"
              alt={event.posterAlt}
              width={1054}
              height={1492}
              sizes="(max-width: 760px) 75vw, 360px"
              priority
            />
            <span>{event.posterCaption} ↗</span>
          </a>
        </section>

        <section className={styles.facts} aria-label={event.factsLabel}>
          {event.facts.map((fact) => (
            <div key={fact.label}>
              <span>{fact.label}</span>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </section>

        <section className={styles.intro} aria-labelledby="event-intro-title">
          <div className={styles.sectionNumber}>01 / THE BRIEF</div>
          <div>
            <h2 id="event-intro-title">{event.briefTitle}</h2>
            <p>{event.brief}</p>
            <ul className={styles.briefList}>
              {event.briefPoints.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
        </section>

        <section className={styles.agenda} aria-labelledby="event-agenda-title">
          <div className={styles.sectionNumber}>02 / RUN OF SHOW</div>
          <div>
            <h2 id="event-agenda-title">{event.agendaTitle}</h2>
            <ol>
              {event.agenda.map((step, index) => (
                <li key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={styles.archive} aria-labelledby="event-archive-title">
          <div className={styles.sectionNumber}>03 / ARCHIVE</div>
          <div>
            <h2 id="event-archive-title">{event.archiveTitle}</h2>
            <p className={styles.archiveNote}>{event.archiveNote}</p>
            <div className={styles.resourceLinks}>
              <Link href="/events/xhs-xgj/slides">
                <span>01</span><strong>{event.slidesResource}</strong><span aria-hidden="true">↗</span>
              </Link>
              <Link href="/guide">
                <span>02</span><strong>{event.guideResource}</strong><span aria-hidden="true">↗</span>
              </Link>
              <a href="/assets/event-poster.png" target="_blank" rel="noopener noreferrer">
                <span>03</span><strong>{event.posterResource}</strong><span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
