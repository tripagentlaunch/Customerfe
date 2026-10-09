import { useEffect, useState } from "react";
import type { CityData, CityGuideItem, CityGuidePanel } from "../types/city";

// City guide content from the sourcing engine (2026-10-09). The engine
// (tripagent-sourcing-engine, engine/supabase_sync.py) writes one row per
// city into `sourcing_city_guide`, with `guide` already in this page's
// shape (panels -> tiers -> items). The content comes from there; the
// layout stays CityPage's own.
//
// Falls back to the bundled cities.generated.json guide whenever the
// engine has nothing usable for the city: the table isn't in this
// Supabase project yet, the read fails or times out, or the city has no
// places. A page is never left with an empty guide.
//
// Reads over plain REST rather than through lib/supabaseClient.ts: that
// module throws at import when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// are unset, and importing it here took the whole site down (white screen)
// on a deploy without them. Unset now just means the bundled guide.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

type EngineGuideRow = {
  guide: {
    verified?: string | null;
    // { text: "Agra, in hand.", accent: "in hand" } from engine/city_guide.py;
    // a plain string is accepted too.
    heading?: { text?: unknown; accent?: unknown } | string | null;
    lede?: string | null;
    panels?: { key?: string; tiers?: { label?: string | null; items?: Partial<CityGuideItem>[] }[] }[];
  } | null;
};

export type EngineGuideState = { status: "loading" | "ready" | "fallback"; guide: CityData["guide"] | null };

const PANEL_KEYS = new Set(["stay", "do", "eat", "party"]);
// Don't hold the page loader hostage to a slow read — after this the
// static guide shows.
const TIMEOUT_MS = 3000;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Engine rows are external data rendered straight into the page — every
// field is type-checked so a shape change degrades to null (or the bundled
// value) instead of crashing CityPage.
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function toItem(raw: Partial<CityGuideItem>): CityGuideItem | null {
  const name = raw ? str(raw.name) : null;
  if (!name) return null;
  return {
    name,
    area: str(raw.area),
    credentials: Array.isArray(raw.credentials) ? raw.credentials.filter((c): c is string => !!str(c)) : [],
    description: str(raw.description),
    photo: str(raw.photo),
  };
}

// Same markup as the bundled headingHtml: `Agra, <span class="it">in hand</span>.`
function headingHtml(h: NonNullable<EngineGuideRow["guide"]>["heading"]): string | null {
  const text = typeof h === "string" ? str(h) : h ? str(h.text) : null;
  if (!text) return null;
  const html = escapeHtml(text);
  const accent = h && typeof h === "object" ? str(h.accent) : null;
  if (!accent) return html;
  const acc = escapeHtml(accent);
  const i = html.indexOf(acc);
  return i === -1 ? html : `${html.slice(0, i)}<span class="it">${acc}</span>${html.slice(i + acc.length)}`;
}

// Engine guide -> this page's guide. Empty tiers/panels are dropped.
// heading is plain text from the engine, so it's escaped before going into
// headingHtml (rendered with dangerouslySetInnerHTML).
function toGuide(row: EngineGuideRow, base: CityData["guide"]): CityData["guide"] | null {
  const g = row.guide;
  if (!g || typeof g !== "object" || !Array.isArray(g.panels)) return null;
  const panels: CityGuidePanel[] = [];
  for (const p of g.panels) {
    if (!p.key || !PANEL_KEYS.has(p.key)) continue;
    const tiers = (Array.isArray(p.tiers) ? p.tiers : [])
      .map((t) => ({
        label: str(t.label),
        items: (Array.isArray(t.items) ? t.items : []).map(toItem).filter((i): i is CityGuideItem => i !== null),
      }))
      .filter((t) => t.items.length > 0);
    if (tiers.length) panels.push({ key: p.key as CityGuidePanel["key"], tiers });
  }
  if (!panels.length) return null;
  return {
    verified: str(g.verified) ?? base.verified,
    headingHtml: headingHtml(g.heading) ?? base.headingHtml,
    lede: str(g.lede) ?? base.lede,
    note: base.note,
    panels,
  };
}

export function useEngineGuide(slug: string | undefined, base: CityData["guide"] | undefined): EngineGuideState {
  const [state, setState] = useState<EngineGuideState>({ status: "loading", guide: null });

  useEffect(() => {
    if (!slug || !base || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setState({ status: "fallback", guide: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", guide: null });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = `${SUPABASE_URL}/rest/v1/sourcing_city_guide?select=guide&slug=eq.${encodeURIComponent(slug)}&limit=1`;
    fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((rows: EngineGuideRow[] | null) => {
        if (cancelled) return;
        let guide: CityData["guide"] | null = null;
        try {
          guide = Array.isArray(rows) && rows[0] ? toGuide(rows[0], base) : null;
        } catch {
          guide = null; // malformed engine data: show the bundled guide
        }
        setState(guide ? { status: "ready", guide } : { status: "fallback", guide: null });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, base]);

  return state;
}
