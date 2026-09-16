import { useEffect, useMemo, useRef, useState } from "react";
import type { CityData } from "../types/city";
import styles from "./CalendarSection.module.css";

type WhenToGo = CityData["whenToGo"];
type WhatsOn = CityData["whatsOn"];
type WhatsOnEvent = WhatsOn["events"][number];

const TIER_LABEL: Record<string, string> = {
  wm2: "At its best",
  wm1: "Fine shoulder",
  wm0: "Quieter",
};

const AUTO_ADVANCE_MS = 4000;

// "When to go" and "What's on" merged into one calendar. Two clearly
// separate kinds of state here, deliberately not conflated:
//
// - Hover is purely a visual preview ("this is clickable") — a light fill
//   on an event's tag/row and a slight lift on its month(s). It never
//   touches the map: panning on every mouse-over the user passes through
//   would be jerky and distracting, not helpful.
// - Selection is what actually drives the map (and gets the stronger,
//   distinct "selected" styling) — either the event auto-advance is
//   currently on, or whichever month the user has clicked (clicking again
//   un-clicks it and hands control back to auto-advance).
//
// While this section is in view, one event is always selected — cycling
// automatically unless a month is pinned. The map on the page's sticky
// right-hand side (owned by CityPage, driven via onActiveEventChange/
// onInViewChange below) mirrors the selected event, the same way it
// mirrors the Plan section's active step.
export default function CalendarSection({
  whenToGo,
  whatsOn,
  onActiveEventChange,
  onInViewChange,
}: {
  whenToGo: WhenToGo;
  whatsOn: WhatsOn;
  onActiveEventChange?: (event: WhatsOnEvent | null) => void;
  onInViewChange?: (inView: boolean) => void;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  // Selection inputs: a pinned (clicked) month, or the auto-advance pointer.
  const [pinnedMonth, setPinnedMonth] = useState<string | null>(null);
  const [autoIdx, setAutoIdx] = useState(0);

  // Hover inputs: preview-only, never read by the map/selection logic below.
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [hoveredEventIdx, setHoveredEventIdx] = useState<number | null>(null);

  function toggleMonth(code: string) {
    setPinnedMonth((prev) => (prev === code ? null : code));
  }

  // A month with no event at all (Jan/Feb/Mar/Nov/Dec on Santorini) isn't
  // interactive — nothing to select, nothing for the map to point at, so it
  // shouldn't take a hover/click state or a pointer cursor either.
  const eventableMonths = useMemo(() => {
    const set = new Set<string>();
    whatsOn.events.forEach((ev) => ev.months?.forEach((m) => set.add(m)));
    return set;
  }, [whatsOn.events]);

  // Only events with a real months range are eligible to cycle/select — an
  // event with no months is "always relevant" for dimming purposes (see
  // below) but has nothing to point the map at.
  const cyclableIndices = useMemo(() => whatsOn.events.map((ev, i) => (ev.months?.length ? i : -1)).filter((i) => i >= 0), [whatsOn.events]);

  // Clicking an event (its tag on the calendar, or its row below) jumps the
  // auto-advance pointer to it rather than pinning it forever — the same
  // relationship the Plan section has between its manual arrows and its own
  // auto-advance: a manual choice becomes the new "current", and cycling
  // continues on from there instead of getting stuck.
  //
  // Also releases any pinned month: selectedEventIdx below gives a pinned
  // month's own event priority over the auto-advance pointer, which was
  // otherwise silently overriding every click on a *different* event's
  // row/tag after a month had been pinned — the click still moved
  // autoIdx, it just never showed, making those rows look unclickable.
  function jumpToEvent(i: number) {
    const pos = cyclableIndices.indexOf(i);
    if (pos >= 0) setAutoIdx(pos);
    setPinnedMonth(null);
  }

  useEffect(() => {
    // Watches the *previous* section (whatever CityPage happens to render
    // right before this one), not this section itself — "in view" here
    // means "the previous section has fully scrolled out", specifically.
    // Anchoring on this section's own box instead (e.g. "my top has
    // reached the viewport's top") happens to give the same answer only
    // when the two sections are flush with no gap between them; it stops
    // matching the moment any gap exists, since this section's top would
    // then reach the viewport top later than the previous section actually
    // exits. entry.boundingClientRect.bottom<=0 (not entry.isIntersecting)
    // is what specifically means "exited upward" — isIntersecting is also
    // false before the previous section has ever entered view, which would
    // switch the map far too early, right at page load.
    const el = sectionRef.current;
    const prev = el?.previousElementSibling;
    if (!prev) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.boundingClientRect.bottom <= 0), { threshold: 0 });
    observer.observe(prev);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onInViewChange?.(inView);
  }, [inView, onInViewChange]);

  // Auto-advance only pauses while a month is actually pinned (clicked) —
  // hover never pauses it, since hover doesn't select anything.
  useEffect(() => {
    if (!inView || pinnedMonth !== null || cyclableIndices.length < 2) return;
    const id = setTimeout(() => setAutoIdx((i) => (i + 1) % cyclableIndices.length), AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [inView, pinnedMonth, autoIdx, cyclableIndices.length]);

  // The selected event: a pinned month's own event wins outright, otherwise
  // whichever event auto-advance is currently on. Hover is never part of
  // this — see the component comment above.
  const pinnedMonthEventIdx = pinnedMonth ? whatsOn.events.findIndex((ev) => ev.months?.includes(pinnedMonth)) : -1;
  const autoEventIdx = cyclableIndices.length > 0 ? cyclableIndices[autoIdx % cyclableIndices.length] : null;
  const selectedEventIdx = pinnedMonthEventIdx >= 0 ? pinnedMonthEventIdx : autoEventIdx;
  const selectedEvent = selectedEventIdx !== null ? whatsOn.events[selectedEventIdx] : null;

  useEffect(() => {
    onActiveEventChange?.(selectedEvent ?? null);
  }, [selectedEvent, onActiveEventChange]);

  // The hover preview target: directly hovering an event's tag/row, or
  // hovering a month that belongs to one — purely for the light "inviting a
  // click" fill/lift, kept fully separate from selectedEventIdx above.
  const hoveredMonthEventIdx = hoveredMonth ? whatsOn.events.findIndex((ev) => ev.months?.includes(hoveredMonth)) : -1;
  const previewEventIdx = hoveredEventIdx ?? (hoveredMonthEventIdx >= 0 ? hoveredMonthEventIdx : null);
  const previewEvent = previewEventIdx !== null ? whatsOn.events[previewEventIdx] : null;

  const selectedEventMonths = selectedEvent?.months ?? [];
  const previewEventMonths = previewEvent?.months ?? [];
  function monthClass(code: string) {
    const isSelected = code === pinnedMonth || selectedEventMonths.includes(code);
    const isHovering = code === hoveredMonth || previewEventMonths.includes(code);
    return `${isSelected ? ` ${styles.selected}` : ""}${isHovering && !isSelected ? ` ${styles.hovering}` : ""}`;
  }

  const monthIndex = new Map(whenToGo.months.map((m, i) => [m.code, i]));
  const eventRanges = whatsOn.events
    .map((ev) => {
      if (!ev.months?.length) return null;
      const indices = ev.months.map((c) => monthIndex.get(c)).filter((i): i is number => i !== undefined);
      if (indices.length === 0) return null;
      return { ev, start: Math.min(...indices), end: Math.max(...indices) };
    })
    .filter((x): x is { ev: WhatsOnEvent; start: number; end: number } => x !== null);

  const halfSize = Math.ceil(whenToGo.months.length / 2);
  const halves = [
    { months: whenToGo.months.slice(0, halfSize), offset: 0 },
    { months: whenToGo.months.slice(halfSize), offset: halfSize },
  ].filter((h) => h.months.length > 0);

  function spansForHalf(offset: number, count: number) {
    return eventRanges
      .map(({ ev, start, end }) => {
        const s = Math.max(start, offset);
        const e = Math.min(end, offset + count - 1);
        if (s > e) return null;
        return { ev, start: s - offset, span: e - s + 1 };
      })
      .filter((x): x is { ev: WhatsOnEvent; start: number; span: number } => x !== null);
  }

  return (
    <section className="band tight ta-when-go" ref={sectionRef}>
      <div className="reveal" style={{ maxWidth: "60ch" }}>
        <div className="eyebrow">When to go</div>
        <div className="rule" />
        <p className={styles.wmBest}>{whenToGo.bestMonths}</p>
        <p className={styles.wmBlurb}>{whenToGo.blurb}</p>
      </div>

      <div className={`${styles.stripStack} reveal d1`} role="group" aria-label="Months">
        {halves.map(({ months, offset }, hi) => (
          <div
            className={styles.strip}
            key={hi}
            style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
          >
            {months.map((m, i) => {
              const code = m.code ?? "";
              // A month with no event of its own (Jan/Feb/Mar/Nov/Dec on
              // Santorini) is informational only — it still shows its
              // best/shoulder/quiet tier color, but takes no hover/click
              // state and doesn't affect the map, so it renders as a plain
              // non-interactive div, not a button.
              if (!eventableMonths.has(code)) {
                return (
                  <div key={i} className={`${styles.month} ${styles.monthStatic} ${styles[m.tier] ?? ""}`} style={{ gridRow: 2 }} title={TIER_LABEL[m.tier] ?? undefined}>
                    {code}
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  className={`${styles.month} ${styles[m.tier] ?? ""}${monthClass(code)}`}
                  style={{ gridRow: 2 }}
                  aria-pressed={pinnedMonth === code}
                  title={TIER_LABEL[m.tier] ?? undefined}
                  onMouseEnter={() => setHoveredMonth(code)}
                  onMouseLeave={() => setHoveredMonth(null)}
                  onClick={() => toggleMonth(code)}
                >
                  {code}
                </button>
              );
            })}
            {spansForHalf(offset, months.length).map(({ ev, start, span }, i) => {
              const evIdx = whatsOn.events.indexOf(ev);
              const isSelected = evIdx === selectedEventIdx;
              const isHovering = evIdx === previewEventIdx;
              return (
                <button
                  key={i}
                  type="button"
                  className={`${styles.monthEventLabel}${isSelected ? ` ${styles.selected}` : ""}${isHovering && !isSelected ? ` ${styles.hovering}` : ""}`}
                  style={{ gridColumn: `${start + 1} / span ${span}`, gridRow: 1 }}
                  onMouseEnter={() => setHoveredEventIdx(evIdx)}
                  onMouseLeave={() => setHoveredEventIdx(null)}
                  onClick={() => jumpToEvent(evIdx)}
                >
                  {ev.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {whatsOn.events.length > 0 && (
        <div className={`${styles.events} reveal d2`}>
          {whatsOn.events.map((ev, i) => {
            const isSelected = i === selectedEventIdx;
            const isHovering = i === previewEventIdx;
            return (
              <div
                className={`ta-event${isSelected ? ` ${styles.selected}` : ""}${isHovering && !isSelected ? ` ${styles.hoverFill}` : ""}`}
                key={i}
                onMouseEnter={() => setHoveredEventIdx(i)}
                onMouseLeave={() => setHoveredEventIdx(null)}
                onClick={() => jumpToEvent(i)}
              >
                <span className="ta-ev-when">{ev.when}</span>
                <div className="ta-ev-b">
                  <span className="ta-ev-n">{ev.name}</span>
                  <span className="ta-ev-note">{ev.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
