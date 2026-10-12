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
      {/* "Build your trip" in the nav lands here (2026-10-09): a clear coming-soon
          page whose main option is planning with Tara AI — that button opens
          the Tara chatbot (any Tara AI CTA does, see lib/taraChat.ts). */}
      <div className={styles.tpPanel}>
        <div className="eyebrow">Coming soon</div>
        <h1>Build your trip</h1>
        <p>
          The trip builder is on its way. Until then, plan it with <TaraAI /> — tell it the cities, the dates and what you
          have in mind, and your advisor builds the trip with you: flights, hotels and visas, all of it.
        </p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: 8 }}>
          <Link className="btn btn-gold" to="/enquire">
            Plan with <TaraAI />
          </Link>
          <Link className="btn btn-ghost" to="/destinations">
            Explore destinations
          </Link>
        </div>
      </div>
    </div>
  );
}
