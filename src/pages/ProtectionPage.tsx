import { useEffect } from "react";
// import { Link } from "react-router-dom"; // unused since the 2026-11-13 refresh
import protectionData from "../data/protection-page.generated.json";
import type { ProtectionPageData } from "../types/protection-page";
import { useScrollReveal } from "../lib/useScrollReveal";
// import { toRoute } from "../lib/toRoute"; // unused since the 2026-11-13 refresh
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./protection-page.module.css";

const data = protectionData as unknown as ProtectionPageData;

// Design refresh (2026-11-13, direct request), same treatment as Flights, Hotels and Visas. Copy is unchanged; the
// two statement blocks (intro + pull quote) are hidden.
const HANDLE_ICONS = [
  // proactive disruption watch: eye
  '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
  // one-message rebooking: chat bubble
  '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  // secure payments: lock
  '<rect x="5" y="10.5" width="14" height="9.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  // visa care: document with check
  '<path d="M7 3h7l4 4v14H7zM14 3v4h4M9.5 14.5l2 2 3.5-4"/>',
  // documents held safely: folder
  '<path d="M3 7h6l2 2.5h10V19H3z"/>',
  // discretion: shield
  '<path d="M12 3l7 3v5.5c0 4.2-2.8 7.4-7 9.5-4.2-2.100-7-5.300-7-9.500V6z"/>',
];
const HERO_PHOTO = "/img/h/journal-the-return-home.jpg";
const MATTERS_PHOTO = "/img/h/journal-the-2am-save.jpg";
const MONEY_PHOTO = "/img/h/points.jpg";
const SIG_PHOTO = "/img/h/journal-the-quiet-suite.jpg";

export default function ProtectionPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, promises, matters, pq, money, signature, steps, faq, cta } = data;
  void cta;

  return (
    <main>
      <header className={styles.fHero} style={{ backgroundImage: `linear-gradient(90deg, rgba(8,6,5,.82) 0%, rgba(8,6,5,.6) 45%, rgba(8,6,5,.4) 100%), url('${HERO_PHOTO}')` }}>
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

      {/* Statement blocks ("Anyone can make a booking...") hidden 2026-11-13, in line with Hotels and Visas. */}
      {false && (
        <>
          <section className="band center">
            <div className="wrap">
              <h2 dangerouslySetInnerHTML={{ __html: intro.headingHtml ?? "" }} />
              <p className="lede">{intro.lede}</p>
            </div>
          </section>
          <section className="band tight">
            <div className="wrap">
              <div className="pq">
                <p>{pq}</p>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{promises.eyebrow}</div>
            <div className="rule" />
            <h2>{promises.heading}</h2>
          </div>
          <div className={`${styles.fTiles} reveal d1`}>
            {promises.items.map((it, i) => (
              <div className={styles.fTile} key={i}>
                <svg className={styles.fIcon} viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HANDLE_ICONS[i % HANDLE_ICONS.length] }} />
                <h3>{it.heading}</h3>
                <p>{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.fSplit}`}>
          <div className={`${styles.fSplitPic} reveal`} style={{ backgroundImage: `url('${MATTERS_PHOTO}')` }} />
          <div className="reveal d1">
            <div className="eyebrow">{matters.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }}>{matters.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {matters.lede}
            </p>
            <ul className={styles.fChecks}>
              {matters.items.map((it, i) => (
                <li key={i}>
                  <span aria-hidden="true">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className={`wrap ${styles.fSplit} ${styles.rev}`}>
          <div className="reveal d1">
            <div className="eyebrow">{money.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,44px)" }}>{money.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {money.lede}
            </p>
            <ul className={styles.fChecks}>
              {money.items.map((it, i) => (
                <li key={i}>
                  <span aria-hidden="true">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className={`${styles.fSplitPic} reveal`} style={{ backgroundImage: `url('${MONEY_PHOTO}')` }} />
        </div>
      </section>

      <section className={`sig ${styles.fSig}`} style={{ backgroundImage: `url('${SIG_PHOTO}')` }}>
        <div className="wrap">
          <div className="eyebrow reveal">{signature.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: signature.headingHtml ?? "" }} />
          <p className="lede reveal d2">{signature.lede}</p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{steps.eyebrow}</div>
            <div className="rule" />
            <h2>{steps.heading}</h2>
            <p className="lede">{steps.lede}</p>
          </div>
          <div className={`${styles.fSteps} reveal d1`}>
            {steps.items.map((st, i) => (
              <div className={styles.fStep} key={i}>
                <div className={styles.fStepN}>{st.n}</div>
                <h4>{st.heading}</h4>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{faq.eyebrow}</div>
            <div className="rule" />
            <h2>{faq.heading}</h2>
          </div>
          <div className={`${styles.fFaq} faq reveal d1`}>
            {faq.items.map((it, i) => (
              <details key={i}>
                <summary>{it.question}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.answerHtml ?? "" }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${HERO_PHOTO}')` }}>
        <div className="wrap">
          <h2 className="reveal" style={{ maxWidth: "22ch", margin: "0 auto" }}>
            {cta.heading}
          </h2>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            <PrimaryInverseButton to="concierge.html">Plan a trip</PrimaryInverseButton>
          </div>
        </div>
      </section>
    </main>
  );
}
