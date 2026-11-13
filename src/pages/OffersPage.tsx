import { useEffect } from "react";
import offersData from "../data/offers.generated.json";
import type { OffersPageData } from "../types/offers";
import { useScrollReveal } from "../lib/useScrollReveal";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
// import styles from "./offers-page.module.css"; // layout now uses the shared rf-* styles (css/refresh.css)

const data = offersData as unknown as OffersPageData;

// Design refresh (2026-11-13, direct request): same treatment as the other service pages (shared rf-* styles).
export default function OffersPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, features, value, cta } = data;
  void intro;

  return (
    <>
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

      <main>
        {/* Intro statement ("Not deals. Not coupons...") hidden 2026-11-13, in line with the other pages. */}
        {false && (
          <section className="band center tight">
            <div className="wrap">
              <p className="lede" style={{ maxWidth: "60ch", margin: "0 auto" }}>
                {intro}
              </p>
            </div>
          </section>
        )}

        {features.map((f, i) => (
          <section
            className={`band${i === 1 ? " tight" : ""}`}
            style={i === 1 ? { background: "var(--bone)" } : undefined}
            id={f.id ?? undefined}
            key={f.id ?? i}
          >
            <div className={`wrap rf-split${i % 2 === 1 ? " rev" : ""}`}>
              <div className="rf-pic reveal" style={{ backgroundImage: `url('${f.image}')` }} role="img" aria-label={f.imageAlt ?? undefined} />
              <div className="reveal d1">
                <div className="eyebrow">{f.eyebrow}</div>
                <div className="rule" />
                <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }} dangerouslySetInnerHTML={{ __html: f.headingHtml ?? "" }} />
                <p className="lede" style={{ marginTop: 16 }}>
                  {f.lede}
                </p>
                <ul className="rf-checks">
                  {f.items.map((it, j) => (
                    <li key={j}>
                      <span aria-hidden="true">✓</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}

        <section className="rf-sig" style={{ backgroundImage: `url('${value.image}')` }}>
          <div className="wrap">
            <div className="eyebrow reveal">{value.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: value.headingHtml ?? "" }} />
            <p className="lede reveal d2">{value.lede}</p>
          </div>
        </section>

        <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
          <div className="wrap">
            <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0", maxWidth: "48ch" }}>
              {cta.lede}
            </p>
            <div className="btn-row center reveal d3" style={{ marginTop: 28 }}>
              <PrimaryInverseButton to="concierge.html">Plan a trip</PrimaryInverseButton>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
