import { useEffect } from "react";
import { Link } from "react-router-dom";
import tripData from "../data/trip.generated.json";
import type { TripPageData } from "../types/trip";
import { useNavVariant } from "../lib/navVariant";
import { TaraAI } from "../components/TaraAI";
import styles from "./trip-page.module.css";

const data = tripData as unknown as TripPageData;

// The real trip.html body is one empty <section id="ta-trip"> mount for a
// 347-line Supabase-backed trip-builder app (js/trip.js) — no static
// content to port. Per the shell-only-defer-logic decision, this renders a
// static placeholder that keeps the CONVERT path alive (routes to
// /enquire) rather than a dead end, until the builder itself is ported.
export default function TripPage() {
  useNavVariant("solid");

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  return (
    <div className={styles.tpWrap}>
      <div className={styles.tpPanel}>
        <div className="eyebrow">Build a trip</div>
        <h1>The trip builder is on its way.</h1>
        <p>In the meantime, tell your advisor the cities, the dates and what you have in mind — they'll build the trip with you, flights, hotels and visas, all of it.</p>
        <Link className="btn btn-gold" to="/enquire">
          Plan a trip with <TaraAI />
        </Link>
      </div>
    </div>
  );
}
