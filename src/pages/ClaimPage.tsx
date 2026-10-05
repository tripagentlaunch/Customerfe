import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./claim-page.module.css";

// Ported from claim.html — the 8-digit-code redemption page (distinct from
// invitation.html's 16-character, 4-step ceremony: InvitationPage.tsx).
// Deliberately simple in the source too: enter the code, claim it, go home.
// No capture/card/welcome-ceremony steps — those only exist on the
// invitation.html flow.

// Same-origin in prod, VITE_API_BASE_URL for local dev — mirrors
// InvitationPage.tsx / EnquirePage.tsx's API_BASE convention (itself
// matching concierge-chat/src/api.ts's PROD_DEFAULT_ENDPOINT pattern).
// The source (js/api.js's TA_INVITE.redeem) additionally special-cased a
// hardcoded http://localhost:8000 for local dev via its own
// _taInviteIsLocalDevHost() check; VITE_API_BASE_URL is this project's
// existing equivalent seam for exactly that same local-dev override, so it
// is reused rather than re-implemented.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type RedeemResponse = {
  valid?: boolean;
  used?: boolean;
  error?: string;
  months?: number;
  memberId?: string | null;
  advisorName?: string | null;
};

// Cinematic full-screen background video, muted/looping/autoplaying behind
// the invitation card. Drop the real clip in at this exact path to replace
// the placeholder — no other code changes needed. See VIDEO_FALLBACK_SRC
// below for the still-image shown until (or instead of) that file exists.
const VIDEO_SRC = "/videos/tripagent-claim-loop.mp4";
// Reuses the same golden-hour Santorini photo already used elsewhere on the
// site (RequestAccessPage's collage) — a real, already-present asset, not a
// placeholder — shown whenever the video can't load, and permanently for
// visitors with prefers-reduced-motion. Replace this file directly to swap
// the still.
const VIDEO_FALLBACK_SRC = "/images/tripagent-claim-fallback.jpg";

