import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import destinationsData from "../data/destinations-index.generated.json";
import worldDots from "../data/worlddots.generated.json";
import zonesData from "../data/zones.json";
import type { DestinationsIndexPageData } from "../types/destinations-index";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./destinations-index-page.module.css";

const data = destinationsData as unknown as DestinationsIndexPageData;
const DOTS = worldDots as unknown as [number, number][];

// A group's country name links to its Country/Zone page once that page
// exists (zones.json is hand-authored, so most countries won't have one
// yet) — otherwise it stays plain text, same as before. Matched by
// slugifying the display label (e.g. "Greece" -> "greece") rather than a
// separate authored mapping, since zones.json's own keys are already just
// the lowercase country/zone name.
const ZONE_SLUGS = new Set(Object.keys(zonesData));
function zoneSlugFor(countryLabel: string): string | null {
  const slug = countryLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return ZONE_SLUGS.has(slug) ? slug : null;
}

const W = 2000;
const H = 1000;
const px = (lon: number) => ((lon + 180) / 360) * W;
const py = (lat: number) => ((90 - lat) / 180) * H;

interface Tip {
  name: string;
  x: number;
  y: number;
}

function WorldMap() {
  const [tip, setTip] = useState<Tip | null>(null);

  return (
    <div className="ta-map reveal d1">
      <svg className={styles.world} viewBox="120 95 1840 690" role="img" aria-label="Map of TripAgent destinations">
        <g className="dots">
          {DOTS.map(([lon, lat], i) => (
            <circle key={i} className={styles.wd} cx={px(lon).toFixed(1)} cy={py(lat).toFixed(1)} r={1.5} />
          ))}
        </g>
        <g className="pins">
          {data.map.pins.map((p, i) => {
            const cx = px(p.lon);
            const cy = py(p.lat);
            return (
              <a
                key={p.slug}
                className={styles.pinwrap}
                href={toRoute(`city-${p.slug}.html`)}
                aria-label={p.name}
                style={{ animationDelay: `${(0.25 + i * 0.022).toFixed(3)}s` }}
                onMouseEnter={() => setTip({ name: p.name, x: cx, y: cy })}
                onMouseLeave={() => setTip(null)}
                onFocus={() => setTip({ name: p.name, x: cx, y: cy })}
                onBlur={() => setTip(null)}
              >
                <circle className={styles.pinGlow} cx={cx} cy={cy} r={20} />
                <circle className={styles.pinMid} cx={cx} cy={cy} r={11} />
                <circle className={styles.pinPulse} cx={cx} cy={cy} r={9} style={{ animationDelay: `${(i * 0.18).toFixed(2)}s` }} />
                <circle className={styles.pinCore} cx={cx} cy={cy} r={6} />
                <circle className={styles.pinHit} cx={cx} cy={cy} r={24} />
              </a>
            );
          })}
        </g>
      </svg>
      <div className={`${styles.taMapTip}${tip ? " on" : ""}`} hidden={!tip} style={tip ? { left: `${((tip.x - 120) / 1840) * 100}%`, top: `${((tip.y - 95) / 690) * 100}%` } : undefined}>
        <span className="nm">{tip?.name}</span>
        <span className="go">Explore →</span>
      </div>
    </div>
  );
}

export default function DestinationsIndexPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, map, intro, groupsIntro, regions, beyond, cta } = data;

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

      <section className="band" id="dest-map">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "50ch" }}>
            <div className="eyebrow">{map.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,54px)" }}>{map.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {map.lede}
            </p>
          </div>
          <WorldMap />
          <div className={`${styles.taMapFoot} reveal d1`}>
            <i />
            {map.foot}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap editorial">
          <div className="ed-grid">
            <div className="ed-meta reveal">
              <div className="eyebrow">{intro.eyebrow}</div>
              <p className="ed-note">{intro.note}</p>
            </div>
            <div className="reveal d1">
              <p className="ed-statement" dangerouslySetInnerHTML={{ __html: intro.statementHtml ?? "" }} />
              <p className="lede" style={{ marginTop: 22 }}>
                {intro.lede}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="band tight ta-dx" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="dx-head">
            <div className="eyebrow reveal">{groupsIntro.eyebrow}</div>
            <div className="rule reveal d1" />
            <h2 className="reveal d1" style={{ marginBottom: "clamp(20px,2.6vw,34px)" }}>
              {groupsIntro.heading}
            </h2>
          </div>
          {regions.map((r) => (
            <section className="dx-region reveal" key={r.label}>
              <h3 className="dx-r-name">{r.label}</h3>
              <div className="dx-grid">
                {r.groups.map((g) => {
                  if (g.size === "solo") {
                    return (
                      <div className="dx-country dx-solo" key={g.country}>
                        {g.cities.map((c) => (
                          <Link className="dx-city" to={toRoute(`city-${c.slug}.html`)} key={c.slug}>
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    );
                  }
                  const zoneSlug = zoneSlugFor(g.country);
                  const countryNameEl = zoneSlug ? (
                    <Link className="dx-c-name" to={toRoute(`zone-${zoneSlug}`)}>
                      {g.country}
                    </Link>
                  ) : (
                    <span className="dx-c-name">{g.country}</span>
                  );
                  if (g.size === "big") {
                    return (
                      <div className="dx-country dx-big" key={g.country}>
                        {countryNameEl}
                        <div className="dx-cities-multi">
                          {g.cities.map((c) => (
                            <Link className="dx-city" to={toRoute(`city-${c.slug}.html`)} key={c.slug}>
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="dx-country" key={g.country}>
                      {countryNameEl}
                      {g.cities.map((c) => (
                        <Link className="dx-city" to={toRoute(`city-${c.slug}.html`)} key={c.slug}>
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${beyond.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{beyond.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "24ch", margin: "0 auto" }}>
            {beyond.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {beyond.lede}
          </p>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ fontSize: "clamp(30px,4vw,58px)" }}>
            {cta.heading}
          </h2>
          <p className="lede reveal d2" style={{ margin: "20px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
