import { useParams, Link } from "react-router-dom";
import zones from "../data/zones.json";
import cities from "../data/cities.generated.json";
import type { ZoneData } from "../types/zone";
import type { CityData } from "../types/city";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
// Reused as-is from CityPage's own hero — the breadcrumb trail and facts
// strip should look identical between a city and its own country/zone page,
// not like two different templates that happen to sit next to each other.
import cityStyles from "./city-page.module.css";
import styles from "./zone-page.module.css";

const ZONES = zones as unknown as Record<string, ZoneData>;
const CITIES = cities as unknown as Record<string, CityData>;

// This template is deliberately minimal right now — hero + a card grid
// linking out to each member city's own full page. It's the structural
// skeleton (routing, data model, one reference build for Greece) the rest
// of the page's content will grow into once that's decided.
export default function ZonePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const slug = pageSlug?.startsWith("zone-") ? pageSlug.slice("zone-".length) : undefined;
  const zone = slug ? ZONES[slug] : undefined;

  useScrollReveal([zone]);

  if (!zone) {
    return (
      <div className="wrap band">
        <p>Not yet ported to the app.</p>
      </div>
    );
  }

  const { hero, intro, cities: memberSlugs } = zone;
  const members = memberSlugs.map((s) => CITIES[s]).filter((c): c is CityData => Boolean(c));

  return (
    <>
      <header className="city-hero" data-hero style={{ backgroundImage: `url('${hero.image}')` }}>
        <div className="wrap">
          <nav className={`${cityStyles.bcTrail} reveal`} aria-label="Breadcrumb">
            <Link to="/destinations">All destinations</Link>
            <span className={cityStyles.bcSep}>/</span>
            <span className={cityStyles.bcCur} aria-current="page">
              {hero.name}
            </span>
          </nav>
          {hero.eyebrow && <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>}
          <h1 className="reveal d1">{hero.name}</h1>
          <p className={`${cityStyles.ess} reveal d2`}>{hero.tagline}</p>
        </div>
      </header>

      <section className="band ta-content">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "60ch" }}>
            <div className="eyebrow">The cities</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.6vw,48px)" }}>{intro.heading}</h2>
            <p className="lede" style={{ marginTop: 14 }}>
              {intro.lede}
            </p>
          </div>

          <div className={`${styles.cityGrid} reveal d1`}>
            {members.map((c) => (
              <Link className={styles.cityCard} to={toRoute(`city-${c.slug}`)} key={c.slug}>
                <div className={styles.cityCardImg} style={{ backgroundImage: `url('${c.hero.image}')` }} />
                <div className={styles.cityCardBody}>
                  <span className={styles.cityCardName}>{c.hero.name}</span>
                  <span className={styles.cityCardTagline}>{c.hero.tagline}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
