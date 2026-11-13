import { useEffect } from "react";
import { Link } from "react-router-dom";
import servicesData from "../data/services-page.generated.json";
import type { ServicesPageData } from "../types/services-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
// import styles from "./services-page.module.css"; // layout now uses the shared rf-* styles (css/refresh.css)

const data = servicesData as unknown as ServicesPageData;

// Design refresh (2026-11-13, direct request): same treatment as Flights, Hotels, Visas, Protection and About.
export default function ServicesPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, services, pq, whyOnlyThree, health, signature } = data;
  void pq;

  return (
    <main>
      <header className="rf-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,6,5,.82) 0%, rgba(8,6,5,.6) 45%, rgba(8,6,5,.4) 100%), url('${hero.image}')` }}>
        <div className="wrap">
          <div className="rf-hero-copy">
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className="btn-row rf-hero-btns reveal d3">
              <PrimaryInverseButton to="destinations.html">Find my trip</PrimaryInverseButton>
              <SecondaryInverseButton to="concierge.html">Chat with us</SecondaryInverseButton>
            </div>
          </div>
        </div>
      </header>

      {services.map((svc, i) => (
        <section className={i === 1 ? "band tight" : "band"} style={i === 1 ? { background: "var(--bone)" } : undefined} id={svc.id ?? undefined} key={i}>
          <div className={`wrap rf-split${i % 2 === 1 ? " rev" : ""}`}>
            <div className="rf-pic reveal" style={{ backgroundImage: `url('${svc.image}')` }} role="img" aria-label={svc.imageAlt ?? undefined} />
            <div className="reveal d1">
              <div className="eyebrow">{svc.no ? `${svc.no} · ` : ""}{svc.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }} dangerouslySetInnerHTML={{ __html: svc.headingHtml ?? "" }} />
              <p className="lede" style={{ marginTop: 16 }}>
                {svc.lede}
              </p>
              <ul className="rf-checks">
                {svc.items.map((it, ii) => (
                  <li key={ii}>
                    <span aria-hidden="true">✓</span>
                    <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                  </li>
                ))}
              </ul>
              <div className="btn-row" style={{ marginTop: 26 }}>
                <Link className="btn btn-gold" to={toRoute(svc.cta.href)}>
                  {svc.cta.label}
                </Link>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Pull quote ("The welcome that tells you that you were expected.") hidden 2026-11-13, in line with the other pages. */}
      {false && (
        <section className="band tight">
          <div className="wrap">
            <div className="pq">
              <p>{pq}</p>
            </div>
          </div>
        </section>
      )}

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="rf-head reveal">
            <div className="eyebrow">{whyOnlyThree.eyebrow}</div>
            <div className="rule" />
            <h2 dangerouslySetInnerHTML={{ __html: whyOnlyThree.headingHtml ?? "" }} />
            <p className="lede">{whyOnlyThree.lede}</p>
          </div>
        </div>
      </section>

      <section className="band tight" id="health">
        <div className="wrap">
          <div className="rf-tile reveal" style={{ padding: "clamp(24px,3vw,40px)" }}>
            <div className="rf-label">{health.tag}</div>
            <h3 style={{ fontSize: "clamp(24px,2.6vw,34px)" }} dangerouslySetInnerHTML={{ __html: health.headingHtml ?? "" }} />
            <p style={{ marginTop: 12, maxWidth: "70ch" }}>{health.body}</p>
            <p className="rf-note">{health.note}</p>
            <p style={{ marginTop: 16, maxWidth: "70ch" }}>{health.asideLede}</p>
            <div className="btn-row" style={{ marginTop: 22 }}>
              <Link className="btn btn-gold" to={toRoute(health.cta.href)}>
                {health.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rf-sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className="eyebrow reveal">{signature.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className="lede reveal d2">{signature.sub}</p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            <PrimaryInverseButton to="concierge.html">Plan a trip</PrimaryInverseButton>
          </div>
        </div>
      </section>
    </main>
  );
}
