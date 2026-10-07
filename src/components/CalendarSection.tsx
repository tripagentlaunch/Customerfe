import type { CityData } from "../types/city";
import styles from "./CalendarSection.module.css";

type WhenToGo = CityData["whenToGo"];

// "When to go": the best-months headline and blurb, then the months grouped
// by how good they are — "Best time" (tier wm2) and "Fine shoulder" (wm1) as
// two labelled rows, each month listed in calendar order. Quieter months
// (wm0) aren't shown. A row with no months is left out.
const ROWS: { tier: string; label: string }[] = [
  { tier: "wm2", label: "Best time" },
  { tier: "wm1", label: "Fine shoulder" },
];

export default function CalendarSection({ whenToGo }: { whenToGo: WhenToGo }) {
  return (
    <section className="band tight ta-when-go">
      <div className="reveal" style={{ maxWidth: "60ch" }}>
        <div className="eyebrow">When to go</div>
        <div className="rule" />
        <p className={styles.wmBest}>{whenToGo.bestMonths}</p>
        <p className={styles.wmBlurb}>{whenToGo.blurb}</p>
      </div>

      <div className={`${styles.rows} reveal d1`}>
        {ROWS.map(({ tier, label }) => {
          const months = whenToGo.months.filter((m) => m.tier === tier);
          if (months.length === 0) return null;
          return (
            <div className={styles.row} key={tier}>
              <span className={styles.rowLabel}>{label}</span>
              <div className={styles.chips}>
                {months.map((m, i) => (
                  <span key={i} className={`${styles.chip}${tier === "wm2" ? ` ${styles.chipBest}` : ""}`}>
                    {m.code}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
