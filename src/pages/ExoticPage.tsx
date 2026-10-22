import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

function facts(s: ExoticSpot): [string, string][] {
  const all: [string, string | null][] = [
    ["Getting there", s.getting_there],
    ["When", s.season],
    ["From India", s.india],
    ["We handle", s.handle],
    ["Where you stay", s.stay],
  ];
  return all.filter((f): f is [string, string] => !!f[1]);
}

// Every card the same shape (2026-10-22): fixed slots for the name and the
// line under it, the season and access note on one meta row, and the actions
// pinned to the foot. The write-up opens over the page, never inside the
// card, so a row never changes height.
function Card({ s, onDetails }: { s: ExoticSpot; onDetails: () => void }) {
  const best = bestMonths(s.season);
  return (
    <article className={styles.exCard}>
      <div className={styles.exRegion}>{shortRegion(s.region)}</div>
      <h3 className={styles.exName}>{s.name}</h3>
      <p className={styles.exTag}>{s.tagline ?? "\u00a0"}</p>
      <p className={styles.exMeta}>
        {best && (
          <>
            <span className={styles.exMetaK}>Best</span> {best}
          </>
        )}
        {s.access_flag && <span className={styles.exAccess}>Access-dependent</span>}
      </p>
      <div className={styles.exActions}>
        <Link className={styles.exCta} to={advisorHref(s.name)}>
          Have <TaraAI /> plan it →
        </Link>
        <button type="button" className={styles.exToggle} onClick={onDetails} aria-haspopup="dialog">
          Details
          <span className={styles.exPlus} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

const SHEET_MS = 320;

function DetailsSheet({ spot, onClose }: { spot: ExoticSpot | null; onClose: () => void }) {
  // Kept on screen through the closing fade, then unmounted.
  const [shown, setShown] = useState<ExoticSpot | null>(spot);
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (spot) {
      setShown(spot);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setShown(null), SHEET_MS);
    return () => window.clearTimeout(t);
  }, [spot]);

  useEffect(() => {
    if (!spot) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [spot, onClose]);

  if (!shown) return null;
  const best = bestMonths(shown.season);
  return createPortal(
    <div className={`${styles.exSheetWrap}${visible ? ` ${styles.exSheetOn}` : ""}`} onClick={onClose}>
      <div
        className={styles.exSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ex-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className={styles.exSheetClose} aria-label="Close" onClick={onClose} />
        <div className={styles.exRegion}>{shortRegion(shown.region)}</div>
        <h3 id="ex-sheet-title" className={styles.exSheetName}>{shown.name}</h3>
        {shown.tagline && <p className={styles.exSheetTag}>{shown.tagline}</p>}
        {(best || shown.access_flag) && (
          <p className={styles.exMeta}>
            {best && (
              <>
                <span className={styles.exMetaK}>Best</span> {best}
              </>
            )}
            {shown.access_flag && <span className={styles.exAccess}>Access-dependent</span>}
          </p>
        )}
        {shown.why && <p className={styles.exWhy}>{shown.why}</p>}
        <dl className={styles.exFacts}>
          {facts(shown).map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
        <Link className={styles.exCta} to={advisorHref(shown.name)} onClick={onClose}>
          Have <TaraAI /> plan it →
        </Link>
      </div>
    </div>,
    document.body,
  );
}

export default function ExoticPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, groups, note } = data;
  const [detailsOf, setDetailsOf] = useState<ExoticSpot | null>(null);
  const closeDetails = useCallback(() => setDetailsOf(null), []);

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
                <Card s={s} key={s.id} onDetails={() => setDetailsOf(s)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className={`${styles.exNote} reveal`}>{note}</p>
      <DetailsSheet spot={detailsOf} onClose={closeDetails} />
    </main>
  );
}
