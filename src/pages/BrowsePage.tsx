import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import browse from "../data/browse.generated.json";
import type { BrowseData } from "../types/browse";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { ORIGINS, flightTimes, hoursLabel, useOrigin, type FlightFrom } from "../lib/origin";
import styles from "./browse-page.module.css";
import NotFoundPage from "./NotFoundPage";

const BROWSE = browse as unknown as Record<string, BrowseData>;

export default function BrowsePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? BROWSE[pageSlug] : undefined;

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  // Flight times are from the visitor's own city (Bengaluru unless they chose another) —
  // the cards used to say "1h from India", which is meaningless (and wrong for every
  // Indian city). The same per-city table the city pages use (city-decision.json).
  const [origin] = useOrigin();
  const [times, setTimes] = useState<Record<string, Record<string, FlightFrom> | null>>({});
  useEffect(() => {
    let cancelled = false;
    (data?.cards ?? []).forEach((c) => {
      const slug = c.href.replace(/^\//, "").replace(/\.html$/, "").replace(/^city-/, "");
      flightTimes(slug).then((f) => !cancelled && setTimes((t) => ({ ...t, [slug]: f })));
    });
    return () => {
      cancelled = true;
    };
  }, [data]);

  if (!data) {
    return <NotFoundPage />;
  }

  const { hero, cards } = data;

  return (
    <>
      <header className={styles.brHero}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1>{hero.name}</h1>
          <p>{hero.lede}</p>
        </div>
      </header>
      <div className={styles.wtgRgrid}>
        {cards.map((c, i) => (
          <Link className={styles.wtgCard} to={toRoute(c.href)} key={i}>
            <div className={styles.wp} style={{ backgroundImage: `url('${c.image}')` }} />
            <div className={styles.wb}>
              <div className={styles.wc}>{c.country}</div>
              <h3>{c.name}</h3>
              <p className={styles.wt}>{c.description}</p>
              <div className="wm">
                {c.meta.map((m, j) => {
                  if (!/ from India$/.test(m)) return <span key={j}>{m}</span>;
                  const slug = c.href.replace(/^\//, "").replace(/\.html$/, "").replace(/^city-/, "");
                  const h = hoursLabel(times[slug]?.[origin]?.hours);
                  // No time for this city from here yet (or at all): show nothing rather than a wrong one.
                  return h ? <span key={j}>{`${h} from ${ORIGINS[origin]}`}</span> : null;
                })}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
