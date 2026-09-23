import { useEffect } from "react";
import { Link } from "react-router-dom";
import howItWorksData from "../data/how-it-works-page.generated.json";
import type { HowItWorksPageData } from "../types/how-it-works-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import IPhoneMock from "./IPhoneMock";
import styles from "./how-it-works-page.module.css";

const data = howItWorksData as unknown as HowItWorksPageData;

export default function HowItWorksPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, model, steps, journey, pq, rescue, sig, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.heroHiw}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "60% 40%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row">
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaHref)}>
                {hero.ctaLabel}
              </Link>
              <a className={styles.hiwTextlink} href={hero.jumpHref}>
                {hero.jumpLabel}
              </a>
            </div>
          </div>
        </div>
        <figure className={styles.heroInset}>
          <div className="pic" style={{ backgroundImage: `url('${hero.inset.image}')` }} />
          <figcaption className="cap">
            <div className="k">{hero.inset.kicker}</div>
            <div className="t">{hero.inset.caption}</div>
          </figcaption>
        </figure>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className="band editorial">
        <div className="wrap ed-grid">
          <div className="ed-meta reveal">
            <div className="eyebrow">{model.eyebrow}</div>
            <p className="ed-note">{model.note}</p>
          </div>
          <div className="ed-main reveal d1">
            <h2 className="ed-statement" dangerouslySetInnerHTML={{ __html: model.statementHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 28, maxWidth: "50ch" }}>
              {model.lede}
            </p>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "30ch", marginBottom: "clamp(34px,4vw,56px)" }}>
            <div className="eyebrow">{steps.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,3.8vw,54px)" }}>{steps.heading}</h2>
          </div>
          <div className={`${styles.idx} reveal d1`}>
            {steps.items.map((s, i) => (
              <div className={styles.row} key={i}>
                <div className="nn">{s.nn}</div>
                <div className={styles.bd}>
                  <h3>{s.heading}</h3>
                  <p>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" id="journey">
        <div className="wrap grid-2">
          <div className="reveal" style={{ display: "flex", justifyContent: "center" }}>
            <IPhoneMock phone={journey.phone} />
          </div>
          <div className="reveal d2">
            <div className="eyebrow">
              <span className="demo-live">{journey.liveLabel}</span>
            </div>
            <h2 style={{ fontSize: "clamp(30px,3.6vw,52px)", marginTop: 14 }} dangerouslySetInnerHTML={{ __html: journey.headingHtml ?? "" }} />
            {journey.ledes.map((l, i) => (
              <p className="lede" style={{ marginTop: i === 0 ? 16 : 14 }} key={i}>
                {l}
              </p>
            ))}
            <div className="btn-row" style={{ marginTop: 28 }}>
              <Link className="btn btn-ghost" to={toRoute(journey.ctaHref)}>
                {journey.ctaLabel}
              </Link>
            </div>
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

      <section className="band">
        <div className="wrap grid-2" style={{ direction: "rtl" }}>
          <div className="reveal" style={{ display: "flex", justifyContent: "center", direction: "ltr" }}>
            <IPhoneMock phone={rescue.phone} />
          </div>
          <div className="reveal d2" style={{ direction: "ltr" }}>
            <div className="eyebrow">{rescue.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,50px)" }} dangerouslySetInnerHTML={{ __html: rescue.headingHtml ?? "" }} />
            {rescue.ledes.map((l, i) => (
              <p className="lede" style={{ marginTop: i === 0 ? 18 : 14 }} key={i}>
                {l}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${sig.image}')` }}>
        <div className="wrap">
          <div className="eyebrow reveal">{sig.eyebrow}</div>
          <div className="rule reveal d1" />
          <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: sig.headingHtml ?? "" }} />
          <p className="lede reveal d2">{sig.lede}</p>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <h2 className="reveal" style={{ fontSize: "clamp(30px,4vw,58px)" }}>
            {cta.heading}
          </h2>
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
