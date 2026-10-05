import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import healthIndexData from "../data/health-index-page.generated.json";
import type { HealthCard, HealthIndexPageData } from "../types/health-index-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { withTaraAI } from "../components/TaraAI";
import styles from "./health-index-page.module.css";

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

function CardGrid({ cards }: { cards: HealthCard[] }) {
  return (
    <div className="med-grid cols2 reveal d1">
      {cards.map((c, i) => (
        <Link className="med-card" to={toRoute(c.href ?? "#")} key={i}>
          <div className="mc-ic">
            <Icon svg={c.iconSvg} />
          </div>
          <div className="mc-sub">{c.sub}</div>
          <h3>{c.name}</h3>
          <p>{c.body}</p>
          <span className="mc-more">Discover →</span>
        </Link>
      ))}
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
      <header className="med-hero">
        <div className="wrap">
          <div className="med-hero-ic">
            <Icon svg={hero.iconSvg} />
          </div>
          <div className={`${styles.crumb} eyebrow`}>
            <Link to={toRoute(hero.crumbHref)}>{hero.crumbLabel}</Link>
            <span className={styles.sep}>/</span>
            <span className={styles.here}>{hero.hereLabel}</span>
          </div>
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1>{hero.heading}</h1>
          <p className="lede">{hero.lede}</p>
          <p className={styles.medKicker}>{hero.kicker}</p>
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
          <CardGrid cards={longevity.cards} />
        </div>
      </section>

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
          <div className="feat-grid reveal d1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 26 }}>
            {steps.items.map((s, i) => (
              <div className="med-card" style={{ border: 0, padding: 0, background: "none" }} key={i}>
                <div className="mc-ic">
                  <Icon svg={s.iconSvg} />
                </div>
                <h3 style={{ fontSize: 20 }}>{s.heading}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="med-concierge">
        <div className="wrap">
          <div className="eyebrow on-dark">{concierge.eyebrow}</div>
          <h2>{concierge.heading}</h2>
          <p>{concierge.body}</p>
          <div className="med-conf">
            <Icon svg={concierge.confIconSvg} />
            {concierge.confText}
          </div>
          <div className="btn-row">
            <Link className="btn btn-gold on-dark btn-square" to={toRoute(concierge.ctaHref)}>
              {withTaraAI(concierge.ctaLabel)}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
