import type { CityDay } from "../types/city";
import { extractPlaceCandidate } from "./extractPlaceName";

type Slot = CityDay["slots"][number];

const hasCoord = (s: Slot) => typeof s.lat === "number" && typeof s.lon === "number";

function median(values: number[]) {
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Each plan day shows ONE highlight — the slot easiest to find on a map.
// Preference: a slot with coordinates on file (when a day has several, the
// one nearest the middle of the whole plan's coordinates, so an out-of-town
// excursion doesn't win over the central sight); else the first slot whose
// text names a findable place (a live Places lookup can resolve it); else
// the first slot. Returns the chosen slot index per day (-1 for a day with
// no slots).
export function pickHighlightSlots(days: CityDay[]): number[] {
  const coords = days.flatMap((d) => (d.slots ?? []).filter(hasCoord).map((s) => ({ lat: s.lat as number, lon: s.lon as number })));
  const mid = coords.length ? { lat: median(coords.map((c) => c.lat)), lon: median(coords.map((c) => c.lon)) } : null;

  return days.map((day) => {
    const slots = day.slots ?? [];
    if (slots.length === 0) return -1;
    const withCoord = slots.map((s, i) => ({ s, i })).filter(({ s }) => hasCoord(s));
    if (withCoord.length > 0 && mid) {
      const dist = ({ s }: { s: Slot }) => Math.hypot((s.lat as number) - mid.lat, (s.lon as number) - mid.lon);
      return withCoord.reduce((best, cur) => (dist(cur) < dist(best) ? cur : best)).i;
    }
    const named = slots.findIndex((s) => extractPlaceCandidate(s.text));
    return named >= 0 ? named : 0;
  });
}
