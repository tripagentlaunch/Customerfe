import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { PlannerCity, PlannerData } from "../types/homepage";
import { useIsMobile } from "../hooks/useIsMobile";
import styles from "./DestinationPlanner.module.css";

// Cards are at most ~300px wide, so a 640px rendition covers 2x screens —
// the data's 1024px/q80 version was ~2.5x the bytes on phones (2026-10-13).
function cardImage(src: string | null | undefined): string {
  if (!src) return "";
  return src.replace(/&w=\d+/, "&w=640").replace(/&q=\d+/, "&q=75");
}

// Ported from index.html's #planner inline <script> 1:1 — the same
// month -> top-8-cities ranking (by that month's digit in monthScore, ties
// broken per month - see tieBreak), defaulting to the visitor's
// current month. Real client-side logic, no backend: see
// tools/extract_homepage.py's docstring.

// Cities with the same score for a month used to keep data order, so the same few
// (Dubai, Abu Dhabi…) led every month they were in season. Ties are now ordered by
// a hash of the city AND the month: stable on a given month (no reshuffle on
// re-render), different from one month to the next. Better-scoring cities still
// always come first.
function tieBreak(slug: string, month: number): number {
  let h = 2166136261;
  const key = `${month}:${slug}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rankCities(cities: PlannerCity[], month: number) {
  return cities
    .map((city) => ({ city, score: parseInt(city.monthScore.charAt(month), 10) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || tieBreak(a.city.slug, month) - tieBreak(b.city.slug, month))
    .slice(0, 8);
}

export default function DestinationPlanner({ planner }: { planner: PlannerData }) {
  const [month, setMonth] = useState(() => new Date().getMonth());
  const ranked = useMemo(() => rankCities(planner.cities, month), [planner.cities, month]);

  // Phone: one row (2 cards) at a time, paged with arrows. Back to the first
  // row whenever the month changes.
  const isMobile = useIsMobile();
  const PER_PAGE = 2;
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [month]);
  const pages = Math.max(1, Math.ceil(ranked.length / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const visible = isMobile ? ranked.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE) : ranked;

  // Phone: the month row is one horizontally scrolling line. When it first
  // scrolls into view it starts at Jan and glides across until the current
  // month is centred (once per page load; instant under reduced motion).
  const monthsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = monthsRef.current;
    if (!row || !window.matchMedia("(max-width: 720px)").matches) return;
    let raf = 0;
    let delay = 0;
    const glide = () => {
      const sel = row.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!sel) return;
      const max = row.scrollWidth - row.clientWidth;
      const to = Math.max(0, Math.min(max, sel.offsetLeft - (row.clientWidth - sel.offsetWidth) / 2));
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        row.scrollLeft = to;
        return;
      }
      const t0 = performance.now();
      const dur = 1100;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        row.scrollLeft = to * (1 - Math.pow(1 - k, 3));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        delay = window.setTimeout(glide, 350);
      },
      { threshold: 0.6 }
    );
    io.observe(row);
    return () => {
      io.disconnect();
      clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, []);


  return (
    <section className={`band ${styles.section}`} id="planner">
      <div className="wrap">
        <div className={`${styles.plHead} reveal`}>
          <div className="eyebrow">{planner.eyebrow}</div>
          <div className="rule" />
          <h2 style={{ fontSize: "clamp(30px,4.2vw,58px)" }} dangerouslySetInnerHTML={{ __html: planner.headingHtml ?? "" }} />
          {/* Subtext under the planner heading commented out (not deleted); restore to bring it back.
          <p className="lede" style={{ marginTop: 16 }}>
            {planner.lede}
          </p>
          */}
        </div>

        <div ref={monthsRef} className={`${styles.plMonths} reveal d1`} role="tablist" aria-label="Choose a month">
          {planner.months.map((m, i) => (
            <button type="button" role="tab" aria-selected={i === month} onClick={() => setMonth(i)} key={i}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className={styles.plGrid} aria-live="polite">
          {visible.map(({ city }, i) => (
            <Link
              className={styles.plCard}
              style={{ animationDelay: `${(i * 0.06).toFixed(2)}s` }}
              to={`/city-${city.slug}#stay`}
              key={city.slug}
            >
              <div className={styles.cardOuter}>
                <div className={styles.pic}>
                  <span style={{ backgroundImage: `url('${cardImage(city.image)}')` }} />
                </div>
                <div className={styles.cardBody}>
                  <h3>{city.name}</h3>
                  <ul className={styles.plStays}>
                    {city.topStays.map((stay, si) => (
                      <li key={si}>{stay}</li>
                    ))}
                  </ul>
                  <div className={styles.go}>Where to stay</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {isMobile && pages > 1 && (
          <div className={styles.plPager} role="group" aria-label="More destinations for this month">
            <button type="button" aria-label="Previous destinations" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <span aria-live="polite">
              {safePage + 1} / {pages}
            </span>
            <button type="button" aria-label="Next destinations" disabled={safePage === pages - 1} onClick={() => setPage(safePage + 1)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
