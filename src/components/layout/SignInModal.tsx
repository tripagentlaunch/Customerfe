import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { useSignInModal } from "../../lib/signInModal";

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

function readProfile(): { name?: string; phone?: string; email?: string } {
  try {
    const raw = localStorage.getItem("ta_profile");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Mirrors legacy's otpStep() success handler: only fills in profile fields
// that are currently empty, never overwrites what's already there.
function mergeProfile(name: string, phone: string) {
  try {
    const p = readProfile();
    let changed = false;
    if (name && !p.name) {
      p.name = name;
      changed = true;
    }
    if (phone && !p.phone) {
      p.phone = phone;
      changed = true;
    }
    if (changed) localStorage.setItem("ta_profile", JSON.stringify(p));
  } catch {
    // ignore
  }
}

type Step = "email" | "otp";

function SignInModalCard({ message, close }: { message: string | null; close: () => void }) {
  const { requestLogin, verifyLogin } = useAuth();
  const profile = useRef(readProfile()).current;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(profile.email ?? "");
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [code, setCode] = useState("");
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
      setStep("otp");
    } else {
      setError(
        r.error === "not_invited"
          ? "This email isn't on the invitation list — please speak to your advisor."
          : "We couldn't send the code. Please try again."
      );
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
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
      mergeProfile(name.trim(), phone.trim());
      close();
    } else {
      setSubmitting(false);
      setError("That code didn't match. Try again.");
    }
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
              TripAgent is by invitation. Sign in with the email on your invitation — we'll send a one-time
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
              No invitation yet? <Link to="/invitation" onClick={close}>Request one</Link>.
            </div>
          </form>
        ) : (
          <form onSubmit={submitCode}>
            <h3 className="ta-si-h">Check your email.</h3>
            <p className="ta-si-sub">
              We've emailed {email} a secure sign-in link — click it to open your year. If your email
              includes a code instead, enter it below.
            </p>
            <div className="ta-si-f">
              <label htmlFor="ta-si-otp">One-time code</label>
              <input
                id="ta-si-otp"
                ref={otpRef}
                type="text"
                inputMode="numeric"
                className="ta-si-otp"
                placeholder="Code from your email"
                value={code}
                onChange={(e) => setCode(e.target.value)}
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
  const { isOpen, message, close } = useSignInModal();
  if (!isOpen) return null;
  return <SignInModalCard message={message} close={close} />;
}
