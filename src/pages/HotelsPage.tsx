import { useEffect } from "react";
import { Link } from "react-router-dom";
import hotelsData from "../data/hotels.generated.json";
import type { HotelsPageData } from "../types/hotels";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { TaraAI } from "../components/TaraAI";
import styles from "./hotels-page.module.css";

const data = hotelsData as unknown as HotelsPageData;

// #hs-app (js/hotel-search.js) is a real live search -> room -> guest ->
// book -> cancel flow talking to a local proxy holding real TripSure API
// credentials — genuine booking/payment infrastructure, not a lead form.
// Per CLAUDE.md this is queued for Amit's named OK; the shell here is a
// static placeholder pointing at the working /enquire conversion path,
// same pattern as TripPage/SearchPage.
export default function HotelsPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, searchGate, pullq, idx, feat, signature, examples, howItWorks, pullq2, faq, cta } = data;

  return (
    <main>
      <header className="hero left hero-ed" style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "60% 50%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
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

      <section className="band">
        <div className="wrap">
          <div style={{ marginBottom: 34, maxWidth: "56ch" }}>
            <div className="eyebrow">{searchGate.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ margin: 0 }}>{searchGate.heading}</h2>
          </div>
          <div className={styles.hsGate}>
            <p>Live search is on its way. Meanwhile, tell your advisor the dates and the destination — they'll hold rooms and rates for you directly.</p>
            <Link className="btn btn-gold" to="/enquire">
              Plan a trip with <TaraAI />
            </Link>
          </div>
        </div>
      </section>

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
          <div className="reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "18px 40px", marginBottom: 14 }}>
            <div style={{ maxWidth: "32ch" }}>
              <div className="eyebrow">{idx.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ margin: 0 }}>{idx.heading}</h2>
            </div>
            <p className="lede" style={{ maxWidth: "34ch" }}>
              {idx.lede}
            </p>
          </div>
          <div className={`${styles.idx} reveal d1`}>
            {idx.rows.map((r, i) => (
              <div className={styles.row} key={i}>
                <div className={styles.no}>{r.no}</div>
                <div className={styles.bd}>
                  <h3>{r.heading}</h3>
                  <p>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.featAsym}`}>
          <div className="reveal">
            <span className={styles.leadNum}>{feat.leadNum}</span>
            <div className="eyebrow">{feat.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }} dangerouslySetInnerHTML={{ __html: feat.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 16 }}>
              {feat.lede}
            </p>
            <ul className={`incl ${styles.plain}`} style={{ marginTop: 22, maxWidth: "none" }}>
              {feat.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✓</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`reveal d2 ${styles.bleed}`}>
            <div className="deep-img" style={{ backgroundImage: `url('${feat.image}')` }} />
          </div>
        </div>
      </section>

      <section className="signature" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.sigEyebrow} reveal`}>{signature.eyebrow}</div>
          <p className={`${styles.sigLine} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className={`${styles.sigSub} lede reveal d2`}>{signature.sub}</p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "18px 40px", marginBottom: 42 }}>
            <div style={{ maxWidth: "26ch" }}>
              <div className="eyebrow">{examples.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ margin: 0 }}>{examples.heading}</h2>
            </div>
            <p className="lede" style={{ maxWidth: "44ch" }}>
              {examples.lede}
            </p>
          </div>
          <div className="grid-3">
            {examples.tiles.map((t, i) => (
              <div className={`svc ${styles.tile} reveal`} key={i}>
                <div className="n">{t.label}</div>
                <h3>{t.heading}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{howItWorks.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{howItWorks.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {howItWorks.lede}
            </p>
            {howItWorks.cta && (
              <div className="btn-row" style={{ marginTop: 24 }}>
                <Link className="btn btn-gold" to={toRoute(howItWorks.cta.href)}>
                  {howItWorks.cta.label}
                </Link>
              </div>
            )}
          </div>
          <div className="reveal d2">
            <div className="steps">
              {howItWorks.steps.map((s, i) => (
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

      <section className="band tight">
        <div className="wrap">
          <div className="pq reveal">
            <p>{pullq2}</p>
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
                <summary>{it.summary}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </details>
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
