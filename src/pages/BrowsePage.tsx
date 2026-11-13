import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import CityFilters from "../components/CityFilters";
import CityRegions from "../components/CityRegions";
import { useCitySearch } from "../lib/citySearch";
import browse from "../data/browse.generated.json";
import type { BrowseData } from "../types/browse";
import { useScrollReveal } from "../lib/useScrollReveal";
import styles from "./browse-page.module.css";
import NotFoundPage from "./NotFoundPage";

const BROWSE = browse as unknown as Record<string, BrowseData>;

// Pages that are already about who is travelling: no "Who" filter.
const WHO_PAGES = new Set(["browse-romance", "browse-honeymoon", "browse-family-kids", "browse-multigen"]);

// Hero photo per collection (existing site photos).
const HERO_IMG: Record<string, string> = {
  "browse-beach": "/img/h/destination-maldives.jpg",
  "browse-romance": "/img/h/honeymoon.jpg",
  "browse-culture": "/img/h/destination-italy.jpg",
  "browse-adventure": "/img/h/destination-new-zealand.jpg",
  "browse-wellness": "/img/h/destination-bhutan.jpg",
  "browse-wildlife": "/img/h/destination-kenya.jpg",
  "browse-food": "/img/h/destination-japan.jpg",
  "browse-nightlife": "/img/h/destination-singapore.jpg",
  "browse-snow": "/img/h/destination-switzerland.jpg",
  "browse-slow": "/img/h/destination-seychelles.jpg",
  "browse-honeymoon": "/img/h/honeymoon-stays.jpg",
  "browse-family-kids": "/img/h/family-travel.jpg",
  "browse-multigen": "/img/h/family-stays.jpg",
  "browse-safari": "/img/h/destination-south-africa.jpg",
  "browse-ski": "/img/h/destination-austria.jpg",
  "browse-dive": "/img/h/destination-indonesia.jpg",
  "browse-wine": "/img/h/destination-france.jpg",
  "browse-art": "/img/h/destination-spain.jpg",
  "browse-spa": "/img/h/destination-sri-lanka.jpg",
  "browse-pilgrimage": "/img/h/destination-jordan.jpg",
};

export default function BrowsePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? BROWSE[pageSlug] : undefined;

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  // Cards are the Destinations cards (city data from the live search), grouped by region.
  const search = useCitySearch();
  useScrollReveal([search.status]);
  const slugs = useMemo(
    () => new Set((data?.cards ?? []).map((c) => c.href.replace(/^\//, "").replace(/\.html$/, "").replace(/^city-/, ""))),
    [data]
  );
  const scoped = useMemo(
    () => ({ ...search, results: search.results.filter((c) => slugs.has(c.slug)), filtered: true }),
    [search, slugs]
  );

  if (!data) {
    return <NotFoundPage />;
  }

  const { hero } = data;
  const heroImg = HERO_IMG[data.slug] ?? "/img/h/destinations.jpg";

  return (
    <>
      <header className={styles.brHero} style={{ ["--br-img" as string]: `url('${heroImg}')` }}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1>{hero.name}</h1>
          <p>{hero.lede}</p>
        </div>
      </header>
      <div className={styles.brResults}>
        {search.status === "ready" && (
          <div style={{ marginBottom: "clamp(24px,3vw,44px)" }}>
            <CityFilters search={search} showMood={false} showWho={!WHO_PAGES.has(data.slug)} />
          </div>
        )}
        {search.status === "ready" && <CityRegions search={scoped} eyebrow />}
        {search.status === "error" && <p className="lede">The cities couldn't load just now: please refresh.</p>}
      </div>
    </>
  );
}
