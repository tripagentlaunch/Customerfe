import { BedDouble, Compass, Martini, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { CityMapVenue } from "../types/city";

// Shared by CityMap.tsx (real Google map + toggle state) and MockCityMap.tsx
// (plain projected-pin placeholder) — kept in its own module so the two
// don't need to import from each other.
export type CatKey = CityMapVenue["cat"];

export const CATEGORIES: { key: CatKey; label: string; color: string }[] = [
  { key: "stay", label: "Stays", color: "#6E2A38" },
  { key: "eat", label: "Tables", color: "#4E5B57" },
  { key: "do", label: "Sights", color: "#6F5B3E" },
  { key: "party", label: "After dark", color: "#3F5560" },
];

export const CAT_COLOR: Record<CatKey, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.color])) as Record<
  CatKey,
  string
>;

// One glyph per category, shown inside each map pin (see MapPin.tsx) so
// pins read at a glance instead of relying on color alone.
export const CAT_ICON: Record<CatKey, LucideIcon> = {
  stay: BedDouble,
  eat: UtensilsCrossed,
  do: Compass,
  party: Martini,
};

// `cat` is typed as the closed CatKey union, but that union isn't enforced
// on an actual API response at runtime — an unrecognized value would make
// CAT_ICON[v.cat]/CAT_COLOR[v.cat] return undefined and crash MapPin. These
// helpers fall back to the "do" glyph/color the same way CityPage.tsx's
// tierIcon() falls back to a generic icon for an unrecognized tier label.
export function catIcon(cat: CatKey): LucideIcon {
  return CAT_ICON[cat] ?? Compass;
}

export function catColor(cat: CatKey): string {
  return CAT_COLOR[cat] ?? CAT_COLOR.do;
}
