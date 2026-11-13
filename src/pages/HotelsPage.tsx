import { useEffect } from "react";
import { Link } from "react-router-dom";
import hotelsData from "../data/hotels.generated.json";
import stripData from "../data/hotels-strip.json";
import guidesData from "../data/stay-guides.generated.json";
import type { HotelsPageData } from "../types/hotels";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
// import { TaraAI } from "../components/TaraAI"; // "Tara AI" removed from the site (2026-11-13)
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./hotels-page.module.css";

const data = hotelsData as unknown as HotelsPageData;

// #hs-app (js/hotel-search.js) is a real live search -> room -> guest ->
// book -> cancel flow talking to a local proxy holding real TripSure API
// credentials — genuine booking/payment infrastructure, not a lead form.
// Per CLAUDE.md this is queued for Amit's named OK; the shell here is a
// static placeholder pointing at the working /enquire conversion path,
// same pattern as TripPage/SearchPage.
// Design refresh (2026-11-13, direct request), same treatment as Flights: photo hero, outlined tiles, four-step
// row, shared closing band. Copy is unchanged. The old layout is in git history.
const HANDLE_ICONS = [
  // hotels, resorts & lodges: building
  '<path d="M5 21V4h9v17M14 9h5v12M3 21h18M8 8h3M8 12h3M8 16h3"/>',
  // suites & upgrades: arrow up in circle
  '<circle cx="12" cy="12" r="9"/><path d="M12 16V8M8.5 11.5L12 8l3.5 3.5"/>',
  // villas & residences: house
  '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5"/>',
  // negotiated & net rates: tag
  '<path d="M3 12V4h8l10 10-8 8zM7.5 8h.01"/>',
  // amenities & welcome: bell
  '<path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 8V5M10 5h4"/>',
  // families & groups: people
  '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M15 20v-1.5a4 4 0 0 1 6 -3"/>',
];
const HERO_PHOTO = "/img/h/hotels.jpg";
// Strip of hotels from various cities (2026-11-13, direct request): the first photographed stay of each city's guide,
// picked into a small file so the page doesn't load the whole city data. Links to that city's page.
type StripHotel = { slug: string; city: string; country: string; name: string; area: string; photo: string };
const STRIP = stripData as StripHotel[];

// "Choosing the stay" and "The advantage" moved here from the Stay guides page (2026-11-13, direct request); that page is
// gone. Card images are unwrapped from their /_vercel/image URLs; one card has none, so it falls back to its guide's photo.
type GuideCard = { route?: string; heading?: string; body?: string; image?: string; href?: string; eyebrow?: string };
const GUIDES = guidesData as unknown as { routeGuides: { eyebrow: string; heading: string; lede: string; cards: GuideCard[] }; productGuides: { eyebrow: string; heading: string; cards: GuideCard[] } };
const guideImg = (c: GuideCard) => {
  if (c.image) {
    try {
      return new URL(c.image, "http://x").searchParams.get("url") || c.image;
    } catch {
      return c.image;
    }
  }
  const slug = (c.href ?? "").replace(/\.html$/, "");
  return slug ? `/img/h/${slug}.jpg` : "";
};
const SIG_PHOTO = "/img/h/hotel-programmes.jpg";

