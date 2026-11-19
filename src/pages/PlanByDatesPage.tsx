import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDays, addToTrip, formatRange, fromIso, rangeDays, setTripDates, titleCase, toIso, useTrip, type TripDates } from "../lib/tripState";
import { rankFor, verdictLine, type Ranked } from "../lib/whenRank";
import styles from "./plan-by-dates.module.css";

// Plan by your dates (2026-11-20, direct request: "start each and every person from the calendar and take
// them again to the calendar"). Pick the days you are free; the cities are ranked for exactly those days
// (each city's month ratings and its events then); add one or a few, and the trip is built on those dates:
// each city's days fall on real dates on the trip page, and the dates go on to Tara and the advisor.

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const LENGTHS = [3, 5, 7, 10, 14];
const MAX_DAYS = 45;
const todayIso = () => toIso(new Date());

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;                 // Monday first
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toIso(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function Calendar({ dates, onPick }: { dates: { start: string | null; end: string | null }; onPick: (iso: string) => void }) {
  const today = todayIso();
  const startFrom = dates.start ? fromIso(dates.start) : new Date();
  const [view, setView] = useState({ y: startFrom.getFullYear(), m: startFrom.getMonth() });
  const now = new Date();
  const atFirst = view.y === now.getFullYear() && view.m === now.getMonth();
  const cells = monthGrid(view.y, view.m);
  const label = new Date(view.y, view.m, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
  const move = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const inRange = (iso: string) => dates.start && dates.end && iso >= dates.start && iso <= dates.end;
  return (
    <div className={styles.cal}>
      <div className={styles.calHead}>
        <button type="button" className={styles.calNav} onClick={() => move(-1)} disabled={atFirst} aria-label="Previous month">‹</button>
        <span className={styles.calMonth}>{label}</span>
        <button type="button" className={styles.calNav} onClick={() => move(1)} aria-label="Next month">›</button>
      </div>
      <div className={styles.calGrid} role="grid" aria-label={label}>
        {WEEKDAYS.map((w) => <span key={w} className={styles.calWd}>{w}</span>)}
        {cells.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              type="button"
              className={[
                styles.calDay,
                inRange(iso) ? styles.calIn : "",
                iso === dates.start ? styles.calStart : "",
                iso === dates.end ? styles.calEnd : "",
                iso === today ? styles.calToday : "",
              ].join(" ")}
              disabled={iso < today}
              aria-pressed={!!inRange(iso) || iso === dates.start}
              aria-label={fromIso(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              onClick={() => onPick(iso)}
            >
              {fromIso(iso).getDate()}
            </button>
          ) : (
            <span key={`e${i}`} />
          ),
        )}
      </div>
    </div>
  );
}

function CityRow({ r, picked, onToggle }: { r: Ranked; picked: boolean; onToggle: () => void }) {
  return (
    <li className={`${styles.city}${picked ? ` ${styles.cityOn}` : ""}`}>
      <Link to={`/city-${r.slug}`} className={styles.cityPhoto} style={r.image ? { backgroundImage: `url('${r.image}')` } : undefined} aria-label={`${r.name} city guide`} />
      <div className={styles.cityBody}>
        <div className={styles.cityTop}>
          <Link to={`/city-${r.slug}`} className={styles.cityName}>{r.name}</Link>
          {r.country && r.country.toLowerCase() !== r.name.toLowerCase() && <span className={styles.cityCountry}>{r.country}</span>}
        </div>
        <span className={`${styles.verdict} ${styles[`v_${r.verdict}`]}`}>{verdictLine(r)}</span>
        {r.during.length > 0 && (
          <span className={styles.events}>
            On then: {r.during.slice(0, 2).map((e) => e.name).join(" · ")}{r.during.length > 2 ? ` · +${r.during.length - 2} more` : ""}
          </span>
        )}
        <span className={styles.meta}>
          {[r.flight && r.country && r.country !== "India" && `${r.flight} from India`, r.ideal && `${r.ideal} days is ideal`].filter(Boolean).join(" · ")}
        </span>
      </div>
      <button type="button" className={styles.add} aria-pressed={picked} aria-label={picked ? `Remove ${r.name}` : `Add ${r.name}`} onClick={onToggle}>
        {picked ? "✓" : "+"}
      </button>
    </li>
  );
}

export default function PlanByDatesPage() {
  const trip = useTrip();
  const navigate = useNavigate();
  const [start, setStart] = useState<string | null>(trip?.dates?.start ?? null);
  const [end, setEnd] = useState<string | null>(trip?.dates?.end ?? null);
  const [picked, setPicked] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => { document.title = "Plan by your dates | TripAgent"; }, []);

  const dates: TripDates | null = start && end ? { start, end } : null;
  const ranked = useMemo(() => (dates ? rankFor(dates) : []), [start, end]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = showAll ? ranked : ranked.filter((r) => r.verdict !== "quiet").slice(0, 24);
  const inTrip = new Set((trip?.legs ?? []).filter(Boolean).map((l) => l.city));

  function pick(iso: string) {
    if (!start || (start && end) || iso < start) { setStart(iso); setEnd(null); return; }
    if (rangeDays({ start, end: iso }) > MAX_DAYS) { setEnd(addDays(start, MAX_DAYS - 1)); return; }
    setEnd(iso);
  }
  function length(n: number) {
    const s = start ?? addDays(todayIso(), 14);
    setStart(s);
    setEnd(addDays(s, n));                              // n nights: n + 1 days
  }
  function build() {
    if (!dates) return;
    for (const slug of picked) {
      const r = ranked.find((x) => x.slug === slug);
      if (r) addToTrip(slug, r.name);
    }
    setTripDates(dates);
    navigate("/trip");
  }

  const days = dates ? rangeDays(dates) : 0;
  const selected = picked.map((s) => ranked.find((r) => r.slug === s)?.name).filter(Boolean) as string[];
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className="eyebrow">Plan by your dates</div>
        <h1 className={styles.title}>When are you <span className="it">free?</span></h1>
        <p className={styles.lede}>Choose the days you can travel. We will show you where is at its best then, and build the trip on those dates.</p>
      </header>

      <section className={styles.step} aria-label="Your dates">
        <Calendar dates={{ start, end }} onPick={pick} />
        <div className={styles.lengths} role="group" aria-label="How long">
          {LENGTHS.map((n) => (
            <button key={n} type="button" className={`${styles.len}${dates && days === n + 1 ? ` ${styles.lenOn}` : ""}`} onClick={() => length(n)}>
              {n} nights
            </button>
          ))}
        </div>
        <p className={styles.picked} aria-live="polite">
          {dates ? <><strong>{formatRange(dates, true)}</strong> · {days - 1} {days - 1 === 1 ? "night" : "nights"}</>
            : start ? <>From <strong>{formatRange({ start, end: start })}</strong>: now the last day</>
            : "Tap your first day, then your last."}
        </p>
      </section>

      {dates && (
        <section className={styles.step} aria-label="Where is best then">
          <h2 className={styles.h2}>Where is best, <span className="it">{formatRange(dates)}</span></h2>
          <ul className={styles.list}>
            {shown.map((r) => (
              <CityRow key={r.slug} r={r} picked={picked.includes(r.slug) || inTrip.has(r.slug)}
                onToggle={() => !inTrip.has(r.slug) && setPicked((p) => (p.includes(r.slug) ? p.filter((x) => x !== r.slug) : [...p, r.slug]))} />
            ))}
          </ul>
          {!showAll && ranked.length > shown.length && (
            <button type="button" className={styles.more} onClick={() => setShowAll(true)}>Show every city</button>
          )}
        </section>
      )}

      {dates && (picked.length > 0 || inTrip.size > 0) && (
        <div className={styles.bar} role="region" aria-label="Your trip">
          <div className={styles.barText}>
            <strong>{[...(trip?.legs ?? []).filter(Boolean).map((l) => l.label || titleCase(l.city.replace(/-/g, " "))), ...selected].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(", ")}</strong>
            <span>{formatRange(dates)} · {days} days</span>
          </div>
          <button type="button" className={styles.build} onClick={build}>Build my trip <span aria-hidden="true">→</span></button>
        </div>
      )}
    </div>
  );
}
