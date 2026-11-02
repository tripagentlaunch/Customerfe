import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import enquireData from "../data/enquire.generated.json";
import destinationsIndex from "../data/destinations-index.generated.json";
import type { EnquirePageData } from "../types/enquire";
import { useScrollReveal } from "../lib/useScrollReveal";
import { useNavVariant } from "../lib/navVariant";
import { titleCase } from "../lib/tripState";
import { useAuth } from "../lib/auth";
import { useIsMobile } from "../hooks/useIsMobile";
import { useSignInModal } from "../lib/signInModal";
import { withTaraAI } from "../components/TaraAI";
import styles from "./enquire-page.module.css";

const data = enquireData as unknown as EnquirePageData;

// Phase A: gated behind sign-in (site_members already holds name/email/
// phone — enquiries.member_id links to that row server-side, resolved from
// the caller's session token, never duplicated onto the enquiry itself).
// Submits into the real `enquiries` table via POST /enquiries
// (backend/app/routers/enquiry_router.py). The "Not quite live yet" panel
// now only shows on a genuine submission failure (network error, backend
// down, session rejected) — not unconditionally.
// Desktop form helpers (2026-10-28).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d][\d\s-]{8,14}$/;
const pad2 = (n: number) => String(n).padStart(2, "0");
// Local-time ISO dates (toISOString is UTC and can be a day off around midnight in India).
const toIso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fromIso = (iso: string) => new Date(`${iso}T00:00:00`);
const isoToday = () => toIso(new Date());
const addDays = (iso: string, n: number) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const addMonths = (iso: string, n: number) => {
  const d = fromIso(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return toIso(d);
};
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
// Next 12 months for the "flexible month" dropdown.
const monthOptions = () => {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    out.push(d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }));
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};
// Places TripAgent has pages for, from the destinations index: cities (with their
// country and region) and countries. Used by the "Where to?" list.
type Place = { name: string; country: string; region: string; kind: "city" | "country" };
const PLACES: Place[] = [];
const BROWSE: Place[] = []; // cities only, in the index's region order, for the open menu
{
  const seenCity = new Set<string>();
  const seenCountry = new Set<string>();
  type Idx = { regions?: { label?: string; groups?: { country?: string; cities?: { name: string }[] }[] }[] };
  // Menu order (2026-10-28, direct request): start from Europe and keep going west round
  // the world to India, with the Indian Ocean and India last. Any new region the index
  // gains lands just before the Indian Ocean.
  const REGION_ORDER = [
    "Western Europe",
    "Northern Europe",
    "Central Europe",
    "Southern Europe",
    "Türkiye",
    "The Middle East",
    "Africa",
    "North America",
    "South America",
    "Australia & New Zealand",
    "East Asia",
    "South-East Asia",
    "The Indian Ocean & the Himalaya",
    "India",
  ];
  const rank = (label?: string) => {
    const i = REGION_ORDER.indexOf(label ?? "");
    return i < 0 ? REGION_ORDER.length - 2.5 : i;
  };
  const orderedRegions = [...((destinationsIndex as Idx).regions ?? [])].sort((x, y) => rank(x.label) - rank(y.label));
  for (const r of orderedRegions)
    for (const g of r.groups ?? []) {
      const country = g.country ?? "";
      const region = r.label ?? "";
      if (country && !seenCountry.has(country)) {
        seenCountry.add(country);
        PLACES.push({ name: country, country: "", region, kind: "country" });
      }
      for (const c of g.cities ?? []) {
        if (seenCity.has(c.name)) continue;
        seenCity.add(c.name);
        const place: Place = { name: c.name, country, region, kind: "city" };
        PLACES.push(place);
        BROWSE.push(place);
      }
    }
}
const stripSpan = (html: string | null | undefined) => (html ?? "").replace(/<span[^>]*>.*?<\/span>/g, "").trim();
// Unused since the city hint line was removed:
// const spanText = (html: string | null | undefined) => (/<span[^>]*>(.*?)<\/span>/.exec(html ?? "")?.[1] ?? "").trim();

// The city list as a bottom sheet on a phone (2026-10-29, direct request): the chosen cities as chips, a search box,
// then the same list as the desktop menu ("I'm flexible on where" first, then the places by region, or the matches
// while typing, and "Use ..." for text that isn't on the list), and a Done button. Picking a city adds a chip and
// leaves the sheet open for the next one. Like the details sheet, it rides above the keyboard: its bottom edge and
// its height follow the visible part of the screen.
type CityPlace = { name: string; country: string; region: string; kind: "city" | "country" };

function CitySheet({
  values,
  places,
  showCustom,
  hasFlex,
  draft,
  setDraft,
  q,
  kb,
  inputRef,
  onAdd,
  onRemove,
  onClose,
}: {
  values: string[];
  places: CityPlace[];
  showCustom: boolean;
  hasFlex: boolean;
  draft: string;
  setDraft: (v: string) => void;
  q: string;
  kb: { inset: number; height: number };
  inputRef: React.RefObject<HTMLInputElement>;
  onAdd: (name: string) => void;
  onRemove: (i: number) => void;
  onClose: () => void;
}) {
  const { leaving, leave } = useSheetLeave();
  const close = () => leave(onClose);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const height = Math.round(Math.min(window.innerHeight * 0.8, kb.height - 16));
  return createPortal(
    <>
      <div className={`${styles.dSheetBackdrop}${leaving ? ` ${styles.dSheetBackdropOut}` : ""}`} onClick={close} aria-hidden="true" />
      <div
        className={`${styles.dSheet} ${styles.dSheetGlass} ${styles.dCitySheet}${leaving ? ` ${styles.dSheetOut}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Where to?"
        style={{ bottom: kb.inset, height }}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <div className={styles.dSheetHandle} aria-hidden="true" />
        <h3 className={styles.dSheetTitle}>Where to?</h3>
        {values.length > 0 && (
          <div className={styles.dCitySheetChips}>
            {values.map((v, i) => (
              <span className={styles.dCity} key={v}>
                {v}
                <button type="button" className={styles.dCityX} aria-label={`Remove ${v}`} onClick={() => onRemove(i)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          className={`ra-input ${styles.dSheetSearch}`}
          placeholder="Start typing a city or country"
          autoComplete="off"
          enterKeyHint="done"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (q && places.length) onAdd(places[0].name);
              else if (q) onAdd(q);
              else close();
            }
          }}
        />
        <div className={`${styles.dSheetList} ${styles.dCitySheetList}`} role="listbox" aria-multiselectable="true">
          {hasFlex && (
            <div role="option" aria-selected={false} className={`${styles.dComboOpt} ${styles.dCitySheetFlex}`} onClick={() => onAdd(FLEX_DEST)}>
              <span>I'm flexible on where</span>
              <span className={styles.dComboSub}>Not sure yet? Your advisor will suggest places.</span>
            </div>
          )}
          {places.map((pl, i) => (
            <div key={pl.kind + pl.name}>
              {!q && (i === 0 || places[i - 1].region !== pl.region) && <div className={styles.dComboHead}>{pl.region}</div>}
              <div role="option" aria-selected={false} className={styles.dComboOpt} onClick={() => onAdd(pl.name)}>
                <span>{pl.name}</span>
                <span className={styles.dComboSub}>{pl.kind === "country" ? "Country" : pl.country}</span>
              </div>
            </div>
          ))}
          {showCustom && (
            <div role="option" aria-selected={false} className={styles.dComboOpt} onClick={() => onAdd(q)}>
              <span>Use “{q}”</span>
            </div>
          )}
        </div>
        <button type="button" className={styles.dSheetPrimary} onClick={close}>
          Done
        </button>
      </div>
    </>,
    document.body
  );
}

// "Where to?" (2026-10-28, direct request): ONE field and ONE menu. The menu lists
// the places TripAgent has pages for, grouped by region (or filters while typing,
// with "Use ..." for text that isn't on the list, and "I'm flexible on where" pinned
// at the bottom). Picking a place adds it as a chip with an X and the field stays
// ready for the next one, so a multi-city trip never needs another field. Backspace
// on an empty field removes the last chip. The menu is portalled to <body> so the
// scrolling form can't clip it.
const FLEX_DEST = "Flexible on destination";

/** How much of the screen the on-screen keyboard covers, and the height left above it (window.visualViewport). */
function useViewportKeyboard() {
  const [kb, setKb] = useState({ inset: 0, height: window.innerHeight });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setKb({ inset: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)), height: Math.round(vv.height) });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return kb;
}

/** Leaving animation for the bottom sheets (2026-10-29, direct request): a sheet slides back down before it goes, instead of
 *  vanishing. `leave(after)` plays the slide (260ms) and then runs `after`; with reduced motion it runs `after` at once. */
const SHEET_OUT_MS = 260;
function useSheetLeave() {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const leave = (after: () => void) => {
    if (leaving) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      after();
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      setLeaving(false);
      after();
    }, SHEET_OUT_MS);
  };
  return { leaving, leave };
}

