import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import itineraries from "../data/itinerary-teasers.generated.json";
import type { ItineraryData } from "../types/itinerary";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { withTaraAI } from "../components/TaraAI";
import styles from "./itinerary-page.module.css";

const ITINERARIES = itineraries as unknown as Record<string, ItineraryData>;

export default function ItineraryPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? ITINERARIES[pageSlug] : undefined;

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  if (!data) {
    return (
      <div className="wrap band">
        <p>Not yet ported to the app.</p>
      </div>
    );
  }

  const { hero, legs, note, cta } = data;

  return (
    <>
      <header className={styles.rtHero}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1>{hero.name}</h1>
          <p>{hero.lede}</p>
          <div className={styles.rtMeta}>
            {hero.meta.map((m, i) => (
              <div key={i}>
                <span className="rk">{m.label}</span>
                <span className="rv" style={i > 0 ? { fontSize: 17 } : undefined}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.rtLegs}>
        {legs.map((leg, i) => (
          <div className={styles.rtLeg} key={i}>
            <div className={styles.rtNum}>{leg.n}</div>
            <div className={styles.rtLegB}>
              <span className={styles.rn}>{leg.nights}</span>
              <h3>{leg.city}</h3>
              <p>{leg.text}</p>
              {leg.guideLink && (
                <Link className={styles.rl} to={toRoute(leg.guideLink.href)}>
                  {leg.guideLink.label}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.rtNote}>{note}</div>
      <div className={styles.rtCta}>
        <Link className="btn btn-gold btn-square" to={toRoute(cta.href)}>
          {withTaraAI(cta.label)}
        </Link>
      </div>
    </>
  );
}
