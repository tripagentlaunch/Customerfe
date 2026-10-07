import { useEffect } from "react";
import destinationsData from "../data/destinations-index.generated.json";
import type { DestinationsIndexPageData } from "../types/destinations-index";
import { useScrollReveal } from "../lib/useScrollReveal";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import WorldMapSection from "../components/WorldMapSection";
import CityFilters from "../components/CityFilters";
import CityRegions from "../components/CityRegions";
import { useCitySearch } from "../lib/citySearch";
import styles from "./destinations-index-page.module.css";

const data = destinationsData as unknown as DestinationsIndexPageData;

export default function DestinationsIndexPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);


  const search = useCitySearch();

  // Re-observe when the search data arrives: the filter block below only
  // renders once status flips to "ready", i.e. after the mount-time pass
  // that collects `.reveal` elements, so it would otherwise stay at opacity:0.
  useScrollReveal([search.status]);
  const { hero, groupsIntro, beyond, cta } = data;

  return (
    <main>
      <header
        className={`hero left ${styles.heroIx}`}
        style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "60% 50%" }}
      >
        <div className="wrap hero-inner">
          <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
          <div className="rule reveal d1" />
          <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ marginTop: 22, maxWidth: "46ch" }}>
            {hero.lede}
          </p>
        </div>
        <div className={styles.indexCount}>
          <div className="n">{hero.count.n}</div>
          <div className="k">{hero.count.k}</div>
        </div>
      </header>

      <WorldMapSection />

      <section className="band tight ta-dx" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="dx-head">
            <div className="eyebrow reveal">{groupsIntro.eyebrow}</div>
            <div className="rule reveal d1" />
            <h2 className="reveal d1" style={{ marginBottom: "clamp(20px,2.6vw,34px)" }}>
              {groupsIntro.heading}
            </h2>
          </div>
          {search.status === "ready" && (
            <div className="reveal d1" style={{ marginBottom: "clamp(24px,3vw,44px)" }}>
              <CityFilters search={search} />
            </div>
          )}
          {search.status === "ready" && <CityRegions search={search} />}
          {search.status === "error" && <p className="lede">The city list couldn't load just now — please refresh.</p>}
        </div>
      </section>

      {/* "Beyond the thirty-six"'s own copy was replaced by "Where to next"'s
          (the page's actual final CTA) per explicit request — this section
          keeps only `beyond.image` as its photo background now; the former
          plain light `cta` band that used to follow it is gone, folded in
          here instead, so the photo band is genuinely the last section
          before the footer rather than a dark band with nothing after it
          but another full CTA. */}
      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${beyond.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "24ch", margin: "0 auto" }}>
            {cta.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {cta.buttons.map((b, i) =>
              b.label && /plan/i.test(b.label) ? (
                <PrimaryInverseButton to={b.href} key={i}>
                  {b.label}
                </PrimaryInverseButton>
              ) : (
                <SecondaryInverseButton to={b.href} key={i}>
                  {b.label}
                </SecondaryInverseButton>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
