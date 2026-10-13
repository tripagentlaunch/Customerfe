import { Link } from "react-router-dom";
import { toRoute } from "../lib/toRoute";
import { KIND_LABEL, type SearchEntry } from "../lib/searchIndex";

// One search result — shared by the /search page and the homepage's inline
// search, styled by css/site.css's .sp-row rules.
function citySlug(e: SearchEntry): string | null {
  if (e.u.indexOf("city-") === 0) return e.u.slice(5).replace(".html", "").replace(/[#?].*$/, "");
  return null;
}

function truncate(d: string, max: number): string {
  return d.length > max ? d.slice(0, max - 2).replace(/\s+\S*$/, "") + "…" : d;
}

export default function SearchResultRow({ entry }: { entry: SearchEntry }) {
  const slug = citySlug(entry);
  return (
    <div className="sp-row">
      <Link className="sp-row-main" to={toRoute(entry.u)}>
        {slug ? (
          <span className="sp-th" style={{ backgroundImage: `url('/_vercel/image?url=%2Fimg%2Fcities%2F${slug}.jpg&w=96&q=70')` }} />
        ) : (
          <span className="sp-th sp-th-ph">{(entry.t || "?").charAt(0)}</span>
        )}
        <span className="sp-row-tw">
          <span className="sp-row-top">
            <span className="sp-row-t">{entry.t}</span>
            <span className="sp-row-k">
              {KIND_LABEL[entry.k] || entry.k}
              {entry.city && <> <em>{entry.city}</em></>}
            </span>
          </span>
          {entry.d && <span className="sp-row-d">{truncate(entry.d, 128)}</span>}
        </span>
      </Link>
    </div>
  );
}
