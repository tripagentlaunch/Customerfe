// Session id for the server-side tool-calling/booking-confirmation state
// (backend/app/services/session_store.py). Nothing in this codebase already
// issues an anonymous visitor id — TA_ACCOUNT's session only exists once
// signed in (see js/account.js) — so: use the signed-in memberId when there
// is one, else mint a per-tab id once via sessionStorage. Same "opaque
// token, not proof of identity" trust level as the trace_id every backend
// router already mints per call, just scoped to a whole tab instead of one
// request. Ported from js/assistant.js's own sessionId() so both the legacy
// vanilla widget (if still embedded anywhere) and this one agree on identity.

declare global {
  interface Window {
    TA_ACCOUNT?: {
      signedIn?: () => boolean;
      member?: () => { memberId?: string | null };
    };
    TA_CONFIG?: {
      assistantEndpoint?: string;
    };
  }
}

const STORAGE_KEY = "ta_chat_sid";

export function getSessionId(): string {
  try {
    if (window.TA_ACCOUNT?.signedIn?.()) {
      const memberId = window.TA_ACCOUNT.member?.().memberId;
      if (memberId) return memberId;
    }
  } catch {
    // fall through to the anonymous per-tab id
  }
  try {
    let sid = sessionStorage.getItem(STORAGE_KEY);
    if (!sid) {
      sid = `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return `anon-${Date.now().toString(36)}`;
  }
}
