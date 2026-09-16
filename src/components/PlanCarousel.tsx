import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CityDay } from "../types/city";
import styles from "./PlanCarousel.module.css";

// `CityDay.slots[].label` is free-form text (types/city.ts), but only these
// three values get an actual clock-time shown in the carousel — anything
// else falls back to showing the raw label instead (see time computation
// below), so a backend isn't blocked from sending other slot labels, it
// just won't get a clock-time shown. This is the authoritative list of
// labels that do.
export const KNOWN_SLOT_LABELS = ["Morning", "Afternoon", "Evening"] as const;

const SLOT_TIME: Record<string, string> = {
  Morning: "9:00 a.m.",
  Afternoon: "2:00 p.m.",
  Evening: "7:30 p.m.",
};

type Transition = "slide" | "fade-place" | "fade-day";

export default function PlanCarousel({
  days,
  activeDayIndex,
  activeSlotIndex,
  activePhotoIndex,
  photos,
  onSelectDay,
  onPrev,
  onNext,
}: {
  days: CityDay[];
  activeDayIndex: number;
  activeSlotIndex: number;
  activePhotoIndex: number;
  photos: string[];
  onSelectDay: (i: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const day = days[activeDayIndex];
  const slot = day?.slots[activeSlotIndex];

  // Compare against the previous render to pick the right transition —
  // a day change outranks a slot change, which outranks a plain photo
  // advance within the same place.
  const prevRef = useRef({ dayIndex: activeDayIndex, slotIndex: activeSlotIndex });
  const [transition, setTransition] = useState<Transition>("slide");

  useEffect(() => {
    const prev = prevRef.current;
    if (prev.dayIndex !== activeDayIndex) setTransition("fade-day");
    else if (prev.slotIndex !== activeSlotIndex) setTransition("fade-place");
    else setTransition("slide");
    prevRef.current = { dayIndex: activeDayIndex, slotIndex: activeSlotIndex };
  }, [activeDayIndex, activeSlotIndex]);

  if (!day || !slot) return null;

  const time = (slot.label && SLOT_TIME[slot.label]) ?? slot.label ?? "";
  const placeName = slot.place ?? slot.label ?? "";
  const photo = photos[activePhotoIndex] ?? photos[0];

  return (
    <div className={styles.carousel}>
      {/* The tabs bar sits directly above the header, not inside it — its
          own full-width bar, not subject to the header's padding. Day tabs
          and the day's own title both only change when the active day
          changes, unlike the photo overlay below (every place/photo step). */}
      <div className={styles.tabs} role="tablist" aria-label="Day">
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activeDayIndex}
            className={`${styles.tab}${i === activeDayIndex ? ` ${styles.tabActive}` : ""}`}
            onClick={() => onSelectDay(i)}
          >
            {d.dayNumber}
          </button>
        ))}
      </div>
      <div className={styles.header}>
        <h3 className={styles.dayTitle}>{day.title}</h3>
      </div>

      <div className={styles.stage} data-transition={transition} key={`${activeDayIndex}-${activeSlotIndex}-${activePhotoIndex}`}>
        <div className={styles.photo} style={{ backgroundImage: `url('${photo}')` }}>
          <button type="button" aria-label="Previous" className={`${styles.navBtn} ${styles.navPrev}`} onClick={onPrev}>
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next" className={`${styles.navBtn} ${styles.navNext}`} onClick={onNext}>
            <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <div className={styles.photoOverlay}>
            <span className={styles.placeName}>{placeName}</span>
            {time && <span className={styles.time}>{time}</span>}
          </div>
          {/* One dot per place in the day (morning/afternoon/evening), not
              per photo — each place only ever has a single photo now, so
              the dots track progress through the day instead. */}
          {day.slots.length > 1 && (
            <div className={styles.dots}>
              {day.slots.map((_, i) => (
                <span key={i} className={`${styles.dot}${i === activeSlotIndex ? ` ${styles.dotActive}` : ""}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className={styles.caption}>{slot.text}</p>
    </div>
  );
}
