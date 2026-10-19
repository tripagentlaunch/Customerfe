import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "./auth";
import { useSignInModal } from "./signInModal";

// The shortlist ("wishlist") hearts on the city guide cards. Saved to the member's own
// account through the backend's /my-year/items API (cookie session + CSRF header) — the
// same saved items the portal's "My year" shows (undated ones sit in its "Not yet dated"
// tray, ready to be placed on a date). Nothing is stored in the browser.
const CSRF = { "X-Requested-With": "XMLHttpRequest" } as const;

export type WishlistEntry = {
  ref: string; // stable id of the place: "<city>:<panel>:<name>"
  kind: "hotel" | "experience" | "event";
  title: string;
  city: string;
  cityLabel: string;
  meta?: Record<string, unknown>;
};

// ref -> saved item id on the server ("pending" while a save is in flight)
let saved: Record<string, string> | null = null;
let loading = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => saved;

async function loadSaved() {
  if (loading) return;
  loading = true;
  try {
    const res = await fetch("/my-year/items", { credentials: "include" });
    if (!res.ok) throw new Error(String(res.status));
    const rows = (await res.json()) as { id: string; ref: string }[];
    saved = Object.fromEntries(rows.map((r) => [r.ref, r.id]));
  } catch {
    saved = {}; // can't reach the account right now — hearts start empty, saving still tries
  } finally {
    loading = false;
    emit();
  }
}

function reset() {
  saved = null;
  emit();
}

export function useWishlist() {
  const { signedIn } = useAuth();
  const signIn = useSignInModal();
  const state = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    if (signedIn && saved === null) void loadSaved();
    if (!signedIn && saved !== null) reset();
  }, [signedIn]);

  const isSaved = useCallback((ref: string) => !!state && !!state[ref], [state]);

  const toggle = useCallback(
    async (entry: WishlistEntry) => {
      if (!signedIn) {
        signIn.open("Sign in to save it to your year.");
        return;
      }
      const current = saved ?? {};
      const existing = current[entry.ref];
      if (existing && existing !== "pending") {
        const before = { ...current };
        saved = { ...current };
        delete saved[entry.ref];
        emit();
        try {
          const res = await fetch(`/my-year/items/${existing}`, { method: "DELETE", credentials: "include", headers: CSRF });
          if (!res.ok && res.status !== 404) throw new Error(String(res.status));
        } catch {
          saved = before; // couldn't remove it — put the heart back
          emit();
        }
        return;
      }
      if (existing === "pending") return;
      saved = { ...current, [entry.ref]: "pending" };
      emit();
      try {
        const res = await fetch("/my-year/items", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...CSRF },
          body: JSON.stringify({
            kind: entry.kind,
            ref: entry.ref,
            title: entry.title,
            city: entry.city,
            city_label: entry.cityLabel,
            status: "shortlisted",
            meta: entry.meta ?? {},
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const row = (await res.json()) as { id: string };
        saved = { ...(saved ?? {}), [entry.ref]: row.id };
      } catch {
        const next = { ...(saved ?? {}) };
        delete next[entry.ref]; // not saved — heart goes back to empty
        saved = next;
      }
      emit();
    },
    [signedIn, signIn]
  );

  return { isSaved, toggle };
}