export default function HotelsPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, searchGate, pullq, idx, feat, signature, examples, howItWorks, pullq2, faq, cta } = data;

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
              {hero.buttons.map((b, i) =>
                i === 0 ? (
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
        </div>
      </header>

      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{searchGate.eyebrow}</div>
            <div className="rule" />
            <h2>{searchGate.heading}</h2>
          </div>
          <div className={`${styles.fStrip} reveal d1`} role="list" aria-label="Hotels from around the world">
            {STRIP.map((h) => (
              <Link className={styles.fHotel} to={`/city-${h.slug}`} key={h.slug} role="listitem">
                <div className={styles.fHotelPic}>
                  <span style={{ backgroundImage: `url('${h.photo}')` }} />
                </div>
                <div className={styles.fHotelCap}>{[h.city, h.country].filter(Boolean).join(" · ")}</div>
                <h3>{h.name}</h3>
                {h.area && <span className={styles.fHotelArea}>{h.area}</span>}
              </Link>
            ))}
          </div>
          <div className={`${styles.fGate} reveal d1`}>
            <p>Live search is on its way. Meanwhile, tell your advisor the dates and the destination: they'll hold rooms and rates for you directly.</p>
            <Link className={`btn btn-gold ${styles.fGateBtn}`} to="/concierge">
              Plan a trip
            </Link>
          </div>
        </div>
      </section>

      {/* Pull quote ("The room is easy to book...") removed 2026-11-13, direct request; `false &&` keeps it for easy restore. */}
      {false && (
      <section className={`band ${styles.pullq}`}>
        <div className="wrap">
          <p className={`${styles.q} reveal`} dangerouslySetInnerHTML={{ __html: pullq.quoteHtml ?? "" }} />
          <p className="lede reveal d2" style={{ margin: "22px auto 0" }}>
            {pullq.lede}
          </p>
        </div>
      </section>
      )}

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{idx.eyebrow}</div>
            <div className="rule" />
            <h2>{idx.heading}</h2>
            <p className="lede">{idx.lede}</p>
          </div>
          <div className={`${styles.fTiles} reveal d1`}>
            {idx.rows.map((r, i) => (
              <div className={styles.fTile} key={i}>
                <svg className={styles.fIcon} viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HANDLE_ICONS[i % HANDLE_ICONS.length] }} />
                <h3>{r.heading}</h3>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.fSplit}`}>
          <div className={`${styles.fSplitPic} reveal`} style={{ backgroundImage: `url('${feat.image}')` }} />
          <div className="reveal d1">
            <div className="eyebrow">{feat.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }} dangerouslySetInnerHTML={{ __html: feat.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 16 }}>
              {feat.lede}
            </p>
            <ul className={styles.fChecks}>
              {feat.items.map((it, i) => (
                <li key={i}>
                  <span aria-hidden="true">✓</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Photo swapped to the reception-bell shot (signature.image was a bright Santorini view). */}
      <section className={`signature ${styles.fSig}`} style={{ backgroundImage: `url('${SIG_PHOTO}')` }}>
        <div className="wrap">
          <div className={`${styles.sigEyebrow} reveal`}>{signature.eyebrow}</div>
          <p className={`${styles.sigLine} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className={`${styles.sigSub} lede reveal d2`}>{signature.sub}</p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{examples.eyebrow}</div>
            <div className="rule" />
            <h2>{examples.heading}</h2>
            <p className="lede">{examples.lede}</p>
          </div>
          <div className={`${styles.fTiles} reveal d1`}>
            {examples.tiles.map((t, i) => (
              <div className={styles.fTile} key={i}>
                <div className={styles.fTileLabel}>{t.label}</div>
                <h3>{t.heading}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Choosing the stay: six guides as a scrolling strip. */}
      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{GUIDES.routeGuides.eyebrow}</div>
            <div className="rule" />
            <h2>{GUIDES.routeGuides.heading}</h2>
            <p className="lede">{GUIDES.routeGuides.lede}</p>
          </div>
          <div className={`${styles.fStrip} reveal d1`} role="list" aria-label="Choosing the stay">
            {GUIDES.routeGuides.cards.map((c, i) => (
              <Link className={styles.fGuide} to={toRoute(c.href ?? "")} key={i} role="listitem">
                <div className={styles.fGuidePic}>
                  <span style={{ backgroundImage: `url('${guideImg(c)}')` }} />
                </div>
                <div className={styles.fGuideCap}>{c.route}</div>
                <h3>{c.heading}</h3>
                <p>{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* The advantage: the two programme / category guides. */}
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{GUIDES.productGuides.eyebrow}</div>
            <div className="rule" />
            <h2>{GUIDES.productGuides.heading}</h2>
          </div>
          <div className={`${styles.fCabins} reveal d1`}>
            {GUIDES.productGuides.cards.map((c, i) => (
              <Link className={styles.fGuide} to={toRoute(c.href ?? "")} key={i}>
                <div className={styles.fGuidePic}>
                  <span style={{ backgroundImage: `url('${guideImg(c)}')` }} />
                </div>
                <div className={styles.fGuideCap}>{c.eyebrow}</div>
                <h3>{c.heading}</h3>
                <p>{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{howItWorks.eyebrow}</div>
            <div className="rule" />
            <h2>{howItWorks.heading}</h2>
            <p className="lede">{howItWorks.lede}</p>
          </div>
          <div className={`${styles.fSteps} reveal d1`}>
            {howItWorks.steps.map((st, i) => (
              <div className={styles.fStep} key={i}>
                <div className={styles.fStepN}>{st.n}</div>
                <h4>{st.heading}</h4>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Second pull quote ("We brief the property before you arrive...") removed 2026-11-13, direct request. */}
      {false && (
      <section className="band tight">
        <div className="wrap">
          <div className="pq reveal">
            <p>{pullq2}</p>
          </div>
        </div>
      </section>
      )}

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
                <summary>{it.summary}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${HERO_PHOTO}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {cta.buttons.map((b, i) =>
              i === 0 ? (
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
