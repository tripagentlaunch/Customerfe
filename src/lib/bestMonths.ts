import type { CityData } from "../types/city";

// Best months, one rule everywhere (2026-10-09, direct request): a short run
// of 2-4 consecutive months, never the whole calendar. The hero said
// "Jan–Dec" for Agra (its best months wrap Oct–Mar), "When to go" listed six
// months, and the destination cards used a different source again
// (city-decision.json) that disagreed with the city page.
//
// Source: the city page's own month ratings (whenToGo.months: wm2 best, wm1
// fine, wm0 quiet). The window is the longest unbroken run of best months —
// wrapping Dec -> Jan — trimmed to its middle MAX_MONTHS; a lone best month
// takes its better neighbour so there are at least MIN_MONTHS. With no best
// months, the same is done with the fine ones.

export const MONTH_CODES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MIN_MONTHS = 2;
const MAX_MONTHS = 4;
const RANK: Record<string, number> = { wm2: 2, wm1: 1, wm0: 0 };

type Months = { code: string | null; tier: string }[];

function ranks(months: Months): number[] {
  const r = new Array(12).fill(0);
  for (const m of months) {
    const i = MONTH_CODES.indexOf(m.code ?? "");
    if (i !== -1) r[i] = RANK[m.tier] ?? 0;
  }
  return r;
}

// Month indexes (0-11) in series order, e.g. Nov, Dec, Jan, Feb -> [10, 11, 0, 1].
export function bestWindow(months: Months): number[] {
  const r = ranks(months);
  for (const level of [2, 1]) {
    const on = r.map((x) => x >= level);
    if (!on.some(Boolean)) continue;
    if (on.every(Boolean)) return pick(Array.from({ length: 12 }, (_, i) => i), r);
    // Runs start where the previous month is off; walk forward, wrapping.
    let best: number[] = [];
    for (let s = 0; s < 12; s++) {
      if (!on[s] || on[(s + 11) % 12]) continue;
      const run: number[] = [];
      for (let i = s; on[i % 12] && run.length < 12; i++) run.push(i % 12);
      const score = (xs: number[]) => xs.length * 10 + neighbours(xs, r);
      if (score(run) > score(best)) best = run;
    }
    return pick(best, r);
  }
  return [];
}

function neighbours(run: number[], r: number[]): number {
  if (!run.length) return -1;
  return r[(run[0] + 11) % 12] + r[(run[run.length - 1] + 1) % 12];
}

function pick(run: number[], r: number[]): number[] {
  if (run.length > MAX_MONTHS) {
    const start = Math.floor((run.length - MAX_MONTHS) / 2);
    return run.slice(start, start + MAX_MONTHS);
  }
  if (run.length < MIN_MONTHS && run.length > 0) {
    const before = (run[0] + 11) % 12;
    const after = (run[run.length - 1] + 1) % 12;
    return r[after] > r[before] ? [...run, after] : [before, ...run];
  }
  return run;
}

export function rangeLabel(window: number[]): string | null {
  if (!window.length) return null;
  const a = MONTH_CODES[window[0]];
  const b = MONTH_CODES[window[window.length - 1]];
  return a === b ? a : `${a}–${b}`;
}

function listLabel(window: number[]): string | null {
  const codes = window.map((i) => MONTH_CODES[i]);
  if (!codes.length) return null;
  return codes.length === 1 ? codes[0] : `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`;
}

// City page data with every best-months display on the same window: the
// hero fact, "When to go"'s headline, and the calendar's "Best time" row
// (best-rated months outside the window move to "Fine shoulder").
export function withBestWindow(city: CityData): CityData {
  const months = city.whenToGo?.months ?? [];
  const window = bestWindow(months);
  if (!window.length) return city;
  const inWindow = new Set(window.map((i) => MONTH_CODES[i]));
  return {
    ...city,
    hero: {
      ...city.hero,
      facts: city.hero.facts.map((f) => (f.label === "Best months" ? { ...f, value: rangeLabel(window) ?? f.value } : f)),
    },
    whenToGo: {
      ...city.whenToGo,
      bestMonths: listLabel(window),
      months: months.map((m) => (m.tier === "wm2" && !inWindow.has(m.code ?? "") ? { ...m, tier: "wm1" } : m)),
    },
  };
}

// 1-12 month numbers in series order, for the destination cards and their
// month filter.
export function bestMonthNumbers(months: Months | undefined): number[] {
  return months ? bestWindow(months).map((i) => i + 1) : [];
}
