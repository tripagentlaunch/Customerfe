import CityFilters from "./CityFilters";
import CityRegions from "./CityRegions";
import { useCitySearch } from "../lib/citySearch";
import { useScrollReveal } from "../lib/useScrollReveal";

// The /destinations city filter + region lists, split out of the page so
// the city data they need loads after the hero (see DestinationsIndexPage).
export default function DestinationsCityList() {
  const search = useCitySearch();
  // Re-observe when the search data arrives: the filter block only renders
  // once status flips to "ready".
  useScrollReveal([search.status]);
  return (
    <>
      {search.status === "ready" && (
        <div className="reveal d1" style={{ marginBottom: "clamp(24px,3vw,44px)" }}>
          <CityFilters search={search} />
        </div>
      )}
      {search.status === "ready" && <CityRegions search={search} />}
      {search.status === "error" && <p className="lede">The city list couldn't load just now: please refresh.</p>}
    </>
  );
}
