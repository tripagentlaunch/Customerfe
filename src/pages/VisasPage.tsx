import { useEffect } from "react";
import { Link } from "react-router-dom";
import visasData from "../data/visas.generated.json";
import type { VisasPageData } from "../types/visas";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./visas-page.module.css";

const data = visasData as unknown as VisasPageData;

export default function VisasPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, pullq, idx, feat, pullq2, startEarly, vtable, signature, howItWorks, faq, cta } = data;

  return (
    <main>
      <header className="hero left hero-ed" style={{ position: "relative", overflow: "hidden" }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "60% 50%",
            zIndex: 0,
          }}
        >
          <source src="/videos/visas/hero.mp4" type="video/mp4" />
        </video>
        <div className="wrap hero-inner" style={{ position: "relative", zIndex: 1 }}>
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
            <ul className={`incl ${styles.plain} lux-list`} style={{ marginTop: 22, maxWidth: "none" }}>
              {feat.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className={`reveal d2 ${styles.bleed}`}>
            <div className="deep-img" style={{ backgroundImage: `url('${feat.image}')` }} />
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

      <section className="band tight">
        <div className="wrap grid-2">
          <div className="reveal d2">
            <div className="deep-img" style={{ backgroundImage: `url('${startEarly.image}')` }} />
          </div>
          <div className="reveal">
            <div className="eyebrow">{startEarly.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{startEarly.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {startEarly.lede}
            </p>
            <ul className={`incl ${styles.plain}`} style={{ marginTop: 22, maxWidth: "none" }}>
              {startEarly.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✓</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 44 }}>
            <div className="eyebrow reveal">{vtable.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1">{vtable.heading}</h2>
            <p className="lede reveal d2" style={{ margin: "18px auto 0" }}>
              {vtable.lede}
            </p>
          </div>
          <div className={`${styles.vtableWrap} reveal d2`}>
            <table className={styles.vtable}>
              <thead>
                <tr>
                  {vtable.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vtable.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="dest">{r.dest}</td>
                    <td>{r.visaType}</td>
                    <td>{r.processing}</td>
                    <td className={r.biometricsYes ? styles.bioY : styles.bioN}>{r.biometrics}</td>
                    <td className={styles.note}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`${styles.vtableNote} reveal d2`}>{vtable.note}</p>
        </div>
      </section>

      <section className="signature" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.sigEyebrow} reveal`}>{signature.eyebrow}</div>
          <p className={`${styles.sigLine} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className={`${styles.sigSub} lede reveal d2`}>{signature.sub}</p>
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
