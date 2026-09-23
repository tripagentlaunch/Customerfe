import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { GuidesHubPageData } from "../types/guides-hub";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";

type GuidesHubStyles = { readonly [key: string]: string };

export default function GuidesHubLayout({ data, styles }: { data: GuidesHubPageData; styles: GuidesHubStyles }) {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  const { hero, pullq, routeGuides, productGuides, cta } = data;

  return (
    <main>
      <header
        className="hero left hero-ed"
        style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "62% 50%" }}
      >
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <Link className="cta on-dark reveal" to={toRoute(hero.back.href)} style={{ marginBottom: 20 }}>
              ← {hero.back.label}
            </Link>
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row reveal d3">
              {hero.buttons.map((b, i) =>
                b.kind === "square" ? (
                  <Link className="btn btn-gold on-dark btn-square" to={toRoute(b.href)} key={i}>
                    {b.label}
                  </Link>
                ) : (
                  <Link className="hero-textlink" to={toRoute(b.href)} key={i}>
                    {b.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className={`band ${styles.pullq}`}>
        <div className="wrap">
          <p className={`${styles.q} reveal`} dangerouslySetInnerHTML={{ __html: pullq.quoteHtml ?? "" }} />
          <p className="lede reveal d2" style={{ margin: "26px auto 0" }}>
            {pullq.lede}
          </p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "18px 40px", maxWidth: "none", marginBottom: 34 }}>
            <div style={{ maxWidth: "30ch" }}>
              <div className="eyebrow">{routeGuides.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ margin: 0 }}>{routeGuides.heading}</h2>
            </div>
            <p className="lede" style={{ maxWidth: "38ch" }}>
              {routeGuides.lede}
            </p>
          </div>
          <div className={`${styles.rg} reveal d1`}>
            {routeGuides.cards.map((c, i) => (
              <Link className="rcard" to={toRoute(c.href)} key={i}>
                <div className="ph" style={{ backgroundImage: `url('${c.image}')` }} />
                <div className={styles.rcBody}>
                  <div className={styles.route}>{c.route}</div>
                  <h3>{c.heading}</h3>
                  <p>{c.body}</p>
                  <span className={styles.more}>Read the guide</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch", marginBottom: 34 }}>
            <div className="eyebrow">{productGuides.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ margin: 0 }}>{productGuides.heading}</h2>
          </div>
          <div className={`${styles.pg} reveal d1`}>
            {productGuides.cards.map((c, i) => (
              <Link className="pcard" to={toRoute(c.href)} style={{ backgroundImage: `url('${c.image}')` }} key={i}>
                <div className="pc-body">
                  <div className="eyebrow">{c.eyebrow}</div>
                  <h3>{c.heading}</h3>
                  <p>{c.body}</p>
                  <span className={styles.more}>Read the guide</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ fontSize: "clamp(32px,4.4vw,62px)" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede reveal d2" style={{ margin: "18px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d3" style={{ marginTop: 30 }}>
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
