import { useEffect } from "react";
import { Link } from "react-router-dom";
import servicesData from "../data/services-page.generated.json";
import type { ServicesPageData } from "../types/services-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./services-page.module.css";

const data = servicesData as unknown as ServicesPageData;

export default function ServicesPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, services, pq, whyOnlyThree, health, signature } = data;

  return (
    <main>
      <header className="hero left hero-ed" style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "58% 42%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row reveal d3">
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaGold.href)}>
                {hero.ctaGold.label}
              </Link>
              <Link className="hero-textlink" to={toRoute(hero.ctaText.href)}>
                {hero.ctaText.label}
              </Link>
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      {services.map((svc, i) => (
        <section className={i === 1 ? "band tight" : "band"} style={i === 1 ? { background: "var(--bone)" } : undefined} id={svc.id ?? undefined} key={i}>
          <div className={svc.flip ? `wrap ${styles.svcBlock} ${styles.flip}` : `wrap ${styles.svcBlock}`}>
            {svc.flip && (
              <div className="reveal d2">
                <img className="svc-img" src={svc.image} loading="lazy" decoding="async" alt={svc.imageAlt ?? ""} />
              </div>
            )}
            <div className="reveal">
              <span className={styles.svcNo}>{svc.no}</span>
              <div className="eyebrow">{svc.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(30px,3.6vw,54px)" }} dangerouslySetInnerHTML={{ __html: svc.headingHtml ?? "" }} />
              <p className="lede" style={{ marginTop: 18 }}>
                {svc.lede}
              </p>
              <ul className="incl" style={{ marginTop: 24, maxWidth: "none" }}>
                {svc.items.map((it, ii) => (
                  <li key={ii}>
                    <span className="ck">✦</span>
                    <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                  </li>
                ))}
              </ul>
              <Link className="cta" to={toRoute(svc.cta.href)}>
                {svc.cta.label}
              </Link>
            </div>
            {!svc.flip && (
              <div className="reveal d2">
                <img className="svc-img" src={svc.image} loading="lazy" decoding="async" alt={svc.imageAlt ?? ""} />
              </div>
            )}
          </div>
        </section>
      ))}

      <section className="band tight">
        <div className="wrap">
          <div className="pq reveal">
            <p>{pq}</p>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap" style={{ maxWidth: 980 }}>
          <div className="eyebrow reveal">{whyOnlyThree.eyebrow}</div>
          <div className="rule reveal d1" />
          <h2 className="quote reveal d1" style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: whyOnlyThree.headingHtml ?? "" }} />
          <p className="lede reveal d2" style={{ margin: "26px 0 0", maxWidth: "54ch" }}>
            {whyOnlyThree.lede}
          </p>
        </div>
      </section>

      <section className="band tight" id="health">
        <div className="wrap">
          <div className={`${styles.svcAside} reveal`}>
            <div>
              <div className="tag">{health.tag}</div>
              <h3 dangerouslySetInnerHTML={{ __html: health.headingHtml ?? "" }} />
              <p>{health.body}</p>
              <p className={styles.asideNote}>{health.note}</p>
              <Link className="cta" to={toRoute(health.cta.href)}>
                {health.cta.label}
              </Link>
            </div>
            <div>
              <p className="lede" style={{ margin: 0 }}>
                {health.asideLede}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="signature" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.sigEyebrow} reveal`}>{signature.eyebrow}</div>
          <p className={`${styles.sigLine} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className={`${styles.sigSub} lede reveal d2`}>{signature.sub}</p>
          <div className="btn-row center reveal d3" style={{ marginTop: 32 }}>
            {signature.buttons.map((b, i) =>
              i === 0 ? (
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
      </section>
    </main>
  );
}
