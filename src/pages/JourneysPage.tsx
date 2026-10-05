import { useEffect } from "react";
import { Link } from "react-router-dom";
import journeysData from "../data/journeys.generated.json";
import type { JourneysPageData } from "../types/journeys";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { withTaraAI } from "../components/TaraAI";
import styles from "./journeys-page.module.css";

const data = journeysData as unknown as JourneysPageData;

export default function JourneysPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, cards, cta } = data;

  return (
    <>
      <header className={styles.rtHero} style={{ background: "var(--ink)" }}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1>{hero.heading}</h1>
          <p>{hero.lede}</p>
        </div>
      </header>
      <main>
        <div className={styles.jrGrid} style={{ paddingTop: "clamp(40px,5vw,64px)" }}>
          {cards.map((c, i) => (
            <Link className={styles.jrCard} to={toRoute(c.href)} key={i}>
              <div className={styles.jn}>{c.meta}</div>
              <h3 dangerouslySetInnerHTML={{ __html: c.titleHtml ?? "" }} />
              <p>{c.body}</p>
              <div className={styles.jc}>{c.cities}</div>
            </Link>
          ))}
        </div>

        <section className="band center">
          <div className="wrap">
            <div className="eyebrow reveal">{cta.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ fontSize: "clamp(30px,4vw,54px)" }}>
              {cta.heading}
            </h2>
            <p className="lede reveal d2" style={{ margin: "20px auto 0", maxWidth: "54ch" }}>
              {cta.lede}
            </p>
            <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
              {cta.buttons.map((b, i) => (
                <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} to={toRoute(b.href)} key={i}>
                  {withTaraAI(b.label)}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
