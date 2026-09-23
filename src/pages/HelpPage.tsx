import { useEffect } from "react";
import { Link } from "react-router-dom";
import helpData from "../data/help-page.generated.json";
import type { HelpPageData } from "../types/help-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./help-page.module.css";

const data = helpData as unknown as HelpPageData;

export default function HelpPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, categories, cta } = data;

  return (
    <main>
      <header className="hero hero-ed" style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "50% 55%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 className="display" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 24 }}>
              {hero.lede}
            </p>
            <div className={styles.helpToc}>
              {hero.toc.map((t, i) => (
                <a href={t.href} key={i}>
                  {t.label}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className="band">
        <div className="wrap">
          {categories.map((cat, ci) => (
            <div className={styles.helpCat} id={cat.id ?? undefined} key={ci}>
              <div className={`${styles.catHead} reveal`}>
                <div className="eyebrow">{cat.eyebrow}</div>
                <div className="rule" />
                <h3>{cat.heading}</h3>
              </div>
              <div className="faq reveal d2">
                {cat.items.map((it, i) => (
                  <details open={it.open || undefined} key={i}>
                    <summary>{it.question}</summary>
                    <p dangerouslySetInnerHTML={{ __html: it.answerHtml ?? "" }} />
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
        <div className="wrap">
          <h2 className="reveal d1" style={{ fontSize: "clamp(32px,4.6vw,62px)" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ margin: "18px auto 30px" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d3">
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost on-dark"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
