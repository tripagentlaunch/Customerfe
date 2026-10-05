import { Fragment, useEffect } from "react";
import { Link } from "react-router-dom";
import exoticData from "../data/exotic-page.generated.json";
import type { ExoticPageData, ExoticSpot } from "../types/exotic-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { TaraAI } from "../components/TaraAI";
import styles from "./exotic-page.module.css";

const data = exoticData as unknown as ExoticPageData;

// #exotic-list is populated at runtime by js/exotic.js from data/exotic.json
// (32 spots, static local data — no backend/scoring). Ported the real
// (dynamic) content directly, replicating exotic.js's own category
// grouping/ordering and per-fact conditional rendering, same pattern as
// destinations.js in Batch C.
function advisorHref(name: string) {
  // window.TA_WA (WhatsApp number) isn't provisioned yet — this replicates
  // exotic.js's fallback path, same as ContactPage's default state.
  return `/enquire?dest=${encodeURIComponent(name)}`;
}

function Card({ s }: { s: ExoticSpot }) {
  const facts: [string, string | null][] = [
    ["Getting there", s.getting_there],
    ["When", s.season],
    ["From India", s.india],
    ["We handle", s.handle],
    ["Where you stay", s.stay],
  ];
  return (
    <article className={styles.exCard}>
      <div className={styles.exCardHead}>
        {s.access_flag && <span className={styles.exFlag}>Access-dependent</span>}
        <div className={styles.exRegion}>{s.region}</div>
        <h3 className={styles.exName}>{s.name}</h3>
        {s.tagline && <p className={styles.exTag}>{s.tagline}</p>}
      </div>
      {s.why && <p className={styles.exWhy}>{s.why}</p>}
      <dl className={styles.exFacts}>
        {facts
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
      </dl>
      <Link className={styles.exCta} to={advisorHref(s.name)}>
        Have <TaraAI /> plan it →
      </Link>
    </article>
  );
}

export default function ExoticPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, groups, note } = data;

  return (
    <main>
      <header className={`${styles.exHero} reveal`}>
        <div className="eyebrow">{hero.eyebrow}</div>
        <h1>{hero.heading}</h1>
        <p>{hero.lede}</p>
      </header>

      <div className={styles.exWrap}>
        {groups.map((g) => (
          <section className={`${styles.exGroup} reveal`} key={g.category}>
            <h2 className={styles.exGroupH}>{g.category}</h2>
            <div className={styles.exGrid}>
              {g.spots.map((s) => (
                <Card s={s} key={s.id} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className={`${styles.exNote} reveal`}>{note}</p>
    </main>
  );
}
