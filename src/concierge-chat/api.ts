import type { AssistantContext, ConciergeChatRequestBody, ConciergeChatResponse } from "./types";
import { getSessionId } from "./session";

// Production default: a same-origin relative path. This only works if
// whatever serves the built static site also proxies /ai/* through to the
// FastAPI backend — if production is actually two separate origins, set
// window.TA_CONFIG.assistantEndpoint explicitly (js/site.js) rather than
// relying on this.
const PROD_DEFAULT_ENDPOINT = "/ai/concierge/chat";
// Local dev default: an ABSOLUTE url. A relative path resolves against
// whatever origin is serving *this page* — when that's a plain static file
// server (python3 -m http.server, live-server, etc.) on some port, and the
// backend is uvicorn on 8000, a relative path silently posts to the static
// server itself, which 501s on POST. This bit us in practice: confirmed via
// the actual Network tab, not just reasoning about it. Note this check runs
// at runtime against window.location, not import.meta.env.DEV — DEV is
// false in the built dist/concierge-chat.js bundle this page actually
// loads, since it's a production build being tested locally, not `vite dev`.
const LOCAL_DEV_ENDPOINT = "http://localhost:8000/ai/concierge/chat";
// Keep this aligned with js/assistant.js's own VER if that ever changes —
// it's just a cache-busting/telemetry tag on the corpus version, not load-bearing.
const CORPUS_VERSION = "e256";

function isLocalDevHost(): boolean {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "";
}

function resolveEndpoint(): string {
  if (window.TA_CONFIG?.assistantEndpoint) return window.TA_CONFIG.assistantEndpoint;
  if (import.meta.env.VITE_ASSISTANT_ENDPOINT) return import.meta.env.VITE_ASSISTANT_ENDPOINT;
  return isLocalDevHost() ? LOCAL_DEV_ENDPOINT : PROD_DEFAULT_ENDPOINT;
}

export async function askConcierge(query: string, context: AssistantContext): Promise<ConciergeChatResponse> {
  const body: ConciergeChatRequestBody = {
    query,
    context,
    corpus_version: CORPUS_VERSION,
    session_id: getSessionId(),
  };
  const response = await fetch(resolveEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`assistant endpoint responded ${response.status}`);
  }
  return (await response.json()) as ConciergeChatResponse;
}

export function citySlugFromPage(): string | null {
  // React app routes are extensionless (/city-mumbai), unlike the static
  // site's city-mumbai.html — accept both so this still works if the
  // dist bundle is ever loaded standalone on the legacy static pages too.
  const match = /city-([a-z0-9-]+)(?:\.html)?/.exec(window.location.pathname || "");
  return match ? match[1] : null;
}
