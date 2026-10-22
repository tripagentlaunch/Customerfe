import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import destinationsData from "../data/destinations-index.generated.json";
import type { DestinationsIndexPageData } from "../types/destinations-index";
import { cardChips, type CitySearch, type CityRecord } from "../lib/citySearch";
import { useIsMobile } from "../hooks/useIsMobile";
import styles from "./CityRegions.module.css";

// Same region > country > city scheme as the Destinations page's data file
// (the source of truth for order); cities are looked up by slug in the live
// search results, so the filters above it narrow the grid in place and a
// region left with no matches disappears.
const REGIONS = (destinationsData as unknown as DestinationsIndexPageData).regions;

function imgUrl(src: string, w = 800, q = 72) {
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}

function CityCard({ city, origin }: { city: CityRecord; origin: string }) {
  const chips = cardChips(city, origin);
  return (
    <Link className={styles.csCard} to={`/city-${city.slug}`}>
      <div className={styles.csPic}>
        <span style={city.band ? { backgroundImage: `url('${imgUrl(city.band)}')` } : undefined} />
      </div>
      <h3 className={styles.csName}>{city.name}</h3>
      <span className={styles.csCountry}>{city.country}</span>
      {chips.length > 0 && (
        <div className={styles.csChips}>
          {chips.map((c, i) => (
            <span className={styles.csChip} key={i}>
              {c}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function CityRegions({ search }: { search: CitySearch }) {
  // Desktop: regions the visitor has collapsed; empty = everything expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Phone (mobile handoff): one region open at a time — opening one closes
  // the others, and all can be closed. Starts with everything closed.
  const isMobile = useIsMobile();
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const toggle = (label: string) => {
    if (isMobile) {
      setOpenLabel((cur) => (cur === label ? null : label));
      return;
    }
    setCollapsed((cur) => {
      const next = new Set(cur);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const bySlug = new Map(search.results.map((c) => [c.slug, c]));
  const regions = REGIONS.map((r) => ({
    label: r.label,
    cities: r.groups.flatMap((g) => g.cities).map((c) => bySlug.get(c.slug)).filter((c): c is CityRecord => !!c),
  })).filter((r) => r.cities.length > 0);

  // Phone: when a search/filter first narrows the list, open the first
  // region with a match so results aren't hidden behind closed headings.
  const wasFiltered = useRef(false);
  const firstLabel = regions[0]?.label ?? null;
  useEffect(() => {
    if (isMobile && search.filtered && !wasFiltered.current && firstLabel) setOpenLabel(firstLabel);
    wasFiltered.current = search.filtered;
  }, [isMobile, search.filtered, firstLabel]);

  if (regions.length === 0) {
    return <p className="lede">Nothing fits all of that: loosen a filter, or use Clear above.</p>;
  }
  return (
    <>
      {regions.map((r) => {
        const isCollapsed = isMobile ? openLabel !== r.label : collapsed.has(r.label);
        const bodyId = `ci-region-${r.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
        return (
          <section className={`${styles.ciRegion}${isCollapsed ? ` ${styles.ciCollapsed}` : ""}`} key={r.label}>
            <h3 className={styles.ciRegionName}>
              <button type="button" className={styles.ciRegionToggle} aria-expanded={!isCollapsed} aria-controls={bodyId} onClick={() => toggle(r.label)}>
                <span className={styles.ciChevron} aria-hidden="true" />
                {r.label}
              </button>
            </h3>
            <div className={styles.ciBody} id={bodyId}>
              <div className={styles.ciBodyInner}>
                <div className={styles.csGrid}>
                  {r.cities.map((c) => (
                    <CityCard city={c} origin={search.origin} key={c.slug} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
