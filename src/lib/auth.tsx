import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { SiteMemberRow } from "./database.types";

export type LoginResult = { ok: true } | { ok: false; error: "not_invited" | string };

type AuthContextValue = {
  session: Session | null;
  member: SiteMemberRow | null;
  loading: boolean; // true until the first getSession()+site_members lookup resolves
  signedIn: boolean;
  // Set when a session was established (typically via the magic-link click,
  // which supabase-js's detectSessionInUrl completes with no code in this
  // app ever seeing it) but no site_members row is linked — see hydrate()'s
  // doc comment. Consumed by whichever UI wants to surface it (Header opens
  // the sign-in modal with it), then cleared with clearAuthError().
  authError: "not_invited" | null;
  clearAuthError: () => void;
  requestLogin: (email: string) => Promise<LoginResult>;
  verifyLogin: (email: string, token: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Mirrors js/backend.js's remote-mode hydrate(): look up the site_members row
// linked to this auth user via auth_uid. Returns null if OTP succeeded but no
// site_members row is linked yet — this is the invite gate, enforced the same
// way js/account.js's verifyLogin does (a valid login with no linked
// membership is not a member).
async function loadMember(session: Session | null): Promise<SiteMemberRow | null> {
  if (!session) return null;
  const { data, error } = await supabase
    .from("site_members")
    .select("*")
    .eq("auth_uid", session.user.id)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[auth] site_members lookup failed:", error.message);
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<SiteMemberRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<"not_invited" | null>(null);

  useEffect(() => {
    let cancelled = false;

    // A session can arrive here two ways: verifyLogin() below (typed code —
    // already gates itself and signs back out on no-member), or a magic-link
    // click completing entirely inside supabase-js's own detectSessionInUrl
    // handling before any of this app's code runs — that path has no other
    // gate, so it's enforced here too. Without this, a non-member's session
    // would sit signed-in-at-Supabase but member:null forever: signedIn
    // reads false (so the UI looks unchanged/signed-out) while a live
    // session lingers in storage — sign it back out and surface why.
    async function hydrate(nextSession: Session | null) {
      const m = await loadMember(nextSession);
      if (cancelled) return;
      if (nextSession && !m) {
        await supabase.auth.signOut();
        if (cancelled) return;
        setSession(null);
        setMember(null);
        setLoading(false);
        setAuthError("not_invited");
        return;
      }
      setSession(nextSession);
      setMember(m);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      hydrate(nextSession);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      member,
      loading,
      signedIn: !!session && !!member,
      authError,
      clearAuthError: () => setAuthError(null),
      async requestLogin(email) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          const notInvited = /not_invited|not on the invitation/i.test(error.message);
          return { ok: false, error: notInvited ? "not_invited" : error.message };
        }
        return { ok: true };
      },
      async verifyLogin(email, token) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: "email",
        });
        if (error) return { ok: false, error: error.message };

        // Invite gate (see loadMember's doc comment above): a verified OTP
        // with no linked site_members row is not a member — sign back out,
        // same as js/account.js's verifyLogin.
        const m = await loadMember(data.session);
        if (!m) {
          await supabase.auth.signOut();
          setSession(null);
          setMember(null);
          return { ok: false, error: "not_invited" };
        }
        setSession(data.session);
        setMember(m);
        return { ok: true };
      },
      async logout() {
        await supabase.auth.signOut();
        setSession(null);
        setMember(null);
      },
    }),
    [session, member, loading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() must be used inside <AuthProvider>");
  return ctx;
}
