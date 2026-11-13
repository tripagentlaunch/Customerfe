import { useEffect, useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { Link } from "react-router-dom";
import healthIndexData from "../data/health-index-page.generated.json";
import type { HealthCard, HealthIndexPageData } from "../types/health-index-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { healthPhoto } from "../lib/healthPhotos";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
// import { withTaraAI } from "../components/TaraAI"; // "Tara AI" removed from the health closing band (2026-11-13)
import "./health-index-page.module.css"; // styles unused since the hero rebuild (2026-11-13); kept as a side-effect import

const data = healthIndexData as unknown as HealthIndexPageData;

function Icon({ svg }: { svg: string | null }) {
  if (!svg) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function SectionHead({
  iconSvg,
  eyebrow,
  heading,
  lede,
}: {
  iconSvg?: string | null;
  eyebrow: string | null;
  heading?: string | null;
  lede?: string | null;
}) {
  return (
    <div className="reveal" style={{ marginBottom: 26, maxWidth: "60ch" }}>
      <div className="eyebrow">
        {iconSvg && (
          <span className="ta-eyebrow-ic">
            <Icon svg={iconSvg} />
          </span>
        )}
        {eyebrow}
      </div>
      <div className="rule" />
      {heading && <h2 style={{ fontSize: "clamp(26px,3vw,40px)" }}>{heading}</h2>}
      {lede && (
        <p className="lede" style={{ marginTop: 12 }}>
          {lede}
        </p>
      )}
    </div>
  );
}

// Photo cards (2026-11-13, direct request), modelled on the city pages' hotel cards: photo on top, place, name, text.
// Photos are stand-ins (see lib/healthPhotos.ts) until real hospital / clinic photos exist.
function CardGrid({ cards, paginate = false }: { cards: HealthCard[]; paginate?: boolean }) {
  // Pagination (2026-11-13, direct request, used by Longevity & wellness): three rows a page, so 9 / 6 / 3 cards as the grid
  // goes 3 / 2 / 1 across, with numbered pages and arrows beneath.
  const oneColumn = useIsMobile(620);
  const twoColumns = useIsMobile(1000);
  const pageSize = !paginate ? cards.length : oneColumn ? 3 : twoColumns ? 6 : 9;
  const pages = Math.max(1, Math.ceil(cards.length / pageSize));
  const [page, setPage] = useState(0);
  const cur = Math.min(page, pages - 1);
  useEffect(() => setPage(0), [pageSize]);
  const shown = cards.slice(cur * pageSize, (cur + 1) * pageSize);
  return (
    <div className="reveal d1">
      <div className="hc-grid">
        {shown.map((c, i) => {
          const idx = cur * pageSize + i;
          return (
            <Link className="hc-card" to={toRoute(c.href ?? "#")} key={idx}>
              <div className="hc-pic">
                <img src={healthPhoto(c.sub ?? c.name, idx)} alt="" loading="lazy" />
              </div>
              <div className="hc-body">
                {c.sub && c.sub !== c.name && <div className="hc-area">{c.sub}</div>}
                <h3>{c.name}</h3>
                <p>{c.body}</p>
                <span className="hc-more">Discover</span>
              </div>
            </Link>
          );
        })}
      </div>
      {paginate && pages > 1 && (
        <nav className="hc-pager" aria-label="Pages">
          <button type="button" onClick={() => setPage(Math.max(0, cur - 1))} disabled={cur === 0} aria-label="Previous page">
            ‹
          </button>
          {Array.from({ length: pages }, (_, n) => (
            <button type="button" key={n} className={n === cur ? "on" : undefined} aria-current={n === cur ? "page" : undefined} onClick={() => setPage(n)}>
              {n + 1}
            </button>
          ))}
          <button type="button" onClick={() => setPage(Math.min(pages - 1, cur + 1))} disabled={cur === pages - 1} aria-label="Next page">
            ›
          </button>
        </nav>
      )}
    </div>
  );
}

// The .med-explorer widget (18 specialty buttons -> 18 pre-rendered .exp
// panels) is toggled site-wide by a generic handler in js/site.js — real
// client-side state, all panel content is local/static. Ported with
// useState instead of deferring, same category as destinations.js.
function Explorer({ explorer }: { explorer: HealthIndexPageData["explorer"] }) {
  const [active, setActive] = useState(explorer.buttons[0]?.id ?? null);
  const panel = explorer.panels.find((p) => p.id === active);

  return (
    <div className="med-explorer reveal d1">
      <div className="med-ex-list">
        {explorer.buttons.map((b, i) => (
          <button key={i} type="button" data-ex={b.id ?? undefined} className={b.id === active ? "active" : undefined} onClick={() => setActive(b.id)}>
            <Icon svg={b.iconSvg} />
            <span>{b.label}</span>
          </button>
        ))}
      </div>
      <div className="med-ex-panel">
        {panel && (
          <div className="exp" data-ex={panel.id ?? undefined}>
            <h3>{panel.heading}</h3>
            <p className="exp-dek">{panel.dek}</p>
            <div className="exp-lbl">{panel.indexLabel}</div>
            <div className="med-index reveal d1">
              {panel.rows.map((r, i) =>
                r.href ? (
                  <Link className="med-index-row" to={toRoute(r.href)} key={i}>
                    <span className="ix-n">{r.name}</span>
                    <span className="ix-r">
                      <span className="ix-m">{r.location}</span>
                      <span className="ix-a">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div className="med-index-row" key={i}>
                    <span className="ix-n">{r.name}</span>
                    <span className="ix-r">
                      <span className="ix-m">{r.location}</span>
                      {/* empty arrow slot so the location column lines up with the linked rows (2026-11-13) */}
                      <span className="ix-a" aria-hidden="true" />
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HealthIndexPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, disclaimer, stats, longevity, preventive, explorer, destinations, steps, concierge } = data;

  return (
    <main>
      {/* Hero refreshed 2026-11-13: photo hero like the service pages. The duplicated breadcrumb + eyebrow ("What we handle /
          Health & Longevity" twice) became one eyebrow, and the faint icon is gone. */}
      <header className="rf-hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(8,6,5,.82) 0%, rgba(8,6,5,.6) 45%, rgba(8,6,5,.4) 100%), url('/img/h/destination-switzerland.jpg')" }}>
        <div className="wrap">
          <div className="rf-hero-copy">
            <div className="eyebrow on-dark">{hero.hereLabel}</div>
            <div className="rule" />
            <h1 className="display">{hero.heading}</h1>
            <p className="lede on-dark">{hero.lede}</p>
            <p className="lede on-dark" style={{ fontSize: 15, marginTop: 14, opacity: 0.85 }}>
              {hero.kicker}
            </p>
            <div className="btn-row rf-hero-btns">
              <PrimaryInverseButton to="destinations.html">Find my trip</PrimaryInverseButton>
              <SecondaryInverseButton to="concierge.html">Chat with us</SecondaryInverseButton>
            </div>
          </div>
        </div>
      </header>

      <section className="med-disc">
        <div className="wrap">
          <Icon svg={disclaimer.iconSvg} />
          <p>{disclaimer.text}</p>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap">
          <div className="med-stats reveal">
            {stats.map((s, i) => (
              <div className="med-stat" key={i}>
                <span className="n">{s.value}</span>
                <span className="l">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={longevity.eyebrowIconSvg} eyebrow={longevity.eyebrow} heading={longevity.heading} lede={longevity.lede} />
          <CardGrid cards={longevity.cards} paginate />
        </div>
      </section>

      {/* "Stay ahead / Preventive & executive health." removed 2026-11-13, direct request; kept hidden for easy restore. */}
      {false && (
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead iconSvg={preventive.eyebrowIconSvg} eyebrow={preventive.eyebrow} heading={preventive.heading} lede={preventive.lede} />
          <div className="med-chips reveal d1" style={{ gap: 12 }}>
            {preventive.chips.map((c, i) => (
              <Link className="btn btn-ghost" to={toRoute(c.href ?? "#")} key={i}>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={explorer.eyebrowIconSvg} eyebrow={explorer.eyebrow} heading={explorer.heading} lede={explorer.lede} />
          <Explorer explorer={explorer} />
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <SectionHead iconSvg={destinations.eyebrowIconSvg} eyebrow={destinations.eyebrow} heading={destinations.heading} />
          <CardGrid cards={destinations.cards} />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <SectionHead iconSvg={steps.eyebrowIconSvg} eyebrow={steps.eyebrow} heading={steps.heading} />
          {/* Three steps as the numbered row used on the other "How it works" sections (2026-11-13). Was icon columns. */}
          <div className="rf-steps reveal d1" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
            {steps.items.map((st, i) => (
              <div className="rf-step" key={i}>
                <div className="rf-step-n">{i + 1}</div>
                <h4>{st.heading}</h4>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing band refreshed 2026-11-13: the shared photo band (was a plain dark gradient with a "Speak to Tara AI" button). */}
      <section className="band-dark band center" style={{ backgroundImage: "var(--scrim), url('/img/h/destination-switzerland.jpg')" }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{concierge.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }}>{concierge.heading}</h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0", maxWidth: "56ch" }}>{concierge.body}</p>
          <div className="med-conf reveal d2" style={{ justifyContent: "center", marginTop: 18 }}>
            <Icon svg={concierge.confIconSvg} />
            {concierge.confText}
          </div>
          <div className="btn-row center reveal d3" style={{ marginTop: 28 }}>
            <PrimaryInverseButton to="concierge.html">Plan a trip</PrimaryInverseButton>
          </div>
        </div>
      </section>
    </main>
  );
}
