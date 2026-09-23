import { useEffect } from "react";
import { Link } from "react-router-dom";
import protectionData from "../data/protection-page.generated.json";
import type { ProtectionPageData } from "../types/protection-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./protection-page.module.css";

const data = protectionData as unknown as ProtectionPageData;

export default function ProtectionPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, promises, matters, pq, money, signature, steps, faq, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.heroPro}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "58% 40%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 className="display" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row">
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaGold.href)}>
                {hero.ctaGold.label}
              </Link>
              <Link className={styles.proTextlink} to={toRoute(hero.ctaText.href)}>
                {hero.ctaText.label}
              </Link>
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className="band center">
        <div className="wrap">
          <h2 className="reveal" style={{ maxWidth: "22ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: intro.headingHtml ?? "" }} />
          <p className="lede reveal d2" style={{ margin: "24px auto 0" }}>
            {intro.lede}
          </p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 46 }}>
            <div className="eyebrow reveal">{promises.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1">{promises.heading}</h2>
          </div>
          <div className="grid-3">
            {promises.items.map((it, i) => (
              <div className={`svc ${styles.tile} reveal`} key={i}>
                <div className="n">{it.n}</div>
                <h3>{it.heading}</h3>
                <p>{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{matters.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{matters.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {matters.lede}
            </p>
            <ul className={`incl ${styles.plain}`} style={{ marginTop: 22, maxWidth: "none" }}>
              {matters.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal d2">
            <div className="deep-img" style={{ backgroundImage: `url('${matters.image}')` }} />
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

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap grid-2">
          <div className="reveal d2">
            <div className="deep-img" style={{ backgroundImage: `url('${money.image}')` }} />
          </div>
          <div className="reveal">
            <div className="eyebrow">{money.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{money.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {money.lede}
            </p>
            <ul className={`incl ${styles.plain}`} style={{ marginTop: 22, maxWidth: "none" }}>
              {money.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className="eyebrow reveal">{signature.eyebrow}</div>
          <div className="rule reveal d1" />
          <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: signature.headingHtml ?? "" }} />
          <p className="lede reveal d2">{signature.lede}</p>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{steps.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{steps.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {steps.lede}
            </p>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <Link className="btn btn-gold" to={toRoute(steps.cta.href)}>
                {steps.cta.label}
              </Link>
            </div>
          </div>
          <div className="reveal d2">
            <div className="steps">
              {steps.items.map((s, i) => (
                <div className="step" key={i}>
                  <div className="si">{s.n}</div>
                  <div>
                    <h4>{s.heading}</h4>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 40 }}>
            <div className="eyebrow reveal">{faq.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1">{faq.heading}</h2>
          </div>
          <div className="faq reveal d2">
            {faq.items.map((it, i) => (
              <details key={i}>
                <summary>{it.question}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.answerHtml ?? "" }} />
              </details>
            ))}
          </div>
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
