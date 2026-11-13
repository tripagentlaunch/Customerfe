import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import whatsonData from "../data/whatson.generated.json";
import destinationsData from "../data/destinations-index.generated.json";
import type { DestinationsIndexPageData } from "../types/destinations-index";
import type { WhatsOnPageData } from "../types/whatson";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import HomeSearch from "../components/HomeSearch";
import { Dropdown } from "../components/CityFilters";
import cfStyles from "../components/CityFilters.module.css";
import { REGION_ORDER } from "../components/CityRegions";
import { EMPTY_STATE, FLIGHT, loadCityList, matches, type CityRecord } from "../lib/citySearch";
import { ORIGINS, useOrigin } from "../lib/origin";
import styles from "./whatson-page.module.css";

const data = whatsonData as unknown as WhatsOnPageData;

// City slug -> region label (the same region scheme the Destinations page uses), for each card's eyebrow.
const REGION_OF: Record<string, string> = {};
for (const r of (destinationsData as unknown as DestinationsIndexPageData).regions) {
  for (const g of r.groups) for (const c of g.cities) REGION_OF[c.slug] = r.label;
}
const citySlug = (href: string) => /^\/?city-(.+?)(?:\.html)?$/.exec(href)?.[1] ?? "";
// "Abu Dhabi · late Jan–early Feb" -> city / dates
const splitMeta = (meta: string | null | undefined) => {
  const [city, ...rest] = (meta ?? "").split(" · ");
  return { city: city ?? "", when: rest.join(" · ") };
};

// Card photo (2026-11-10, direct request): each event links to its city page, so the city's photo is
// used. Tries /img/cities/<slug>.jpg, then <slug>-v2.jpg, then a generic fallback.
function EventImg({ href }: { href: string }) {
  const slug = /^\/?city-(.+?)(?:\.html)?$/.exec(href)?.[1];
  const sources = [...(slug ? [`/img/cities/${slug}.jpg`, `/img/cities/${slug}-v2.jpg`] : []), "/img/h/when-to-go.jpg"];
  const [i, setI] = useState(0);
  return <img className={styles.woEvImg} src={sources[i]} alt="" loading="lazy" onError={() => setI((n) => Math.min(n + 1, sources.length - 1))} />;
}

