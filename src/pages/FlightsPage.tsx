import { useEffect } from "react";
import { Link } from "react-router-dom";
import flightsData from "../data/flights.generated.json";
import guidesData from "../data/flight-guides.generated.json";
import type { FlightsPageData } from "../types/flights";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./flights-page.module.css";

const data = flightsData as unknown as FlightsPageData;

// Design refresh (2026-11-13, direct request): photo hero, outlined tiles with line icons, route photo cards,
// a four-step row and the shared closing band, in the style of the city / destinations pages. Copy is unchanged.
// The old layout (video hero, index rows, feature list, tile cards) is replaced; see git history.
const HANDLE_ICONS = [
  // every airline & alliance: globe
  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
  // business & first: seat
  '<path d="M7 4h4a2 2 0 0 1 2 2v6h5a2 2 0 0 1 2 2v3H5V6a2 2 0 0 1 2-2zM5 20h14M8 20v-3M16 20v-3"/>',
  // fares held: clock
  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  // seats, meals, lounges: cup
  '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
  // miles, upgrades, status: star
  '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  // changes & refunds: refresh
  '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>',
];
// Route guides and "Knowing the cabin" moved here from the Flight guides page (2026-11-13, direct request); that page
// is gone. The cards' own images are wrapped in /_vercel/image URLs, so the original path is unwrapped for plain loading.
type GuideCard = { route?: string; heading?: string; body?: string; image?: string; href?: string; eyebrow?: string };
const GUIDES = guidesData as unknown as { routeGuides: { eyebrow: string; heading: string; lede: string; cards: GuideCard[] }; productGuides: { eyebrow: string; heading: string; cards: GuideCard[] } };
const rawImg = (src?: string) => {
  if (!src) return "";
  try {
    return new URL(src, "http://x").searchParams.get("url") || src;
  } catch {
    return src;
  }
};
const ROUTE_LINKS = ["/route-delhi-london", "/route-mumbai-new-york", "/route-bengaluru-singapore"];
const ROUTE_PHOTOS = ["/img/h/route-delhi-london.jpg", "/img/h/route-mumbai-new-york.jpg", "/img/h/route-bengaluru-singapore.jpg"];
const HERO_PHOTO = "/img/h/journal-the-overnight-flight.jpg";

export default function FlightsPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, pullq, idx, feat, signature, examples, howItWorks, faq, cta } = data;

  return (
    <main>
      {/* Photo hero with white text (was a looping video, kept below for easy restore). */}
      <header className={styles.fHero} style={{ backgroundImage: `linear-gradient(90deg, rgba(8,6,5,.82) 0%, rgba(8,6,5,.6) 45%, rgba(8,6,5,.38) 100%), url('${HERO_PHOTO}')` }}>
        {/* <video autoPlay loop muted playsInline src="/videos/flights/hero.mp4" /> */}
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

      <section className={`band ${styles.pullq}`}>
        <div className="wrap">
          <p className={`${styles.q} reveal`} dangerouslySetInnerHTML={{ __html: pullq.quoteHtml ?? "" }} />
          <p className="lede reveal d2" style={{ margin: "22px auto 0" }}>
            {pullq.lede}
          </p>
        </div>
      </section>

      {/* What we handle: six outlined tiles with line icons. */}
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

      {/* Business & first: photo beside the argument, three checks. */}
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

      {/* Photo swapped to the 2 a.m. airport scene (was the Dubai skyline in signature.image: busy, bright, off-topic). */}
      <section className={`signature ${styles.fSig}`} style={{ backgroundImage: "url('/img/h/journal-the-2am-save.jpg')" }}>
        <div className="wrap">
          <div className={`${styles.sigEyebrow} reveal`}>{signature.eyebrow}</div>
          <p className={`${styles.sigLine} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className={`${styles.sigSub} lede reveal d2`}>{signature.sub}</p>
        </div>
      </section>

      {/* By example: three route photo cards that link to the route pages. */}
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{examples.eyebrow}</div>
            <div className="rule" />
            <h2>{examples.heading}</h2>
            <p className="lede">{examples.lede}</p>
          </div>
          <div className={styles.fRoutes}>
            {examples.tiles.map((t, i) => (
              <Link className={`${styles.fRoute} reveal d${i + 1}`} to={ROUTE_LINKS[i] ?? "/routes"} key={i}>
                <div className={styles.fRoutePic}>
                  <span style={{ backgroundImage: `url('${ROUTE_PHOTOS[i] ?? HERO_PHOTO}')` }} />
                </div>
                <div className={styles.fRouteCap}>{t.label}</div>
                <h3>{t.heading}</h3>
                <p>{t.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Route guides: premium cabins from India, a scrolling strip of cards that link to each route guide. */}
      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{GUIDES.routeGuides.eyebrow}</div>
            <div className="rule" />
            <h2>{GUIDES.routeGuides.heading}</h2>
            <p className="lede">{GUIDES.routeGuides.lede}</p>
          </div>
          <div className={`${styles.fStrip} reveal d1`} role="list" aria-label="Route guides">
            {GUIDES.routeGuides.cards.map((c, i) => (
              <Link className={styles.fGuide} to={toRoute(c.href ?? "")} key={i} role="listitem">
                <div className={styles.fGuidePic}>
                  <span style={{ backgroundImage: `url('${rawImg(c.image)}')` }} />
                </div>
                <div className={styles.fRouteCap}>{c.route}</div>
                <h3>{c.heading}</h3>
                <p>{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Knowing the cabin: the two product guides. */}
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{GUIDES.productGuides.eyebrow}</div>
            <div className="rule" />
            <h2>{GUIDES.productGuides.heading}</h2>
          </div>
          <div className={`${styles.fCabins} reveal d1`}>
            {GUIDES.productGuides.cards.map((c, i) => (
              <Link className={styles.fRoute} to={toRoute(c.href ?? "")} key={i}>
                <div className={styles.fRoutePic}>
                  <span style={{ backgroundImage: `url('${rawImg(c.image)}')` }} />
                </div>
                <div className={styles.fRouteCap}>{c.eyebrow}</div>
                <h3>{c.heading}</h3>
                <p>{c.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works: four steps in a row. */}
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

      {/* Closing band: the shared photo band, buttons side by side on phones. */}
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
