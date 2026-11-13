import { useEffect } from "react";
import { Link } from "react-router-dom";
import collectionsData from "../data/collections.generated.json";
import type { CollectionsPageData } from "../types/collections";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./collections-page.module.css";

const data = collectionsData as unknown as CollectionsPageData;

// Refined tag names (2026-11-13): sentence case, shorter, overlapping pairs told
// apart. Labels only; hrefs stay as the data supplies them.
const LABELS: Record<string, string> = {
  "/browse-beach": "Beach & sun",
  "/browse-romance": "Romantic escapes",
  "/browse-culture": "Culture & history",
  "/browse-adventure": "Adventure",
  "/browse-wellness": "Wellness & calm",
  "/browse-wildlife": "Wildlife",
  "/browse-food": "Food & drink",
  "/browse-nightlife": "Nightlife",
  "/browse-snow": "Snow & mountains",
  "/browse-slow": "Slow & quiet",
  "/browse-honeymoon": "Honeymoons",
  "/browse-family-kids": "Family with children",
  "/browse-multigen": "Three generations",
  "/browse-safari": "Safari lodges",
  "/browse-ski": "Ski resorts",
  "/browse-dive": "Diving & snorkelling",
  "/browse-wine": "Wine regions",
  "/browse-art": "Art & museums",
  "/browse-spa": "Spa retreats",
  "/browse-pilgrimage": "Sacred places",
};
const SECTION_LABELS: Record<string, string> = {
  "By mood": "By mood",
  "Who is travelling": "Who's travelling",
  "By interest": "By interest",
};

// 24px line icons, one per tag (inner SVG markup).
const ICONS: Record<string, string> = {
  "/browse-beach": '<circle cx="12" cy="9" r="4"/><path d="M12 1.5v2M4.5 9h2M17.5 9h2M3 17c3 -2 6 2 9 0s6 -2 9 0M3 21c3 -2 6 2 9 0s6 -2 9 0"/>',
  "/browse-romance": '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  "/browse-culture": '<path d="M3 9l9-5 9 5M5 9v9M9.7 9v9M14.3 9v9M19 9v9M3 20h18"/>',
  "/browse-adventure": '<path d="M2 20l7-12 4 7 2-3 7 8zM9 8l1.5 2.5"/>',
  "/browse-wellness": '<path d="M12 20c-4-2-6-5-6-9 3 0 5 1 6 3 1-2 3-3 6-3 0 4-2 7-6 9zM12 14V6"/>',
  "/browse-wildlife": '<circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14.5" cy="6" r="1.8"/><circle cx="18.5" cy="10" r="1.8"/><path d="M12.2 11c3 0 5.2 3.3 4.3 5.7-.8 2-3 1.3-4.3 1.3s-3.5.7-4.3-1.3C6.9 14.3 9.2 11 12.2 11z"/>',
  "/browse-food": '<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.5 1.5-3 5-3 8h3"/>',
  "/browse-nightlife": '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  "/browse-snow": '<path d="M12 2v20M4.5 7l15 10M19.5 7l-15 10M9 3.5l3 2 3-2M9 20.5l3-2 3 2"/>',
  "/browse-slow": '<path d="M5 3h14M5 21h14M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
  "/browse-honeymoon": '<circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M12 3l1.5 2L12 7 10.5 5z"/>',
  "/browse-family-kids": '<circle cx="8" cy="7" r="2.5"/><circle cx="17" cy="10" r="2"/><path d="M3 20v-3a5 5 0 0 1 10 0v3M14.5 20v-2a3.5 3.5 0 0 1 6.5-1.8V20"/>',
  "/browse-multigen": '<circle cx="12" cy="6" r="2.5"/><circle cx="5" cy="11" r="2"/><circle cx="19" cy="11" r="2"/><path d="M7.5 20v-3a4.5 4.5 0 0 1 9 0v3M1.5 20v-2a3.5 3.5 0 0 1 5-3M22.5 20v-2a3.5 3.5 0 0 0-5-3"/>',
  "/browse-safari": '<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6"/>',
  "/browse-ski": '<path d="M3 20l18-5M4 15l16-5M14 4.5a1.5 1.5 0 1 0 .1 0M9 11l3-3 3 2"/>',
  "/browse-dive": '<circle cx="8" cy="8" r="2"/><circle cx="14" cy="5" r="1.3"/><circle cx="16.5" cy="10" r="1.7"/><path d="M3 17c3-2 6 2 9 0s6-2 9 0M3 21c3-2 6 2 9 0s6-2 9 0"/>',
  "/browse-wine": '<path d="M7 3h10c0 5-1 9-5 9S7 8 7 3zM12 12v9M8 21h8"/>',
  "/browse-art": '<path d="M3.5 4h17v13h-17zM8 21l4-4 4 4M7 12l3-3 3 3 2-2 2 2"/>',
  "/browse-spa": '<path d="M12 4c2.5 2.5 3 5 0 8-3-3-2.5-5.5 0-8zM4 10c3 0 5 1 6 4-3 0-5-1-6-4zM20 10c-3 0-5 1-6 4 3 0 5-1 6-4zM7 20h10"/>',
  "/browse-pilgrimage": '<path d="M12 3v3M5 21V12a7 7 0 0 1 14 0v9M3 21h18M10 21v-5a2 2 0 0 1 4 0v5"/>',
};

export default function CollectionsPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, sections } = data;

  return (
    <>
      <header className={styles.brHero}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1>{hero.heading}</h1>
          <p>{hero.lede}</p>
        </div>
      </header>
      <main>
        <div className={styles.brHub}>
          {sections.map((sec, i) => (
            <div className={styles.brSec} key={i}>
              <div className="eyebrow">{SECTION_LABELS[sec.eyebrow ?? ""] ?? sec.eyebrow}</div>
              <div className="rule" />
              <div className={styles.brLinks}>
                {sec.links.map((l, j) => (
                  <Link className={styles.brLink} to={toRoute(l.href)} key={j}>
                    {ICONS[l.href ?? ""] && (
                      <svg className={styles.brIcon} viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[l.href ?? ""] }} />
                    )}
                    <span className={styles.brLabel}>{LABELS[l.href ?? ""] ?? l.label}</span>
                    <svg className={styles.brArrow} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
