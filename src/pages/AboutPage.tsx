import { useEffect } from "react";
import aboutData from "../data/about-page.generated.json";
import type { AboutPageData } from "../types/about-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./about-page.module.css";

const data = aboutData as unknown as AboutPageData;

// Design refresh (2026-11-13, direct request), same treatment as Flights, Hotels, Visas and Protection. Copy is
// unchanged; the pull quote and the one-line quote are hidden.
export default function AboutPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, pullQuote, belief, lineage, pq, stats, partners, people, values, cta } = data;
  void cta;

  return (
    <main>
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

      {/* Quotes ("The last luxury...", "The same person each time...") hidden 2026-11-13, in line with the other pages. */}
      {false && (
        <>
          <section className={styles.pull}>
            <div className="wrap">
              <blockquote dangerouslySetInnerHTML={{ __html: pullQuote.quoteHtml ?? "" }} />
              <cite>{pullQuote.cite}</cite>
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
        <div className={`wrap ${styles.fSplit}`}>
          <div className={`${styles.fSplitPic} reveal`} style={{ backgroundImage: `url('${belief.image}')` }} role="img" aria-label={belief.imageAlt ?? undefined} />
          <div className="reveal d1">
            <div className="eyebrow">{belief.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.6vw,48px)" }} dangerouslySetInnerHTML={{ __html: belief.headingHtml ?? "" }} />
            {belief.ledes.map((l, i) => (
              <p className="lede" style={{ marginTop: i === 0 ? 18 : 14 }} key={i}>
                {l}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.fSplit} ${styles.rev}`}>
          <div className="reveal d1">
            <div className="eyebrow">{lineage.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }} dangerouslySetInnerHTML={{ __html: lineage.headingHtml ?? "" }} />
            {lineage.ledes.map((l, i) => (
              <p className="lede" style={{ marginTop: i === 0 ? 18 : 14 }} key={i}>
                {l}
              </p>
            ))}
            <ul className={styles.fChecks}>
              {lineage.items.map((it, i) => (
                <li key={i}>
                  <span aria-hidden="true">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className={`${styles.fSplitPic} reveal`} style={{ backgroundImage: `url('${lineage.image}')` }} role="img" aria-label={lineage.imageAlt ?? undefined} />
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${stats.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{stats.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto 56px" }}>
            {stats.heading}
          </h2>
          <div className="stat-grid scale reveal d2">
            {stats.items.map((s, i) => (
              <div key={i}>
                <div className="v">{s.value}</div>
                <div className="k">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{partners.eyebrow}</div>
            <div className="rule" />
            <h2>{partners.heading}</h2>
            <p className="lede">{partners.lede}</p>
          </div>
          <div className={`${styles.fPartners} reveal d1`}>
            {partners.items.map((p, i) => (
              <div className={styles.fPartner} key={i}>
                {p}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{people.eyebrow}</div>
            <div className="rule" />
            <h2>{people.heading}</h2>
            <p className="lede" dangerouslySetInnerHTML={{ __html: people.ledeHtml ?? "" }} />
            {people.lede2Html && <p className="lede" style={{ marginTop: 14 }} dangerouslySetInnerHTML={{ __html: people.lede2Html }} />}
          </div>
          <div className={`${styles.fTiles} reveal d1`}>
            {people.feats.map((f, i) => (
              <div className={styles.fTile} key={i}>
                <div className={styles.fTileLabel}>{f.label}</div>
                <h3>{f.heading}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${values.image}')` }}>
        <div className="wrap">
          <h2 className="reveal" style={{ maxWidth: "22ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d1" style={{ margin: "22px auto 0", maxWidth: "52ch" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            <PrimaryInverseButton to="concierge.html">Plan a trip</PrimaryInverseButton>
          </div>
        </div>
      </section>
    </main>
  );
}
