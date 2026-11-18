import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useSignInModal } from "../../lib/signInModal";
import { mergeProfile, readProfile } from "../../lib/profileStore";
import { useIsMobile } from "../../hooks/useIsMobile";
import claim from "../../pages/claim-page.module.css";
import sheet from "./signin-sheet.module.css";

// Ported from js/account.js's openSignIn() — same two-step email-OTP flow
// (request code → enter code), same copy, same validation rules, wired to
// the real requestLogin()/verifyLogin() in lib/auth.tsx instead of the
// legacy's TA_ACCOUNT. css/site.css's .ta-si* rules (written for the legacy
// modal) apply with zero new CSS.
//
// The legacy version also had a "local" no-OTP branch for when
// TA_CONFIG.backend !== 'remote'. The React app's auth.tsx has no such
// branch — requestLogin() always goes through Supabase OTP — so this always
// renders the "remote" copy/flow.
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// Why a sign-in code could not be sent, in words the visitor can act on. The
// codes come from requestLogin() (lib/auth.tsx) and Customerbe's /auth/request-otp.
function sendCodeError(error: string): string {
  switch (error) {
    case "not_invited":
      return "This email isn't on the invitation list: please speak to your advisor.";
    case "rate_limited":
      return "Too many codes have been requested just now. Please wait a few minutes and try again.";
    case "unavailable":
    case "network":
      return "We couldn't reach the sign-in service. Check your connection and try again in a moment.";
    default:
      return "We couldn't send the code. Please try again.";
  }
}

type Step = "email" | "otp";

// The "Sign in" button in the code email opens the site at #signin&email=...&code=... : the code is already filled in, so nothing has to
// be copied. It sits in the #fragment, which no server ever receives; it is read once here and removed from the address bar at once.
type LinkedCode = { email: string; code: string };

function readLinkedCode(): LinkedCode | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith("signin")) return null;
  const p = new URLSearchParams(hash);
  const email = (p.get("email") ?? "").trim();
  const code = (p.get("code") ?? "").trim();
  return EMAIL_RE.test(email) && /^\d{8}$/.test(code) ? { email, code } : null;
}

function clearHash() {
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    // ignore
  }
}

