import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import cities from "../data/cities.generated.json";
import type { CityData, CityGuidePanel } from "../types/city";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import CityMap from "../components/CityMap";
import styles from "./city-page.module.css";

const CITIES = cities as unknown as Record<string, CityData>;

function GuidePanel({ panel, active }: { panel: CityGuidePanel; active: boolean }) {
  const [openTiers, setOpenTiers] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpenTiers((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className={`cg-panel${active ? " on" : ""}`} data-cg={panel.key}>
      {panel.tiers.map((tier, i) => (
        <div className={`cg-tier${openTiers.has(i) ? " cg-more-open" : ""}`} key={i}>
          {tier.label && <div className="tl">{tier.label}</div>}
          <ul className={`cg-list${tier.listNumbered ? " cg-num" : ""}`}>
            {tier.items.map((item, j) => (
              <li className={item.hidden ? "cg-hide" : ""} key={j}>
                <span className="cg-nm-row">
                  <span className="nm">{item.name}</span>
                  {item.area && <span className="ar">{item.area}</span>}
                </span>
                {item.credentials.length > 0 && (
                  <span className="cg-creds">
                    {item.credentials.map((c, k) => (
                      <span className="cg-cred" key={k}>
                        {c}
                      </span>
                    ))}
                  </span>
                )}
                <span className="ds">{item.description}</span>
              </li>
            ))}
          </ul>
          {tier.moreLabel && (
            <button className="cg-more" type="button" aria-expanded={openTiers.has(i)} onClick={() => toggle(i)}>
              {tier.moreLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CityPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const slug = pageSlug?.startsWith("city-") ? pageSlug.slice("city-".length) : undefined;
  const city = slug ? CITIES[slug] : undefined;
  const [activeTab, setActiveTab] = useState<string>("stay");

  useEffect(() => {
    setActiveTab("stay");
  }, [slug]);

  useEffect(() => {
    if (city?.seo.title) document.title = city.seo.title;
  }, [city]);

  useScrollReveal([city]);

  const tabLabels: Record<string, string> = useMemo(
    () => ({
      stay: "Where to stay",
      do: "What to do",
      eat: "Where to eat",
      party: "Where the night goes",
      map: "Map",
    }),
    []
  );

  if (!city) {
    // Not a city-*.html slug (or an unrecognised one) — other page-template
    // groups aren't ported yet; later phases replace this fallback.
    return (
      <div className="wrap band">
        <p>Not yet ported to the app.</p>
      </div>
    );
  }

  const { hero, ourTake, firstLook, whenToGo, guide, signatureExperiences, plan, neighbourhoods, whatsOn, goodToKnow, collections, closing } =
    city;

  return (
    <>
      <header className="city-hero" data-hero style={{ backgroundImage: `url('${hero.image}')` }}>
        <div className="wrap">
          <nav className={`${styles.bcTrail} reveal`} aria-label="Breadcrumb">
            <Link to="/destinations">All destinations</Link>
            {hero.breadcrumbCountry && (
              <>
                <span className={styles.bcSep}>/</span>
                <Link to={toRoute(hero.breadcrumbCountry.href)}>{hero.breadcrumbCountry.label}</Link>
              </>
            )}
            <span className={styles.bcSep}>/</span>
            <span className={styles.bcCur} aria-current="page">
              {hero.name}
            </span>
          </nav>
          {hero.eyebrow && <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>}
          <h1 className="reveal d1">{hero.name}</h1>
          <p className={`${styles.ess} reveal d2`}>{hero.tagline}</p>
          <div className="btn-row reveal d3" style={{ marginTop: 26 }}>
            <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaPrimary.href)}>
              {hero.ctaPrimary.label}
            </Link>{" "}
            <a className="btn btn-ghost on-dark" href={hero.ctaSecondary.href}>
              {hero.ctaSecondary.label}
            </a>
          </div>
          <p className={`${styles.taReassure} reveal d3`}>
            <span className={styles.taReassureDot} />A private advisor, not a call centre — usually a reply within the hour. No
            obligation.
          </p>
          <div className={`${styles.chFacts} reveal d3`}>
            {hero.facts.map((f, i) => (
              <div className={styles.chFact} key={i}>
                <span className="fk">{f.label}</span>
                <span className={styles.fv}>
                  {f.value} {f.small && <small>{f.small}</small>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="band ta-content ta-take">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "60ch" }}>
            <div className="eyebrow">Our take</div>
            <div className="rule" />
            <p className="lede">{ourTake.lede}</p>
          </div>
          <div className={`${styles.taFit} reveal d1`}>
            <div className={styles.taFitCol}>
              <div className={styles.fitK}>
                <i />
                Come if
              </div>
              <p>{ourTake.comeIf}</p>
            </div>
            <div className={`${styles.taFitCol} ${styles.skip}`}>
              <div className={styles.fitK}>
                <i />
                Perhaps not, if
              </div>
              <p>{ourTake.skipIf}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.taLook}>
        <div className={`${styles.taLookHero} reveal-clip`} style={{ backgroundImage: `url('${firstLook.heroImage}')` }}>
          <div className={styles.taLookCap}>
            <span>{firstLook.heroCaption}</span>
          </div>
        </div>
        <div className={styles.taLookGrid}>
          {firstLook.grid.map((fig, i) => (
            <figure className="reveal" style={{ backgroundImage: `url('${fig.image}')` }} key={i}>
              <figcaption>{fig.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 26 }}>
            <div className="eyebrow reveal">When to go</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ fontSize: "clamp(26px,3.2vw,44px)" }}>
              The year, at a glance.
            </h2>
            <p className="lede reveal d1" style={{ margin: "14px auto 0", maxWidth: "60ch" }}>
              {whenToGo.blurb}
            </p>
          </div>
          <div className={`${styles.wmCallout} reveal d2`}>
            <span className={styles.wmCoK}>At its best</span>
            <span className={styles.wmCoV}>{whenToGo.bestMonths}</span>
          </div>
          <div className="wm-row reveal d2">
            {whenToGo.months.map((m, i) => (
              <span className={`wm ${m.tier}`} key={i}>
                {m.code}
              </span>
            ))}
          </div>
          <div className="wm-key reveal d2">
            <span>
              <i className="wm2" /> At its best
            </span>
            <span>
              <i className="wm1" /> Fine shoulder
            </span>
          </div>
        </div>
      </section>

      <section className="band ta-guide" id="stay" style={{ scrollMarginTop: 96 }}>
        <div className="wrap">
          <div className="reveal cg-head">
            <div className="eyebrow">
              The guide {guide.verified && <span className="ta-verified">{guide.verified}</span>}
            </div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,56px)" }} dangerouslySetInnerHTML={{ __html: guide.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 16 }}>
              {guide.lede}
            </p>
            {guide.note && (
              <p className={`${styles.taGuideNote} reveal d1`}>
                <span className={styles.tgnK}>{guide.note.label}</span>
                {guide.note.text}
              </p>
            )}
          </div>
          <div className="cg-guide reveal d1">
            <div className="cg-tabs" role="tablist">
              {guide.panels.map((p) => (
                <button
                  key={p.key}
                  data-cg={p.key}
                  role="tab"
                  aria-selected={activeTab === p.key}
                  onClick={() => setActiveTab(p.key)}
                >
                  {tabLabels[p.key]}
                </button>
              ))}
              <button
                key="map"
                data-cg="map"
                role="tab"
                aria-selected={activeTab === "map"}
                onClick={() => setActiveTab("map")}
              >
                {tabLabels.map}
              </button>
            </div>
            {guide.panels.map((p) => (
              <div key={p.key} style={{ display: activeTab === p.key ? undefined : "none" }}>
                <GuidePanel panel={p} active={activeTab === p.key} />
              </div>
            ))}
            <div style={{ display: activeTab === "map" ? undefined : "none" }}>
              <CityMap slug={city.slug} />
            </div>
          </div>
        </div>
      </section>

      <section className="band tight ta-content" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 26 }}>
            <div className="eyebrow">Signature experiences</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(26px,3vw,40px)" }}>{signatureExperiences.heading}</h2>
          </div>
          <div className="ta-exp reveal d1">
            {signatureExperiences.items.map((exp, i) => (
              <div className="ta-exp-card" key={i}>
                <div className="xp-img" style={{ backgroundImage: `url('${exp.image}')` }} />
                <div className="xp-b">
                  <h4>{exp.title}</h4>
                  <p>{exp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band ta-content ta-itin">
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 26, maxWidth: "58ch" }}>
            <div className="eyebrow">The plan</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.6vw,46px)" }}>{plan.heading}</h2>
            <p className="lede" style={{ marginTop: 14 }}>
              {plan.lede}
            </p>
          </div>
          <div className="ta-days reveal d1">
            {plan.days.map((day, i) => (
              <div className="ta-day" key={i}>
                <div className="ta-day-h">
                  <span className="ta-day-n">{day.dayNumber}</span>
                  <span className="ta-day-t">{day.title}</span>
                </div>
                <div className="ta-day-b">
                  {day.slots.map((slot, j) => (
                    <div className="ta-slot" key={j}>
                      <span className="tl">{slot.label}</span>
                      <p>{slot.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="reveal d2" style={{ marginTop: 34 }}>
            <Link className="btn btn-gold btn-square" to={toRoute(plan.cta.href)}>
              {plan.cta.label}
            </Link>
          </div>
        </div>
      </section>

      <section className="band tight ta-content">
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 24 }}>
            <div className="eyebrow">{neighbourhoods.heading}</div>
            <div className="rule" />
          </div>
          <div className="ta-nbh reveal d1">
            {neighbourhoods.items.map((n, i) => (
              <div className="ta-nbh-row" key={i}>
                <span className="ta-nbh-n">{n.name}</span>
                <span className="ta-nbh-c">{n.description}</span>
              </div>
            ))}
          </div>
          {neighbourhoods.pairWith && (
            <div className={`${styles.taPair} reveal`} style={{ marginTop: 34 }}>
              <strong>Pair it with</strong>
              {neighbourhoods.pairWith}
            </div>
          )}
        </div>
      </section>

      {whatsOn.events.length > 0 && (
        <section className="band tight ta-content" style={{ background: "var(--bone)" }}>
          <div className="wrap">
            <div className="reveal" style={{ marginBottom: 24 }}>
              <div className="eyebrow">What&#39;s on</div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(26px,3vw,40px)" }}>{whatsOn.heading}</h2>
            </div>
            <div className="ta-events reveal d1">
              {whatsOn.events.map((ev, i) => (
                <div className="ta-event" key={i}>
                  <span className="ta-ev-when">{ev.when}</span>
                  <div className="ta-ev-b">
                    <span className="ta-ev-n">{ev.name}</span>
                    <span className="ta-ev-note">{ev.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="band tight ta-content ta-prac ta-og" id="ta-og" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 30, maxWidth: "58ch" }}>
            <div className="eyebrow">Good to know</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(26px,3vw,40px)" }}>{goodToKnow.heading}</h2>
          </div>
          <div className="ta-prac-grid">
            <div className="ta-prac-col reveal d1">
              <div className="eyebrow">{goodToKnow.onGround.heading}</div>
              <div className="rule" />
              <div className="ta-og-grid single">
                {goodToKnow.onGround.rows.map((r, i) => (
                  <div className="ta-og-row" key={i}>
                    <span className="ta-og-k">{r.label}</span>
                    <span className="ta-og-v">{r.value}</span>
                  </div>
                ))}
              </div>
              {goodToKnow.onGround.note && <p className="ta-og-note reveal d2">{goodToKnow.onGround.note}</p>}
            </div>
            <div className="ta-prac-col reveal d2">
              <div className="eyebrow">{goodToKnow.beforeYouGo.heading}</div>
              <div className="rule" />
              <div className="ta-og-grid single">
                {goodToKnow.beforeYouGo.rows.map((r, i) => (
                  <div className="ta-og-row" key={i}>
                    <span className="ta-og-k">{r.label}</span>
                    <span className="ta-og-v">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band tight ta-collections" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "56ch" }}>
            <div className="eyebrow">More ways to explore</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(24px,2.9vw,38px)" }} dangerouslySetInnerHTML={{ __html: collections.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 12 }}>
              {collections.lede}
            </p>
          </div>
          <div className={`${styles.taColLinks} reveal d1`}>
            {collections.items.map((c, i) => (
              <Link className={styles.taColLink} to={toRoute(c.href)} key={i}>
                {c.label}
              </Link>
            ))}
            {collections.allLink && (
              <Link className={`${styles.taColLink} ${styles.taColAll}`} to={toRoute(collections.allLink.href)}>
                {collections.allLink.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section
        className="band-dark band center"
        style={{ backgroundImage: `var(--scrim), url('${hero.image}')` }}
      >
        <div className="wrap">
          <h2
            className="reveal d1"
            style={{ fontSize: "clamp(30px,4.4vw,58px)" }}
            dangerouslySetInnerHTML={{ __html: closing.headingHtml ?? "" }}
          />
          <p className="lede on-dark reveal d2" style={{ margin: "18px auto 28px" }}>
            {closing.lede}
          </p>
          <div className="btn-row center reveal d3">
            <Link className="btn btn-gold on-dark" to={toRoute(closing.ctaPrimary.href)}>
              {closing.ctaPrimary.label}
            </Link>{" "}
            {closing.ctaSecondary && (
              <Link className="btn btn-ghost on-dark" to={toRoute(closing.ctaSecondary.href)}>
                {closing.ctaSecondary.label}
              </Link>
            )}
          </div>
          <p className={`${styles.taReassure} ${styles.taReassureC} reveal d3`}>
            <span className={styles.taReassureDot} />A private advisor, not a call centre — usually a reply within the hour. No
            obligation.
          </p>
        </div>
      </section>
    </>
  );
}