export default function ClaimPage() {
  useEffect(() => {
    document.title = "Claim your invitation — TripAgent";
  }, []);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);

  // Same convention as InvitationPage.tsx's own reduced-motion check — a
  // visitor who has asked the OS for less motion gets the static fallback
  // image outright, never an attempted video load.
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  // Sits behind the video (never in front) so a video that fails to load,
  // is still buffering, or is skipped for reduced-motion always has this
  // showing underneath — the destination is never blank.
  const [videoFailed, setVideoFailed] = useState(false);

  const [code, setCode] = useState("");
  const [ann, setAnn] = useState<{ text: string; kind: "hint" | "err" | "busy" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Auto-fill (never auto-submit) a code carried in ?code= — same
  // convention as invitation.html's emailed-link handling.
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("code") || "";
      const clean = raw.replace(/\D/g, "").slice(0, 8);
      if (clean) setCode(clean);
    } catch {
      // no-op
    }
    inputRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.replace(/\D/g, "").slice(0, 8));
    setAnn(null);
  }

  // Redeems against the same backend endpoint, same fail-safe contract, as
  // invitation.html's redeem step — POST {API_BASE}/invite/{code}/redeem.
  // No capture step here (deliberately, matching the source): member
  // profile details aren't collected at this step.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 8) {
      setAnn({ text: "Your code has 8 digits — a few are still missing.", kind: "hint" });
      inputRef.current?.focus();
      return;
    }
    if (busy) return;

    setBusy(true);
    setAnn({ text: "Verifying your code…", kind: "busy" });

    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const [res] = await Promise.all([
      (async (): Promise<RedeemResponse> => {
        try {
          const r = await fetch(`${API_BASE}/invite/${encodeURIComponent(clean)}/redeem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          return (await r.json()) as RedeemResponse;
        } catch {
          return { valid: false, error: "network" };
        }
      })(),
      new Promise((r) => setTimeout(r, 700)),
    ]);

    setBusy(false);

    const months = Number(res.months);
    // GUARDRAIL: validity + free-months are decided by the backend only —
    // a "valid" response with no usable months is never trusted client-side.
    if (res.valid === true && Number.isFinite(months) && months >= 1 && months <= 24) {
      setAnn(null);
      setClaimed(true);
      try {
        welcomeRef.current?.focus({ preventScroll: true });
      } catch {
        // no-op
      }
      setTimeout(() => navigate("/"), 1400);
      return;
    }
    if (res.used === true) {
      setAnn({ text: "This invitation has already been claimed.", kind: "err" });
    } else if (res.error === "email_taken") {
      setAnn({
        text: "That email is already attached to another membership. Please reach us on WhatsApp or write to maison@tripsure.com.",
        kind: "err",
      });
    } else if (res.error === "network") {
      setAnn({ text: "We could not reach the door just now. Please try again in a moment.", kind: "err" });
    } else {
      setAnn({ text: "That code isn't recognised. Please check your email and try again.", kind: "err" });
    }
  }

  return (
    // "hero" (global, unwrapped) is the same class AdvisorButton already
    // scans for (document.querySelectorAll(".hero, .city-hero, ...")) to
    // switch itself into its on-dark-hero skin — reusing that existing
    // sitewide mechanism, rather than reaching into AdvisorButton itself,
    // is what makes the floating advisor button read correctly against
    // this page's own dark video without touching a shared component.
    <section className={`hero ${styles.claimWrap}`}>
      <img
        className={styles.claimFallback}
        src={VIDEO_FALLBACK_SRC}
        alt=""
        aria-hidden="true"
      />
      {!reduceMotion && !videoFailed && (
        <video
          className={styles.claimVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={VIDEO_FALLBACK_SRC}
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      )}
      <div className={styles.claimScrim} aria-hidden="true" />
      <div className={styles.claimVignette} aria-hidden="true" />
      <div className={styles.claimGrain} aria-hidden="true" />
      <div className={styles.claimCard}>
        {!claimed ? (
          <div>
            <div className="eyebrow">Claim your invitation</div>
            <div className="rule center" />
            <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: "clamp(38px,5.6vw,60px)", lineHeight: 1.06 }}>
              You&apos;ve been <span className={styles.it}>invited</span>.
            </h1>
            <p className="lede" style={{ margin: "18px auto 0", maxWidth: "36ch" }}>
              Enter the 8-digit code from your invitation email.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.codeField}>
                <label htmlFor="claim-code" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
                  Invitation code
                </label>
                <input
                  ref={inputRef}
                  id="claim-code"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  autoComplete="one-time-code"
                  placeholder="00000000"
                  spellCheck={false}
                  value={code}
                  onChange={handleInput}
                />
              </div>
              <div
                className={`${styles.ann}${ann ? ` ${ann.kind === "err" ? styles.annErr : ann.kind === "busy" ? styles.annBusy : styles.annHint}` : ""}`}
                aria-live="polite"
              >
                {ann?.text}
              </div>
              <div className={styles.ctaRow}>
                <button type="submit" className="btn btn-gold" disabled={busy}>
                  Claim your invitation <span className={styles.ctaArrow}>→</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className={styles.claimWelcome} role="status" aria-live="polite" tabIndex={-1} ref={welcomeRef}>
            <div className="eyebrow">You&apos;re in</div>
            <div className="rule center" />
            <h1 style={{ fontFamily: "var(--serif)", fontWeight: 500, fontSize: "clamp(38px,5.6vw,60px)", lineHeight: 1.06 }}>
              Welcome to <span className={styles.it}>TripAgent</span>.
            </h1>
            <p className="lede" style={{ margin: "18px auto 0", maxWidth: "36ch" }}>
              Taking you home…
            </p>
          </div>
        )}
      </div>
      <div className={styles.claimFooter} aria-hidden="true">
        Exclusive travel &nbsp;·&nbsp; Personal advisors &nbsp;·&nbsp; Curated experiences
      </div>
    </section>
  );
}
