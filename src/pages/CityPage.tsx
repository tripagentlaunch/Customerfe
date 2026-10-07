import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Gem,
  Crown,
  Sparkle,
  Star,
  MapPin,
  Wine,
  Shirt,
  Coffee,
  Martini,
  Landmark,
  Music2,
  Sunset,
  Mountain,
  Camera,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import cities from "../data/cities.generated.json";
import type { CityData, CityGuidePanel } from "../types/city";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import CityMap from "../components/CityMap";
import PlanRouteMap, { type PlanStop } from "../components/PlanRouteMap";
import PlanCarousel from "../components/PlanCarousel";
import CalendarSection from "../components/CalendarSection";
// import EventMap from "../components/EventMap"; // commented out: When-to-go now reuses the first section's CityMap
import { pickHighlightSlots } from "../lib/planHighlights";
import { useAgraLivePlanCoords, type PlanTarget } from "../hooks/useAgraLivePlanCoords";
// import { useAgraLiveEventLocations } from "../hooks/useAgraLiveEventLocations";
import { useLiveGuidePanelPhotos, type LivePanelPhoto } from "../hooks/useLiveGuidePanelPhotos";
import { placeholderPhoto } from "../lib/placeholderPhoto";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import { withTaraAI } from "../components/TaraAI";
import styles from "./city-page.module.css";
import LiveVenues from "../components/LiveVenues";

const CITIES = cities as unknown as Record<string, CityData>;

const LOCATION_ICON = (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

// Canonical tab display order — the guide's tab row (and which tab a city
// page lands on by default) must not depend on whatever order a backend's
// `guide.panels` array happens to arrive in, since JSON array order isn't
// part of the CityGuidePanel["key"] contract. orderedPanels() below always
// reorders panels to this sequence before rendering, regardless of source
// order.
const GUIDE_TAB_ORDER: CityGuidePanel["key"][] = ["stay", "do", "eat", "party"];

function orderedPanels(panels: CityGuidePanel[]): CityGuidePanel[] {
  return [...panels].sort((a, b) => GUIDE_TAB_ORDER.indexOf(a.key) - GUIDE_TAB_ORDER.indexOf(b.key));
}

// One icon per tier label, keyed lower-case — covers every tier label
// used across all cities' guide data (stay: Ultra/Grand/Luxury/Premium;
// eat: Destination/Fine/Smart/Casual; party: Cocktail bars/Landmark bars/
// Late & loud/Rooftops; do: Icons & views/Nature & the outdoors/History &
// culture/Food & wine experiences). The "do" labels are deliberately
// generic — not city-specific ("Caldera & villages", "Wine country") —
// same reasoning as the other three panels' tiers, so this same fixed set
// of four categories, and their icons, applies to every city's "do" data,
// not just Santorini's. Falls back to Gem (a faceted gemstone, not the
// rhombus "Diamond" icon) for anything unrecognized. Icons from lucide-react.
// `CityGuideTier.label` (types/city.ts) is free-form text — a backend isn't
// blocked from sending an unlisted label, it just gets the Gem fallback
// instead of a dedicated icon. This object's own keys are the authoritative
// list of labels that get one.
const TIER_ICONS: Record<string, typeof Gem> = {
  ultra: Gem,
  grand: Crown,
  luxury: Sparkle,
  premium: Star,
  destination: MapPin,
  fine: Wine,
  smart: Shirt,
  casual: Coffee,
  "cocktail bars": Martini,
  "landmark bars": Landmark,
  "late & loud": Music2,
  rooftops: Sunset,
  "icons & views": Camera,
  "nature & the outdoors": Mountain,
  "history & culture": Landmark,
  "food & wine experiences": Wine,
};

function tierIcon(label: string) {
  const Icon = TIER_ICONS[label.toLowerCase()] ?? Gem;
  return <Icon size={14} strokeWidth={1.8} aria-hidden="true" />;
}

// Credential strings are often "Award body, year — the specific ranking"
// (e.g. "Travel + Leisure World's Best Awards 2025 — No. 1 Resort in Europe,
// No. 1 Resort in Greece, No. 16 Hotel in the World") — the badge shows only
// a short version (the part after the dash, trimmed to the first clause if
// that's still long; the whole string if there's no dash to split on, since
// those tend to already be short award names). The full text is still
// available via the badge's native title tooltip on hover.
function shortCredential(full: string): string {
  const dashIdx = full.indexOf("—");
  let short = dashIdx >= 0 ? full.slice(dashIdx + 1).trim() : full;
  const commaIdx = short.indexOf(",");
  if (commaIdx > 0 && short.length > 40) short = short.slice(0, commaIdx).trim();
  return short;
}

// Applies to every guide tier on every city page — the first 6 entries
// always show, anything past that collapses behind "Show all N" until
// expanded. Computed from each tier's own item count rather than relying
// on the authored hidden/moreLabel fields (which came from the original
// static site's own, inconsistent truncation), so this rule is uniform
// regardless of how any one city's data happens to be authored.
const MIN_VISIBLE_ITEMS = 6;

// Which page buttons to show. Always the same number of slots (7) once there
// are more than seven pages, so the pager never changes width or shifts as
// you move through it: near the start it's 1 2 3 4 5 … N, near the end
// 1 … N-4 … N, and in the middle 1 … c-1 c c+1 … N ("gap" is an ellipsis).
function pagerItems(total: number, current: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, p) => p);
  const last = total - 1;
  if (current < 4) return [0, 1, 2, 3, 4, "gap", last];
  if (current > last - 4) return [0, "gap", last - 4, last - 3, last - 2, last - 1, last];
  return [0, "gap", current - 1, current, current + 1, "gap", last];
}

