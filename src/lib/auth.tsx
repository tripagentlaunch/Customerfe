import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SiteMemberRow } from "./database.types";

export type LoginResult = { ok: true } | { ok: false; error: "not_invited" | string };

const SESSION_STAMP_KEY = "ta_session_started_at";
// A login lasts 3 months (90 days) from when it began — matches Customerbe's
// ta_login_at limit; after that the member signs in again with their email.
const SESSION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

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

// Last member the server confirmed in this browser (2026-10-13, direct
// request). The header used to show "Sign in" until /auth/session answered
// — a few seconds when the backend is waking — and a failed check left a
// signed-in member looking signed out. The hint shows them as signed in
// straight away; the server's answer still decides.
const MEMBER_HINT_KEY = "ta_member_hint";

function readMemberHint(): SiteMemberRow | null {
  try {
    const raw = localStorage.getItem(MEMBER_HINT_KEY);
    return raw && !isSessionTooOld() ? (JSON.parse(raw) as SiteMemberRow) : null;
  } catch {
    return null;
  }
}

function writeMemberHint(m: SiteMemberRow | null): void {
  try {
    if (m) localStorage.setItem(MEMBER_HINT_KEY, JSON.stringify(m));
    else localStorage.removeItem(MEMBER_HINT_KEY);
  } catch {
    // storage unavailable
  }
}

// A session check that fails (backend waking, 502 from the proxy, network)
// is not an answer — retried after these waits before giving up.
const SESSION_RETRY_MS = [1500, 4000, 8000, 15000];

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

// Sent on every state-changing request to this backend — see
// app/dependencies/csrf.py for why this specific header defeats
// cross-site forged requests.
const CSRF_HEADERS = { "X-Requested-With": "XMLHttpRequest" } as const;

type AuthContextValue = {
  member: SiteMemberRow | null;
  loading: boolean;
  signedIn: boolean;
  authError: "not_invited" | null;
  clearAuthError: () => void;
  requestLogin: (email: string) => Promise<LoginResult>;
  verifyLogin: (email: string, token: string) => Promise<LoginResult>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type SessionCheckResponse = { signed_in: boolean; member: SiteMemberRow | null };
type VerifyOtpApiResponse = { ok: boolean; error?: string; member?: SiteMemberRow };
type RequestOtpApiResponse = { ok: boolean; error?: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMemberState] = useState<SiteMemberRow | null>(readMemberHint);
  const setMember = useCallback((m: SiteMemberRow | null) => {
    writeMemberHint(m);
    setMemberState(m);
  }, []);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<"not_invited" | null>(null);
  const [mockSignedIn, setMockSignedIn] = useState(readMockAuth);

  // Resolves true once the server has answered (signed in or not), false
  // when the check itself failed — the current state is then left alone.
  const checkSession = useCallback(async (): Promise<boolean> => {
    if (isSessionTooOld()) {
      await fetch("/auth/logout", { method: "POST", credentials: "include", headers: CSRF_HEADERS }).catch(() => {});
      clearSessionStamp();
      setMember(null);
      return true;
    }
    try {
      const res = await fetch("/auth/session", { credentials: "include" });
      if (!res.ok) return false;
      const data = (await res.json()) as SessionCheckResponse;
      if (data.signed_in && data.member) {
        stampSessionStart();
        setMember(data.member);
      } else {
        clearSessionStamp();
        setMember(null);
      }
      return true;
    } catch {
      return false;
    }
  }, [setMember]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const attempt = async (n: number) => {
      const answered = await checkSession();
      if (cancelled) return;
      if (answered || n >= SESSION_RETRY_MS.length) {
        setLoading(false);
        return;
      }
      timer = window.setTimeout(() => attempt(n + 1), SESSION_RETRY_MS[n]);
    };
    attempt(0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [checkSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      member: mockSignedIn ? MOCK_MEMBER : member,
      loading,
      signedIn: mockSignedIn || !!member,
      authError,
      clearAuthError: () => setAuthError(null),
      refresh: async () => {
        await checkSession();
      },
      async requestLogin(email) {
        try {
          const res = await fetch("/auth/request-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
            credentials: "include",
            body: JSON.stringify({ email: email.trim() }),
          });
          // Short codes, not sentences: the sign-in modal words each one.
          if (res.status === 429) return { ok: false, error: "rate_limited" };
          if (res.status >= 500) return { ok: false, error: "unavailable" };
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
            headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
            credentials: "include",
            body: JSON.stringify({ email: email.trim(), token: token.trim() }),
          });
          if (res.status === 429) return { ok: false, error: "Too many attempts: please wait a few minutes and try again." };
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
        await fetch("/auth/logout", { method: "POST", credentials: "include", headers: CSRF_HEADERS }).catch(() => {});
        clearSessionStamp();
        setMember(null);
      },
    }),
    [member, loading, authError, mockSignedIn, checkSession, setMember]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}