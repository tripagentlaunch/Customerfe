// A tab opened before a deploy asks for page files that no longer exist ("Failed to fetch dynamically imported module", an old CSS or
// script chunk). The fix is to load the new build, once. The guard is a time window, not a flag cleared on `load`: a flag that waits
// for the heavy page's `load` event could still be set when the next failure arrives (e.g. a sign-in that opens the home page within
// a second), which turned a recoverable stale tab into the "This page didn't open" screen.

const KEY = "ta_version_reload_at";
const WINDOW_MS = 60_000;

export function isChunkLoadError(err: unknown): boolean {
  const msg = String((err as { message?: unknown } | null)?.message ?? err ?? "");
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed/i.test(msg);
}

/** Reloads the page for the new build unless it already did within the last minute (so it can never loop). True if it is reloading. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false; // storage blocked: don't risk a reload loop
  }
  window.location.reload();
  return true;
}