// A bottom sheet for the dropdowns and the date pickers on a phone (2026-10-29, direct request): the same dark glass as the
// desktop menus, sliding up from the bottom with a title, over a dimmed page that does not scroll. Tapping the dimmed area
// or pressing Escape closes it. (On a larger screen the same choices open as a menu under the field.)
function PickerSheet({
  title,
  onClose,
  children,
  sheetRef,
  onKeyDown,
  leaving,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  sheetRef?: React.RefObject<HTMLDivElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  leaving?: boolean;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return createPortal(
    <>
      <div className={`${styles.dSheetBackdrop}${leaving ? ` ${styles.dSheetBackdropOut}` : ""}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={`${styles.dSheet} ${styles.dSheetGlass}${leaving ? ` ${styles.dSheetOut}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ bottom: 0, maxHeight: "78svh" }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          onKeyDown?.(e);
        }}
      >
        <div className={styles.dSheetHandle} aria-hidden="true" />
        <h3 className={styles.dSheetTitle}>{title}</h3>
        {children}
      </div>
    </>,
    document.body
  );
}

function CityChips({
  id,
  values,
  onChange,
  placeholder,
  describedBy,
}: {
  id: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  describedBy?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const byKeyboard = useRef(false);
  // On a phone the city list is a bottom sheet with its own search box (2026-10-29, direct request).
  const phone = useIsMobile();
  const kb = useViewportKeyboard();
  const [sheet, setSheet] = useState(false);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

  const taken = new Set(values.map((v) => v.toLowerCase()));
  const q = draft.trim();
  const ql = q.toLowerCase();
  const places: Place[] = (
    ql
      ? PLACES.filter((p) => p.name.toLowerCase().includes(ql) || (p.kind === "city" && p.country.toLowerCase().includes(ql)))
          .sort(
            (a, b) =>
              Number(b.name.toLowerCase().startsWith(ql)) - Number(a.name.toLowerCase().startsWith(ql)) ||
              Number(b.kind === "city") - Number(a.kind === "city")
          )
          .slice(0, 60)
      : BROWSE
  ).filter((p) => !taken.has(p.name.toLowerCase()));
  const exact = taken.has(ql) || places.some((p) => p.name.toLowerCase() === ql);
  const showCustom = !!q && !exact;
  const hasFlex = !taken.has(FLEX_DEST.toLowerCase());
  // Row order: "I'm flexible on where" first (pinned at the top), then the places, then "Use ...".
  const flexIndex = hasFlex ? 0 : -1;
  const off = hasFlex ? 1 : 0; // places start after the flexible row
  const customIndex = off + places.length;
  const count = off + places.length + (showCustom ? 1 : 0);

  // No row is highlighted until the mouse is over one or the arrow keys are used.
  useEffect(() => setActive(-1), [draft, values.length]);

  useEffect(() => {
    if (!open || !byKeyboard.current) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    byKeyboard.current = false;
  }, [active, open, listId]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      setPos(
        below < 260 && r.top > below
          ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 4 }
          : { left: r.left, width: r.width, top: r.bottom + 4 }
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, draft, values.length]);

  // "Flexible on destination" stands alone (2026-10-29, direct request): choosing it removes every other entry, and
  // choosing a city while it is there takes it out (the two don't go together).
  function withEntry(n: string): string[] {
    if (n === FLEX_DEST) return [FLEX_DEST];
    return [...values.filter((v) => v !== FLEX_DEST), n];
  }

  function add(name: string, refocus = true) {
    const n = name.trim();
    if (n && !taken.has(n.toLowerCase())) onChange(withEntry(n));
    setDraft("");
    setActive(-1);
    if (refocus) inputRef.current?.focus();
  }
  function remove(i: number) {
    onChange(values.filter((_, j) => j !== i));
    inputRef.current?.focus();
  }
  function pickIndex(i: number) {
    if (i === flexIndex) add(FLEX_DEST);
    else if (showCustom && i === customIndex) add(q);
    else if (places[i - off]) add(places[i - off].name);
    setOpen(true); // stays open, ready for the next city
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (count) {
        byKeyboard.current = true;
        // From nothing highlighted, Down while typing goes to the best match (not the flexible row on top).
        setActive((a) =>
          e.key === "ArrowDown" ? (a < 0 ? (q && places.length ? off : 0) : (a + 1) % count) : a < 0 ? count - 1 : (a - 1 + count) % count
        );
      }
    } else if (e.key === "Enter") {
      if (open && count && active >= 0) {
        e.preventDefault();
        pickIndex(active);
      } else if (q && places.length) {
        // Nothing highlighted: Enter takes the best match for what was typed.
        e.preventDefault();
        add(places[0].name);
      } else if (q) {
        e.preventDefault();
        add(q);
      }
    } else if (e.key === ",") {
      if (q) {
        e.preventDefault();
        add(q);
      }
    } else if (e.key === "Backspace" && !draft && values.length) {
      remove(values.length - 1);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
    }
  }

  const bold = (label: string) => {
    const i = label.toLowerCase().indexOf(ql);
    if (!ql || i < 0) return label;
    return (
      <>
        {label.slice(0, i)}
        <b>{label.slice(i, i + ql.length)}</b>
        {label.slice(i + ql.length)}
      </>
    );
  };
  const optClass = (i: number) => `${styles.dComboOpt}${i === active ? ` ${styles.dComboOn}` : ""}`;

  return (
    <>
      <div ref={wrapRef} className={styles.dChipField} onClick={() => (phone ? setSheet(true) : inputRef.current?.focus())}>
        {values.map((v, i) => (
          <span className={styles.dCity} key={v}>
            {v}
            <button
              type="button"
              className={styles.dCityX}
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(i);
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          // Idle (chips, not focused, nothing typed): the input collapses so it can't take a whole empty row of its own.
          className={`ra-input ${styles.dChipInput}${values.length && !focused && !draft ? ` ${styles.dChipInputIdle}` : ""}`}
          // With chips, the "Add another city" prompt only shows while the field is focused.
          placeholder={values.length ? (focused || phone ? "Add another city" : undefined) : placeholder}
          readOnly={phone}
          aria-describedby={describedBy}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && count && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (phone) {
              setSheet(true); // the sheet has the search box; this field stays read-only
              return;
            }
            setFocused(true);
            setOpen(true);
          }}
          onBlur={() => {
            setFocused(false);
            setOpen(false);
            if (q) add(q, false); // text left in the field isn't lost
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open &&
        !phone &&
        pos &&
        createPortal(
          <div
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            className={styles.dCombo}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={() => setActive(-1)}
          >
            {hasFlex && (
              <div
                id={`${listId}-${flexIndex}`}
                role="option"
                aria-selected={false}
                className={`${optClass(flexIndex)} ${styles.dComboFlex}`}
                onMouseEnter={() => setActive(flexIndex)}
                onClick={() => pickIndex(flexIndex)}
              >
                <span>I'm flexible on where</span>
                <span className={styles.dComboSub}>Not sure yet? Your advisor will suggest places.</span>
              </div>
            )}
            <div className={styles.dComboScroll}>
              {places.map((pl, i) => (
                <div key={pl.kind + pl.name}>
                  {!q && (i === 0 || places[i - 1].region !== pl.region) && <div className={styles.dComboHead}>{pl.region}</div>}
                  <div
                    id={`${listId}-${i + off}`}
                    role="option"
                    aria-selected={false}
                    className={optClass(i + off)}
                    onMouseEnter={() => setActive(i + off)}
                    onClick={() => pickIndex(i + off)}
                  >
                    <span>{q ? bold(pl.name) : pl.name}</span>
                    <span className={styles.dComboSub}>{pl.kind === "country" ? "Country" : pl.country}</span>
                  </div>
                </div>
              ))}
              {showCustom && (
                <div
                  id={`${listId}-${customIndex}`}
                  role="option"
                  aria-selected={false}
                  className={optClass(customIndex)}
                  onMouseEnter={() => setActive(customIndex)}
                  onClick={() => pickIndex(customIndex)}
                >
                  <span>Use “{q}”</span>
                </div>
              )}
              {!places.length && !showCustom && <div className={styles.dComboHead}>No more places match</div>}
            </div>
          </div>,
          document.body
        )}
      {phone && sheet && (
        <CitySheet
          values={values}
          places={places}
          showCustom={showCustom}
          hasFlex={hasFlex}
          draft={draft}
          setDraft={setDraft}
          q={q}
          kb={kb}
          inputRef={sheetInputRef}
          onAdd={(name) => {
            const n = name.trim();
            if (n && !taken.has(n.toLowerCase())) onChange(withEntry(n));
            setDraft("");
            sheetInputRef.current?.focus(); // the keyboard stays up for the next city
          }}
          onRemove={(i) => onChange(values.filter((_, j) => j !== i))}
          onClose={() => {
            if (q && !taken.has(q.toLowerCase())) onChange(withEntry(q)); // text left in the box isn't lost
            setDraft("");
            setSheet(false);
          }}
        />
      )}
    </>
  );
}

// Dropdown menus (2026-10-28, direct request): the same menu as the city list, in
// place of the browser's native <select>: portalled list, optional group headings,
// a tick on the chosen row, keyboard (arrows, Home/End, Enter/Space, Escape, type a
// letter to jump) and "Clear" to go back to nothing chosen.
type DropOpt = { label: string; value?: string; group?: string };

function Dropdown({
  id,
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  title,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: DropOpt[];
  placeholder: string;
  ariaLabel?: string;
  /** The heading of the bottom sheet on a phone. */
  title?: string;
}) {
  const phone = useIsMobile();
  const { leaving, leave } = useSheetLeave();
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const byKeyboard = useRef(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

  const val = (o: DropOpt) => o.value ?? o.label;
  const chosen = options.find((o) => val(o) === value);
  // Row 0 is "Clear selection" once something is chosen.
  const rows: (DropOpt | null)[] = value ? [null, ...options] : options;
  const optAt = (i: number) => rows[i];

  const chosenRow = rows.findIndex((o) => o && val(o) === value);

  function openMenu() {
    setActive(-1); // nothing highlighted until hover or arrow keys; the chosen row shows a tick
    setOpen(true);
  }

  // On open, scroll the chosen row into view.
  useEffect(() => {
    if (open && chosenRow >= 0) document.getElementById(`${listId}-${chosenRow}`)?.scrollIntoView({ block: "nearest" });
  }, [open, chosenRow, listId]);

  useEffect(() => {
    if (!open || !byKeyboard.current) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
    byKeyboard.current = false;
  }, [active, open, listId]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      // At least 220px wide and inside the screen, for a half-width field on a phone.
      const width = Math.max(r.width, 220);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos(
        below < 260 && r.top > below
          ? { left, width, bottom: window.innerHeight - r.top + 4 }
          : { left, width, top: r.bottom + 4 }
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // On a phone the sheet slides back down before it closes.
  const closeSheet = () => leave(() => setOpen(false));

  function pick(i: number) {
    const o = optAt(i);
    onChange(o ? val(o) : "");
    if (phone) closeSheet();
    else setOpen(false);
    btnRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      byKeyboard.current = true;
      setActive((a) =>
        e.key === "ArrowDown"
          ? a < 0
            ? chosenRow >= 0
              ? chosenRow
              : 0
            : (a + 1) % rows.length
          : a < 0
            ? rows.length - 1
            : (a - 1 + rows.length) % rows.length
      );
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      byKeyboard.current = true;
      setActive(e.key === "Home" ? 0 : rows.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active >= 0) pick(active);
      else setOpen(false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const i = rows.findIndex((o, j) => j !== active && o && o.label.toLowerCase().startsWith(k));
      if (i >= 0) {
        byKeyboard.current = true;
        setActive(i);
      }
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`${styles.dControl} ${styles.dSelect} ${styles.dDropBtn}${chosen ? "" : ` ${styles.dDropPlaceholder}`}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onBlur={() => !phone && setOpen(false)}
        onKeyDown={onKeyDown}
      >
        {chosen ? chosen.label : placeholder}
      </button>
      {open && phone && (
        <PickerSheet title={title ?? ariaLabel ?? placeholder} onClose={closeSheet} leaving={leaving}>
          <div className={styles.dSheetList} role="listbox">
            {rows.map((o, i) => {
              const prev = i > 0 ? rows[i - 1] : null;
              const head = o && o.group && (!prev || prev.group !== o.group) ? o.group : "";
              const isChosen = !!o && val(o) === value;
              return (
                <div key={o ? val(o) : "clear"}>
                  {head && <div className={styles.dComboHead}>{head}</div>}
                  <div role="option" aria-selected={isChosen} className={styles.dComboOpt} onClick={() => pick(i)}>
                    <span className={o ? undefined : styles.dComboSub}>{o ? o.label : "Clear selection"}</span>
                    {isChosen && <span className={styles.dComboSub}>✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </PickerSheet>
      )}
      {open &&
        !phone &&
        pos &&
        createPortal(
          <div
            id={listId}
            role="listbox"
            className={styles.dCombo}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            onMouseDown={(e) => e.preventDefault()}
            onMouseLeave={() => setActive(-1)}
          >
            <div className={styles.dComboScroll}>
              {rows.map((o, i) => {
                const prev = i > 0 ? rows[i - 1] : null;
                const head = o && o.group && (!prev || prev.group !== o.group) ? o.group : "";
                const isChosen = !!o && val(o) === value;
                return (
                  <div key={o ? val(o) : "clear"}>
                    {head && <div className={styles.dComboHead}>{head}</div>}
                    <div
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={isChosen}
                      className={`${styles.dComboOpt}${i === active ? ` ${styles.dComboOn}` : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(i)}
                    >
                      <span className={o ? undefined : styles.dComboSub}>{o ? o.label : "Clear selection"}</span>
                      {isChosen && <span className={styles.dComboSub}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// Date picker (2026-10-28, direct request): our own calendar in place of the browser's
// native date input. A field that opens a month grid (portalled, styled like the menus),
// with month arrows, today marked, dates before `min` disabled, the chosen day filled
// and the span between leaving and returning tinted. Keyboard: arrows move by day or
// week, Page Up / Down by month, Home / End to the week's ends, Enter picks, Escape closes.
function DatePicker({
  id,
  value,
  onChange,
  min,
  placeholder,
  ariaLabel,
  rangeFrom,
  rangeTo,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  placeholder: string;
  ariaLabel: string;
  rangeFrom?: string;
  rangeTo?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(""); // first day of the month being shown
  const [focusIso, setFocusIso] = useState("");
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const phone = useIsMobile();
  const { leaving, leave } = useSheetLeave();
  // Which way the month just moved, so the new month slides in from that side (2026-10-29, direct request).
  const [dir, setDir] = useState<"" | "next" | "prev">("");
  const today = isoToday();
  const atLeastMin = (iso: string) => (min && iso < min ? min : iso);

  function openCal() {
    const start = atLeastMin(value || min || today);
    setDir("");
    setFocusIso(start);
    setView(`${start.slice(0, 8)}01`);
    setOpen(true);
  }
  function close(refocus = true) {
    const done = () => {
      setOpen(false);
      if (refocus) btnRef.current?.focus();
    };
    if (phone && open) leave(done); // the sheet slides down first
    else done();
  }

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      // As wide as the field it opens from (was a fixed 288px), but never narrower than 288px: on a phone the two
      // date fields share a row.
      const width = Math.max(r.width, 288);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      setPos(
        below < 340 && r.top > below
          ? { left, width, bottom: window.innerHeight - r.top + 4 }
          : { left, width, top: r.bottom + 4 }
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Put keyboard focus on the focused day when the calendar opens or the day moves.
  useEffect(() => {
    if (open) popRef.current?.querySelector<HTMLButtonElement>('[data-focus="true"]')?.focus();
  }, [open, focusIso, pos]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  function move(next: string) {
    if (min && next < min) return;
    const nm = next.slice(0, 7);
    const vm = view.slice(0, 7);
    if (nm !== vm) setDir(nm > vm ? "next" : "prev");
    setFocusIso(next);
    setView(`${next.slice(0, 8)}01`);
  }
  // One way to change month: the arrows, a swipe and the keyboard all slide the new month in.
  function shiftMonth(delta: number) {
    if (delta < 0 && prevDisabled) return;
    setDir(delta > 0 ? "next" : "prev");
    setView(`${addMonths(view, delta).slice(0, 8)}01`);
  }
  // A swipe across the month: left for the next month, right for the previous one.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const st = swipe.current;
    swipe.current = null;
    if (!st) return;
    const dx = e.changedTouches[0].clientX - st.x;
    const dy = e.changedTouches[0].clientY - st.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftMonth(dx < 0 ? 1 : -1);
  };
  function onPopKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const f = focusIso || today;
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDays(f, -1),
      ArrowRight: () => addDays(f, 1),
      ArrowUp: () => addDays(f, -7),
      ArrowDown: () => addDays(f, 7),
      PageUp: () => addMonths(f, -1),
      PageDown: () => addMonths(f, 1),
      Home: () => addDays(f, -((fromIso(f).getDay() + 6) % 7)),
      End: () => addDays(f, 6 - ((fromIso(f).getDay() + 6) % 7)),
    };
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (map[e.key] && (e.target as HTMLElement).dataset.day) {
      e.preventDefault();
      move(map[e.key]());
    }
  }

  const y = view ? Number(view.slice(0, 4)) : 0;
  const m = view ? Number(view.slice(5, 7)) - 1 : 0;
  const lead = view ? (new Date(y, m, 1).getDay() + 6) % 7 : 0;
  const total = view ? new Date(y, m + 1, 0).getDate() : 0;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  const title = view ? fromIso(view).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";
  const monthOfFocus = focusIso.slice(0, 7) === view.slice(0, 7);
  const prevDisabled = !!min && view <= `${min.slice(0, 8)}01`;

  return (
    <>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`${styles.dControl} ${styles.dDropBtn} ${styles.dDateBtn}${value ? "" : ` ${styles.dDropPlaceholder}`}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${ariaLabel}${value ? `: ${fmtDate(value)}` : ""}`}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close(false) : openCal())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openCal();
          }
        }}
      >
        {value ? fmtDate(value) : placeholder}
        <svg className={styles.dDateIcon} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>
      {open && phone && (
        <PickerSheet title={ariaLabel} onClose={() => close(false)} sheetRef={popRef} onKeyDown={onPopKey} leaving={leaving}>
          <div className={styles.dCalSheet} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className={styles.dCalHead}>
              <button
                type="button"
                className={styles.dCalNav}
                aria-label="Previous month"
                disabled={prevDisabled}
                onClick={() => shiftMonth(-1)}
              >
                ‹
              </button>
              <div className={styles.dCalTitle} key={view} aria-live="polite">
                {title}
              </div>
              <button
                type="button"
                className={styles.dCalNav}
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                ›
              </button>
            </div>
            <div key={view} className={`${styles.dCalGrid}${dir === "next" ? ` ${styles.dCalNext}` : dir === "prev" ? ` ${styles.dCalPrev}` : ""}`}>
              {WEEKDAYS.map((w) => (
                <div key={w} className={styles.dCalDow}>
                  {w}
                </div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const iso = `${view.slice(0, 8)}${pad2(d)}`;
                const off = !!min && iso < min;
                const selected = iso === value;
                const inRange = !!rangeFrom && !!rangeTo && iso > rangeFrom && iso < rangeTo;
                const isFocus = monthOfFocus ? iso === focusIso : d === 1;
                return (
                  <button
                    key={iso}
                    type="button"
                    data-day={iso}
                    data-focus={isFocus ? "true" : undefined}
                    tabIndex={isFocus ? 0 : -1}
                    disabled={off}
                    aria-label={fromIso(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    aria-pressed={selected}
                    className={`${styles.dCalDay}${selected ? ` ${styles.dCalSel}` : ""}${inRange ? ` ${styles.dCalRange}` : ""}${iso === today ? ` ${styles.dCalToday}` : ""}`}
                    onClick={() => {
                      onChange(iso);
                      close();
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className={styles.dCalFoot}>
              <button type="button" className={styles.dCalLink} disabled={!value} onClick={() => { onChange(""); close(); }}>
                Clear
              </button>
              <button
                type="button"
                className={styles.dCalLink}
                disabled={!!min && today < min}
                onClick={() => {
                  onChange(today);
                  close();
                }}
              >
                Today
              </button>
            </div>
          </div>
        </PickerSheet>
      )}
      {open &&
        !phone &&
        pos &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label={ariaLabel}
            className={styles.dCal}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            onKeyDown={onPopKey}
          >
            <div className={styles.dCalHead}>
              <button
                type="button"
                className={styles.dCalNav}
                aria-label="Previous month"
                disabled={prevDisabled}
                onClick={() => shiftMonth(-1)}
              >
                ‹
              </button>
              <div className={styles.dCalTitle} key={view} aria-live="polite">
                {title}
              </div>
              <button
                type="button"
                className={styles.dCalNav}
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                ›
              </button>
            </div>
            <div key={view} className={`${styles.dCalGrid}${dir === "next" ? ` ${styles.dCalNext}` : dir === "prev" ? ` ${styles.dCalPrev}` : ""}`}>
              {WEEKDAYS.map((w) => (
                <div key={w} className={styles.dCalDow}>
                  {w}
                </div>
              ))}
              {cells.map((d, i) => {
                if (d === null) return <div key={`b${i}`} />;
                const iso = `${view.slice(0, 8)}${pad2(d)}`;
                const off = !!min && iso < min;
                const selected = iso === value;
                const inRange = !!rangeFrom && !!rangeTo && iso > rangeFrom && iso < rangeTo;
                const isFocus = monthOfFocus ? iso === focusIso : d === 1;
                return (
                  <button
                    key={iso}
                    type="button"
                    data-day={iso}
                    data-focus={isFocus ? "true" : undefined}
                    tabIndex={isFocus ? 0 : -1}
                    disabled={off}
                    aria-label={fromIso(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    aria-pressed={selected}
                    className={`${styles.dCalDay}${selected ? ` ${styles.dCalSel}` : ""}${inRange ? ` ${styles.dCalRange}` : ""}${iso === today ? ` ${styles.dCalToday}` : ""}`}
                    onClick={() => {
                      onChange(iso);
                      close();
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <div className={styles.dCalFoot}>
              <button type="button" className={styles.dCalLink} disabled={!value} onClick={() => { onChange(""); close(); }}>
                Clear
              </button>
              <button
                type="button"
                className={styles.dCalLink}
                disabled={!!min && today < min}
                onClick={() => {
                  onChange(today);
                  close();
                }}
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// The bottom sheet for editing name / mobile / email on a phone (2026-10-29, direct request). It slides up over the page
// and sits above the on-screen keyboard: window.visualViewport reports how much of the screen the keyboard covers, and
// the sheet's bottom edge and its height follow it, so the field being typed in stays visible. The edits stay on this
// page (this form has never sent them; the server takes them from the session).
type ContactRow = {
  key: "name" | "phone" | "email";
  label: string;
  type: string;
  placeholder: string;
  autoComplete: string;
  value: string;
};

function ContactSheet({
  rows,
  onClose,
  onSave,
}: {
  rows: ContactRow[];
  onClose: () => void;
  onSave: (v: { name: string; phone: string; email: string }) => void;
}) {
  const { leaving, leave } = useSheetLeave();
  const close = () => leave(onClose);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, r.value])));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [kb, setKb] = useState({ inset: 0, height: window.innerHeight });
  const sheetRef = useRef<HTMLDivElement>(null);

  // The keyboard: the part of the screen it covers is what the visual viewport has lost.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setKb({ inset: Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)), height: Math.round(vv.height) });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // The page behind does not scroll while the sheet is open; the first empty field (else the first) is focused.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const inputs = [...(sheetRef.current?.querySelectorAll<HTMLInputElement>("input") ?? [])];
    (inputs.find((i) => !i.value) ?? inputs[0])?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // A field that gets focus is brought into view inside the sheet when the keyboard opens.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.scrollIntoView?.({ block: "nearest" });
  }, [kb.inset]);

  function save() {
    const e: Record<string, string> = {};
    const name = (vals.name ?? "").trim();
    const phone = (vals.phone ?? "").trim();
    const email = (vals.email ?? "").trim();
    if (!name) e.name = "Please tell us your name.";
    if (phone && !PHONE_RE.test(phone)) e.phone = "Please enter a valid mobile number.";
    if (email && !EMAIL_RE.test(email)) e.email = "Please enter a valid email.";
    setErrs(e);
    const first = Object.keys(e)[0];
    if (first) {
      sheetRef.current?.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus();
      return;
    }
    leave(() => onSave({ name, phone, email }));
  }

  return createPortal(
    <>
      <div className={`${styles.dSheetBackdrop}${leaving ? ` ${styles.dSheetBackdropOut}` : ""}`} onClick={close} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={`${styles.dSheet}${leaving ? ` ${styles.dSheetOut}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your details"
        style={{ bottom: kb.inset, maxHeight: kb.height - 16 }}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
        }}
      >
        <div className={styles.dSheetHandle} aria-hidden="true" />
        <h3 className={styles.dSheetTitle}>Your details</h3>
        {rows.map((r) => (
          <div className={styles.dSheetField} key={r.key}>
            <label className={styles.dSheetLabel} htmlFor={`sheet-${r.key}`}>
              {r.label}
            </label>
            <input
              id={`sheet-${r.key}`}
              name={r.key}
              type={r.type}
              className={`ra-input ${styles.dSheetInput}`}
              placeholder={r.placeholder}
              autoComplete={r.autoComplete}
              inputMode={r.type === "tel" ? "tel" : r.type === "email" ? "email" : undefined}
              value={vals[r.key] ?? ""}
              onChange={(e) => setVals((v) => ({ ...v, [r.key]: e.target.value }))}
              aria-invalid={!!errs[r.key]}
              aria-describedby={errs[r.key] ? `sheet-${r.key}-err` : undefined}
            />
            {errs[r.key] && (
              <div className={styles.dSheetErr} id={`sheet-${r.key}-err`}>
                {errs[r.key]}
              </div>
            )}
          </div>
        ))}
        <div className={styles.dSheetBtns}>
          <button type="button" className={styles.dSheetPrimary} onClick={save}>
            Done
          </button>
          <button type="button" className={styles.dSheetGhost} onClick={close}>
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export default function EnquirePage() {
  useNavVariant("solid");
  const { signedIn, member } = useAuth();
  // 2026-10-29 (direct request): phones get the redesigned form too (it stacks into one column, see the phone block at
  // the end of enquire-page.module.css). Was: const desk = !useIsMobile();
  const desk = true;
  // Desktop: name / mobile / email are already known, so they show as a preview card (Edit swaps in the fields).
  const [editContact, setEditContact] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);
  // Desktop controls: single-choice chips, a stepper and a date picker, kept in state
  // and assembled into the same POST body as before (nothing new is sent).
  // Starts at 1 (was empty, shown as a dash); the stepper runs from 1 to 20.
  const [travellers, setTravellers] = useState<number>(1);
  // Trip type and cabin preference were removed from the desktop form (2026-10-28, direct request).
  // const [tripType, setTripType] = useState("");
  // const [cabin, setCabin] = useState("");
  const [budget, setBudget] = useState("");
  const [dateMode, setDateMode] = useState<"dates" | "flex">("dates");
  // Multi-city: an ordered list of stops (a shortlist from the site arrives as several).
  const [stops, setStops] = useState<string[]>(() => {
    // Read the params directly: `dest` / `shortlist` are declared further down this function.
    const qs = new URLSearchParams(window.location.search);
    const sl = qs.get("shortlist");
    const d = qs.get("dest");
    const fromShortlist = sl ? sl.split(",").map((x) => titleCase(x.trim())).filter(Boolean) : [];
    if (fromShortlist.length) return fromShortlist;
    return d ? [titleCase(d)] : [];
  });
  // Flexible timing: a month or season (or "any time"), and a number of days (or flexible on length).
  const [when, setWhen] = useState("");
  // One value for the trip length: "", "Flexible", or a number of days ("7 days"). It was a stepper
  // plus a separate "Flexible" checkbox; now it is a single dropdown (2026-10-28, direct request).
  const [duration, setDuration] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // "Anything else": number of 28px text lines, so the underlines follow the text.
  const [notesLines, setNotesLines] = useState(1);
  const [submitErr, setSubmitErr] = useState("");
  // Phones edit the name / mobile / email in a bottom sheet; desktop edits them in place.
  const isPhone = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contactVals, setContactVals] = useState<{ name?: string; phone?: string; email?: string }>({});
  const openContactEdit = () => (isPhone ? setSheetOpen(true) : setEditContact(true));
  useEffect(() => {
    if (!editContact) return;
    const inputs = [...(contactRef.current?.querySelectorAll<HTMLInputElement>("input") ?? [])];
    (inputs.find((i) => !i.value) ?? inputs[0])?.focus();
  }, [editContact]);
  const signInModal = useSignInModal();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notLive, setNotLive] = useState(false);
  const thanksRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const showThanks = submitted || notLive;

  // Carries context from "Talk to your advisor" links/floating button/trip
  // handoff (?dest=<city-slug> or ?shortlist=<slug,slug>) into the
  // destination field — the fallback path when WhatsApp isn't configured
  // still needs to arrive pre-filled, per the CONVERT KRA.
  const dest = searchParams.get("dest");
  const shortlist = searchParams.get("shortlist");
  const destPrefill = dest ? titleCase(dest) : shortlist ? shortlist.split(",").map(titleCase).join(", ") : "";

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  useEffect(() => {
    if (!showThanks) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      thanksRef.current?.focus({ preventScroll: true });
    } catch {
      // no-op
    }
  }, [showThanks]);

  async function post(body: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const res = await fetch(`/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`enquiry submit failed: ${res.status}`);
      setSubmitted(true);
    } catch {
      // Desktop keeps the form (nothing typed is lost) and shows an inline error;
      // phones keep the original "Not quite live yet" panel.
      if (desk) setSubmitErr("We couldn't send that just now. Everything you entered is still here: try again, or email your advisor.");
      else setNotLive(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signedIn) {
      signInModal.open("Sign in to send your enquiry.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const travellersRaw = fd.get("travellers");
    const body = {
      destination: (fd.get("destination") as string) || undefined,
      dates: (fd.get("dates") as string) || undefined,
      travellers: travellersRaw ? Number(travellersRaw) : undefined,
      trip_type: (fd.get("trip_type") as string) || undefined,
      cabin: (fd.get("cabin") as string) || undefined,
      budget: (fd.get("budget") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    };
    await post(body);
  }

  const { aside, form } = data;

  // Desktop (2026-10-28, direct request): same look as /request-access and
  // /claim: photo background, two glass cards side by side (intro, then form),
  // translucent inputs, a white button beside an outline button. Name, mobile
  // and email are details we already hold, so they appear as a preview card with
  // an Edit button instead of three empty fields. (Editing is local: this page
  // has never sent them; the server takes them from the session.) Phones keep
  // the original page below.
  if (desk) {
    const byId = (id: string) => form.fields.find((f) => f.id === id);
    const fDest = byId("f-dest");
    const fDates = byId("f-dates");
    const fTrav = byId("f-travellers");
    // const fType = byId("f-type"); // removed from the desktop form
    // const fCabin = byId("f-cabin"); // removed from the desktop form
    const fBudget = byId("f-budget");
    const fNotes = byId("f-notes");
    const contact = [
      { f: byId("f-name"), value: contactVals.name ?? member?.name, autoComplete: "name" },
      { f: byId("f-phone"), value: contactVals.phone ?? member?.phone, autoComplete: "tel" },
      { f: byId("f-email"), value: contactVals.email ?? member?.email, autoComplete: "email" },
    ];
    const today = isoToday();

    const datesText =
      dateMode === "dates"
        ? dateFrom && dateTo
          ? `${fmtDate(dateFrom)} to ${fmtDate(dateTo)}`
          : dateFrom
            ? `From ${fmtDate(dateFrom)}`
            : ""
        : "";

    const flexText = [
      when ? (when === "Flexible" ? "Flexible dates" : when) : "",
      duration === "Flexible" ? "flexible length" : duration,
    ]
      .filter(Boolean)
      .join(", ");
    // Stops go to the one existing `destination` string, in order.
    const destinationText = stops.map((x) => x.trim()).filter(Boolean).join(" → ");

    const errLine = (key: string) =>
      fieldErrors[key] ? (
        <div className={styles.dErr} id={`enq-${key}-err`}>
          {fieldErrors[key]}
        </div>
      ) : null;
    const errProps = (key: string) => ({
      "aria-invalid": !!fieldErrors[key],
      "aria-describedby": fieldErrors[key] ? `enq-${key}-err` : undefined,
    });

    function validate(fd: FormData) {
      const errs: Record<string, string> = {};
      if (editContact) {
        const n = String(fd.get("name") ?? "").trim();
        const ph = String(fd.get("phone") ?? "").trim();
        const em = String(fd.get("email") ?? "").trim();
        if (!n) errs.name = "Please tell us your name.";
        if (ph && !PHONE_RE.test(ph)) errs.phone = "Please enter a valid mobile number.";
        if (em && !EMAIL_RE.test(em)) errs.email = "Please enter a valid email.";
      }
      if (dateMode === "dates") {
        if (dateFrom && dateFrom < today) errs.dates = "Please choose a date in the future.";
        else if (dateFrom && dateTo && dateTo < dateFrom) errs.dates = "The return date can't be before you leave.";
      }
      return errs;
    }
    const focusIds: Record<string, string> = {
      name: "f-name",
      phone: "f-phone",
      email: "f-email",
      dates: dateMode === "dates" ? "enq-date-from" : "enq-date-when",
    };

    async function handleDeskSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (submitting) return;
      if (!signedIn) {
        signInModal.open("Sign in to send your enquiry.");
        return;
      }
      const fd = new FormData(e.currentTarget);
      const errs = validate(fd);
      setFieldErrors(errs);
      setSubmitErr("");
      const first = Object.keys(errs)[0];
      if (first) {
        document.getElementById(focusIds[first] ?? "")?.focus();
        return;
      }
      await post({
        destination: destinationText || undefined,
        dates: (dateMode === "flex" ? flexText : datesText) || undefined,
        travellers,
        // trip_type / cabin: no longer collected on desktop
        budget: budget || undefined,
        notes: (fd.get("notes") as string) || undefined,
      });
    }

    /* Choice-button helper, replaced by dropdowns (2026-10-28):
    // Single-choice chips (click the chosen one again to clear it).
    const chips = (labelId: string, options: string[] | null | undefined, value: string, set: (v: string) => void) => (
      <div className={styles.dChips} role="radiogroup" aria-labelledby={labelId}>
        {(options ?? []).map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            className={`${styles.dChip}${value === o ? ` ${styles.dChipOn}` : ""}`}
            onClick={() => set(value === o ? "" : o)}
          >
            {o}
          </button>
        ))}
      </div>
    );

    */

    // const hint = spanText(fDest?.labelHtml); // the "or the trip you've been building" line was removed (2026-10-28, direct request)

    return (
      <>
        <section id="ta-intent" aria-label="Open a trip you've already decided on" />
        <section className={styles.deskRoot}>
          <div className={styles.deskWrap}>
            <div className={`wrap ${styles.deskCard}`}>
              {/* 2026-10-29 (direct request): back to the original page layout: light page, text on the left,
                  form on the right, no cards or photo. The form keeps the new fields, controls and menus. */}
              <div className={styles.deskAside}>
                <div className="eyebrow">{aside.eyebrow}</div>
                <div className="rule" />
                <h1
                  style={{ fontFamily: "var(--logo)", fontWeight: 500, fontSize: "clamp(30px, min(3.6vw, 6.4vh), 56px)", lineHeight: 1.04 }}
                  dangerouslySetInnerHTML={{ __html: aside.headingHtml ?? "" }}
                />
                <p className="lede" style={{ marginTop: 20 }}>
                  {aside.lede}
                </p>
                {/* marginTop was 28: a smaller gap between the paragraph and the ticked lines (2026-10-29, direct request) */}
                <ul className="incl" style={{ marginTop: 8 }}>
                  {aside.incl.map((line, i) => (
                    <li key={i}>
                      <span className="ck">✦</span>
                      {/* "lede": the same text style as the paragraph above it, whatever size that has on each screen */}
                      <span className={`lede ${styles.dInclText}`}>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.deskPane}>
                {showThanks ? (
                  <div className={`${styles.dThanks} ${styles.dFadeIn}`} role="status" aria-live="polite" tabIndex={-1} ref={thanksRef}>
                    <svg width={54} height={54} viewBox="0 0 420 420" fill="none" aria-hidden="true">
                      <g stroke="currentColor" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M140,150 L280,150" />
                        <path d="M210,150 L210,212" />
                        <path d="M140,300 L210,212 L280,300" />
                        <path d="M174,256 L246,256" />
                      </g>
                    </svg>
                    {submitted ? (
                      <>
                        <h3 className={styles.dPaneHeading}>Thank you. We've got it.</h3>
                        <p className={styles.dMuted}>Your advisor will be in touch shortly to help shape this trip.</p>
                      </>
                    ) : (
                      <>
                        <h3 className={styles.dPaneHeading}>Not quite live yet.</h3>
                        <p className={styles.dMuted}>
                          Enquiry submission is on its way. For now, please write to your advisor directly and they'll pick it up right away.
                        </p>
                        <a className={styles.dPrimary} href={form.emailCta.href}>
                          <span className={styles.dLabelText}>{withTaraAI(form.emailCta.label)}</span>
                        </a>
                      </>
                    )}
                  </div>
                ) : !signedIn ? (
                  <div className={`${styles.dSignIn} ${styles.dFadeIn}`}>
                    <h3 className={styles.dPaneHeading}>Sign in to send your enquiry.</h3>
                    <p className={styles.dMuted}>
                      TripAgent is by invitation: sign in with the email on your invitation so your advisor knows
                      exactly who's reaching out.
                    </p>
                    <button type="button" className={styles.dPrimary} onClick={() => signInModal.open("Sign in to send your enquiry.")}>
                      <span className={styles.dLabelText}>Sign in</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Back (2026-10-29): the heading and subtext as on the original page. The "Everything below is
                        optional." note stays removed. */}
                    <h3 className={styles.dPaneHeading}>{form.heading}</h3>
                    <p className={styles.dMuted}>{form.muted}</p>
                    <form className={styles.dForm} noValidate onSubmit={handleDeskSubmit}>

                      {/* Details we already hold: a preview card; a missing one is flagged so it can be added. */}
                      {isPhone && sheetOpen && (
                        <ContactSheet
                          rows={contact.flatMap(({ f, value, autoComplete }) =>
                            f
                              ? [
                                  {
                                    key: (f.name ?? "") as "name" | "phone" | "email",
                                    label: stripSpan(f.labelHtml),
                                    type: f.type ?? "text",
                                    placeholder: f.placeholder ?? "",
                                    autoComplete,
                                    value: value ?? "",
                                  },
                                ]
                              : []
                          )}
                          onClose={() => setSheetOpen(false)}
                          onSave={(v) => {
                            setContactVals(v);
                            setSheetOpen(false);
                          }}
                        />
                      )}
                      <div className={styles.dContact} ref={contactRef}>
                        {editContact ? (
                          <div className={`${styles.dContactEdit} ${styles.dFadeIn}`}>
                            {contact.map(({ f, value, autoComplete }) =>
                              f ? (
                                <div className={styles.dField} key={f.id}>
                                  <label className={styles.dLabel} htmlFor={f.id ?? undefined}>
                                    {stripSpan(f.labelHtml)}
                                  </label>
                                  <input
                                    id={f.id ?? undefined}
                                    type={f.type ?? "text"}
                                    name={f.name ?? undefined}
                                    className={`ra-input ${styles.dControl}`}
                                    placeholder={f.placeholder ?? undefined}
                                    defaultValue={value ?? undefined}
                                    autoComplete={autoComplete}
                                    inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                                    {...errProps(f.name ?? "")}
                                  />
                                  {errLine(f.name ?? "")}
                                </div>
                              ) : null
                            )}
                          </div>
                        ) : (
                          <div className={`${styles.dContactView} ${styles.dFadeIn}`}>
                            {contact.map(({ f, value }) =>
                              f ? (
                                <div className={styles.dContactItem} key={f.id}>
                                  <span className={styles.dContactLabel}>{stripSpan(f.labelHtml)}</span>
                                  {value ? (
                                    <span className={styles.dContactValue}>{value}</span>
                                  ) : (
                                    <button type="button" className={styles.dAdd} onClick={openContactEdit}>
                                      Add {stripSpan(f.labelHtml).toLowerCase().replace("full ", "")}
                                    </button>
                                  )}
                                </div>
                              ) : null
                            )}
                          </div>
                        )}
                        <button type="button" className={styles.dEdit} onClick={() => (editContact ? setEditContact(false) : openContactEdit())}>
                          {editContact ? "Done" : "Edit"}
                        </button>
                      </div>

                      <div className={styles.dGrid}>
                        {/* One field, one menu: each pick becomes a chip (2026-10-28). Was a row per city with "+ Add another city". */}
                        {fDest && (
                          <div className={`${styles.dField} ${styles.dSpan5}`}>
                            <label className={styles.dLabel} htmlFor="f-dest">
                              {stripSpan(fDest.labelHtml)}
                            </label>
                            <CityChips
                              id="f-dest"
                              values={stops}
                              onChange={setStops}
                              placeholder={fDest.placeholder ?? undefined}
                            />
                            {/* Removed (2026-10-28, direct request): the line "or the trip you've been building" under this field. */}
                          </div>
                        )}

                        {fTrav && (
                          <div className={`${styles.dField} ${styles.dTrav}`}>
                            <span className={styles.dLabel} id="enq-trav-label">
                              {stripSpan(fTrav.labelHtml)}
                            </span>
                            <div className={styles.dStepper} role="group" aria-labelledby="enq-trav-label">
                              <button
                                type="button"
                                className={styles.dStepBtn}
                                aria-label="Fewer travellers"
                                disabled={travellers <= 1}
                                onClick={() => setTravellers((n) => Math.max(1, n - 1))}
                              >
                                −
                              </button>
                              <output className={styles.dStepVal} aria-live="polite">
                                {travellers}
                              </output>
                              <button
                                type="button"
                                id="enq-trav-plus"
                                className={styles.dStepBtn}
                                aria-label="More travellers"
                                disabled={travellers >= 20}
                                onClick={() => setTravellers((n) => Math.min(20, n + 1))}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}

                        {fDates && (
                          <div className={`${styles.dField} ${styles.dSpan4}`}>
                            <div className={styles.dLabelRow}>
                              <span className={styles.dLabel} id="enq-dates-label">
                                {stripSpan(fDates.labelHtml)}
                              </span>
                              <div className={styles.dSeg} role="radiogroup" aria-label="How to enter dates">
                                {(
                                  [
                                    ["dates", "Specific dates"],
                                    ["flex", "Flexible"],
                                  ] as const
                                ).map(([m, label]) => (
                                  <button
                                    key={m}
                                    type="button"
                                    role="radio"
                                    aria-checked={dateMode === m}
                                    className={`${styles.dSegBtn}${dateMode === m ? ` ${styles.dSegOn}` : ""}`}
                                    onClick={() => {
                                      setDateMode(m);
                                      setFieldErrors((e) => ({ ...e, dates: "" }));
                                    }}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {dateMode === "dates" ? (
                              <div key="dates" className={`${styles.dDateRow} ${styles.dFadeIn}`}>
                                <DatePicker
                                  id="enq-date-from"
                                  ariaLabel="Leaving on"
                                  placeholder="Leaving on"
                                  value={dateFrom}
                                  min={today}
                                  rangeFrom={dateFrom}
                                  rangeTo={dateTo}
                                  invalid={!!fieldErrors.dates}
                                  describedBy={fieldErrors.dates ? "enq-dates-err" : undefined}
                                  onChange={(v) => {
                                    setDateFrom(v);
                                    if (dateTo && v && dateTo < v) setDateTo("");
                                  }}
                                />
                                <DatePicker
                                  id="enq-date-to"
                                  ariaLabel="Returning on"
                                  placeholder="Returning on"
                                  value={dateTo}
                                  min={dateFrom || today}
                                  rangeFrom={dateFrom}
                                  rangeTo={dateTo}
                                  invalid={!!fieldErrors.dates}
                                  describedBy={fieldErrors.dates ? "enq-dates-err" : undefined}
                                  onChange={setDateTo}
                                />
                              </div>
                            ) : (
                              <div key="flex" className={`${styles.dDateRow} ${styles.dFadeIn}`}>
                                <Dropdown
                                  id="enq-date-when"
                                  ariaLabel="Month or season"
                                  title="Month or season"
                                  value={when}
                                  onChange={setWhen}
                                  placeholder="Select a month or season"
                                  options={[
                                    { label: "Flexible, any time", value: "Flexible" },
                                    ...["Spring", "Summer", "Autumn", "Winter"].map((x) => ({ label: x, group: "Seasons" })),
                                    ...monthOptions().map((m) => ({ label: m, group: "Months" })),
                                  ]}
                                />
                                <Dropdown
                                  id="enq-days"
                                  ariaLabel="Trip length"
                                  title="Trip length"
                                  value={duration}
                                  onChange={setDuration}
                                  placeholder="Number of days"
                                  options={[
                                    { label: "Flexible on length", value: "Flexible" },
                                    ...Array.from({ length: 30 }, (_, i) => ({
                                      label: `${i + 1} ${i === 0 ? "day" : "days"}`,
                                      group: "Number of days",
                                    })),
                                    { label: "More than 30 days", group: "Longer" },
                                  ]}
                                />
                              </div>
                            )}
                            {errLine("dates")}
                          </div>
                        )}

                        {/* Removed from the desktop form (2026-10-28, direct request): "Trip type" and "Cabin preference"
                            (both were Dropdown menus over fType.options / fCabin.options). */}

                        {/* Budget shares the dates row (2026-10-28, direct request). */}
                        {fBudget && (
                          <div className={`${styles.dField} ${styles.dCol2} ${styles.dBudget}`}>
                            <div className={styles.dLabelRow}>
                              <label className={styles.dLabel} htmlFor="f-budget">
                                {stripSpan(fBudget.labelHtml)}
                              </label>
                            </div>
                            <Dropdown id="f-budget" value={budget} onChange={setBudget} placeholder="Select a range" title="Indicative budget" options={(fBudget.options ?? []).map((o) => ({ label: o }))} />
                          </div>
                        )}

                        {fNotes && (
                          <div className={`${styles.dField} ${styles.dSpan3}`}>
                            <label className={styles.dLabel} htmlFor="f-notes">
                              {stripSpan(fNotes.labelHtml)}
                            </label>
                            <textarea
                              id="f-notes"
                              name={fNotes.name ?? "notes"}
                              rows={1}
                              className={`ra-input ${styles.dControl} ${styles.dTextarea}`}
                              placeholder={fNotes.placeholder ?? undefined}
                              style={{ backgroundSize: `100% ${notesLines * 28}px` }}
                              onInput={(e) => {
                                // Grow with the text (up to max-height in the CSS), one underline per line.
                                // The lines are counted from the text alone: with the CSS min-height in play, scrollHeight
                                // never drops below the box's resting height and one line of text was counted as three.
                                const el = e.currentTarget;
                                el.style.minHeight = "0";
                                el.style.height = "0px";
                                const h = el.scrollHeight;
                                el.style.minHeight = "";
                                el.style.height = `${h}px`;
                                setNotesLines(Math.max(1, Math.round(h / 28)));
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {submitErr && (
                        <div className={styles.dErr} role="alert">
                          {submitErr}
                        </div>
                      )}
                      {/* Desktop caption (2026-10-28, direct request). Was {form.trust}: "Your details stay private. A person reads every enquiry, never a bot." */}
                      <div className={styles.dTrust}>
                        Your details stay private.
                        <br className={styles.dBrPhone} /> Your advisor will read your enquiry and get back to you.
                      </div>
                      {/* Two buttons side by side (2026-10-28): the white primary, and an outline "Email your advisor"
                          (was the text link "Rather write to us directly? Email Tara AI"). The primary's label was
                          withTaraAI(form.submitLabel) ("Hand it to Tara AI"). */}
                      <div className={styles.dBtnRow}>
                        <button type="submit" className={styles.dPrimary} disabled={submitting}>
                          <span className={styles.dLabelText}>{submitting ? "Sending…" : "Send to your advisor"}</span>
                        </button>
                        <a className={styles.dGhost} href={form.emailCta.href}>
                          <span className={styles.dLabelText}>Email your advisor</span>
                        </a>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section id="ta-intent" aria-label="Open a trip you've already decided on" />

      <section>
        <div className={`wrap ${styles.enqWrap}`}>
          <div className={`${styles.enqAside} reveal`}>
            <div className="eyebrow">{aside.eyebrow}</div>
            <div className="rule" />
            <h1
              style={{ fontFamily: "var(--logo)", fontWeight: 500, fontSize: "clamp(38px,5vw,72px)", lineHeight: 1.04 }}
              dangerouslySetInnerHTML={{ __html: aside.headingHtml ?? "" }}
            />
            <p className="lede" style={{ marginTop: 20 }}>
              {aside.lede}
            </p>
            <ul className="incl" style={{ marginTop: 28 }}>
              {aside.incl.map((line, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal d2">
            <div className={`${styles.form}${showThanks ? ` ${styles.sent}` : ""}`} id="enquireForm">
              {!signedIn ? (
                <div className={styles.formBody}>
                  <h3 style={{ fontSize: 26, marginBottom: 4 }}>Sign in to send your enquiry.</h3>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
                    TripAgent is by invitation: sign in with the email on your invitation so your advisor knows
                    exactly who's reaching out.
                  </p>
                  <button
                    type="button"
                    className="btn btn-gold"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => signInModal.open("Sign in to send your enquiry.")}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
              <div className={styles.formBody}>
                <h3 style={{ fontSize: 26, marginBottom: 4 }}>{form.heading}</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
                  {form.muted}
                </p>
                <form id="leadForm" noValidate onSubmit={handleSubmit}>
                  {form.fields.map((f) => (
                    <div className="field" key={f.id}>
                      <label htmlFor={f.id ?? undefined} dangerouslySetInnerHTML={{ __html: f.labelHtml ?? "" }} />
                      {f.tag === "select" ? (
                        <select id={f.id ?? undefined} name={f.name ?? undefined}>
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.tag === "textarea" ? (
                        <textarea id={f.id ?? undefined} name={f.name ?? undefined} rows={3} placeholder={f.placeholder ?? undefined} />
                      ) : (
                        <input
                          id={f.id ?? undefined}
                          type={f.type ?? "text"}
                          name={f.name ?? undefined}
                          required={f.required}
                          placeholder={f.placeholder ?? undefined}
                          defaultValue={f.id === "f-dest" && destPrefill ? destPrefill : undefined}
                        />
                      )}
                    </div>
                  ))}
                  <div className={styles.trust} style={{ margin: "2px 0 14px" }}>
                    {form.trust}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-gold"
                    style={{ width: "100%", justifyContent: "center" }}
                    disabled={submitting}
                  >
                    {submitting ? "Sending…" : withTaraAI(form.submitLabel)}
                  </button>
                </form>
                <div style={{ textAlign: "center", marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line-soft)" }}>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                    {form.emailPrompt}
                  </p>
                  <a className="btn btn-ghost" href={form.emailCta.href} style={{ width: "100%", justifyContent: "center" }}>
                    {withTaraAI(form.emailCta.label)}
                  </a>
                </div>
              </div>
              )}
              <div className={`${styles.thanks}${showThanks ? ` ${styles.show}` : ""}`} role="status" aria-live="polite" tabIndex={-1} ref={thanksRef}>
                <svg width={54} height={54} viewBox="0 0 420 420" fill="none" style={{ margin: "0 auto 18px" }}>
                  <g stroke="#785C12" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M140,150 L280,150" />
                    <path d="M210,150 L210,212" />
                    <path d="M140,300 L210,212 L280,300" />
                    <path d="M174,256 L246,256" />
                  </g>
                </svg>
                {submitted ? (
                  <>
                    <h3 style={{ fontSize: 30 }}>Thank you. We've got it.</h3>
                    <p className="lede" style={{ margin: "12px auto 8px", maxWidth: "40ch" }}>
                      Your advisor will be in touch shortly to help shape this trip.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: 30 }}>Not quite live yet.</h3>
                    <p className="lede" style={{ margin: "12px auto 8px", maxWidth: "40ch" }}>
                      Enquiry submission is on its way. For now, please write to your advisor directly and they'll pick it up right away.
                    </p>
                    <a className="btn btn-gold" href={form.emailCta.href}>
                      {withTaraAI(form.emailCta.label)}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}