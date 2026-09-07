import { Link } from "react-router-dom";
import { toRoute } from "../../lib/toRoute";
import { useTripSummary, titleCase } from "../../lib/tripState";
import { useTripHandoffHref } from "../../lib/advisor";

// Ported from js/shell.js's discoverMega()/planMega() (~line 25-45) — same
// content, same image-driven tile layout. IMGBASE matches shell.js exactly;
// app/vite.config.ts's dev-mode /_vercel/image proxy + app/public/img/cities
// make these resolve in dev the same way Vercel resolves them in prod.
const IMGBASE = "/_vercel/image?url=%2Fimg%2Fcities%2F";

function imgUrl(slug: string) {
  return `${IMGBASE}${slug}.jpg&w=800&q=76`;
}

function MegaFeat({ slug, eyebrow, name, href }: { slug: string; eyebrow: string; name: string; href: string }) {
  return (
    <Link className="ta-feat" to={toRoute(href)}>
      <span className="ta-feat-img" style={{ backgroundImage: `url('${imgUrl(slug)}')` }} />
      <span className="ta-feat-grad" />
      <span className="ta-feat-cap">
        <span className="fk">{eyebrow}</span>
        <span className="fn">{name}</span>
      </span>
    </Link>
  );
}

function LinkList({ label, items }: { label: string; items: [string, string, string?][] }) {
  return (
    <div className="ta-mll">
      <span className="ll">{label}</span>
      <div className="ta-mll-a">
        {items.map(([text, href, note]) => (
          <Link key={href} to={toRoute(href)}>
            {text}
            {note ? <em> {note}</em> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function TripRail() {
  const summary = useTripSummary();
  const handoff = useTripHandoffHref(summary);

  if (!summary) {
    return (
      <div className="ta-triprail">
        <span className="ta-rail-empty">Your trip is empty — add a city from Discover, or ask your advisor.</span>
      </div>
    );
  }

  const names = summary.legs.map((l) => titleCase(l.city)).join(" · ");
  return (
    <div className="ta-triprail">
      <div className="ta-rail-in">
        <div>
          <span className="rk">Your trip so far</span>
          <div className="rtt">
            {names} — {summary.nights} night{summary.nights === 1 ? "" : "s"}
          </div>
        </div>
        <div className="rb">
          <Link className="cont" to="/trip">
            Continue
          </Link>
          <a className="hand" href={handoff.href} target={handoff.external ? "_blank" : undefined} rel={handoff.external ? "noopener" : undefined}>
            To your advisor →
          </a>
        </div>
      </div>
    </div>
  );
}

export function DiscoverMega() {
  return (
    <div className="ta-mega ta-mega-rich">
      <div className="ta-feats">
        <MegaFeat slug="udaipur" eyebrow="The cities" name="110, decided" href="destinations.html" />
        <MegaFeat slug="reykjavik" eyebrow="Exotic" name="The ends of the earth" href="exotic.html" />
        <MegaFeat slug="zermatt" eyebrow="Health & longevity" name="Medicine & retreats, arranged" href="health.html" />
        <MegaFeat slug="lake-como" eyebrow="Journeys" name="Curated, multi-city" href="journeys.html" />
      </div>
      <div className="ta-mega-foot">
        <LinkList label="Not sure where?" items={[["Ask Aanya, your concierge →", "concierge.html"]]} />
        <LinkList
          label="Also"
          items={[
            ["All 110 cities", "cities.html"],
            ["When to go", "when-to-go.html"],
            ["Collections", "collections.html"],
            ["The Journal", "journal.html"],
          ]}
        />
      </div>
    </div>
  );
}

export function PlanMega() {
  return (
    <div className="ta-mega ta-mega-rich">
      <div className="ta-feats ta-feats-2">
        <MegaFeat slug="lake-como" eyebrow="The tool" name="Build your trip" href="trip.html" />
        <MegaFeat slug="jaipur" eyebrow="Ready-made" name="Curated journeys" href="journeys.html" />
      </div>
      <div className="ta-mega-foot ta-plan-foot">
        <LinkList
          label="What we arrange"
          items={[
            ["Flights", "flights.html"],
            ["Hotels", "hotels.html"],
            ["Visas", "visas.html"],
          ]}
        />
        <LinkList
          label="Decide & shape"
          items={[
            ["Where to go", "where-to-go.html"],
            ["Compare", "compare.html"],
            ["When to go", "when-to-go.html"],
            ["Days", "days.html"],
          ]}
        />
      </div>
      <TripRail />
    </div>
  );
}
