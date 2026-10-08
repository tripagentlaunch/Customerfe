import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
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

type EngineGuideRow = {
  guide: {
    verified?: string | null;
    heading?: string | null;
    lede?: string | null;
    panels?: { key?: string; tiers?: { label?: string | null; items?: Partial<CityGuideItem>[] }[] }[];
  } | null;
};

export type EngineGuideState = { status: "loading" | "ready" | "fallback"; guide: CityData["guide"] | null };

const PANEL_KEYS = new Set(["stay", "do", "eat", "party"]);
// Don't hold the page loader hostage to a slow read — after this the
// static guide shows.
const TIMEOUT_MS = 4000;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toItem(raw: Partial<CityGuideItem>): CityGuideItem | null {
  if (!raw || !raw.name) return null;
  return {
    name: raw.name,
    area: raw.area ?? null,
    credentials: Array.isArray(raw.credentials) ? raw.credentials.filter(Boolean) : [],
    description: raw.description ?? null,
    photo: raw.photo ?? null,
  };
}

// Engine guide -> this page's guide. Empty tiers/panels are dropped.
// heading is plain text from the engine, so it's escaped before going into
// headingHtml (rendered with dangerouslySetInnerHTML).
function toGuide(row: EngineGuideRow, base: CityData["guide"]): CityData["guide"] | null {
  const g = row.guide;
  if (!g || !Array.isArray(g.panels)) return null;
  const panels: CityGuidePanel[] = [];
  for (const p of g.panels) {
    if (!p.key || !PANEL_KEYS.has(p.key)) continue;
    const tiers = (p.tiers ?? [])
      .map((t) => ({
        label: t.label ?? null,
        items: (t.items ?? []).map(toItem).filter((i): i is CityGuideItem => i !== null),
      }))
      .filter((t) => t.items.length > 0);
    if (tiers.length) panels.push({ key: p.key as CityGuidePanel["key"], tiers });
  }
  if (!panels.length) return null;
  return {
    verified: g.verified ?? base.verified,
    headingHtml: g.heading ? escapeHtml(g.heading) : base.headingHtml,
    lede: g.lede ?? base.lede,
    note: base.note,
    panels,
  };
}

export function useEngineGuide(slug: string | undefined, base: CityData["guide"] | undefined): EngineGuideState {
  const [state, setState] = useState<EngineGuideState>({ status: "loading", guide: null });

  useEffect(() => {
    if (!slug || !base) {
      setState({ status: "fallback", guide: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", guide: null });
    const timer = setTimeout(() => {
      if (!cancelled) setState({ status: "fallback", guide: null });
    }, TIMEOUT_MS);

    // sourcing_city_guide isn't in the generated Database types (the table
    // is created by the engine's own migration), so read it untyped.
    (supabase as unknown as SupabaseClient)
      .from("sourcing_city_guide")
      .select("guide")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        clearTimeout(timer);
        const guide = !error && data ? toGuide(data as EngineGuideRow, base) : null;
        setState(guide ? { status: "ready", guide } : { status: "fallback", guide: null });
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, base]);

  return state;
}
