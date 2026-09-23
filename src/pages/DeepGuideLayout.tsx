import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { DeepGuidePageData } from "../types/deep-guide";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";

// Three different page-scoped CSS Modules (hotel-programmes-page.module.css,
// suites-worth-it-page.module.css, the-right-room-page.module.css) apply to
// this ONE shared layout's markup, each with its own hashed local classes
// (and slightly different rule values per page) — so the caller passes its
// own module's classes in as `styles` rather than this file importing one
// fixed module itself.
type DeepGuideStyles = Record<string, string>;

export default function DeepGuideLayout({ data, styles }: { data: DeepGuidePageData; styles: DeepGuideStyles }) {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  const { hero, intro, idx, signature, vrow, line, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.dpHero}`} style={{ backgroundImage: `url('${hero.image}')` }}>
        <div className="wrap hero-inner">
          <div className={styles.dpCopy}>
            <Link className="cta on-dark reveal" to={toRoute(hero.back.href)} style={{ marginBottom: 20 }}>
              ← {hero.back.label}
            </Link>
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className={`${styles.dpCta} reveal d2`}>
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaGold.href)}>
                {hero.ctaGold.label}
              </Link>
              <a className="cta on-dark" href={hero.ctaText.href}>
                {hero.ctaText.label}
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="band">
        <div className="wrap editorial">
          <div className="ed-grid">
            <div className="ed-meta reveal">
              <div className="eyebrow">{intro.eyebrow}</div>
              <p className="ed-note">{intro.note}</p>
            </div>
            <div className="reveal d1">
              <p className="ed-statement">{intro.statement}</p>
              <p className="lede" style={{ marginTop: 22 }}>
                {intro.lede}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }} id={hero.ctaText.href.replace("#", "")}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "32ch" }}>
            <div className="eyebrow">{idx.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{idx.heading}</h2>
            {idx.lede && (
              <p className="lede" style={{ marginTop: 16 }}>
                {idx.lede}
              </p>
            )}
          </div>
          <ol className={`${styles.idx} reveal d1`}>
            {idx.items.map((it, i) => (
              <li key={i}>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{signature.by}</div>
          <p className={`${styles.pull} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.pullHtml ?? "" }} />
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.vrow}`}>
          <div className="reveal">
            <div className="eyebrow">{vrow.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{vrow.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {vrow.lede}
            </p>
            <ul className={styles.cpLines}>
              {vrow.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal d1">
            <div className="ov-img" style={{ backgroundImage: `url('${vrow.image}')` }} />
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap center">
          <div className="eyebrow reveal">{line.eyebrow}</div>
          <div className="rule center reveal d1" />
          <p className={`${styles.when} reveal d1`} style={{ margin: "18px auto 0" }}>
            {line.text}
          </p>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }}>
            {cta.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold on-dark" : "btn btn-ghost on-dark"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
