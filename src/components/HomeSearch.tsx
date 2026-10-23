import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadSearchIndex, matches, type SearchEntry } from "../lib/searchIndex";
import SearchResultRow from "./SearchResultRow";
import styles from "../pages/home-page.module.css";

const SHOWN = 8;

// Typed one after another in the empty bar (2026-10-13, direct request).
// Each example is a real search that returns results — checked against
// public/data/search-index.json — so the bar never promises what search
// can't find.
const TYPED_EXAMPLES = ["a city: Kyoto", "a hotel: Aman Tokyo", "a mood: honeymoon", "a visa: Japan"];

// Types each example, holds it, deletes it, moves to the next. Off under
// reduced motion — the static label shows instead.
function useTypedExample(active: boolean): string | null {
  const [text, setText] = useState("");
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (!active || reduce) return;
    let i = 0;
    let len = 0;
    let deleting = false;
    let timer = 0;
    const tick = () => {
      const full = TYPED_EXAMPLES[i];
      if (!deleting) {
        len += 1;
        setText(full.slice(0, len));
        if (len === full.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1700);
          return;
        }
        timer = window.setTimeout(tick, 65);
      } else {
        len -= 1;
        setText(full.slice(0, len));
        if (len === 0) {
          deleting = false;
          i = (i + 1) % TYPED_EXAMPLES.length;
          timer = window.setTimeout(tick, 350);
          return;
        }
        timer = window.setTimeout(tick, 28);
      }
    };
    timer = window.setTimeout(tick, 600);
    return () => window.clearTimeout(timer);
  }, [active, reduce]);
  return reduce ? null : text;
}

// The homepage's "Where shall we take you?" bar (2026-10-13, direct
// request): searches right here as you type instead of opening /search.
// Same index and scoring as the /search page; the full list stays one
// click away under the top results.
export default function HomeSearch({ labelHtml }: { labelHtml: string }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  // Results hide on a click outside the bar + list, or Escape; typing or
  // focusing the field brings them back.
  const [open, setOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const typed = useTypedExample(!query && !focused);

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
  const [showAll, setShowAll] = useState(false);
  useEffect(() => setShowAll(false), [q]);

  return (
    <div className="reveal d1" ref={rootRef}>
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
          {!query &&
            (typed === null ? (
              <span className={styles.dsLabel} aria-hidden="true" dangerouslySetInnerHTML={{ __html: labelHtml }} />
            ) : (
              <span className={styles.dsLabel} aria-hidden="true">
                Search{"\u00a0"}
                <em>{focused ? "a city, a hotel, a visa…" : typed}</em>
                {!focused && <span className={styles.dsCaret} />}
              </span>
            ))}
          <input
            ref={inputRef}
            type="search"
            className={`${styles.dsInput} ta-home-q`}
            aria-label="Search a place, a hotel, or a city"
            spellCheck={false}
            value={query}
            onFocus={() => {
              warm();
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                setOpen(false);
              }
            }}
          />
        </span>
      </form>

      {open && q && index && (
        <div className={styles.dsResults} aria-live="polite">
          {results.length === 0 ? (
            <div className="sp-empty">
              <p>Nothing in the library matched “{q}”.</p>
              <p>
                Your advisor can still find it: {" "}
                <Link to={`/enquire?about=${encodeURIComponent(q)}`}>tell them what you have in mind →</Link>
              </p>
            </div>
          ) : (
            <>
              <div className="sp-rows">
                {(showAll ? results : results.slice(0, SHOWN)).map((e, i) => (
                  <SearchResultRow entry={e} key={e.u + i} />
                ))}
              </div>
              {!showAll && results.length > SHOWN && (
                <button type="button" className={styles.dsAll} onClick={() => setShowAll(true)}>
                  Show {results.length - SHOWN} more →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
