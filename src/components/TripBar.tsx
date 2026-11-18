import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TRIP_FLY_EVENT, type TripFlyDetail } from "../lib/flyToTrip";
import { removeItem, titleCase, useTrip, type TripItem } from "../lib/tripState";
import styles from "./TripBar.module.css";

const KIND: Record<TripItem["kind"], string> = { hotel: "Stay", experience: "Do and eat", event: "Event", plan: "From the plan" };

// A slim bar along the foot of a city page once something has been added to the trip
// ("Add to your trip"). It opens upward to list what is in the trip, this city first,
// with a remove button on each; "Open your trip" goes to the /trip builder.
export function TripBar({ citySlug }: { citySlug: string }) {
  const trip = useTrip();
  const [open, setOpen] = useState(false);
  const legs = (trip?.legs ?? [])
    .filter((l) => l && l.items && l.items.length)
    .sort((a, b) => Number(b.city === citySlug) - Number(a.city === citySlug));
  const total = legs.reduce((n, l) => n + (l.items?.length ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  useEffect(() => {
    if (!total) setOpen(false);
  }, [total]);

  // "Add to trip" flight (lib/flyToTrip.ts): while a photo is still in the air the number holds back by one,
  // and when it lands the number ticks up and the bar gives a small bump.
  const [inFlight, setInFlight] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const bump = { duration: 340, easing: "cubic-bezier(.3,1.5,.5,1)" };
    const onFly = (e: Event) => {
      const d = (e as CustomEvent<TripFlyDetail>).detail;
      if (d.phase === "start") return setInFlight((n) => n + 1);
      setInFlight((n) => Math.max(0, n - 1));
      if (d.reduced) return;
      barRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }], bump);
      countRef.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }], bump);
    };
    window.addEventListener(TRIP_FLY_EVENT, onFly);
    return () => window.removeEventListener(TRIP_FLY_EVENT, onFly);
  }, []);
  // The first item shows at once (the tray slides in with it); later ones tick up on landing.
  const shown = total ? Math.max(1, total - inFlight) : 0;

  if (!total) return null;
  return (
    <>
      {open && <div className={styles.scrim} onClick={() => setOpen(false)} />}
      <div className={styles.wrap} role="region" aria-label="Your trip">
        {open && (
          <div className={styles.panel}>
            {legs.map((leg) => (
              <div className={styles.leg} key={leg.id}>
                <div className={styles.legName}>{leg.label || titleCase(leg.city)}</div>
                <ul>
                  {(leg.items ?? []).map((it) => (
                    <li key={it.ref}>
                      <span className={styles.itTitle}>{it.title}</span>
                      <span className={styles.itKind}>
                        {KIND[it.kind]}
                        
                      </span>
                      <button type="button" aria-label={`Remove ${it.title} from your trip`} onClick={() => removeItem(it.ref)}>
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className={styles.bar} ref={barRef}>
          <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className={styles.count} ref={countRef} data-trip-count>
              {shown}
            </span>
            <span>
              added to your trip
            </span>
            <span className={styles.chev} aria-hidden="true">
              {open ? "↓" : "↑"}
            </span>
          </button>
          <Link className={styles.open} to="/trip">
            Open your trip
          </Link>
        </div>
      </div>
    </>
  );
}
