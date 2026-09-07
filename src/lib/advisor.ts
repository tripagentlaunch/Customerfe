import { useLocation } from "react-router-dom";
import { titleCase, type TripSummary } from "./tripState";

// Ported from js/site.js's EXPERT HANDOFF block (~line 1055-1095) — the
// context-carrying "Talk to your advisor" logic, core CONVERT KRA. Route
// prefixes mirror PageRouter.tsx's dispatch (city-, health-, browse-,
// destination-), since the React app preserves the legacy slug shape 1:1.
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;

function title(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pageHeading(): string {
  const h1 = document.querySelector(".city-hero h1, h1");
  const fromH1 = (h1?.textContent || "").trim();
  if (fromH1) return fromH1;
  return document.title.replace(/\s*[—-]\s*TripAgent.*/, "").trim();
}

function advisorContext(pathname: string, search: string): { msg: string; enq: string } {
  const p = pathname;
  let m: RegExpMatchArray | null;

  if (/\/health/.test(p)) {
    const isHub = /\/health$/.test(p);
    const ht = (document.querySelector(".med-hero h1")?.textContent || "").trim();
    return { msg: `Hello — I'd like to speak, in confidence, with a TripAgent health concierge${!isHub && ht ? " about " + ht : ""}.`, enq: "" };
  }
  if ((m = p.match(/city-([a-z0-9-]+)/))) {
    return { msg: `Hello — I'm planning a trip to ${pageHeading()} and would like your help.`, enq: `?dest=${m[1]}` };
  }
  if (/where-to-go/.test(p)) {
    return { msg: "Hello — I'd like help choosing where to go.", enq: "" };
  }
  if (/compare/.test(p)) {
    const c = new URLSearchParams(search).get("cities");
    return {
      msg: `Hello — I'm deciding between a few places${c ? ": " + c.split(",").map(title).join(", ") : ""} and would like your advice.`,
      enq: c ? `?shortlist=${c}` : "",
    };
  }
  if ((m = p.match(/browse-([a-z-]+)/))) {
    return { msg: `Hello — I'm looking at ${pageHeading() || "some"} trips and would like help planning.`, enq: "" };
  }
  if (/destination-/.test(p)) {
    return { msg: `Hello — I'm planning a trip to ${pageHeading()} and would like your help.`, enq: "" };
  }
  if (/whats-on|collections/.test(p)) {
    return { msg: "Hello — I'm researching where to go and would like your advice.", enq: "" };
  }
  return { msg: "Hello — I'd like to speak with a TripAgent advisor about planning a trip.", enq: "" };
}

export type AdvisorLink = { href: string; external: boolean };

export function useAdvisorHref(): AdvisorLink {
  const { pathname, search } = useLocation();
  const ctx = advisorContext(pathname, search);
  if (WHATSAPP_NUMBER) {
    return { href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(ctx.msg)}`, external: true };
  }
  return { href: `/enquire${ctx.enq}`, external: false };
}

// Ported from js/shell.js's tripHandoffHref() — the trip-cart "checkout":
// hand the built trip to a person, carrying full context.
export function useTripHandoffHref(summary: TripSummary | null): AdvisorLink {
  const fallback = useAdvisorHref();
  if (!summary) return fallback;
  if (WHATSAPP_NUMBER) {
    const legs = summary.legs.map((l) => `${titleCase(l.city)} — ${l.nights || 0} night${(l.nights || 0) === 1 ? "" : "s"}`).join(", ");
    const msg = `Hello — here is the trip I have been building${summary.name ? ` (${summary.name})` : ""}: ${legs}. Could my advisor take it from here?`;
    return { href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, external: true };
  }
  const cities = summary.legs.map((l) => l.city).join(",");
  return { href: `/enquire?shortlist=${encodeURIComponent(cities)}`, external: false };
}
