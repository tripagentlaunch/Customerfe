import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadSearchIndex, matches, type SearchEntry } from "../lib/searchIndex";
import SearchResultRow from "./SearchResultRow";
import styles from "../pages/home-page.module.css";

const SHOWN = 8;

// The homepage's "Where shall we take you?" bar (2026-10-13, direct
// request): searches right here as you type instead of opening /search.
// Same index and scoring as the /search page; the full list stays one
// click away under the top results.
export default function HomeSearch({ labelHtml }: { labelHtml: string }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim();

  // Fetched on first focus, not on page load — most visitors never search.
  function warm() {
    if (index) return;
    loadSearchIndex().then(setIndex);
  }

  useEffect(() => {
    if (q) warm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const results = useMemo(() => (index && q ? matches(index, q) : []), [index, q]);
  const allHref = `/search?q=${encodeURIComponent(q)}`;

  return (
    <div className="reveal d1">
      <form
        className={styles.discSearch}
        role="search"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          inputRef.current?.blur();
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <svg className={styles.dsIc} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <circle cx="11" cy="11" r="7" />
          <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
        </svg>
        <span className={styles.dsField}>
          {!query && <span className={styles.dsLabel} aria-hidden="true" dangerouslySetInnerHTML={{ __html: labelHtml }} />}
          <input
            ref={inputRef}
            type="search"
            className={`${styles.dsInput} ta-home-q`}
            aria-label="Search a place, a hotel, or a city"
            spellCheck={false}
            value={query}
            onFocus={warm}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
          />
        </span>
      </form>

      {q && index && (
        <div className={styles.dsResults} aria-live="polite">
          {results.length === 0 ? (
            <div className="sp-empty">
              <p>Nothing in the library matched “{q}”.</p>
              <p>
                Your advisor can still find it —{" "}
                <Link to={`/enquire?about=${encodeURIComponent(q)}`}>tell them what you have in mind →</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="sp-rows">
                {results.slice(0, SHOWN).map((e, i) => (
                  <SearchResultRow entry={e} key={e.u + i} />
                ))}
              </div>
              {results.length > SHOWN && (
                <Link className={styles.dsAll} to={allHref}>
                  See all results →
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