// Two independent boxes, not one shared hover treatment: the thumbnail is a
// constant square that never reacts to hover. Fixed at 150px (card-page.module.css)
// rather than measured off the text column, as an earlier JS/ResizeObserver
// version did — every card's content is already bounded to the same line
// counts (1-line title, optional 1-line tag, 2-3 line description), so a
// measured size only ever converged on this same 150px anyway; fixing it
// directly removes the observer and guarantees the square can never grow or
// shrink, not even for a future field (e.g. a longer location line) that
// isn't currently truncated. The text column keeps its own "fills the box,
// settles inward on hover" reveal.
function GuideCard({
  photo,
  badge,
  isLoading,
  children,
}: {
  photo: string;
  badge?: string;
  isLoading?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.cardInner}>
      <div className={styles.cardThumbWrap}>
        <img className={styles.cardThumb} src={photo} alt="" loading="lazy" />
        {badge && <span className={styles.cardThumbBadge}>{badge}</span>}
        {isLoading && (
          <div className={styles.cardThumbLoading}>
            <span className={styles.cardSpinner} />
          </div>
        )}
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

// Tabs + tier chips both moved out of here into one shared sticky wrapper
// in CityPage itself (see .guideSticky) — this component now renders only
// the actual tier list content, driven by the selectedTier prop it's given.
function GuidePanel({
  panel,
  active,
  selectedTier,
  livePhotos,
  fireLookup,
}: {
  panel: CityGuidePanel;
  active: boolean;
  selectedTier: number;
  livePhotos: Record<string, LivePanelPhoto>;
  fireLookup: (key: string, itemName: string, itemArea: string | undefined) => void;
}) {
  // Per-tier reveal COUNT, not a binary open/closed flag — "Show all"
  // now reveals MIN_VISIBLE_ITEMS more each click (batched), rather than
  // jumping straight from 6 to all 44 at once, so a visitor who never
  // clicks past the first batch or two never triggers the later items'
  // image loads at all.
  // Per-tier PAGE index (0-based) — the numbered pager under each tier
  // shows ONLY that page's batch, not a cumulative reveal. Page 0 is
  // items[0:6], page 1 is items[6:12], etc.
  const [tierPage, setTierPage] = useState<Record<number, number>>({});

  const tierRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Keeps each tier's list at the height of a FULL page, so a shorter last
  // page (e.g. 1 entry) doesn't pull the pager upward: the height is
  // measured whenever a full page is showing, and applied as a min-height.
  // Cleared on resize (card heights change with the layout) and re-measured
  // the next time a full page is on screen.
  const listRefs = useRef<Record<number, HTMLUListElement | null>>({});
  const [listMinH, setListMinH] = useState<Record<number, number>>({});
  useEffect(() => {
    const clear = () => setListMinH({});
    window.addEventListener("resize", clear);
    return () => window.removeEventListener("resize", clear);
  }, []);
  useLayoutEffect(() => {
    panel.tiers.forEach((tier, i) => {
      const el = listRefs.current[i];
      if (!el) return;
      const page = tierPage[i] ?? 0;
      if (tier.items.slice(page * MIN_VISIBLE_ITEMS, (page + 1) * MIN_VISIBLE_ITEMS).length < MIN_VISIBLE_ITEMS) return;
      const h = el.offsetHeight;
      if (h > 0) setListMinH((prev) => (prev[i] && prev[i] >= h ? prev : { ...prev, [i]: h }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierPage, active, selectedTier, listMinH]);

  function goToPage(i: number, page: number) {
    setTierPage((prev) => ({ ...prev, [i]: page }));
    // The pager sits under the list, so after a page change the new page's
    // first entries can be above the viewport — bring the tier's top back
    // into view (only when it has scrolled off, below the sticky header).
    requestAnimationFrame(() => {
      const el = tierRefs.current[i];
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top < 96) window.scrollTo({ top: window.scrollY + top - 110, behavior: "smooth" });
    });
  }

  const labelledTiers = panel.tiers.filter((t) => t.label);

  // Fire live lookups directly for whatever's on the CURRENT page of each
  // tier — replaces the old IntersectionObserver approach (see this
  // hook's own comment for why that became unreliable once pagination
  // was added). Re-runs whenever a page changes, so "Show next 6"
  // correctly triggers lookups for exactly the newly-shown 6 items.
  useEffect(() => {
    panel.tiers.forEach((tier, i) => {
      const page = tierPage[i] ?? 0;
      const start = page * MIN_VISIBLE_ITEMS;
      const end = start + MIN_VISIBLE_ITEMS;
      tier.items.slice(start, end).forEach((item, offset) => {
        const j = start + offset;
        if (item.photo) return; // static photo already present — no live fetch needed
        fireLookup(`${panel.key}-${i}-${j}`, item.name ?? "", item.area ?? undefined);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel.key, tierPage]);

  return (
    <div className={`cg-panel${active ? " on" : ""}`} data-cg={panel.key}>
      {panel.tiers.map((tier, i) => (
        (labelledTiers.length <= 1 || i === selectedTier) && (
        <div className={`cg-tier${(tierPage[i] ?? 0) > 0 ? " cg-more-open" : ""}`} key={i} ref={(el) => { tierRefs.current[i] = el; }}>
          <ul className="cg-list" ref={(el) => { listRefs.current[i] = el; }} style={listMinH[i] ? { minHeight: listMinH[i], alignContent: "start" } : undefined}>
            {tier.items.map((item, j) => {
              // `credentials` is typed required, but that's a compile-time
              // guarantee for hand-authored JSON only — a live API response
              // is never actually type-checked, so a missing/null key here
              // must not crash the whole guide list.
              const credentials = item.credentials ?? [];
              const noTag = credentials.length === 0;
              const live = livePhotos[`${panel.key}-${i}-${j}`];
              const isLoadingLivePhoto = !item.photo && live?.status === "loading";
              const photo =
                item.photo ??
                (live?.status === "success" ? live.photoUrl : placeholderPhoto(`${panel.key}-${i}-${j}-${item.name}`));
              return (
              <li
                className={(() => {
                  const page = tierPage[i] ?? 0;
                  const start = page * MIN_VISIBLE_ITEMS;
                  const end = start + MIN_VISIBLE_ITEMS;
                  return j >= start && j < end ? "" : "cg-hide";
                })()}
                key={j}
              >
                <GuideCard photo={photo} badge={credentials[0] ? shortCredential(credentials[0]) : undefined} isLoading={isLoadingLivePhoto}>
                  <span className="cg-nm-row">
                    <span className="nm">{item.name}</span>
                  </span>
                  {!noTag && (
                    <span className="cg-creds">
                      <span className="cg-cred" title={credentials[0]}>
                        {shortCredential(credentials[0])}
                      </span>
                    </span>
                  )}
                  <span className={`ds${noTag ? ` ${styles.dsExtra}` : ""}`}>{item.description}</span>
                  {item.area && (
                    <span className={`${styles.itemLocation}${noTag ? ` ${styles.itemLocationWide}` : ""}`}>
                      {LOCATION_ICON}
                      {item.area}
                    </span>
                  )}
                </GuideCard>
              </li>
              );
            })}
          </ul>
          {tier.items.length > MIN_VISIBLE_ITEMS && (() => {
              const totalPages = Math.ceil(tier.items.length / MIN_VISIBLE_ITEMS);
              const page = tierPage[i] ?? 0;
              const start = page * MIN_VISIBLE_ITEMS + 1;
              const end = Math.min(start + MIN_VISIBLE_ITEMS - 1, tier.items.length);
              return (
                <nav className={styles.pager} aria-label="Guide pages">
                  <span className={styles.pagerStatus}>
                    Showing {start}-{end} of {tier.items.length}
                  </span>
                  <div className={styles.pagerPages}>
                    <button
                      type="button"
                      className={styles.pagerBtn}
                      aria-label="Previous page"
                      disabled={page === 0}
                      onClick={() => goToPage(i, page - 1)}
                    >
                      <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                    {pagerItems(totalPages, page).map((p, k) =>
                      p === "gap" ? (
                        <span key={`gap-${k}`} className={styles.pagerGap} aria-hidden="true">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          type="button"
                          className={`${styles.pagerBtn}${p === page ? ` ${styles.pagerBtnActive}` : ""}`}
                          aria-label={`Page ${p + 1}`}
                          aria-current={p === page ? "page" : undefined}
                          onClick={() => goToPage(i, p)}
                        >
                          {p + 1}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      className={styles.pagerBtn}
                      aria-label="Next page"
                      disabled={page >= totalPages - 1}
                      onClick={() => goToPage(i, page + 1)}
                    >
                      <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                </nav>
              );
            })()}
        </div>
        )
      ))}
    </div>
  );
}

// A per-city data gap (missing plan coordinates, missing event location) —
// logged to the console for whoever's wiring up a city, but rendered to
// real visitors as a calm, on-brand placeholder (matching CityMap's own
// "not available yet" fallback) rather than a debug-looking error box.
// `reason` stays dev-facing only; the visible copy is always the same
// generic line so the page still reads as intentional, not broken.
function MapDataMissing({ reason }: { reason: string }) {
  useEffect(() => {
    console.warn(`[MapDataMissing] ${reason}`);
  }, [reason]);
  return (
    <div className={styles.mapDataMissing}>
      <MapPin size={22} strokeWidth={1.75} />
      <p>Map view coming soon for this stop.</p>
    </div>
  );
}

function AccordionRow({ label, value }: { label: string; value: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.accordionRow}>
      <button type="button" className={styles.accordionButton} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label}
        <span className={`${styles.accordionChevron}${open ? ` ${styles.open}` : ""}`} aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && <div className={styles.accordionPanel}>{value}</div>}
    </div>
  );
}

export default function CityPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const slug = pageSlug?.startsWith("city-") ? pageSlug.slice("city-".length) : undefined;
  const city = slug ? CITIES[slug] : undefined;
  const [activeTab, setActiveTab] = useState<string>("stay");
  // Keyed by panel key, not a single shared value — so switching from
  // "stay" (say, Grand selected) to "eat" and back still remembers Grand,
  // instead of resetting every panel's tier selection on every tab switch.
  const [selectedTierByPanel, setSelectedTierByPanel] = useState<Record<string, number>>({});

  useEffect(() => {
    // "stay" is the conventional first tab, but the contract doesn't
    // guarantee a panel with that key exists — land on the first panel in
    // canonical order instead of assuming.
    setActiveTab(orderedPanels(city?.guide.panels ?? [])[0]?.key ?? "stay");
    setSelectedTierByPanel({});
  }, [slug, city]);

  // The guide's sticky tabs+chips bar should let go ~6 boxes' worth of
  // scrolling before the list actually ends, rather than staying pinned to
  // the very last pixel. Native position:sticky already does this exact
  // handoff smoothly — an element stops sticking the instant its containing
  // block's own bottom edge reaches the sticky offset, and the browser
  // eases that transition on its own, no jump. The only thing missing is a
  // containing block whose height is deliberately "content height minus
  // 520px" instead of its true full height, and pure CSS has no way to
  // express that (no calc(intrinsic - 520px)) since the list's real height
  // varies with which tier/panel is active and whether "Show all" is
  // expanded — so it's measured in JS instead.
  //
  // A sticky element's release point is bounded by its own DIRECT parent,
  // not any shortened ancestor further up — so the bar and the list must be
  // direct children of the shortened box itself (guideListWrap), not nested
  // one level deeper inside some other measuring wrapper (that was the bug
  // in an earlier version: the extra wrapper was auto-height and never
  // shortened, so the bar's *actual* containing block was never the
  // shortened one, and it never released). Since overflow:visible means a
  // child's own size is unaffected by its parent's explicit (shorter)
  // height, the bar and list can each be measured directly and still sit as
  // guideListWrap's own immediate children.
  // Higher = shorter pinned duration (more of the list is treated as "past
  // the release point"). 280 kept it pinned for noticeably longer than
  // wanted; 600 shortens that back down.
  const GUIDE_RELEASE_PX = 600;
  const guideBarRef = useRef<HTMLDivElement | null>(null);
  const guideListRef = useRef<HTMLDivElement | null>(null);
  const [guideWrapHeight, setGuideWrapHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const barEl = guideBarRef.current;
    const listEl = guideListRef.current;
    if (!barEl || !listEl) return;
    const update = () => setGuideWrapHeight(Math.max(0, barEl.offsetHeight + listEl.offsetHeight - GUIDE_RELEASE_PX));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(barEl);
    ro.observe(listEl);
    return () => ro.disconnect();
  }, []);

  // "The plan" is a day-tabs view with ONE highlight per day (picked by
  // lib/planHighlights.ts): normal page scroll (not scroll-hijacked/sticky),
  // advanced by day-tab clicks or a 4s auto-advance timer — both just set
  // activeDayIndex, since there's no scroll-linkage to keep in sync.
  const highlightSlots = useMemo(() => pickHighlightSlots(city?.plan.days ?? []), [city]);
  const dayCount = city?.plan.days?.length ?? 0;
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [planInView, setPlanInView] = useState(false);
  const planSectionRef = useRef<HTMLElement | null>(null);

  // The sticky map also switches to a single-pin view of whichever event
  // CalendarSection is currently highlighting (hover/click/auto-advance)
  // while that section is in view — same pattern as planInView/PlanRouteMap
  // below, just driven from a sibling section instead of a ref+observer
  // here, since CalendarSection owns its own section element.
  // Commented out: the When-to-go section no longer swaps the sticky map for
  // a single-event EventMap — it keeps the first section's CityMap.
  // const [calendarInView, setCalendarInView] = useState(false);
  // const [calendarActiveEvent, setCalendarActiveEvent] = useState<CityData["whatsOn"]["events"][number] | null>(null);

  // The "Events" tab after the last day: a static list (not part of the
  // day auto-cycle, not tied to any map) of the city's events in calendar
  // order. Absent when the city has none.
  const [eventsTabOpen, setEventsTabOpen] = useState(false);
  const planEvents = useMemo(() => {
    const order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const first = (ev: CityData["whatsOn"]["events"][number]) => {
      const idx = (ev.months ?? []).map((m) => order.indexOf(m)).filter((i) => i >= 0);
      return idx.length ? Math.min(...idx) : order.length;
    };
    return [...(city?.whatsOn.events ?? [])].sort((a, b) => first(a) - first(b));
  }, [city]);

  function selectPlanDay(dayIndex: number) {
    setEventsTabOpen(false);
    setActiveDayIndex(dayIndex);
  }

  // The sticky map (to the right) still needs to know when the Plan section
  // itself has been scrolled to, so it can switch from the venue map to the
  // route map — a single observer on the section as a whole, not per-step
  // sentinels, since scroll no longer drives which step is active. Threshold
  // 0.5 (not 0): Plan sits right below the Calendar section, which is taller
  // than most viewports, so a plain "any pixel visible" trigger flipped this
  // true (and, worse, flipped Calendar's own observer false) well before the
  // user had actually scrolled to Plan — see the map-priority comment below.
  useEffect(() => {
    const el = planSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setPlanInView(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!planInView || eventsTabOpen || dayCount < 2) return;
    const id = setTimeout(() => setActiveDayIndex((i) => (i + 1) % dayCount), 4000);
    return () => clearTimeout(id);
  }, [planInView, eventsTabOpen, dayCount, activeDayIndex]);

  // Agra only, for now — live Places API (New) lookups for every slot in
  // the active day that has no coordinates on file, using each slot's own
  // extracted place name (extractPlaceName.ts), not one hardcoded query.
  // See places_service.py for why this is always a live call, never baked
  // into cities.generated.json the way Pexels photos are.
  // TEST/STAGING rollout, not a production decision — see places_service.py
  // and this session's cost-tier estimate: live Places lookups aren't
  // cached across visitors (Places API (New) ToS has no caching
  // exception for photos/names), so every pageview on these city pages
  // re-triggers the same lookups. Widen this list only after weighing
  // that cost, or after a scheduled backfill replaces live-fetch entirely.
  const LIVE_PLACES_TEST_CITIES = new Set(["abu-dhabi", "agra", "alleppey", "amalfi-coast", "amman-petra", "amritsar", "amsterdam", "andaman", "athens", "auckland", "bali", "bangkok", "barcelona", "bengaluru", "budapest", "buenos-aires", "cairo", "cancun", "cape-town", "cappadocia", "chennai", "colombo", "copenhagen", "cusco", "darjeeling", "delhi", "doha", "dubai", "dublin", "dubrovnik", "edinburgh", "florence", "galle", "geneva", "goa", "hanoi", "ho-chi-minh-city", "hoi-an", "hong-kong", "hyderabad", "istanbul", "jaipur", "jaisalmer", "jodhpur", "kathmandu", "kochi", "kolkata", "krabi", "kuala-lumpur", "kyoto", "lake-como", "langkawi", "las-vegas", "leh-ladakh", "lima", "lisbon", "london", "los-angeles", "madrid", "mahe-seychelles", "male-maldives", "manali", "marrakech", "mauritius-city", "melbourne", "mexico-city", "miami", "milan", "mumbai", "munich", "munnar", "muscat", "mykonos", "nairobi-mara", "new-york", "nice-riviera", "osaka", "paris", "paro", "phuket", "porto", "prague", "queenstown", "ranthambore", "reykjavik", "rio-de-janeiro", "rishikesh", "rome", "salzburg", "san-francisco", "santorini", "seoul", "shanghai", "shimla", "siem-reap", "singapore-city", "srinagar", "st-moritz", "sydney", "taipei", "tokyo", "toronto", "udaipur", "vancouver", "varanasi", "venice", "vienna", "zanzibar", "zermatt", "zurich"]);
  const isLivePlacesEnabledCity = city ? LIVE_PLACES_TEST_CITIES.has(city.slug) : false;
  const planTargets = useMemo<PlanTarget[]>(
    () => highlightSlots.map((slotIndex, dayIndex) => ({ dayIndex, slotIndex })).filter((t) => t.slotIndex >= 0),
    [highlightSlots],
  );
  const agraLiveCoords = useAgraLivePlanCoords(isLivePlacesEnabledCity, city?.plan.days, planTargets);
  // const agraLiveEventLocations = useAgraLiveEventLocations(isLivePlacesEnabledCity, city?.whatsOn.events);
  const { results: liveGuidePanelPhotos, fireLookup: fireLiveGuidePanelLookup } = useLiveGuidePanelPhotos(isLivePlacesEnabledCity, city?.slug);

  // Each day's highlight, resolved: its coordinates come from the static
  // data when present, else from the live lookup (test cities) if it has
  // come back; photo likewise (static, else live, else a placeholder).
  const dayHighlights = useMemo(
    () =>
      (city?.plan.days ?? []).map((day, dayIndex) => {
        const slotIndex = highlightSlots[dayIndex] ?? -1;
        const slot = slotIndex >= 0 ? day.slots[slotIndex] : undefined;
        const liveResult = isLivePlacesEnabledCity && slotIndex >= 0 ? agraLiveCoords[`${dayIndex}-${slotIndex}`] : undefined;
        const live = liveResult?.status === "success" ? liveResult : undefined;
        const coord =
          slot && typeof slot.lat === "number" && typeof slot.lon === "number"
            ? { lat: slot.lat, lon: slot.lon }
            : live
              ? { lat: live.lat, lon: live.lon }
              : null;
        return {
          dayIndex,
          dayNumber: day.dayNumber ?? "",
          label: slot?.label ?? "",
          place: slot?.place ?? slot?.label ?? day.title ?? "",
          text: slot?.text ?? null,
          category: slot?.category ?? null,
          photo: slot?.photo || live?.photoUrl || placeholderPhoto(`${city?.slug}-plan-${dayIndex}-${slotIndex}-0`),
          coord,
        };
      }),
    [city, highlightSlots, isLivePlacesEnabledCity, agraLiveCoords],
  );

  // The sticky map shows the WHOLE route at once: one pin per day (the days
  // that have coordinates), joined in day order. The active day's pin and its
  // leg are what the map highlights.
  const routeDays = useMemo(() => dayHighlights.filter((h) => h.coord), [dayHighlights]);
  const planStops = useMemo<PlanStop[]>(
    () => routeDays.map((h) => ({ lat: h.coord!.lat, lon: h.coord!.lon, dayNumber: h.dayNumber, label: h.label, place: h.place, category: h.category })),
    [routeDays],
  );
  const activeStopIndex = routeDays.findIndex((h) => h.dayIndex === activeDayIndex);

  useEffect(() => {
    if (city?.seo.title) document.title = city.seo.title;
  }, [city]);

  useScrollReveal([city]);

  const tabLabels: Record<string, string> = useMemo(
    () => ({
      stay: "Where to stay",
      do: "What to do",
      eat: "Where to eat",
      party: "Where the night goes",
      map: "Map",
    }),
    []
  );

  if (!city) {
    // Not a city-*.html slug (or an unrecognised one) — other page-template
    // groups aren't ported yet; later phases replace this fallback.
    return (
      <div className="wrap band">
        <p>Not yet ported to the app.</p>
      </div>
    );
  }

  const { hero, ourTake, firstLook, whenToGo, guide, plan, neighbourhoods, goodToKnow, closing } =
    city;

  return (
    <>
      <header className="city-hero" data-hero style={{ backgroundImage: `url('${hero.image}')` }}>
        <div className="wrap">
          <nav className={`${styles.bcTrail} reveal`} aria-label="Breadcrumb">
            <Link to="/destinations">All destinations</Link>
            {hero.breadcrumbCountry && (
              <>
                <span className={styles.bcSep}>/</span>
                <Link to={toRoute(hero.breadcrumbCountry.href)}>{hero.breadcrumbCountry.label}</Link>
              </>
            )}
            <span className={styles.bcSep}>/</span>
            <span className={styles.bcCur} aria-current="page">
              {hero.name}
            </span>
          </nav>
          <h1 className="reveal d1">{hero.name}</h1>
          <p className={`${styles.ess} reveal d2`}>{hero.tagline}</p>
          <div className="btn-row reveal d3" style={{ marginTop: 26 }}>
            {/* Typed as required, but not runtime-guaranteed on a real API
                response — dropping the button beats crashing the whole
                hero. */}
            {hero.ctaPrimary && <PrimaryInverseButton to={hero.ctaPrimary.href}>{hero.ctaPrimary.label}</PrimaryInverseButton>}{" "}
            {hero.ctaSecondary && <SecondaryInverseButton to={hero.ctaSecondary.href}>{hero.ctaSecondary.label}</SecondaryInverseButton>}
          </div>
          <div className={`${styles.chFacts} reveal d3`}>
            {(hero.facts ?? []).map((f, i) => (
              <div className={styles.chFact} key={i}>
                <span className="fk">{f.label}</span>
                <span className={styles.fv}>
                  {f.value} {f.small && <small>{f.small}</small>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className={styles.taSplit}>
      <div className={styles.taSplitInfo}>

      <section className="band ta-content ta-take">
        <div className="reveal" style={{ maxWidth: "60ch" }}>
          <div className="eyebrow">Our take</div>
          <div className="rule" />
          <p className="lede">{ourTake.lede}</p>
        </div>
        <div className={`${styles.taFit} reveal d1`}>
          <div className={styles.taFitCol}>
            <div className={styles.fitK}>
              <i />
              Come if
            </div>
            <p>{ourTake.comeIf}</p>
          </div>
          <div className={`${styles.taFitCol} ${styles.skip}`}>
            <div className={styles.fitK}>
              <i />
              Perhaps not, if
            </div>
            <p>{ourTake.skipIf}</p>
          </div>
        </div>
      </section>

      <section className={styles.taLook}>
        <div className={`${styles.taLookHero} reveal-clip`} style={{ backgroundImage: `url('${firstLook.heroImage}')` }}>
          <div className={styles.taLookCap}>
            <span>{firstLook.heroCaption}</span>
          </div>
        </div>
      </section>

      <CalendarSection whenToGo={whenToGo} />

      <section className="band ta-content ta-itin" ref={planSectionRef}>
        <div className={styles.planIntro}>
          <div className="reveal" style={{ marginBottom: 26, maxWidth: "58ch" }}>
            <div className="eyebrow">The plan</div>
            <div className="rule" />
            <h2 style={{ fontSize: "28px" }}>{plan.heading}</h2>
            <p className="lede" style={{ marginTop: 14, fontSize: 16 }}>
              {plan.lede}
            </p>
          </div>
          {dayHighlights[activeDayIndex] && (
            <PlanCarousel
              days={plan.days}
              activeDayIndex={activeDayIndex}
              highlight={dayHighlights[activeDayIndex]}
              onSelectDay={selectPlanDay}
              events={planEvents}
              eventsActive={eventsTabOpen}
              onSelectEvents={() => setEventsTabOpen(true)}
            />
          )}
          {plan.cta && (
            <div className="reveal d2" style={{ marginTop: 20 }}>
              <Link className={`btn btn-gold btn-square ${styles.planCta}`} to={toRoute(plan.cta.href)}>
                <span className={styles.planCtaLabel}>
                  {withTaraAI(plan.cta.label)}
                  <span className={styles.planCtaArrow} aria-hidden="true">
                    →
                  </span>
                </span>
              </Link>
            </div>
          )}
        </div>
      </section>

      </div>

      <div className={styles.taSplitMap}>
        {planInView && !eventsTabOpen ? (
          // Checked ahead of the calendar's own EventMap below: Plan sits
          // right under the Calendar section, and planInView only goes true
          // once 50%+ of Plan is actually on screen (see its observer's own
          // comment) — by then the user has genuinely moved on, so Plan
          // should win even if Calendar's own observer hasn't flipped false
          // yet (its threshold is a plain "any pixel visible").
          planStops.length > 1 ? (
            <PlanRouteMap stops={planStops} activeIndex={activeStopIndex} />
          ) : (
            // Deliberately NOT a silent fallback to CityMap — that used to
            // make missing per-city plan-coordinate data invisible (looked
            // "fine", just showed the generic venue map instead of the
            // route). This section is supposed to show PlanRouteMap; if it
            // can't, that should be obvious to whoever's wiring up data for
            // a new city, not something that quietly degrades.
            <MapDataMissing reason="fewer than 2 plan days have a highlight with coordinates for this city — PlanRouteMap needs at least 2 (see CityDay in types/city.ts)." />
          )
        ) : /* EventMap branch commented out — When-to-go reuses the first section's CityMap
        calendarInView ? (
          (() => {
            if (!calendarActiveEvent) {
              return (
                <MapDataMissing reason="No event is currently selectable — check that whatsOn.events[].months is populated for this city." />
              );
            }
            if (calendarActiveEvent.location) {
              return (
                <EventMap
                  point={{
                    lat: calendarActiveEvent.location.lat,
                    lon: calendarActiveEvent.location.lon,
                    name: calendarActiveEvent.name ?? calendarActiveEvent.location.label,
                    photo: calendarActiveEvent.photo ?? placeholderPhoto(`event-${calendarActiveEvent.name}`),
                  }}
                />
              );
            }
            // Agra only — a live Places lookup, keyed by the event's own
            // name, for events with no location on file. Citywide events
            // with no single venue (e.g. "Ram Barat") are expected to
            // correctly stay unresolved here, same "skip rather than
            // guess" reasoning as the plan-slot lookups above.
            const live = isLivePlacesEnabledCity ? agraLiveEventLocations[calendarActiveEvent.name ?? ""] : undefined;
            if (live?.status === "success") {
              return (
                <EventMap
                  point={{
                    lat: live.lat,
                    lon: live.lon,
                    name: calendarActiveEvent.name ?? live.placeName,
                    photo: live.photoUrl,
                  }}
                />
              );
            }
            // Same reasoning as the Plan case above — surfaced instead of
            // silently showing CityMap.
            return (
              <MapDataMissing reason="This event has no location set — whatsOn.events[].location is required for EventMap (see types/city.ts)." />
            );
          })()
        ) : */ (
          <CityMap slug={city.slug} livePlacesEnabled={isLivePlacesEnabledCity} />
        )}
      </div>
      </div>

      <section className="band ta-guide" id="stay" style={{ scrollMarginTop: 96 }}>
        <div className="wrap">
          <div className="reveal cg-head">
            <div className="eyebrow">
              The guide {guide.verified && <span className="ta-verified">{guide.verified}</span>}
            </div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,56px)" }} dangerouslySetInnerHTML={{ __html: guide.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 16 }}>
              {guide.lede}
            </p>
            {guide.note && (
              <p className={`${styles.taGuideNote} reveal d1`}>
                <span className={styles.tgnK}>{guide.note.label}</span>
                {guide.note.text}
              </p>
            )}
          </div>
          <div className="cg-guide reveal d1">
            {(() => {
              const panels = orderedPanels(guide.panels ?? []);
              const activePanel = panels.find((p) => p.key === activeTab);
              const activeLabelledTiers = activePanel?.tiers.filter((t) => t.label) ?? [];
              const activeSelectedTier =
                selectedTierByPanel[activeTab] ?? activePanel?.tiers.findIndex((t) => t.label) ?? -1;

              return (
                <>
                {/* This box's own height is deliberately shortened (by JS,
                    see guideWrapHeight above) to "the real content height
                    minus 520px" — that's what makes the sticky bar inside it
                    release 520px before the list's true end, natively and
                    smoothly, with no jump. overflow stays visible since the
                    actual content must still render in full past this box's
                    now-shorter official edge. */}
                <div className={styles.guideListWrap} style={{ height: guideWrapHeight }}>
                  {/* One sticky container for both rows — its own top-offset
                      and padding are what keeps the two rows' spacing
                      constant once pinned; the rows themselves carry no
                      sticky/offset math of their own. Must be a *direct*
                      child of guideListWrap — see the comment above
                      guideBarRef/guideListRef for why. */}
                  <div className={styles.guideSticky} ref={guideBarRef}>
                    <div className="cg-tabs" role="tablist">
                      {panels.map((p) => (
                        <button
                          key={p.key}
                          data-cg={p.key}
                          role="tab"
                          aria-selected={activeTab === p.key}
                          onClick={() => setActiveTab(p.key)}
                        >
                          {tabLabels[p.key]}
                        </button>
                      ))}
                    </div>
                    {activePanel && activeLabelledTiers.length > 1 && (
                      <div className={styles.tierChips} role="radiogroup" aria-label="Filter by tier">
                        {activePanel.tiers.map(
                          (tier, i) =>
                            tier.label && (
                              <button
                                key={i}
                                type="button"
                                className={`${styles.tierChip}${i === activeSelectedTier ? ` ${styles.active}` : ""}`}
                                role="radio"
                                aria-checked={i === activeSelectedTier}
                                onClick={() => setSelectedTierByPanel((prev) => ({ ...prev, [activeTab]: i }))}
                              >
                                {tierIcon(tier.label)}
                                {tier.label}
                              </button>
                            )
                        )}
                      </div>
                    )}
                  </div>
                  <div ref={guideListRef}>
                    {panels.map((p) => (
                      <div key={p.key} style={{ display: activeTab === p.key ? undefined : "none" }}>
                        <GuidePanel
                          panel={p}
                          active={activeTab === p.key}
                          selectedTier={selectedTierByPanel[p.key] ?? p.tiers.findIndex((t) => t.label)}
                          livePhotos={activeTab === p.key ? liveGuidePanelPhotos : {}}
                          fireLookup={fireLiveGuidePanelLookup}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Restores the 520px this section's own height "lost" above,
                    so nothing after the guide (Neighbourhoods, etc.) shifts
                    up the page — the shortened box above only needs to fool
                    the sticky calculation, not actually remove real space. */}
                <div style={{ height: GUIDE_RELEASE_PX }} aria-hidden="true" />
                </>
              );
            })()}
          </div>
        </div>
      </section>

      <section className="band tight ta-content ta-prac ta-og" id="ta-og" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ marginBottom: 30 }}>
            <div className="eyebrow">Good to know</div>
            <div className="rule" />
          </div>

          <div className={`${styles.pracSection} reveal d1`}>
            <h3 className={styles.pracHeading}>{goodToKnow.beforeYouGo.heading}</h3>
            <div className={styles.accordionList}>
              {goodToKnow.beforeYouGo.rows.map((r, i) => (
                <AccordionRow key={i} label={r.label} value={r.value} />
              ))}
            </div>
          </div>

          <div className={`${styles.pracSection} reveal d2`}>
            <h3 className={styles.pracHeading}>{goodToKnow.onGround.heading}</h3>
            <div className={styles.cardGrid}>
              {goodToKnow.onGround.rows.map((r, i) => (
                <div className={styles.pracCard} key={i}>
                  <div className="eyebrow">{r.label}</div>
                  {r.keyword && <div className={styles.cardKeyword}>{r.keyword}</div>}
                  {r.value && <p className={styles.cardDesc}>{r.value}</p>}
                </div>
              ))}
            </div>
            {goodToKnow.onGround.note && <p className={`${styles.taGuideNote} reveal d1`}>{goodToKnow.onGround.note}</p>}
          </div>

          <div className={`${styles.pracSection} reveal d3`}>
            <h3 className={styles.pracHeading}>{neighbourhoods.heading}</h3>
            <div className={styles.cardGrid}>
              {neighbourhoods.items.map((n, i) => (
                <div className={styles.pracCard} key={i}>
                  <div className={styles.cardKeyword}>{n.name}</div>
                  {n.description && <p className={styles.cardDesc}>{n.description}</p>}
                </div>
              ))}
            </div>
            {neighbourhoods.pairWith && (
              <div className={`${styles.taPair}`} style={{ marginTop: 20 }}>
                <strong>Pair it with</strong>
                {neighbourhoods.pairWith}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* "More ways to explore" (collections) section removed — kept here commented out.
      <section className="band tight ta-collections" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "56ch" }}>
            <div className="eyebrow">More ways to explore</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(24px,2.9vw,38px)" }} dangerouslySetInnerHTML={{ __html: collections.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 12 }}>
              {collections.lede}
            </p>
          </div>
          <div className={`${styles.taColLinks} reveal d1`}>
            {collections.items.map((c, i) => (
              <Link className={styles.taColLink} to={toRoute(c.href)} key={i}>
                {c.label}
              </Link>
            ))}
            {collections.allLink && (
              <Link className={`${styles.taColLink} ${styles.taColAll}`} to={toRoute(collections.allLink.href)}>
                {collections.allLink.label}
              </Link>
            )}
          </div>
        </div>
      </section>
      */}

      <section
        className="band-dark band center"
        style={{ backgroundImage: `var(--scrim), url('${hero.image}')` }}
      >
        {slug && <LiveVenues slug={slug} />}
        <div className="wrap">
          <h2
            className="reveal d1"
            style={{ fontSize: "clamp(30px,4.4vw,58px)" }}

            dangerouslySetInnerHTML={{ __html: closing.headingHtml ?? "" }}
          />
          <p className="lede on-dark reveal d2" style={{ margin: "18px auto 28px" }}>
            {closing.lede}
          </p>
          {closing.ctaPrimary && (
            <div className="btn-row center reveal d3">
              <PrimaryInverseButton to={closing.ctaPrimary.href}>{withTaraAI(closing.ctaPrimary.label)}</PrimaryInverseButton>
            </div>
          )}
          <p className={`${styles.taReassure} ${styles.taReassureC} reveal d3`}>
            <span className={styles.taReassureDot} />A private advisor, not a call centre — usually a reply within the hour. No
            obligation.
          </p>
        </div>
      </section>
    </>
  );
}
