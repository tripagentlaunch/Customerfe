import type { CityData, CityDay } from "../types/city";
import styles from "./PlanCarousel.module.css";

// The plan: one tab per day, each day showing a single highlight (photo,
// place name, caption) — no stepping through places, so no arrows or dots —
// plus an optional trailing "Events" tab with a static list.
export default function PlanCarousel({
  days,
  activeDayIndex,
  highlight,
  onSelectDay,
  events = [],
  eventsActive = false,
  onSelectEvents,
}: {
  days: CityDay[];
  activeDayIndex: number;
  // The active day's chosen highlight (see lib/planHighlights.ts).
  highlight: { place: string; text: string | null; photo: string };
  onSelectDay: (i: number) => void;
  // Optional extra "Events" tab after the last day: a static list, shown in
  // place of the day view. Hidden when there are no events.
  events?: CityData["whatsOn"]["events"];
  eventsActive?: boolean;
  onSelectEvents?: () => void;
}) {
  const day = days[activeDayIndex];
  if (!day) return null;

  return (
    <div className={styles.carousel}>
      {/* The tabs bar sits directly above the header, not inside it — its
          own full-width bar, not subject to the header's padding. */}
      <div className={styles.tabs} role="tablist" aria-label="Day">
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={!eventsActive && i === activeDayIndex}
            className={`${styles.tab}${!eventsActive && i === activeDayIndex ? ` ${styles.tabActive}` : ""}`}
            onClick={() => onSelectDay(i)}
          >
            {d.dayNumber}
          </button>
        ))}
        {events.length > 0 && (
          <button
            type="button"
            role="tab"
            aria-selected={eventsActive}
            className={`${styles.tab}${eventsActive ? ` ${styles.tabActive}` : ""}`}
            onClick={onSelectEvents}
          >
            Events
          </button>
        )}
      </div>
      {eventsActive && events.length > 0 ? (
        <div className={styles.eventsList}>
          {events.map((ev, i) => (
            <div className={styles.event} key={i}>
              <div className={styles.eventHead}>
                <span className={styles.eventName}>{ev.name}</span>
                <span className={styles.eventWhen}>{ev.when}</span>
              </div>
              <span className={styles.eventNote}>{ev.note}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.header}>
            <h3 className={styles.dayTitle}>{day.title}</h3>
          </div>

          <div className={styles.stage} key={activeDayIndex}>
            <div className={styles.photo} style={{ backgroundImage: `url('${highlight.photo}')` }}>
              <div className={styles.photoOverlay}>
                <span className={styles.placeName}>{highlight.place}</span>
              </div>
            </div>
          </div>

          <p className={styles.caption}>{highlight.text}</p>
        </>
      )}
    </div>
  );
}