function SignInModalCard({ message, close, linked, prefillEmail }: { message: string | null; close: () => void; linked: LinkedCode | null; prefillEmail?: string }) {
  const { requestLogin, verifyLogin } = useAuth();
  const profile = useRef(readProfile()).current;
  const isMobile = useIsMobile();

  const [step, setStep] = useState<Step>(linked ? "otp" : "email");
  const [email, setEmail] = useState(linked?.email ?? prefillEmail ?? profile.email ?? "");
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [code, setCode] = useState(linked?.code ?? "");
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setEmailInvalid(true);
      emailRef.current?.focus();
      return;
    }
    setEmailInvalid(false);
    setError(null);
    setSubmitting(true);
    const r = await requestLogin(trimmed);
    setSubmitting(false);
    if (r.ok) {
      mergeProfile({ email: trimmed }); // remembered now, so the box has it next time even if this sign-in is not finished
      setStep("otp");
    } else {
      setError(sendCodeError(r.error));
    }
  }

  async function submitCode(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = code.trim();
    // This project's Supabase Auth is configured to send 8-digit numeric
    // email OTPs (Authentication → Providers → Email → OTP length) — if
    // that dashboard setting ever changes, this needs to change with it.
    if (!/^\d{8}$/.test(trimmed)) {
      otpRef.current?.focus();
      return;
    }
    setError(null);
    setSubmitting(true);
    const r = await verifyLogin(email.trim(), trimmed);
    if (r.ok) {
      mergeProfile({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      close();
    } else {
      setSubmitting(false);
      setError(
        r.error === "membership_expired"
          ? "Your 3-month membership has ended. Please speak to your advisor to renew it."
          : "That code didn't match. Try again."
      );
    }
  }

  // Eight digits typed, pasted or filled in from the email's link: sign in without another tap. Each distinct code is tried once by itself
  // (a wrong one is not re-sent in a loop; the Sign in button still works).
  const autoTried = useRef("");
  useEffect(() => {
    const c = code.trim();
    if (step !== "otp" || submitting || !/^\d{8}$/.test(c) || autoTried.current === c) return;
    autoTried.current = c;
    void submitCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  // Phone: the claim page's card — just the email, then the 8-digit code (no
  // optional Mobile/Name fields).
  if (isMobile) {
    return (
      <div
        className={sheet.overlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className={sheet.cardWrap} role="dialog" aria-modal="true" aria-label="Sign in">
          <div className={claim.card}>
            <button type="button" className={sheet.close} aria-label="Close" onClick={close}>
              ×
            </button>
            {step === "email" ? (
              <>
                <div className={claim.eyebrow}>Your year</div>
                <h1 className={claim.heading}>
                  Welcome <span className={claim.it}>back.</span>
                </h1>
                <p className={claim.sub}>{message ?? "Sign in with the email on your invitation: we'll send you a one-time code."}</p>
                <form className={claim.form} onSubmit={submitEmail} noValidate>
                  <label htmlFor="ta-si-email-m" className={claim.label}>
                    Email
                  </label>
                  <input
                    id="ta-si-email-m"
                    ref={emailRef}
                    type="email"
                    className={`ra-input ${sheet.emailInput}`}
                    placeholder="you@example.com"
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    aria-invalid={emailInvalid || !!error}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailInvalid) setEmailInvalid(false);
                    }}
                  />
                  <div className={`${claim.ann} ${error || emailInvalid ? claim.annErr : ""}`} aria-live="polite">
                    {emailInvalid ? "Please enter a valid email address." : error}
                  </div>
                  <button type="submit" className={claim.submitBtn} disabled={submitting}>
                    {submitting ? "Sending…" : "Send my code"}
                    {!submitting && (
                      <span className={claim.arrow} aria-hidden="true">
                        →
                      </span>
                    )}
                  </button>
                </form>
                <p className={claim.footLine}>
                  No invitation yet?{" "}
                  <Link to="/request-access" className={claim.footLink} onClick={close}>
                    Ask for an invitation
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className={claim.eyebrow}>Check your email</div>
                <h1 className={claim.heading}>
                  Enter your <span className={claim.it}>code.</span>
                </h1>
                <p className={claim.sub}>Enter the 8-digit code we sent to {email}.</p>
                <form className={claim.form} onSubmit={submitCode} noValidate>
                  <label htmlFor="ta-si-otp-m" className={claim.label}>
                    One-time code
                  </label>
                  <input
                    id="ta-si-otp-m"
                    ref={otpRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className={`ra-input ${claim.codeInput}`}
                    placeholder="12345678"
                    spellCheck={false}
                    value={code}
                    aria-invalid={!!error}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                  <div className={`${claim.ann} ${error ? claim.annErr : ""}`} aria-live="polite">
                    {error}
                  </div>
                  <button type="submit" className={claim.submitBtn} disabled={submitting}>
                    {submitting ? "Signing in…" : "Sign in"}
                    {!submitting && (
                      <span className={claim.arrow} aria-hidden="true">
                        →
                      </span>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ta-si"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="ta-si-card" role="dialog" aria-modal="true" aria-label="Sign in" ref={cardRef}>
        <button type="button" className="ta-si-x" aria-label="Close" onClick={close}>
          ×
        </button>
        <div className="ta-me-eyebrow">Your year</div>

        {step === "email" ? (
          <form onSubmit={submitEmail}>
            <h3 className="ta-si-h">{message ?? "Sign in to save it to your year."}</h3>
            <p className="ta-si-sub">
              TripAgent is by invitation. Sign in with the email on your invitation: we'll send a one-time
              code, and keep your year, your dates and your plans in one place.
            </p>
            <div className="ta-si-f">
              <label htmlFor="ta-si-email">Email</label>
              <input
                id="ta-si-email"
                ref={emailRef}
                type="email"
                className="ta-si-email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                style={emailInvalid ? { borderColor: "var(--signature)" } : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailInvalid) setEmailInvalid(false);
                }}
              />
            </div>
            <div className="ta-si-f">
              <label htmlFor="ta-si-phone">
                Mobile <span>(optional)</span>
              </label>
              <input
                id="ta-si-phone"
                type="tel"
                className="ta-si-phone"
                placeholder="+91 98xxxxxxxx"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="ta-si-f">
              <label htmlFor="ta-si-name">
                Name <span>(optional)</span>
              </label>
              <input
                id="ta-si-name"
                type="text"
                className="ta-si-name"
                placeholder="How we should address you"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {error && <div className="ta-si-err">{error}</div>}
            <button type="submit" className="btn btn-gold btn-square ta-si-go" disabled={submitting}>
              {submitting ? "Sending…" : "Send my code →"}
            </button>
            <div className="ta-si-alt">
              No invitation yet? <Link to="/request-access" onClick={close}>Request one</Link>.
            </div>
          </form>
        ) : (
          <form onSubmit={submitCode}>
            <h3 className="ta-si-h">Check your email.</h3>
            <p className="ta-si-sub">
              We've emailed {email} an 8-digit sign-in code. Enter it below to open your year. If you
              don't see it in a minute, check your spam folder.
            </p>
            <div className="ta-si-f">
              <label htmlFor="ta-si-otp">One-time code</label>
              <input
                id="ta-si-otp"
                ref={otpRef}
                type="text"
                inputMode="numeric"
                className="ta-si-otp"
                placeholder="8-digit code"
                autoComplete="one-time-code"
                spellCheck={false}
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
            </div>
            {error && <div className="ta-si-err">{error}</div>}
            <button type="submit" className="btn btn-gold btn-square ta-si-go" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function SignInModal() {
  const { isOpen, message, prefill, open, close } = useSignInModal();
  // Read once, before anything renders from it, and take the code out of the address bar straight away.
  const linked = useRef<LinkedCode | null | undefined>(undefined);
  if (linked.current === undefined) {
    linked.current = readLinkedCode();
    if (linked.current) clearHash();
  }
  useEffect(() => {
    if (linked.current) open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!isOpen) return null;
  // The link's code is for the first opening only: once the modal is closed (signed in, or dismissed) a later opening starts clean.
  const closeAndForget = () => {
    linked.current = null;
    close();
  };
  return <SignInModalCard message={message} close={closeAndForget} linked={linked.current} prefillEmail={prefill?.email} />;
}
