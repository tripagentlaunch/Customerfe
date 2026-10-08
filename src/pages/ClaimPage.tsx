import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBareChromeForGuests } from "../lib/bareChrome";
import styles from "./claim-page.module.css";

// Ported from claim.html — the 8-digit-code redemption page (distinct from
// invitation.html's 16-character, 4-step ceremony: InvitationPage.tsx).
// Deliberately simple in the source too: enter the code, claim it, go home.
// No capture/card/welcome-ceremony steps — those only exist on the
// invitation.html flow.
//
// 2026-10-08 (direct request): restyled to match RequestAccessPage — cream
// frosted card, oxblood accents, rounded code field, pill CTA — and no site
// chrome (nav, tab bar, floating helpers) for signed-out visitors.

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

const DESK_EMAIL = "invite@tripagent.vip";

export default function ClaimPage() {
  useBareChromeForGuests();

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
      const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (clean) setCode(clean);
    } catch {
      // no-op
    }
    inputRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Alphanumeric, not digits-only (2026-09-29 fix) — invite codes now
    // include letters (e.g. BH0325AN), matching handleSubmit's own
    // .toUpperCase().replace(/[^A-Z0-9]/g, "") sanitization below.
    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
    setAnn(null);
  }

  // Redeems against the same backend endpoint, same fail-safe contract, as
  // invitation.html's redeem step — POST {API_BASE}/invite/{code}/redeem.
  // No capture step here (deliberately, matching the source): member
  // profile details aren't collected at this step.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 8) {
      setAnn({ text: "Your code has 8 characters — a few are still missing.", kind: "hint" });
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
          const r = await fetch(`/invite/${encodeURIComponent(clean)}/redeem`, {
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
      // if (res.session?.access_token && res.session?.refresh_token) {
      //   try {
      //     await supabase.auth.setSession({
      //       access_token: res.session.access_token,
      //       refresh_token: res.session.refresh_token,
      //     });
      //   } catch {
      //     // Non-fatal: worst case the header still shows "Sign in" and the
      //     // person can sign in manually with the same email — the
      //     // membership itself was already created successfully above.
      //   }
      // }
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
    } else if (res.error === "expired") {
      setAnn({
        text: "This invitation has expired. Please reach us on WhatsApp or write to maison@tripsure.com for a new one.",
        kind: "err",
      });
    } else if (res.error === "network") {
      setAnn({ text: "We could not reach the door just now. Please try again in a moment.", kind: "err" });
    } else {
      setAnn({ text: "That code isn't recognised. Please check your email and try again.", kind: "err" });
    }
  }

  return (
    <section className={styles.claimRoot}>
      {reduceMotion || videoFailed ? (
        <img className={styles.bg} src={VIDEO_FALLBACK_SRC} alt="" aria-hidden="true" />
      ) : (
        <video
          className={styles.bg}
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
      <div className={styles.bgOverlay} aria-hidden="true" />

      <div className={styles.claimWrap}>
        <div className={styles.card}>
          {!claimed ? (
            <>
              <div className={styles.eyebrow}>Claim your invitation</div>
              <h1 className={styles.heading}>
                You&apos;ve been <span className={styles.it}>invited.</span>
              </h1>
              <p className={styles.sub}>Enter the 8-character code from your invitation email.</p>

              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <label htmlFor="claim-code" className={styles.label}>
                  Invitation code
                </label>
                <input
                  ref={inputRef}
                  className={`ra-input ${styles.codeInput}`}
                  id="claim-code"
                  type="text"
                  inputMode="text"
                  maxLength={8}
                  autoComplete="one-time-code"
                  placeholder="AB1234CD"
                  spellCheck={false}
                  value={code}
                  onChange={handleInput}
                  aria-invalid={ann?.kind === "err"}
                  aria-describedby="claim-ann"
                />
                <div
                  id="claim-ann"
                  className={`${styles.ann}${ann ? ` ${ann.kind === "err" ? styles.annErr : ann.kind === "busy" ? styles.annBusy : styles.annHint}` : ""}`}
                  aria-live="polite"
                >
                  {ann?.text}
                </div>
                <button type="submit" className={styles.submitBtn} disabled={busy}>
                  {busy ? "Verifying…" : "Claim your invitation"}
                  {!busy && (
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  )}
                </button>
              </form>

              <p className={styles.footLine}>
                Don&apos;t have a code?{" "}
                <Link to="/request-access" className={styles.footLink}>
                  Ask for an invitation
                </Link>
              </p>
              <p className={styles.footLine}>
                Or write to{" "}
                <a href={`mailto:${DESK_EMAIL}`} className={styles.footLink}>
                  {DESK_EMAIL}
                </a>
              </p>
            </>
          ) : (
            <div className={styles.welcome} role="status" aria-live="polite" tabIndex={-1} ref={welcomeRef}>
              <div className={styles.eyebrow}>You&apos;re in</div>
              <h1 className={styles.heading}>
                Welcome to <span className={styles.it}>TripAgent.</span>
              </h1>
              <p className={styles.sub}>Taking you home…</p>
            </div>
          )}
        </div>
        <div className={styles.claimFooter} aria-hidden="true">
          Exclusive travel · Personal advisors · Curated experiences
        </div>
      </div>
    </section>
  );
}
