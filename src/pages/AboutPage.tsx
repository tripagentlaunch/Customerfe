import { useEffect } from "react";
import { Link } from "react-router-dom";
import aboutData from "../data/about-page.generated.json";
import type { AboutPageData } from "../types/about-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./about-page.module.css";

const data = aboutData as unknown as AboutPageData;

export default function AboutPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, pullQuote, belief, lineage, pq, stats, partners, people, values, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.heroAbt}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "55% 50%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className={styles.pull}>
        <div className="wrap">
          <blockquote className="reveal" dangerouslySetInnerHTML={{ __html: pullQuote.quoteHtml ?? "" }} />
          <cite className="reveal d1">{pullQuote.cite}</cite>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{belief.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.6vw,52px)" }} dangerouslySetInnerHTML={{ __html: belief.headingHtml ?? "" }} />
            {belief.ledes.map((l, i) => (
              <p className="lede" style={{ marginTop: i === 0 ? 18 : 14 }} key={i}>
                {l}
              </p>
            ))}
          </div>
          <div className="reveal d2" style={{ alignSelf: "center" }}>
            <div className="deep-img" style={{ backgroundImage: `url('${belief.image}')` }} role="img" aria-label={belief.imageAlt ?? undefined} />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2" style={{ direction: "rtl" }}>
          <div className="reveal" style={{ direction: "ltr" }}>
            <div className="deep-img" style={{ backgroundImage: `url('${lineage.image}')` }} role="img" aria-label={lineage.imageAlt ?? undefined} />
          </div>
          <div className="reveal d2" style={{ direction: "ltr" }}>
            <div className="eyebrow">{lineage.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,50px)" }} dangerouslySetInnerHTML={{ __html: lineage.headingHtml ?? "" }} />
            {lineage.ledes.map((l, i) => (
              <p className="lede" style={{ marginTop: i === 0 ? 18 : 14 }} key={i}>
                {l}
              </p>
            ))}
            <ul className="incl plain" style={{ marginTop: 22, maxWidth: "none" }}>
              {lineage.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap">
          <div className="pq reveal">
            <p>{pq}</p>
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${stats.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{stats.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto 56px" }}>
            {stats.heading}
          </h2>
          <div className="stat-grid scale reveal d2">
            {stats.items.map((s, i) => (
              <div key={i}>
                <div className="v">{s.value}</div>
                <div className="k">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight center">
        <div className="wrap">
          <div className="eyebrow reveal">{partners.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "24ch", margin: "0 auto" }}>
            {partners.heading}
          </h2>
          <p className="lede reveal d2" style={{ margin: "26px auto 0" }}>
            {partners.lede}
          </p>
          <div className={`${styles.partners} reveal d2`}>
            {partners.items.map((p, i) => (
              <span key={i}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{people.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,50px)" }}>{people.heading}</h2>
            <p className="lede" style={{ marginTop: 18 }} dangerouslySetInnerHTML={{ __html: people.ledeHtml ?? "" }} />
            {people.lede2Html && <p className="lede" style={{ marginTop: 14 }} dangerouslySetInnerHTML={{ __html: people.lede2Html }} />}
          </div>
          <div className="reveal d2" style={{ display: "flex", flexDirection: "column", gap: 22, alignSelf: "center" }}>
            {people.feats.map((f, i) => (
              <div className="feat" key={i}>
                <div className="n">{f.label}</div>
                <h3>{f.heading}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${values.image}')` }}>
        <div className="wrap">
          <h2 className="quote center reveal" style={{ maxWidth: "26ch" }} dangerouslySetInnerHTML={{ __html: values.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ margin: "24px auto 0" }}>
            {values.lede}
          </p>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <h2 className="reveal" style={{ fontSize: "clamp(30px,4vw,58px)" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede reveal d1" style={{ margin: "22px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 26 }}>
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
