import { useEffect } from "react";
import { Link } from "react-router-dom";
import bvfData from "../data/business-vs-first.generated.json";
import type { BusinessVsFirstPageData, VRowSection } from "../types/business-vs-first";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./business-vs-first-page.module.css";

const data = bvfData as unknown as BusinessVsFirstPageData;

function VRow({ v, reverse }: { v: VRowSection; reverse?: boolean }) {
  const copy = (
    <div className="reveal">
      <div className="eyebrow">{v.eyebrow}</div>
      <div className="rule" />
      <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{v.heading}</h2>
      {v.ledes.map((l, i) => (
        <p className="lede" style={{ marginTop: i === 0 ? 16 : 14 }} key={i}>
          {l}
        </p>
      ))}
    </div>
  );
  const img = (
    <div className="reveal d1" style={reverse ? { order: 2 } : undefined}>
      <img className="ov-img" src={v.image ?? undefined} alt={v.imageAlt ?? ""} loading="lazy" />
    </div>
  );
  return (
    <div className={`wrap ${styles.vrow}`}>
      {reverse ? (
        <>
          {img}
          {copy}
        </>
      ) : (
        <>
          {copy}
          {img}
        </>
      )}
    </div>
  );
}

export default function BusinessVsFirstPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, compare, decide, firstWins, signature, businessWins, ask, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.dpHero}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "55% 50%" }}>
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
        <div className="dp-meta">
          <div className="k">{hero.metaK}</div>
          <div className="t">{hero.metaT}</div>
        </div>
      </header>

      <section className="band">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "36ch", marginBottom: 30 }}>
            <div className="eyebrow">{compare.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,56px)" }}>{compare.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {compare.lede}
            </p>
          </div>
          <div className={`${styles.cmp} reveal d1`}>
            {compare.cols.map((c, i) => (
              <div className={styles.col} key={i}>
                <div className="tag">{c.tag}</div>
                <h3>{c.heading}</h3>
                <ul>
                  {c.items.map((it, j) => (
                    <li key={j}>
                      <span className="ck">✦</span>
                      <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }} id={decide.id}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch" }}>
            <div className="eyebrow">{decide.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,56px)" }}>{decide.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {decide.lede}
            </p>
          </div>
          <ol className={`${styles.idx} reveal d1`}>
            {decide.items.map((it, i) => (
              <li key={i}>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band">
        <VRow v={firstWins} />
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{signature.by}</div>
          <p className={`${styles.pull} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.pullHtml ?? "" }} />
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <VRow v={businessWins} reverse />
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{ask.eyebrow}</div>
          <div className="rule center reveal d1" />
          <p className={`${styles.when} reveal d1`} style={{ margin: "18px auto 0" }}>
            {ask.text}
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
