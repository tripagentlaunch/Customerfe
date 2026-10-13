import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import browse from "../data/browse.generated.json";
import type { BrowseData } from "../types/browse";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
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
                {c.meta.map((m, j) => (
                  <span key={j}>{m}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
