// Where is best for a set of dates (2026-11-20, calendar-first planning). Each city has a rating for each
// month (2 at its best, 1 good, 0 quieter; when-index.generated.json, from the city pages' "When to go").
// A trip's dates are scored by the days they spend in each month, plus the city's events in those months.
import whenIndex from "../data/when-index.generated.json";
import { fromIso, type TripDates } from "./tripState";

export type WhenCity = {
  slug: string;
  name: string;
  country: string | null;
  image: string | null;
  tagline: string | null;
  months: (number | null)[];
  ideal: number | null;
  flight: string | null;
  events: { name: string; when: string | null; months: number[]; photo: string | null }[];
};
export type Ranked = WhenCity & { score: number; verdict: "best" | "good" | "quiet"; during: WhenCity["events"]; monthsIn: number[] };

export const CITIES = whenIndex as unknown as WhenCity[];
export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** How many of the trip's days fall in each month: {2: 5, 3: 3} for 27 Mar to 3 Apr. */
export function daysByMonth(d: TripDates): Map<number, number> {
  const out = new Map<number, number>();
  const a = fromIso(d.start), b = fromIso(d.end);
  for (let x = new Date(a); x <= b; x = new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1)) {
    out.set(x.getMonth(), (out.get(x.getMonth()) ?? 0) + 1);
  }
  return out;
}

const hours = (f: string | null) => { const m = /([\d.]+)\s*h/.exec(f ?? ""); return m ? parseFloat(m[1]) : 99; };

export function rankFor(d: TripDates): Ranked[] {
  const per = daysByMonth(d);
  const total = [...per.values()].reduce((a, b) => a + b, 0) || 1;
  const monthsIn = [...per.keys()];
  return CITIES.map((c) => {
    let s = 0;
    for (const [m, n] of per) s += (c.months[m] ?? 1) * n;
    s /= total;                                                     // 0 to 2
    const during = c.events.filter((e) => e.months.some((m) => per.has(m)));
    const score = s + Math.min(2, during.length) * 0.25;
    const verdict: Ranked["verdict"] = s >= 1.6 ? "best" : s >= 0.9 ? "good" : "quiet";
    return { ...c, score, verdict, during, monthsIn };
  }).sort((a, b) => b.score - a.score || hours(a.flight) - hours(b.flight));
}

/** "At its best in March", "Good in March and April", "Quieter in July". */
export function verdictLine(r: Ranked): string {
  const names = r.monthsIn.map((m) => MONTH_NAMES[m]);
  const when = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return r.verdict === "best" ? `At its best in ${when}` : r.verdict === "good" ? `Good in ${when}` : `Quieter in ${when}`;
}
