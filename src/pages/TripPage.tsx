import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import tripData from "../data/trip.generated.json";
import type { TripPageData } from "../types/trip";
import {
  clearTrip,
  // getTripSummary,
  moveLeg,
  setLegOrder,
  removeFromTrip,
  removeItem,
  renameTrip,
  setNights,
  setTripDays,
  titleCase,
  useTrip,
  type TripItem,
  type TripLeg,
} from "../lib/tripState";
// import { useTripHandoffHref } from "../lib/advisor"; // "Send to advisor" now opens the chatbot instead (2026-11-19)
import { taraChatUrl } from "../lib/taraChat";
import { useTripRange } from "../lib/tripRange";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./trip-page.module.css";

const data = tripData as unknown as TripPageData;
const HERO_IMAGE = "/images/home-hero/1-lake-villa.jpg"; // fixed: the hero does not change with the cities
const KIND_LABEL: Record<TripItem["kind"], string> = { hotel: "Stay", experience: "Do and eat", event: "Event", plan: "From the plan" };

// The trip builder (2026-11-17). Everything added with "Add to your trip" on the city pages lands
// here: one row per city (drag to reorder), each with its hotels in one column and its things to
// do in the other. The trip's length in days is the sum of the cities' days; typing a new total
// splits it equally across the cities, and changing a city's days updates the total. Kept in this
// browser (lib/tripState.ts); nothing is sent anywhere until the trip is handed to a person.
export default function TripPage() {
  const trip = useTrip();
  // Dragging a city block: the order shown follows the pointer live (the other cities make room),
  // and is only saved when the block is dropped.
  const [dragId, setDragId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const lastTop = useRef(new Map<string, number>());
  const savedLegs = (trip?.legs ?? []).filter(Boolean);
  const legs = order ? (order.map((id) => savedLegs.find((l) => l.id === id)).filter(Boolean) as TripLeg[]) : savedLegs;
  // const summary = getTripSummary(); // only fed the old advisor handoff link
  const range = useTripRange(legs);
  // const handoff = useTripHandoffHref(summary); // was WhatsApp / the enquiry form; the chatbot now receives the trip
  const [confirmClear, setConfirmClear] = useState(false);

  // Slide the blocks to their new places instead of jumping (the dragged one stays under the pointer's ghost).
  useLayoutEffect(() => {
    els.current.forEach((el, id) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const prev = lastTop.current.get(id);
      if (prev !== undefined && Math.abs(prev - top) > 1) {
        el.animate([{ transform: `translateY(${prev - top}px)` }, { transform: "translateY(0)" }], { duration: 220, easing: "ease" });
      }
      lastTop.current.set(id, top);
    });
  });

  const onContainerDragOver = (e: React.DragEvent) => {
    if (!dragId) return;
    e.preventDefault();
    const current = order ?? savedLegs.map((l) => l.id);
    const others = current.filter((id) => id !== dragId);
    // The block goes before the first other city whose middle is below the pointer.
    let idx = others.length;
    for (let k = 0; k < others.length; k++) {
      const el = els.current.get(others[k]);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        idx = k;
        break;
      }
    }
    const next = [...others.slice(0, idx), dragId, ...others.slice(idx)];
    if (next.join() !== current.join()) setOrder(next);
  };
  const endDrag = (save: boolean) => {
    if (save && order && dragId) setLegOrder(order);
    setDragId(null);
    setOrder(null);
  };

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  const totalDays = legs.reduce((n, l) => n + (l.nights || 0), 0);
  const stops = legs.reduce((n, l) => n + (l.items?.length ?? 0), 0);

  return (
    <div className={styles.tpPage}>
      <header className={styles.hero} style={{ backgroundImage: `url('${HERO_IMAGE}')` }}>
        <div className={styles.heroIn}>
          <div className={styles.heroEyebrow}>Your trip</div>
          <h1 className={styles.heroTitle}>Build your trip</h1>
          <p className={styles.heroLede}>
            On any city page, press the <strong>+</strong> on a hotel, a place to eat, something to do or a stop in the 3-day plan. It gathers here, city by city.
          </p>
          {legs.length === 0 && (
            <div className={styles.actions}>
              <PrimaryInverseButton to="/destinations">Explore destinations</PrimaryInverseButton>
              <SecondaryInverseButton to="/where-to-go">Help me choose</SecondaryInverseButton>
            </div>
          )}
        </div>
      </header>

      {legs.length > 0 && (
        <div className={styles.body}>
          <div className={styles.summary}>
            <input
              className={styles.tripName}
              value={trip?.name ?? ""}
              onChange={(e) => renameTrip(e.target.value)}
              placeholder="Name your trip"
              aria-label="Trip name"
              maxLength={60}
            />
            <div className={styles.summaryMeta}>
              <div className={styles.lengthBox}>
                <span className={styles.lengthK}>Trip length</span>
                <NumField value={totalDays} min={legs.length} max={365} label="Trip length in days" onCommit={setTripDays} className={styles.lengthNum} />
                <span className={styles.lengthU}>days</span>
              </div>
              <span>
                {legs.length} {legs.length === 1 ? "city" : "cities"}
              </span>
              <span>
                {stops} stop{stops === 1 ? "" : "s"} added
              </span>
              <span className={styles.clearWrap}>
                {confirmClear ? (
                  <span className={styles.confirm}>
                    Clear the whole trip?{" "}
                    <button type="button" className={styles.link} onClick={() => { clearTrip(); setConfirmClear(false); }}>
                      Yes, clear it
                    </button>{" "}
                    <button type="button" className={styles.link} onClick={() => setConfirmClear(false)}>
                      Keep it
                    </button>
                  </span>
                ) : (
                  <button type="button" className={styles.link} onClick={() => setConfirmClear(true)}>
                    Clear trip
                  </button>
                )}
              </span>
            </div>
            <p className={styles.summaryHint}>The days split equally across your cities. Change a city's days and the total follows.</p>
          </div>
          <div
            className={styles.legs}
            onDragOver={onContainerDragOver}
            onDrop={(e) => {
              e.preventDefault();
              endDrag(true);
            }}
          >
            {legs.map((leg, i) => (
              <LegRow
                key={leg.id}
                leg={leg}
                index={i}
                last={i === legs.length - 1}
                dragging={dragId === leg.id}
                register={(el) => (el ? els.current.set(leg.id, el) : els.current.delete(leg.id))}
                onDragStart={() => setDragId(leg.id)}
                onDragEnd={() => endDrag(false)}
              />
            ))}
          </div>

          <div className={styles.foot}>
            <div className={styles.range}>
              {range?.have && range.hi > 0 ? (
                <>
                  <span className={styles.rangeK}>Indicative</span>
                  <span className={styles.rangeV}>
                    ₹{range.lo.toFixed(1)} to {range.hi.toFixed(1)} L
                  </span>
                  <span className={styles.rangeF}>per person, a range. Your advisor confirms it.</span>
                </>
              ) : (
                <span className={styles.rangeF}>Your advisor prices it precisely.</span>
              )}
            </div>
            <div className={styles.actions}>
              {/* Opens the chatbot, like "Plan this trip" (data-tara-chat is picked up by lib/taraChat.ts, which also
                  carries a signed-in member's code). The backend turns the trip into the message waiting in the chat. */}
              <a className={`btn btn-gold btn-square ${styles.primary}`} href={taraChatUrl()} data-tara-chat target="_blank" rel="noopener noreferrer">
                Send to advisor
              </a>
              <Link className={`btn btn-ghost ${styles.secondary}`} to="/destinations">
                Add another city
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// A whole-number field you can type in or step with the arrows. Every valid number counts at once, and it
// follows the value it is given when you are not in it (so a change made elsewhere shows up straight away).
function NumField({ value, min, max, label, onCommit, className }: { value: number; min: number; max: number; label: string; onCommit: (n: number) => void; className?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  // if the number changes from elsewhere (the total, another city), drop the half-typed text
  useEffect(() => {
    setDraft((d) => (d !== null && Math.round(Number(d)) !== value ? null : d));
  }, [value]);
  const commit = () => {
    if (draft !== null) {
      const n = Math.round(Number(draft));
      if (Number.isFinite(n) && n >= min) onCommit(Math.min(max, n));
    }
    setDraft(null);
  };
  return (
    <input
      className={className}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(e) => {
        // The change counts straight away (the arrows, or each digit typed once it is a valid number),
        // so the total and the other cities update as you go. The raw text stays until you leave the field.
        setDraft(e.target.value);
        const n = Math.round(Number(e.target.value));
        if (e.target.value !== "" && Number.isFinite(n) && n >= min) onCommit(Math.min(max, n));
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

function LegRow({
  leg,
  index,
  last,
  dragging,
  register,
  onDragStart,
  onDragEnd,
}: {
  leg: TripLeg;
  index: number;
  last: boolean;
  dragging: boolean;
  register: (el: HTMLElement | null) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const items = leg.items ?? [];
  const hotels = items.filter((i) => i.kind === "hotel");
  const things = items.filter((i) => i.kind !== "hotel");
  const city = leg.label || titleCase(leg.city);

  return (
    <section ref={register} className={`${styles.leg}${dragging ? ` ${styles.legDragging}` : ""}`}>
      <div
        className={styles.legHead}
        draggable
        title="Drag to reorder"
        onDragStart={(e) => {
          // Only from the empty parts of the header: links, buttons and the days box keep working.
          if ((e.target as HTMLElement).closest("a, button, input")) {
            e.preventDefault();
            return;
          }
          const section = (e.currentTarget as HTMLElement).closest("section") as HTMLElement | null;
          if (section) {
            const r = section.getBoundingClientRect();
            e.dataTransfer.setDragImage(section, e.clientX - r.left, e.clientY - r.top); // the whole city block follows the pointer
          }
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", leg.id);
          window.setTimeout(onDragStart, 0); // after the ghost image is taken, so it is not the faded one
        }}
        onDragEnd={onDragEnd}
      >
        <span className={styles.grip} aria-hidden="true">
          ⋮⋮
        </span>
        <span className={styles.legNo}>{index + 1}</span>
        <h2>
          <Link to={`/city-${leg.city}`}>{city}</Link>
        </h2>
        <div className={styles.daysBox}>
          <NumField value={leg.nights || 1} min={1} max={365} label={`Days in ${city}`} onCommit={(n) => setNights(leg.id, n)} className={styles.daysNum} />
          <span>day{leg.nights === 1 ? "" : "s"}</span>
        </div>
        <div className={styles.legTools}>
          <button type="button" aria-label={`Move ${city} earlier`} onClick={() => moveLeg(leg.id, -1)} disabled={index === 0}>
            ↑
          </button>
          <button type="button" aria-label={`Move ${city} later`} onClick={() => moveLeg(leg.id, 1)} disabled={last}>
            ↓
          </button>
          <button type="button" className={styles.legRemove} aria-label={`Remove ${city} from your trip`} title="Remove city" onClick={() => removeFromTrip(leg.city)}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.cols}>
        <div className={styles.col}>
          <div className={styles.colK}>Where you stay</div>
          {hotels.length ? (
            <ul className={styles.list}>
              {hotels.map((h) => (
                <ItemRow key={h.ref} item={h} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              No hotel yet. <Link to={`/city-${leg.city}?guide=stay`}>Pick one in {city}</Link>.
            </p>
          )}
        </div>
        <div className={styles.col}>
          <div className={styles.colK}>Things to do</div>
          {things.length ? (
            <ul className={styles.list}>
              {things.map((t) => (
                <ItemRow key={t.ref} item={t} />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              Nothing added yet. <Link to={`/city-${leg.city}?guide=do`}>Browse {city}</Link>.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ItemRow({ item }: { item: TripItem }) {
  return (
    <li className={styles.item}>
      {item.photo ? <img className={styles.itemImg} src={item.photo} alt="" loading="lazy" /> : <span className={styles.itemImg} aria-hidden="true" />}
      <div className={styles.itemText}>
        <span className={styles.itemTitle}>{item.title}</span>
        <span className={styles.itemKind}>
          {KIND_LABEL[item.kind]}
          {item.area ? ` · ${item.area}` : ""}
        </span>
      </div>
      <button type="button" className={styles.itemX} aria-label={`Remove ${item.title} from your trip`} onClick={() => removeItem(item.ref)}>
        ×
      </button>
    </li>
  );
}
