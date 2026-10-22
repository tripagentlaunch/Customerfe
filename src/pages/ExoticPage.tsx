import { Fragment, useEffect, useState } from "react";
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

// Short by default (2026-10-22): a card shows the place, its one line and
// when to go; the full write-up and the practical facts open on request.
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const RANGE = new RegExp(`(?:(?:late|early|mid)[ -])?(${MONTHS})(?:\\s*(?:to|–|-)\\s*(?:(?:late|early|mid)[ -])?(${MONTHS}))?`, "gi");

/** "November to March only — the austral summer…" -> "Nov – Mar". Only the
 *  first sentence, and a second window only when joined by "and". */
function bestMonths(season: string | null): string | null {
  if (!season) return null;
  if (/^\s*(year-round|two seasons|two distinct)/i.test(season)) return "Year-round";
  const first = season.split(/\.\s/)[0];
  const out: string[] = [];
  let prevEnd = -1;
  for (const m of first.matchAll(RANGE)) {
    if (out.length && (!m[2] || !/\band\b/i.test(first.slice(prevEnd, m.index)))) break;
    prevEnd = (m.index ?? 0) + m[0].length;
    const a = m[1].slice(0, 3);
    const b = m[2] ? m[2].slice(0, 3) : null;
    const range = b && b !== a ? `${a} – ${b}` : a;
    if (!out.includes(range)) out.push(range);
    if (out.length === 2) break;
  }
  return out.length ? out.join(" · ") : null;
}

/** "Antarctica (via Ushuaia, Argentina)" -> "Antarctica". */
function shortRegion(region: string): string {
  return region.replace(/\s*\(.*$/, "");
}

function Card({ s }: { s: ExoticSpot }) {
  const [open, setOpen] = useState(false);
  const best = bestMonths(s.season);
  const facts: [string, string | null][] = [
    ["Getting there", s.getting_there],
    ["When", s.season],
    ["From India", s.india],
    ["We handle", s.handle],
    ["Where you stay", s.stay],
  ];
  const detailsId = `ex-details-${s.id}`;
  return (
    <article className={`${styles.exCard}${open ? ` ${styles.exOpen}` : ""}`}>
      <div className={styles.exCardHead}>
        {s.access_flag && <span className={styles.exFlag}>Access-dependent</span>}
        <div className={styles.exRegion}>{shortRegion(s.region)}</div>
        <h3 className={styles.exName}>{s.name}</h3>
        {s.tagline && <p className={styles.exTag}>{s.tagline}</p>}
      </div>
      {best && (
        <p className={styles.exBest}>
          <span>Best</span> {best}
        </p>
      )}
      <div className={styles.exMore} id={detailsId} aria-hidden={!open}>
        <div className={styles.exMoreIn}>
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
        </div>
      </div>
      <div className={styles.exActions}>
        <Link className={styles.exCta} to={advisorHref(s.name)}>
          Have <TaraAI /> plan it →
        </Link>
        <button type="button" className={styles.exToggle} aria-expanded={open} aria-controls={detailsId} onClick={() => setOpen((o) => !o)}>
          {open ? "Less" : "The details"}
          <span className={styles.exCaret} aria-hidden="true" />
        </button>
      </div>
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
        <p>{hero.lede?.split(/(?<=\.)\s/)[0]}</p>
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
