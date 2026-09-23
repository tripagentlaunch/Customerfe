import { useEffect } from "react";
import { Link } from "react-router-dom";
import membershipData from "../data/membership-page.generated.json";
import type { MembershipPageData } from "../types/membership-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./membership-page.module.css";

const data = membershipData as unknown as MembershipPageData;

export default function MembershipPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, price, value, signature, compare, pq, faq, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.heroMem}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "62% 32%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row">
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaGold.href)}>
                {hero.ctaGold.label}
              </Link>
              <a className={styles.memTextlink} href={hero.ctaText.href}>
                {hero.ctaText.label}
              </a>
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <a id="price" />
      <section className="band center">
        <div className="wrap">
          <div className="price-card reveal">
            <div className="tier">{price.tier}</div>
            <div className="amt" dangerouslySetInnerHTML={{ __html: price.amountHtml ?? "" }} />
            <div className="free">{price.free}</div>
            <ul className="incl lux-list">
              {price.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
            <div className="btn-row center" style={{ marginTop: 34 }}>
              <Link className="btn btn-gold" to={toRoute(price.cta.href)}>
                {price.cta.label}
              </Link>
            </div>
            <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
              {price.note}
            </p>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap ed-grid editorial">
          <div className="ed-meta reveal">
            <div className="eyebrow">{value.eyebrow}</div>
            <p className="ed-note">{value.note}</p>
          </div>
          <div className={`${styles.edMain} reveal d1`}>
            <h2 className="ed-statement">{value.statement}</h2>
            <p className="lede" style={{ marginTop: 26, maxWidth: "52ch" }}>
              {value.lede}
            </p>
            <div className="stats reveal d2" style={{ marginTop: 34, background: "var(--card)", borderRadius: "var(--r-lg)", border: "1px solid var(--hair)" }}>
              {value.stats.map((s, i) => (
                <div className="stat" key={i}>
                  <div className="v">{s.value}</div>
                  <div className="k">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal" style={{ display: "block", marginBottom: 18 }}>
            {signature.eyebrow}
          </div>
          <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: signature.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2">{signature.lede}</p>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{compare.alone.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }} dangerouslySetInnerHTML={{ __html: compare.alone.headingHtml ?? "" }} />
            <ul className="incl" style={{ marginTop: 24, maxWidth: "none" }}>
              {compare.alone.items.map((it, i) => (
                <li key={i}>
                  <span className="ck muted">—</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal d2" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 18, padding: "clamp(28px,3vw,44px)" }}>
            <div className="eyebrow">{compare.tripagent.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }} dangerouslySetInnerHTML={{ __html: compare.tripagent.headingHtml ?? "" }} />
            <ul className="incl" style={{ marginTop: 24, maxWidth: "none" }}>
              {compare.tripagent.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
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

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 40 }}>
            <div className="eyebrow reveal">{faq.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1">{faq.heading}</h2>
          </div>
          <div className="faq reveal d2">
            {faq.items.map((it, i) => (
              <details open={it.open || undefined} key={i}>
                <summary>{it.question}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.answerHtml ?? "" }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
        <div className="wrap">
          <h2 className="reveal d1" style={{ fontSize: "clamp(34px,5vw,68px)" }}>
            {cta.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "18px auto 30px" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d3">
            {cta.buttons.map((b, i) => (
              <Link className="btn btn-gold" to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
