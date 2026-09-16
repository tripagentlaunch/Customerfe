import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
} from "lucide-react";
import cities from "../data/cities.generated.json";
import type { CityData, CityGuidePanel } from "../types/city";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import CityMap from "../components/CityMap";
import PlanRouteMap, { type PlanStop } from "../components/PlanRouteMap";
import PlanCarousel from "../components/PlanCarousel";
import CalendarSection from "../components/CalendarSection";
import EventMap from "../components/EventMap";
import { planSlotPhotos, PHOTOS_PER_SLOT } from "../lib/planPhotos";
import { placeholderPhoto } from "../lib/placeholderPhoto";
import styles from "./city-page.module.css";

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
function GuideCard({ photo, children }: { photo: string; children: ReactNode }) {
  return (
    <div className={styles.cardInner}>
      <div className={styles.cardThumbWrap}>
        <img className={styles.cardThumb} src={photo} alt="" loading="lazy" />
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

// Tabs + tier chips both moved out of here into one shared sticky wrapper
// in CityPage itself (see .guideSticky) — this component now renders only
// the actual tier list content, driven by the selectedTier prop it's given.
function GuidePanel({ panel, active, selectedTier }: { panel: CityGuidePanel; active: boolean; selectedTier: number }) {
  const [openTiers, setOpenTiers] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpenTiers((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const labelledTiers = panel.tiers.filter((t) => t.label);

  return (
    <div className={`cg-panel${active ? " on" : ""}`} data-cg={panel.key}>
      {panel.tiers.map((tier, i) => (
        (labelledTiers.length <= 1 || i === selectedTier) && (
        <div className={`cg-tier${openTiers.has(i) ? " cg-more-open" : ""}`} key={i}>
          <ul className="cg-list">
            {tier.items.map((item, j) => {
              // `credentials` is typed required, but that's a compile-time
              // guarantee for hand-authored JSON only — a live API response
              // is never actually type-checked, so a missing/null key here
              // must not crash the whole guide list.
              const credentials = item.credentials ?? [];
              const noTag = credentials.length === 0;
              return (
              <li className={j >= MIN_VISIBLE_ITEMS ? "cg-hide" : ""} key={j}>
                <GuideCard photo={item.photo ?? placeholderPhoto(`${panel.key}-${i}-${j}-${item.name}`)}>
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
          {tier.items.length > MIN_VISIBLE_ITEMS && (
            <button className="cg-more" type="button" aria-expanded={openTiers.has(i)} onClick={() => toggle(i)}>
              {openTiers.has(i) ? "Show fewer" : `Show all ${tier.items.length} →`}
            </button>
          )}
        </div>
        )
      ))}
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

  // "The plan" is a day-tabs + single-place carousel: normal page scroll
  // (not scroll-hijacked/sticky), advanced by arrow clicks, day-tab clicks,
  // or a 6s auto-advance timer — all three just set activeStepIndex
  // directly, since there's no scroll-linkage to keep in sync with anymore.
  type PlanStep = { dayIndex: number; slotIndex: number; photoIndex: number };

  const planSteps = useMemo<PlanStep[]>(() => {
    if (!city) return [];
    const steps: PlanStep[] = [];
    (city.plan.days ?? []).forEach((day, dayIndex) => {
      (day.slots ?? []).forEach((_, slotIndex) => {
        for (let photoIndex = 0; photoIndex < PHOTOS_PER_SLOT; photoIndex++) {
          steps.push({ dayIndex, slotIndex, photoIndex });
        }
      });
    });
    return steps;
  }, [city]);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [planInView, setPlanInView] = useState(false);
  const planSectionRef = useRef<HTMLElement | null>(null);

  // The sticky map also switches to a single-pin view of whichever event
  // CalendarSection is currently highlighting (hover/click/auto-advance)
  // while that section is in view — same pattern as planInView/PlanRouteMap
  // below, just driven from a sibling section instead of a ref+observer
  // here, since CalendarSection owns its own section element.
  const [calendarInView, setCalendarInView] = useState(false);
  const [calendarActiveEvent, setCalendarActiveEvent] = useState<CityData["whatsOn"]["events"][number] | null>(null);

  function stepPlanBy(delta: number) {
    setActiveStepIndex((i) => {
      const n = planSteps.length;
      if (n === 0) return i;
      return (i + delta + n) % n;
    });
  }

  function selectPlanDay(dayIndex: number) {
    const stepIndex = planSteps.findIndex((s) => s.dayIndex === dayIndex);
    if (stepIndex >= 0) setActiveStepIndex(stepIndex);
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
    if (!planInView || planSteps.length < 2) return;
    const id = setTimeout(() => stepPlanBy(1), 4000);
    return () => clearTimeout(id);
  }, [planInView, planSteps.length, activeStepIndex]);

  const activePlanStep = planSteps[activeStepIndex];

  const activeSlotPhotos = useMemo(() => {
    if (!city || !activePlanStep) return [];
    return planSlotPhotos(city.slug, activePlanStep.dayIndex, activePlanStep.slotIndex);
  }, [city, activePlanStep]);

  // The sticky map shows only the current day's stops (not the whole
  // itinerary), highlighting whichever one is the active step's place.
  const activeDayStops = useMemo(() => {
    if (!city || !activePlanStep) return [];
    const day = (city.plan.days ?? [])[activePlanStep.dayIndex];
    if (!day) return [];
    const stops: PlanStop[] = [];
    // Day one starts from the airport, if the city has one on record — the
    // first leg then reads as "arrival -> first stop" instead of starting
    // mid-trip with no lead-in.
    if (activePlanStep.dayIndex === 0 && city.plan.arrivalPoint) {
      const a = city.plan.arrivalPoint;
      stops.push({ lat: a.lat, lon: a.lon, dayNumber: day.dayNumber ?? "", label: a.label, place: a.label, category: "do", isAirport: true });
    }
    for (const slot of day.slots ?? []) {
      if (typeof slot.lat === "number" && typeof slot.lon === "number") {
        stops.push({
          lat: slot.lat,
          lon: slot.lon,
          dayNumber: day.dayNumber ?? "",
          label: slot.label ?? "",
          place: slot.place ?? slot.label ?? "",
          category: slot.category,
        });
      }
    }
    return stops;
  }, [city, activePlanStep]);

  const activeDayStopIndex = useMemo(() => {
    if (!city || !activePlanStep) return -1;
    const slot = (city.plan.days ?? [])[activePlanStep.dayIndex]?.slots?.[activePlanStep.slotIndex];
    if (!slot || typeof slot.lat !== "number" || typeof slot.lon !== "number") return -1;
    return activeDayStops.findIndex((s) => s.lat === slot.lat && s.lon === slot.lon);
  }, [city, activePlanStep, activeDayStops]);

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

  const { hero, ourTake, firstLook, whenToGo, guide, plan, neighbourhoods, whatsOn, goodToKnow, collections, closing } =
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
            {hero.ctaPrimary && (
              <Link className={`btn btn-gold on-dark btn-square ${styles.heroCta}`} to={toRoute(hero.ctaPrimary.href)}>
                <span className={styles.heroCtaLabel}>
                  {hero.ctaPrimary.label}
                  <span className={styles.heroCtaArrow} aria-hidden="true">
                    →
                  </span>
                </span>
              </Link>
            )}{" "}
            {hero.ctaSecondary && (
              <a className={`btn btn-ghost on-dark ${styles.heroCtaSecondary}`} href={hero.ctaSecondary.href}>
                <span className={styles.heroCtaLabel}>
                  {hero.ctaSecondary.label}
                  <span className={styles.heroCtaArrow} aria-hidden="true">
                    →
                  </span>
                </span>
              </a>
            )}
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

      <CalendarSection
        whenToGo={whenToGo}
        whatsOn={whatsOn}
        onInViewChange={setCalendarInView}
        onActiveEventChange={setCalendarActiveEvent}
      />

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
          {activePlanStep && (
            <PlanCarousel
              days={plan.days}
              activeDayIndex={activePlanStep.dayIndex}
              activeSlotIndex={activePlanStep.slotIndex}
              activePhotoIndex={activePlanStep.photoIndex}
              photos={activeSlotPhotos}
              onSelectDay={selectPlanDay}
              onPrev={() => stepPlanBy(-1)}
              onNext={() => stepPlanBy(1)}
            />
          )}
          {plan.cta && (
            <div className="reveal d2" style={{ marginTop: 20 }}>
              <Link className={`btn btn-gold btn-square ${styles.planCta}`} to={toRoute(plan.cta.href)}>
                <span className={styles.planCtaLabel}>
                  {plan.cta.label}
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
        {planInView && activeDayStops.length > 1 ? (
          // Checked ahead of the calendar's own EventMap below: Plan sits
          // right under the Calendar section, and planInView only goes true
          // once 50%+ of Plan is actually on screen (see its observer's own
          // comment) — by then the user has genuinely moved on, so Plan
          // should win even if Calendar's own observer hasn't flipped false
          // yet (its threshold is a plain "any pixel visible").
          <PlanRouteMap stops={activeDayStops} activeIndex={activeDayStopIndex} />
        ) : calendarInView && calendarActiveEvent?.location ? (
          <EventMap
            point={{
              lat: calendarActiveEvent.location.lat,
              lon: calendarActiveEvent.location.lon,
              name: calendarActiveEvent.name ?? calendarActiveEvent.location.label,
              photo: calendarActiveEvent.photo ?? placeholderPhoto(`event-${calendarActiveEvent.name}`),
            }}
          />
        ) : (
          <CityMap slug={city.slug} />
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

      <section
        className="band-dark band center"
        style={{ backgroundImage: `var(--scrim), url('${hero.image}')` }}
      >
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
              <Link className="btn btn-gold on-dark" to={toRoute(closing.ctaPrimary.href)}>
                {closing.ctaPrimary.label}
              </Link>
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
