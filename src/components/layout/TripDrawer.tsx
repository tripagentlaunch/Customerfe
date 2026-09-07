import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTripDrawer } from "../../lib/tripDrawer";
import { useTripSummary, removeFromTrip, titleCase } from "../../lib/tripState";
import { useTripHandoffHref } from "../../lib/advisor";
import { useTripRange } from "../../lib/tripRange";

// Ported from js/shell.js's renderDrawer()/openCart()/closeCart() — the
// persistent "My Trip" cart drawer. css/site.css's .ta-cart* rules apply
// with zero new CSS.
export function TripDrawer() {
  const { isOpen, close } = useTripDrawer();
  const summary = useTripSummary();
  const handoff = useTripHandoffHref(summary);
  const range = useTripRange(summary?.legs);

  // Mirrors js/shell.js's openCart()/closeCart(): mount+unhide a frame
  // before adding .on (so the enter transition actually plays), and delay
  // re-hiding on close until the .32s transform transition finishes.
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [isOpen]);

  return (
    <>
      <div className={`ta-cart-scrim${entered ? " on" : ""}`} hidden={!mounted} onClick={close} />
      <aside className={`ta-cart${entered ? " on" : ""}`} aria-label="My Trip" hidden={!mounted}>
        {!summary ? (
          <>
            <div className="ta-cart-h">
              <span className="k">Your trip</span>
              <button className="ta-cart-x" aria-label="Close" onClick={close}>
                ×
              </button>
            </div>
            <div className="ta-cart-empty">
              <p>Your trip starts with a place.</p>
              <p className="sub">Add a city, a hotel or a month as you browse — it gathers here, then a person makes it real.</p>
              <div className="ta-cart-empty-a">
                <Link className="go" to="/cities" onClick={close}>
                  Browse cities
                </Link>
                <Link className="go" to="/where-to-go" onClick={close}>
                  Help me choose
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="ta-cart-h">
              <span className="k">Your trip</span>
              {summary.name ? <div className="t">{summary.name}</div> : null}
              <button className="ta-cart-x" aria-label="Close" onClick={close}>
                ×
              </button>
            </div>
            <div className="ta-cart-body">
              <div className="ta-cmeta">
                {summary.count} {summary.count === 1 ? "city" : "cities"} · {summary.nights} night{summary.nights === 1 ? "" : "s"}
              </div>
              {summary.legs.map((l, i) => (
                <div className="ta-cleg" key={l.id}>
                  <span className="ln">{i + 1}</span>
                  <span className="lname">{titleCase(l.city)}</span>
                  <span className="ln2">
                    {l.nights || 0} night{(l.nights || 0) === 1 ? "" : "s"}
                  </span>
                  <button className="ta-cleg-x" aria-label={`Remove ${titleCase(l.city)} from your trip`} onClick={() => removeFromTrip(l.city)}>
                    ×
                  </button>
                </div>
              ))}
              <div className="ta-crange">
                {range?.have && range.hi > 0 ? (
                  <>
                    <span className="rk">Indicative</span>
                    <div className="rv">
                      ₹{range.lo.toFixed(1)} – {range.hi.toFixed(1)} L
                    </div>
                    <span className="rf">per person · a range, your advisor confirms</span>
                  </>
                ) : (
                  <span className="rf">Your advisor prices it precisely.</span>
                )}
              </div>
            </div>
            <div className="ta-cart-foot">
              <a className="hand" href={handoff.href} target={handoff.external ? "_blank" : undefined} rel={handoff.external ? "noopener" : undefined}>
                Hand to your advisor →
              </a>
              <Link className="open" to="/trip" onClick={close}>
                Open the full builder
              </Link>
              <span className="assure">
                By invitation ·{" "}
                <Link to="/invitation" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: "2px" }} onClick={close}>
                  request yours →
                </Link>
              </span>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