export default function WhatsOnPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  // Month strip (2026-11-10, direct request): the tab for the month we are in is highlighted when the page
  // opens, and the highlight follows whichever month section is at the top as you scroll.
  const nowId = `m${new Date().getMonth() + 1}`;
  const [activeId, setActiveId] = useState(nowId);
  useEffect(() => {
    const onScroll = () => {
      let current: string | null = null;
      for (const m of data.months) {
        const el = m.id ? document.getElementById(m.id) : null;
        if (el && el.getBoundingClientRect().top <= 140) current = m.id;
      }
      setActiveId(current ?? nowId);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [nowId]);

  // Filters (2026-11-13, direct request): search, region and distance, in the Destinations look. The month
  // strip is the month filter. Months left with no matches are hidden.
  const [origin] = useOrigin();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [flight, setFlight] = useState("");
  // Collapsed months (2026-11-13, direct request): every month starts open; the heading toggles it.
  const [shut, setShut] = useState<Set<string>>(new Set());
  const toggleMonth = (id: string) =>
    setShut((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const openMonth = (id: string) => setShut((cur) => (cur.has(id) ? new Set([...cur].filter((x) => x !== id)) : cur));
  const [cities, setCities] = useState<Record<string, CityRecord>>({});
  useEffect(() => {
    let off = false;
    loadCityList()
      .then((l) => !off && setCities(Object.fromEntries(l.map((c) => [c.slug, c]))))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);
  const filtered = !!(q || region || flight);
  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      data.months.map((m) => ({
        ...m,
        events: m.events.filter((ev) => {
          const slug = citySlug(ev.href);
          if (region && REGION_OF[slug] !== region) return false;
          if (flight) {
            const c = cities[slug];
            if (!c || !matches(c, { ...EMPTY_STATE, flight }, origin)) return false;
          }
          if (needle) {
            const hay = `${ev.name} ${ev.meta ?? ""} ${REGION_OF[slug] ?? ""}`.toLowerCase();
            if (!hay.includes(needle)) return false;
          }
          return true;
        }),
      })),
    [q, region, flight, needle, cities, origin]
  );
  const total = shown.reduce((n, m) => n + m.events.length, 0);
  const regionOpts = [{ v: "", label: "Any region" }, ...REGION_ORDER.map((r) => ({ v: r, label: r }))];
  const flightOpts = FLIGHT.map((f) => ({ v: f.v, label: f.label }));
  const clear = () => {
    setQ("");
    setRegion("");
    setFlight("");
  };

  const { hero, monthLinks } = data;

  return (
    <>
      {/* Hero photo (2026-11-10, direct request). */}
      <header className={styles.woHero} style={{ backgroundImage: "linear-gradient(rgba(10,8,6,.66), rgba(10,8,6,.74)), url('/img/h/when-to-go.jpg')" }}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1 dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
          <p>{hero.lede}</p>
        </div>
      </header>
      <section className={styles.woFilters}>
        <div className="wrap">
          <div className={styles.woSearch}>
            <HomeSearch labelHtml="Search an event or a city" value={q} onValueChange={setQ} showResults={false} />
          </div>
          <div className={styles.woBar}>
            <div className={cfStyles.csField}>
              <label htmlFor="wo-region">Region</label>
              <Dropdown id="wo-region" value={region} options={regionOpts} onChange={setRegion} />
            </div>
            <div className={cfStyles.csField}>
              <label htmlFor="wo-flight">From {ORIGINS[origin] || "Bengaluru"}</label>
              <Dropdown id="wo-flight" value={flight} options={flightOpts} onChange={setFlight} />
            </div>
            {filtered && (
              <button type="button" className={styles.woClear} onClick={clear}>
                Clear
              </button>
            )}
          </div>
        </div>
      </section>
      <div className={styles.woNav}>
        <div className="wrap">
          {monthLinks.map((m) => (
            <a onClick={() => openMonth(m.id)} className={`${styles.woMlink}${m.id === activeId ? ` ${styles.woMlinkOn}` : ""}${filtered && !(shown.find((x) => x.id === m.id)?.events.length) ? ` ${styles.woMlinkEmpty}` : ""}`} href={`#${m.id}`} key={m.id} aria-current={m.id === activeId ? "true" : undefined}>
              {m.label}
              {m.id === nowId && <i className={styles.woNowDot} title="This month" aria-hidden="true" />}
            </a>
          ))}
        </div>
      </div>
      <main>
        {filtered && total === 0 && (
          <div className="wrap">
            <p className={styles.woNone}>Nothing fits all of that: loosen a filter, or <button type="button" onClick={clear}>clear them</button>.</p>
          </div>
        )}
        {shown.map((m, i) => (filtered && m.events.length === 0 ? null : (
          <section className={`${styles.woMonth}${shut.has(m.id ?? String(i)) ? ` ${styles.woShut}` : ""}`} id={m.id ?? undefined} key={m.id ?? i}>
            <div className="wrap">
              <button type="button" className={styles.woMh} aria-expanded={!shut.has(m.id ?? String(i))} aria-controls={`wo-body-${m.id ?? i}`} onClick={() => toggleMonth(m.id ?? String(i))}>
                <span className={styles.woChev} aria-hidden="true" />
                <h2>{m.name}</h2>
                <div className="ln" />
                <span className="ct">{filtered ? `${m.events.length} ${m.events.length === 1 ? "event" : "events"}` : m.count}</span>
              </button>
              <div className={styles.woBody} id={`wo-body-${m.id ?? i}`}>
              <div className={styles.woBodyIn}>
              <div className={styles.woGrid}>
                {m.events.map((ev, j) => {
                  // Same card as the Destinations city cards (2026-11-13, direct request): photo, name, place, date chip;
                  // plus an eyebrow of region and month. The one-line description is no longer shown.
                  const { city, when } = splitMeta(ev.meta);
                  const region = REGION_OF[citySlug(ev.href)];
                  return (
                    <Link className={styles.woEv} to={toRoute(ev.href)} key={j} title={ev.body ?? undefined}>
                      <div className={styles.woPic}>
                        <EventImg href={ev.href} />
                      </div>
                      <div className={styles.woCap}>{[region, m.name].filter(Boolean).join(" · ")}</div>
                      <h3 className={styles.woName}>{ev.name}</h3>
                      <span className={styles.woCity}>{city}</span>
                      {when && <div className={styles.woChips}><span className={styles.woChip}>{when}</span></div>}
                    </Link>
                  );
                })}
              </div>
              </div>
              </div>
            </div>
          </section>
        )))}
      </main>
    </>
  );
}
