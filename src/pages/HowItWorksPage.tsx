import { useEffect } from "react";
import { Link } from "react-router-dom";
import howItWorksData from "../data/how-it-works-page.generated.json";
import type { HowItWorksPageData } from "../types/how-it-works-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import IPhoneMock from "./IPhoneMock";
import HowItWorksTabs from "../components/HowItWorksTabs";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./how-it-works-page.module.css";

const data = howItWorksData as unknown as HowItWorksPageData;

export default function HowItWorksPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, model, steps, journey, pq, rescue, sig } = data;

  return (
    <main>
      {/* Hero refreshed 2026-11-13 like Flights/Hotels/Visas: photo hero, "Find my trip" / "Chat with us". The inset photo
          card and the old buttons ("Enter your invitation", "See how a trip comes together") are no longer shown. */}
      <header className={styles.fHero} style={{ backgroundImage: `linear-gradient(90deg, rgba(8,6,5,.82) 0%, rgba(8,6,5,.6) 45%, rgba(8,6,5,.4) 100%), url('${hero.image}')` }}>
        <div className="wrap">
          <div className={styles.fHeroCopy}>
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className={`btn-row ${styles.fHeroBtns} reveal d3`}>
              <PrimaryInverseButton to="destinations.html">Find my trip</PrimaryInverseButton>
              <SecondaryInverseButton to="concierge.html">Chat with us</SecondaryInverseButton>
            </div>
          </div>
        </div>
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

      {/* "Five steps. The last one is where everyone else stops." removed 2026-11-13, direct request (the pinned section below covers it). */}
      {false && (
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{steps.eyebrow}</div>
            <div className="rule" />
            <h2>{steps.heading}</h2>
          </div>
          <div className={`${styles.fTiles} reveal d1`}>
            {steps.items.map((st, i) => (
              <div className={styles.fTile} key={i}>
                <div className={styles.fTileLabel}>{st.nn}</div>
                <h3>{st.heading}</h3>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* "From a wish to a journey" (phone mock + copy) replaced 2026-11-13, direct request, by the home page's pinned
          Enquiry > Booking > The Journey > The Contingency Desk > Home section, with its sticky scroll and auto-advance.
          The old section is kept below behind `false &&` for easy restore. */}
      <span id="journey" style={{ display: "block" }} />
      <HowItWorksTabs />
      {false && (
      <section className="band tight">
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
      )}

      {/* Pull quote ("A flight rebooked before you wake: handled.") hidden 2026-11-13, in line with Hotels and Visas. */}
      {false && (
      <section className="band tight">
        <div className="wrap">
          <div className="pq reveal">
            <p>{pq}</p>
          </div>
        </div>
      </section>
      )}

      {/* "The difference shows at 2 a.m." (phone mock + copy) removed 2026-11-13, direct request. */}
      {false && (
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
      )}

      {/* "The whole way" band: its content now lives in the closing band below (2026-11-13, direct request); band kept hidden. */}
      {false && (
      <section className={`sig ${styles.fSig}`} style={{ backgroundImage: `url('${sig.image}')` }}>
        <div className="wrap">
          <div className="eyebrow reveal">{sig.eyebrow}</div>
          <div className="rule reveal d1" />
          <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: sig.headingHtml ?? "" }} />
          <p className="lede reveal d2">{sig.lede}</p>
        </div>
      </section>
      )}

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${sig.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{sig.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "24ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: sig.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0", maxWidth: "52ch" }}>
            {sig.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            <PrimaryInverseButton to="concierge.html">Plan a trip</PrimaryInverseButton>
          </div>
        </div>
      </section>
    </main>
  );
}
