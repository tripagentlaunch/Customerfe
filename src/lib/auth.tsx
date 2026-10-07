import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SiteMemberRow } from "./database.types";

export type LoginResult = { ok: true } | { ok: false; error: "not_invited" | string };

// Supabase's free tier has no built-in "force re-login after N days" setting
// (that's a Pro-plan-only feature). This approximates it client-side: the
// first time a session is established, we stamp "when did this login
// start" into localStorage; every subsequent hydrate() checks that stamp
// and force-signs-out once it's older than SESSION_MAX_AGE_MS. Not a
// substitute for a real server-side control — a soft, client-side nudge.
const SESSION_STAMP_KEY = "ta_session_started_at";
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // ~3 months

function isSessionTooOld(): boolean {
  const raw = localStorage.getItem(SESSION_STAMP_KEY);
  if (!raw) return false;
  const startedAt = Number(raw);
  if (!Number.isFinite(startedAt)) return false;
  return Date.now() - startedAt > SESSION_MAX_AGE_MS;
}

function stampSessionStart(): void {
  if (!localStorage.getItem(SESSION_STAMP_KEY)) {
    localStorage.setItem(SESSION_STAMP_KEY, String(Date.now()));
  }
}

function clearSessionStamp(): void {
  localStorage.removeItem(SESSION_STAMP_KEY);
}

// Frontend-only mock sign-in for refining the signed-in UI without a
// backend. Dev server only (import.meta.env.DEV — compiled out of
// production builds): visit any page with ?mock-auth=1 to be "signed in" as
// a fake member (persisted in localStorage across reloads).
const MOCK_KEY = "ta_mock_auth";
const MOCK_MEMBER = {
  id: "mock-member",
  name: "Aarav Mehta",
  email: "aarav@example.com",
  phone: null,
  city: "Mumbai",
  travel_style: null,
  plan: "member",
  status: "active",
  source: "mock",
  invitation_code: null,
  trial_ends_at: null,
  member_until: null,
  amount_paise: null,
  razorpay_order_id: null,
  razorpay_payment_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  auth_uid: "mock-auth-uid",
} as SiteMemberRow;

function readMockAuth(): boolean {
  if (!import.meta.env.DEV) return false;
  const url = new URL(window.location.href);
  const flag = url.searchParams.get("mock-auth");
  if (flag !== null) {
    if (flag === "1") localStorage.setItem(MOCK_KEY, "1");
    else localStorage.removeItem(MOCK_KEY);
    url.searchParams.delete("mock-auth");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  return localStorage.getItem(MOCK_KEY) === "1";
}

type AuthContextValue = {
  member: SiteMemberRow | null;
  loading: boolean; // true until the first GET /auth/session resolves
  signedIn: boolean;
  // Set when OTP verification succeeded but no site_members row is linked
  // (see /auth/verify-otp's "not_invited" response). Consumed by whichever
  // UI wants to surface it (Header opens the sign-in modal with it), then
  // cleared with clearAuthError().
  authError: "not_invited" | null;
  clearAuthError: () => void;
  requestLogin: (email: string) => Promise<LoginResult>;
  verifyLogin: (email: string, token: string) => Promise<LoginResult>;
  // Re-checks GET /auth/session and updates `member` — needed anywhere a
  // session cookie gets set OUTSIDE verifyLogin() (e.g. ClaimPage.tsx's
  // invite-redeem flow, which signs the member in via /invite/{code}/redeem,
  // not /auth/verify-otp). AuthProvider only hydrates once on mount with no
  // listener (no more supabase-js onAuthStateChange), so nothing else would
  // ever notice that cookie without this being called explicitly.
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionCheckResponse = { signed_in: boolean; member: SiteMemberRow | null };
type VerifyOtpApiResponse = { ok: boolean; error?: string; member?: SiteMemberRow };
type RequestOtpApiResponse = { ok: boolean; error?: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<SiteMemberRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<"not_invited" | null>(null);
  const [mockSignedIn, setMockSignedIn] = useState(readMockAuth);

  // The session cookie (HttpOnly, set by /auth/verify-otp or
  // /invite/{code}/redeem) is invisible to this code — GET /auth/session is
  // the only way to ask "is there a valid session, and if so who is this
  // member," replacing supabase-js's getSession()+onAuthStateChange.
  const checkSession = useCallback(async () => {
    if (isSessionTooOld()) {
      await fetch("/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
      clearSessionStamp();
      setMember(null);
      return;
    }
    try {
      const res = await fetch("/auth/session", { credentials: "include" });
      const data = (await res.json()) as SessionCheckResponse;
      if (data.signed_in && data.member) {
        stampSessionStart();
        setMember(data.member);
      } else {
        clearSessionStamp();
        setMember(null);
      }
    } catch {
      setMember(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await checkSession();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [checkSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      member: mockSignedIn ? MOCK_MEMBER : member,
      loading,
      signedIn: mockSignedIn || !!member,
      authError,
      clearAuthError: () => setAuthError(null),
      refresh: checkSession,
      async requestLogin(email) {
        try {
          const res = await fetch("/auth/request-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: email.trim() }),
          });
          const data = (await res.json()) as RequestOtpApiResponse;
          if (!data.ok) return { ok: false, error: data.error ?? "request_failed" };
          return { ok: true };
        } catch {
          return { ok: false, error: "network" };
        }
      },
      async verifyLogin(email, token) {
        try {
          const res = await fetch("/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: email.trim(), token: token.trim() }),
          });
          const data = (await res.json()) as VerifyOtpApiResponse;
          if (!data.ok || !data.member) return { ok: false, error: data.error ?? "verify_failed" };
          stampSessionStart();
          setMember(data.member);
          return { ok: true };
        } catch {
          return { ok: false, error: "network" };
        }
      },
      async logout() {
        if (mockSignedIn) {
          localStorage.removeItem(MOCK_KEY);
          setMockSignedIn(false);
        }
        await fetch("/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
        clearSessionStamp();
        setMember(null);
      },
    }),
    [member, loading, authError, mockSignedIn, checkSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}