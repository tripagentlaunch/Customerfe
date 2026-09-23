import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import visas from "../data/visa.generated.json";
import type { VisaData, VisaLines } from "../types/visa";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./visa-page.module.css";

const VISAS = visas as unknown as Record<string, VisaData>;

function CpLines({ lines, className = styles.cpLines }: { lines: VisaLines; className?: string }) {
  return (
    <ul className={`${className}${lines.warn ? ` ${styles.warn}` : ""}`}>
      {lines.points.map((p, i) => (
        <li key={i}>
          <span className="ck">{p.symbol}</span>
          <span dangerouslySetInnerHTML={{ __html: p.html ?? "" }} />
        </li>
      ))}
    </ul>
  );
}

export default function VisaPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? VISAS[pageSlug] : undefined;

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  if (!data) {
    return (
      <div className="wrap band">
        <p>Not yet ported to the app.</p>
      </div>
    );
  }

  const { hero, facts, what, docs, process, pitfalls, signature, how, faq, closing } = data;

  return (
    <>
      <header
        className="hero left hero-ed"
        data-hero
        style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: hero.imagePosition ?? undefined }}
      >
        <div className="wrap hero-inner">
          <div className="hs-copy">
            {hero.backLink && (
              <Link className="cta on-dark reveal" to={toRoute(hero.backLink.href)} style={{ marginBottom: 20 }}>
                {hero.backLink.label}
              </Link>
            )}
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row reveal d3">
              {hero.ctaPrimary && (
                <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaPrimary.href)}>
                  {hero.ctaPrimary.label}
                </Link>
              )}
              {hero.ctaSecondary && (
                <a className="hero-textlink" href={hero.ctaSecondary.href}>
                  {hero.ctaSecondary.label}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className="band tight">
        <div className="wrap">
          <div className={`${styles.facts} reveal`}>
            {facts.map((f, i) => (
              <div className={styles.f} key={i}>
                <div className="k">{f.label}</div>
                <div className="v">{f.value}</div>
                <div className={styles.s}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className={`wrap ${styles.two}`}>
          {what.map((col, i) => (
            <div className={`reveal${i > 0 ? " d1" : ""}`} key={i}>
              <div className="eyebrow">{col.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }}>{col.heading}</h2>
              <p className="lede" style={{ marginTop: 16 }}>
                {col.lede}
              </p>
              {col.extraParagraph && (
                <p style={{ marginTop: 14, color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.6 }}>{col.extraParagraph}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="band tight">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "40ch", marginBottom: 8 }}>
            <div className="eyebrow">{docs.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }}>{docs.heading}</h2>
          </div>
          <div className={`${styles.two} reveal d1`}>
            {docs.lists.map((l, i) => (
              <CpLines lines={l} key={i} />
            ))}
          </div>
          {docs.hedge && <p className={`${styles.hedge} reveal`}>{docs.hedge}</p>}
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div
            className="reveal"
            style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "18px 40px", marginBottom: 14 }}
          >
            <div style={{ maxWidth: "32ch" }}>
              <div className="eyebrow">{process.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ margin: 0 }}>{process.heading}</h2>
            </div>
            <p className="lede" style={{ maxWidth: "36ch" }}>
              {process.lede}
            </p>
          </div>
          <div className={`${styles.idx} reveal d1`}>
            {process.steps.map((s, i) => (
              <div className={styles.row} key={i}>
                <div className={styles.no}>{s.n}</div>
                <div className={styles.bd}>
                  <h3>{s.heading}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
          {process.hedge && <p className={`${styles.hedge} reveal`}>{process.hedge}</p>}
        </div>
      </section>

      <section className="band tight">
        <div className={`wrap ${styles.two}`}>
          {pitfalls.map((col, i) => (
            <div className={`reveal${i > 0 ? " d1" : ""}`} key={i}>
              <div className="eyebrow">{col.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }}>{col.heading}</h2>
              {col.lede && (
                <p className="lede" style={{ marginTop: 16 }}>
                  {col.lede}
                </p>
              )}
              <CpLines lines={col.list} />
            </div>
          ))}
        </div>
      </section>

      <section className="signature" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.sigEyebrow} reveal`}>{signature.eyebrow}</div>
          <p className={`${styles.sigLine} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className={`${styles.sigSub} lede reveal d2`}>{signature.sub}</p>
        </div>
      </section>

      <section className="band" id={how.anchorId ?? undefined}>
        <div className={`wrap ${styles.featAsym}`}>
          <div className="reveal">
            <div className="eyebrow">{how.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }} dangerouslySetInnerHTML={{ __html: how.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 16 }}>
              {how.lede}
            </p>
            <CpLines lines={how.list} />
            <div className="btn-row" style={{ marginTop: 26 }}>
              {how.ctaPrimary && (
                <Link className="btn btn-gold" to={toRoute(how.ctaPrimary.href)}>
                  {how.ctaPrimary.label}
                </Link>
              )}
              {how.ctaSecondary && (
                <Link className="btn btn-ghost" to={toRoute(how.ctaSecondary.href)}>
                  {how.ctaSecondary.label}
                </Link>
              )}
            </div>
          </div>
          <div className="reveal d2">
            <div className="deep-img" style={{ backgroundImage: `url('${how.image}')` }} />
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 36 }}>
            <div className="eyebrow reveal">{faq.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1">{faq.heading}</h2>
          </div>
          <div className="faq reveal d2">
            {faq.items.map((item, i) => (
              <details key={i}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{closing.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ fontSize: "clamp(32px,4.4vw,60px)" }} dangerouslySetInnerHTML={{ __html: closing.headingHtml ?? "" }} />
          <p className="lede reveal d2" style={{ margin: "18px auto 0" }}>
            {closing.lede}
          </p>
          <div className="btn-row center reveal d3" style={{ marginTop: 30 }}>
            {closing.ctaPrimary && (
              <Link className="btn btn-gold" to={toRoute(closing.ctaPrimary.href)}>
                {closing.ctaPrimary.label}
              </Link>
            )}
            {closing.ctaSecondary && (
              <Link className="btn btn-ghost" to={toRoute(closing.ctaSecondary.href)}>
                {closing.ctaSecondary.label}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
