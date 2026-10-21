import type { CityData } from "../types/city";
import styles from "./CalendarSection.module.css";
import { useIsMobile } from "../hooks/useIsMobile";

type WhenToGo = CityData["whenToGo"];

// "When to go".
// Desktop: the blurb (the why), then the whole year as one Jan-Dec strip,
// each month shaded by tier — best (wm2) filled, good (wm1) outlined, quieter
// (wm0) faint — with a small key. The old italic best-months headline is
// gone: it always repeated the best-tier months word for word (true for all
// 110 cities), so the strip says it once, in calendar context.
// Phone: unchanged — no blurb, months grouped into "Best time" (wm2) and
// "Fine shoulder" (wm1) rows; quieter months aren't shown.
const ROWS: { tier: string; label: string }[] = [
  { tier: "wm2", label: "Best time" },
  { tier: "wm1", label: "Fine shoulder" },
];

const TIERS: { tier: string; label: string }[] = [
  { tier: "wm2", label: "Best" },
  { tier: "wm1", label: "Good" },
  { tier: "wm0", label: "Quieter" },
];
const tierLabel = (tier: string) => TIERS.find((t) => t.tier === tier)?.label ?? "";

export default function CalendarSection({ whenToGo }: { whenToGo: WhenToGo }) {
  const isPhone = useIsMobile();
  return (
    <section className="band tight ta-when-go">
      <div className="reveal" style={{ maxWidth: "60ch" }}>
        <div className="eyebrow">When to go</div>
        <div className="rule" />
        {/* Phone (mobile handoff): the blurb is left out to keep the stacked
            page short. */}
        {!isPhone && <p className={styles.wmBlurb}>{whenToGo.blurb}</p>}
      </div>

      {!isPhone ? (
        <div className={`${styles.year} reveal d1`}>
          <ol className={styles.strip} aria-label="Month by month">
            {whenToGo.months.map((m) => (
              <li key={m.code} className={`${styles.cell} ${styles[m.tier] ?? ""}`} aria-label={`${m.code}: ${tierLabel(m.tier)}`}>
                {m.code}
              </li>
            ))}
          </ol>
          <div className={styles.key} aria-hidden="true">
            {TIERS.map(({ tier, label }) => (
              <span className={styles.keyItem} key={tier}>
                <i className={`${styles.swatch} ${styles[tier]}`} />
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
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
      )}
    </section>
  );
}
