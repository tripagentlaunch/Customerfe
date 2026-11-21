// "Hand to Tara AI" in the trip drawer (2026-11-18, direct request): the trip the visitor built goes to
// Tara whole, and the chat opens on it. Tara asks only what the trip leaves open (how many travel,
// from where, when) and then builds the day-by-day itinerary around their picks.
//
// The trip (cities and days, every place added with its day and part of the day, the indicative
// range the drawer shows) is posted to Tara's backend, which returns a one-time token valid for
// 48 hours. Tara opens with the token in the #fragment (never sent to a server or logged), next to
// the member's code for the shared sign-in. A visitor who isn't signed in signs in on Tara's side
// and the trip is waiting. If Tara can't be reached, the old hand-off (WhatsApp / enquiry) is used.
import { getTrip, titleCase } from "./tripState";
import { signInTicket, taraChatUrl } from "./taraChat";
import type { TripRange } from "./tripRange";
import { ORIGINS, readOrigin } from "./origin";

// Tara's API. Dev and previews use the dev backend; production needs VITE_TARA_API_URL set (until it
// is, production keeps the WhatsApp hand-off).
const DEV_TARA_API = "https://chatbot-be-27yy.onrender.com";
const PROD_HOSTS = ["tripagent.vip", "www.tripagent.vip", "customerfe-mocha.vercel.app"];

export function taraApiUrl(): string | null {
  const override = (import.meta.env.VITE_TARA_API_URL ?? "").trim();
  if (override) return override.replace(/\/$/, "");
  return PROD_HOSTS.includes(window.location.hostname) ? null : DEV_TARA_API;
}

export function tripHandoffPayload(range: TripRange | null) {
  const t = getTrip();
  if (!t || !t.legs?.length) return null;
  return {
    name: t.name || null,
    legs: t.legs.slice(0, 12).map((l) => ({
      city: l.city,
      label: l.label || titleCase(l.city),
      days: Math.max(1, Math.min(60, l.nights || 3)),
      hotel: l.hotel || null,
      items: (l.items ?? []).slice(0, 60).map((i) => ({
        ref: i.ref.slice(0, 200),
        kind: i.kind,
        title: i.title.slice(0, 160),
        section: i.section ?? null,
        area: i.area ? i.area.slice(0, 120) : null,
        day: i.day,
        slot: i.slot,
      })),
    })),
    // The drawer shows lakh per person; Tara takes rupees.
    indicative: range?.have && range.hi > 0 ? { lo: Math.round(range.lo * 100000), hi: Math.round(range.hi * 100000), per: "person" } : null,
    page: window.location.pathname.slice(0, 300),
    // Where they travel from, as the city pages already show it ("From Bengaluru"): Tara confirms it
    // on the card instead of asking (2026-11-19).
    origin: ORIGINS[readOrigin()] ?? null,
    // The trip's dates when it was planned from the calendar (2026-11-20): Tara doesn't ask "when".
    dates: t.dates ?? null,
    source: "trip-drawer",
  };
}

/** Opens Tara on the trip. `fallback` is today's hand-off link, used when Tara can't be reached. */
export async function handTripToTara(range: TripRange | null, memberCode: string | null | undefined, fallback: string): Promise<void> {
  const api = taraApiUrl();
  const body = tripHandoffPayload(range);
  // Open the tab inside the click, so no pop-up blocker stops it, then point it at Tara once the
  // trip is stored.
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null; // Tara's page gets no handle back to this one
  const go = (url: string): void => {
    if (tab) tab.location.href = url;
    else window.location.assign(url);
  };
  if (!api || !body) return go(fallback);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000); // the dev backend can be waking up
    const res = await fetch(`${api}/api/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`handoff ${res.status}`);
    const { token } = (await res.json()) as { token: string };
    const ticket = await signInTicket(memberCode);  // one-time sign-in; never the access code itself
    const hash = new URLSearchParams({ handoff: token, ...(ticket ? { ticket } : {}), from: window.location.href });
    go(`${taraChatUrl()}#${hash.toString()}`);
  } catch {
    go(fallback);
  }
}
