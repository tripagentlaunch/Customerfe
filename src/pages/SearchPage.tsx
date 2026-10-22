import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import searchData from "../data/search.generated.json";
import type { SearchPageData } from "../types/search";
import { useNavVariant } from "../lib/navVariant";
import { RESULT_GROUPS, loadSearchIndex, matches, type SearchEntry } from "../lib/searchIndex";
import SearchResultRow from "../components/SearchResultRow";

const data = searchData as unknown as SearchPageData;

// Ported from js/site.js's RESULTS PAGE section (search.html) — same data
// file (data/search-index.json, symlinked into app/public/data/), same
// scoring (src/lib/searchIndex.ts), same grouping. The header ".ta-hd-q"
// autocomplete, the empty-query "Popular cities" grid, interpret()'s
// contextual shortcuts, and the "+Trip" quick-add button are NOT ported —
// deferred, per the approved plan. Results update live as you type (the
// source only did this for the header autocomplete, not this page — a
// strict improvement, not a fidelity gap).
export default function SearchPage() {
  useNavVariant("solid");
  // The query lives in the URL, set by the header's search bar (the only
  // search box, 2026-10-22), so a new search on this page shows at once.
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const [index, setIndex] = useState<SearchEntry[] | null>(null);

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadSearchIndex().then((idx) => {
      if (!cancelled) setIndex(idx);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim();
  const results = useMemo(() => (index && q ? matches(index, q) : []), [index, q]);

  return (
    <section className="band" style={{ padding: "clamp(40px,6vw,72px) 0" }}>
      <div className="wrap">
        <div className="sp-head">
          <h1 id="spTitle">{q ? `Results for “${q}”` : data.heading}</h1>
          <p id="spCount" className="sp-count">
            {q && index ? `${results.length} ${results.length === 1 ? "result" : "results"}` : ""}
          </p>
        </div>
        <div id="searchResults" className="sp-results">
          {!q
            ? null
            : !index
            ? null
            : results.length === 0
            ? (
                <div className="sp-empty">
                  <p>Nothing in the library matched “{q}”.</p>
                  <p>
                    Your advisor can still find it: {" "}
                    <Link to={`/enquire?about=${encodeURIComponent(q)}`}>tell them what you have in mind →</Link>
                  </p>
                </div>
              )
            : RESULT_GROUPS.map((g) => {
                const items = results.filter((e) => (g.kinds as string[]).includes(e.k));
                if (!items.length) return null;
                return (
                  <section className="sp-group" key={g.label}>
                    <h2 className="sp-group-h">
                      {g.label} <span>{items.length}</span>
                    </h2>
                    <div className="sp-rows">
                      {items.map((e, i) => (
                        <SearchResultRow entry={e} key={e.u + i} />
                      ))}
                    </div>
                  </section>
                );
              })}
        </div>
      </div>
    </section>
  );
}
