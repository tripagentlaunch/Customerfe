import { useEffect } from "react";
import { Link } from "react-router-dom";
import daysData from "../data/days-page.generated.json";
import type { DaysPageData } from "../types/days-page";
import { useNavVariant } from "../lib/navVariant";
import { TaraAI } from "../components/TaraAI";
import styles from "./days-page.module.css";

const data = daysData as unknown as DaysPageData;

// days.html's <main> is a single empty <section id="ta-days"> mount for a
// 442-line MapLibre GL trip-day-planner (js/days.js): live geocoding against
// photon.komoot.io, an agentic text->plan parser, haversine-distance day
// clustering, and a Supabase-backed venue/hotel search — no static content
// to port. Per the shell-only-defer-logic decision (same category as
// trip.html/search.html/hotels.html), this renders a static placeholder
// that keeps the CONVERT path alive rather than a dead end.
export default function DaysPage() {
  useNavVariant("solid");

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  return (
    <div className={styles.dyWrap}>
      <div className={styles.dyPanel}>
        <div className="eyebrow">Your days, mapped</div>
        <h1>The day-planning map is on its way.</h1>
        <p>In the meantime, tell your advisor the places you love and how you like to move — they'll lay out genuinely walkable days with you, and turn it into a booked trip.</p>
        <Link className="btn btn-gold" to="/enquire">
          Plan your days with <TaraAI />
        </Link>
      </div>
    </div>
  );
}
