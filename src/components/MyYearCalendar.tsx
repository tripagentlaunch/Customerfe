import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { SiteMemberRow, SiteSavedItemRow } from "../lib/database.types";
import { useAuth } from "../lib/auth";

// React port of js/account.js's renderMyYear() (docs/ACCOUNTS-CALENDAR-ARCH.md
// §4.3, H4) — the personal 12-month calendar. Unlike the legacy version,
// this reads/writes site_saved_items directly (RLS-scoped to the signed-in
// member) instead of the localStorage TA_YEAR stub; there is no 'local' mode.
const MONF = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const KIND: Record<string, string> = {
  hotel: "Stay", event: "Moment", experience: "Experience", city: "Destination",
  journey: "Journey", window: "Month", flight: "Flight", visa: "Visa", note: "Note",
};
const WA = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;

function pad2(n: number) {
  return (n < 10 ? "0" : "") + n;
}
function iso(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`; // m is 0-based
}
function parseISO(s: string | null) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return { y, m: m - 1, d };
}
function handoff(msg: string, slug?: string | null): string {
  if (WA) return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  return `/enquire${slug ? `?dest=${encodeURIComponent(slug)}` : ""}`;
}

function DaySheet({
  dateKey,
  items,
  onClose,
  onRemove,
}: {
  dateKey: string;
  items: SiteSavedItemRow[];
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const p = parseISO(dateKey)!;
  const label = `${p.d} ${MONF[p.m]} ${p.y}`;
  return (
    <div className="my-sheet">
      <div className="my-sheet-scrim" onClick={onClose} />
      <div className="my-sheet-card" role="dialog" aria-label={label}>
        <button type="button" className="my-sheet-x" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <div className="my-sheet-d">{label}</div>
        <div className="my-sheet-items">
          {items.map((x) => {
            const bookable = x.kind === "hotel" || x.kind === "flight" || x.kind === "visa";
            const verb = bookable ? "Have your advisor book this" : "Ask your advisor to arrange this";
            const msg = `Hello — regarding ${x.title}${x.city_label ? ` in ${x.city_label}` : ""} on ${label}. Could your advisor help?`;
            return (
              <div className="my-sheet-row" key={x.id}>
                <div>
                  <div className="my-sheet-k">
                    {KIND[x.kind] ?? x.kind}
                    {x.city_label ? ` · ${x.city_label}` : ""}
                  </div>
                  <div className="my-sheet-t">{x.title}</div>
                </div>
                <div className="my-sheet-a">
                  <a className="cta" href={handoff(msg, x.city)} target={WA ? "_blank" : undefined} rel={WA ? "noopener" : undefined}>
                    {verb} →
                  </a>
                  <button type="button" className="my-sheet-rm" onClick={() => onRemove(x.id)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function MyYearCalendar({ member }: { member: SiteMemberRow }) {
  const { logout } = useAuth();
  const [items, setItems] = useState<SiteSavedItemRow[] | null>(null); // null = loading
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0..11, months forward from this month
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [placingId, setPlacingId] = useState<string | null>(null);
  const [dpStart, setDpStart] = useState("");
  const [dpEnd, setDpEnd] = useState("");

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setFetchError(null);
    supabase
      .from("site_saved_items")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[my-year] site_saved_items fetch failed:", error.message);
          setFetchError(error.message);
          setItems([]);
          return;
        }
        setItems(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  const now = useMemo(() => new Date(), []);
  const baseY = now.getFullYear();
  const baseM = now.getMonth();

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(baseY, baseM + i, 1);
        return { key: `${d.getFullYear()}-${d.getMonth()}`, short: MONF[d.getMonth()].slice(0, 3), yy: String(d.getFullYear()).slice(2) };
      }),
    [baseY, baseM]
  );

  // index saved items by date (an item spans when_start..when_end) + the undated
  const { byDate, monthHas, undated } = useMemo(() => {
    const byDate: Record<string, SiteSavedItemRow[]> = {};
    const monthHas: Record<string, boolean> = {};
    const undated: SiteSavedItemRow[] = [];
    (items ?? []).forEach((x) => {
      if (!x.when_start) {
        undated.push(x);
        return;
      }
      const s = parseISO(x.when_start)!;
      const e = parseISO(x.when_end || x.when_start)!;
      const start = new Date(s.y, s.m, s.d);
      let end = new Date(e.y, e.m, e.d);
      if (end < start) end = start;
      for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = iso(d.getFullYear(), d.getMonth(), d.getDate());
        (byDate[key] ??= []).push(x);
        monthHas[`${d.getFullYear()}-${d.getMonth()}`] = true;
      }
    });
    return { byDate, monthHas, undated };
  }, [items]);

  const viewD = new Date(baseY, baseM + monthOffset, 1);
  const vy = viewD.getFullYear();
  const vm = viewD.getMonth();
  const firstDow = (new Date(vy, vm, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(vy, vm + 1, 0).getDate();
  const todayKey = iso(now.getFullYear(), now.getMonth(), now.getDate());

  // auto-close the day sheet once its last item is removed
  useEffect(() => {
    if (selectedDate && (byDate[selectedDate]?.length ?? 0) === 0) setSelectedDate(null);
  }, [selectedDate, byDate]);

  useEffect(() => {
    if (!selectedDate) return;
    document.documentElement.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedDate(null);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [selectedDate]);

  async function removeItem(id: string) {
    const { error } = await supabase.from("site_saved_items").delete().eq("id", id);
    if (error) {
      console.error("[my-year] remove failed:", error.message);
      return;
    }
    setItems((prev) => (prev ? prev.filter((x) => x.id !== id) : prev));
  }

  async function placeOnDate(id: string) {
    if (!dpStart) return;
    const start = dpStart;
    const end = dpEnd || dpStart;
    const { error } = await supabase.from("site_saved_items").update({ when_start: start, when_end: end }).eq("id", id);
    if (error) {
      console.error("[my-year] set dates failed:", error.message);
      return;
    }
    setItems((prev) => (prev ? prev.map((x) => (x.id === id ? { ...x, when_start: start, when_end: end } : x)) : prev));
    setPlacingId(null);
  }

  const firstName = (member.name ?? "").split(" ")[0];
  const advMsg = `Hello — a word about my year on TripAgent${items && items.length ? ` (${items.length} saved)` : ""}. Could my advisor help me shape it?`;

  return (
    <section className="band ta-my">
      <div className="wrap">
        <div className="my-head">
          <div>
            <div className="eyebrow">Your year</div>
            <div className="rule" />
            <h2>{firstName ? `${firstName}’s year.` : "Your year."}</h2>
            <p className="lede">
              {items === null
                ? "Loading your year…"
                : items.length
                  ? "Everything you save lands here on its day — hotels, moments to time a trip around, whole cities. Your calendar of the year. Your advisor sees it, and reaches out when the time is right."
                  : "Your calendar is empty. As you browse, tap Add to my year on any stay, moment or city — it lands here on its date, and we carry it with you."}
            </p>
          </div>
          <button type="button" className="my-signout" onClick={() => logout()}>
            Sign out
          </button>
        </div>

        {fetchError && <p className="my-sheet-err lede">Your year couldn’t be loaded just now — please try again shortly.</p>}

        {items !== null && (
          <>
            <div className="my-strip">
              {months.map((m, i) => (
                <button type="button" key={m.key} className={`my-mstrip${i === monthOffset ? " on" : ""}`} data-off={i} onClick={() => setMonthOffset(i)}>
                  {m.short}
                  <span className="my-mstrip-y">{m.yy}</span>
                  {monthHas[m.key] && <span className="my-mstrip-dot" />}
                </button>
              ))}
            </div>

            <div className="my-cal-head">
              <button type="button" className="my-nav my-prev" aria-label="Previous month" disabled={monthOffset === 0} onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}>
                ‹
              </button>
              <h3 className="my-month">
                {MONF[vm]} {vy}
              </h3>
              <button type="button" className="my-nav my-next" aria-label="Next month" disabled={monthOffset === 11} onClick={() => setMonthOffset((o) => Math.min(11, o + 1))}>
                ›
              </button>
            </div>

            <div className="my-cal">
              <div className="my-cal-wd">
                {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
                  <span key={i}>{w}</span>
                ))}
              </div>
              <div className="my-cal-grid">
                {Array.from({ length: firstDow }, (_, i) => (
                  <div className="my-cell my-cell-x" key={`x${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const dnum = i + 1;
                  const key = iso(vy, vm, dnum);
                  const its = byDate[key] ?? [];
                  return (
                    <div
                      key={key}
                      className={`my-cell${its.length ? " has" : ""}${key === todayKey ? " today" : ""}`}
                      onClick={its.length ? () => setSelectedDate(key) : undefined}
                    >
                      <span className="my-dn">{dnum}</span>
                      {its.slice(0, 3).map((x) => (
                        <button
                          type="button"
                          key={x.id}
                          className="my-chip"
                          title={x.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(key);
                          }}
                        >
                          <span className="my-chip-k">{(KIND[x.kind] ?? x.kind).slice(0, 4)}</span>
                          {x.title}
                        </button>
                      ))}
                      {its.length > 3 && <span className="my-more">+{its.length - 3} more</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {undated.length > 0 && (
              <div className="my-tray">
                <div className="my-tray-h">
                  Not yet dated <span>— place them on your year</span>
                </div>
                <div className="my-tray-items">
                  {undated.map((x) => (
                    <div className="my-tcard" key={x.id}>
                      <div className="my-tcard-k">
                        {KIND[x.kind] ?? x.kind}
                        {x.city_label ? ` · ${x.city_label}` : ""}
                      </div>
                      <div className="my-tcard-t">{x.title}</div>
                      <div className="my-tcard-a">
                        {placingId === x.id ? (
                          <span className="my-dp">
                            <input type="date" className="my-dp-s" value={dpStart} onChange={(e) => setDpStart(e.target.value)} />
                            <input type="date" className="my-dp-e" title="end (optional)" value={dpEnd} onChange={(e) => setDpEnd(e.target.value)} />
                            <button type="button" className="my-dp-ok btn btn-gold btn-square" onClick={() => placeOnDate(x.id)}>
                              Add
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="my-place"
                            onClick={() => {
                              setPlacingId(x.id);
                              setDpStart("");
                              setDpEnd("");
                            }}
                          >
                            + Place on a date
                          </button>
                        )}
                        <button type="button" className="my-remove2" onClick={() => removeItem(x.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="my-foot">
              <a className="btn btn-ghost btn-square" href={handoff(advMsg)} target={WA ? "_blank" : undefined} rel={WA ? "noopener" : undefined}>
                Talk to your advisor about your year →
              </a>
            </div>
          </>
        )}
      </div>

      {selectedDate && (
        <DaySheet
          dateKey={selectedDate}
          items={byDate[selectedDate] ?? []}
          onClose={() => setSelectedDate(null)}
          onRemove={(id) => {
            removeItem(id);
            setSelectedDate(null);
          }}
        />
      )}
    </section>
  );
}
