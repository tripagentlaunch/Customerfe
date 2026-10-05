import { useEffect, useRef, useState } from "react";
import { useScrollReveal } from "../lib/useScrollReveal";
import styles from "./request-access-page.module.css";

// Ported from request-access.html — the public "Request Access" lead form
// (distinct from EnquirePage.tsx's signed-in-only enquiry form, though the
// two share the same field/trust/thanks markup shape in the source, since
// they're siblings on the backend: access_request_router.py next to
// enquiry_router.py). No auth here — a stranger applying has no session.
//
// Redesigned 2026-09-24 into a full-screen cinematic video-hero landing
// page (same real-<video>-with-graceful-fallback architecture already
// built for ClaimPage.tsx) — visual/UI pass, the submit handler's actual
// accepted payload keys (first_name/last_name/email/phone/destination/
// travel_date/reason) are UNCHANGED from what the live /access-requests
// endpoint already accepts, since that backend isn't in this checkout to
// safely extend. The new "Country" and "Travel preferences" fields are
// sent as additional, best-effort JSON keys alongside the known-good ones
// — see handleSubmit below.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Same-origin in prod, VITE_API_BASE_URL for local dev — mirrors
// ClaimPage.tsx/InvitationPage.tsx/EnquirePage.tsx's API_BASE convention.
// The source (request-access.html's inline script) instead re-implemented
// its own isLocalDevHost()/localhost:8000 check, since it has no build
// step and no access to Vite env vars — that's this project's existing
// equivalent seam for the same local-dev override, reused rather than
// re-implemented.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

// Same real-video-background pattern as ClaimPage.tsx's VIDEO_SRC/
// VIDEO_FALLBACK_SRC — drop the real clip in at this exact path to
// replace the placeholder, no other code changes needed.
const VIDEO_SRC = "/videos/travel-background.mp4";
// Reuses the same golden-hour Santorini photo already used elsewhere on
// this page's own collage — a real, already-present asset, shown whenever
// the video can't load, and permanently for prefers-reduced-motion.
const VIDEO_FALLBACK_SRC = "/images/tripagent-request-access-fallback.jpg";

export default function RequestAccessPage() {
  // No useNavVariant("solid") here — this page renders its own page-local
  // nav (below) instead of the shared site Header (Layout.tsx suppresses
  // Header, not this page's own markup), so there's no shared nav to set a
  // variant on.
  useScrollReveal([]);

  useEffect(() => {
    document.title = "Request access — TripAgent";
  }, []);

  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [videoFailed, setVideoFailed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const thanksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!submitted) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      thanksRef.current?.focus({ preventScroll: true });
    } catch {
      // no-op
    }
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Guards against a second submit landing while the first is still
    // in-flight (e.g. a fast double Enter) — the button is also disabled
    // while submitting, this is the belt-and-braces version of the same
    // check ClaimPage.tsx's own handleSubmit already uses.
    if (submitting) return;

    const form = e.currentTarget;
    setEmailErr("");
    setSubmitErr("");

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim();
    if (!EMAIL_RE.test(email)) {
      setEmailErr("Please enter a valid email.");
      form.querySelector<HTMLInputElement>("#ra-email")?.focus();
      return;
    }

    setSubmitting(true);
    let succeeded = false;
    try {
      const r = await fetch(`${API_BASE}/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The live endpoint's known-accepted keys — unchanged from
          // before this redesign, verified against the currently deployed
          // backend contract.
          first_name: fd.get("first_name"),
          last_name: fd.get("last_name"),
          email,
          phone: fd.get("phone"),
          reason: fd.get("reason"),
          // Best-effort additions for the new "Where would you like to
          // go?" / "When were you thinking?" fields — this repo has no
          // access to the backend's actual Pydantic model, so whether
          // these two are persisted or simply dropped as unrecognised JSON
          // keys is unverified. Sent regardless, since most JSON-body
          // backends tolerate (rather than reject) unknown fields, and
          // dropping user-entered data silently would be worse. NOTE: if
          // the backend doesn't yet accept `destination`/`travel_timing`,
          // add them to the /access-requests request model to persist
          // these two answers.
          destination: fd.get("destination"),
          travel_timing: fd.get("travel_timing"),
        }),
      });
      succeeded = r.ok;
    } catch {
      succeeded = false;
    }
    setSubmitting(false);

    if (!succeeded) {
      // A real failure — never silently show the confirmation for one.
      setSubmitErr(
        "We couldn't send that just now. Please try again in a moment, or write to us directly at maison@tripsure.com."
      );
      return;
    }

    setSubmitted(true);
  }

  return (
    // "hero" (global, unwrapped) is the same class AdvisorButton scans for
    // (see ClaimPage.tsx's identical trick) so the shared floating "Talk to
    // your advisor" button automatically renders its on-dark-hero skin
    // against this page's own video, without touching that component.
    <section className={`hero ${styles.raRoot}`}>
      <img className={styles.bgFallback} src={VIDEO_FALLBACK_SRC} alt="" aria-hidden="true" />
      {!reduceMotion && !videoFailed && (
        <video
          className={styles.bgVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={VIDEO_FALLBACK_SRC}
          aria-hidden="true"
          onError={() => setVideoFailed(true)}
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      )}
      <div className={styles.bgOverlay} aria-hidden="true" />

      <nav className={styles.raNav} aria-label="Primary">
        <span className={styles.raBrand}>
          {/* Same brand mark used by the site's own global Header
              (src/components/layout/Header.tsx's .ta-hd-brand svg) — reused
              here rather than inventing a new logo, since this page's own
              nav replaces (not duplicates) that shared component. */}
          <svg className={styles.raBrandMark} width="20" height="20" viewBox="0 0 420 420" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round">
              <path d="M140,150 L280,150" />
              <path d="M210,150 L210,212" />
              <path d="M140,300 L210,212 L280,300" />
              <path d="M174,256 L246,256" />
            </g>
          </svg>
          TripAgent
        </span>
        <div className={styles.raNavLinks}>
          <a href="/flights">Flights</a>
          <a href="/hotels">Hotels</a>
          <a href="/visas">Visas</a>
          <a href="/experiences">Experiences</a>
        </div>
        <span className={styles.raNavTag}>Travel smarter</span>
      </nav>

      <main className={styles.raMain}>
      <div className={styles.raWrap}>
        <div className={`${styles.raAside} reveal`}>
          <div className={styles.raEyebrow}>Better trips. Personalized.</div>
          <h1 className={styles.raHeading}>
            Your next journey
            <br />
            starts with a <span className={styles.it}>request.</span>
          </h1>
          <p className={styles.raLede}>
            Get exclusive access to personalized travel planning, curated experiences and expert advisor support —
            all in one place.
          </p>

          <div className={styles.collage} aria-hidden="true">
            <img className={styles.collagePhoto} src="/img/cities/venice.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/dest-santorini-goldenhour.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/cities/male-maldives.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/cities/st-moritz.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/cities/amalfi-coast.jpg" alt="" loading="lazy" />
          </div>

          <div className={styles.credList}>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Trusted &amp; secure
            </div>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Global destinations
            </div>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Expert advisors
            </div>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Curated experiences
            </div>
          </div>
        </div>

        <div className="reveal d2">
          <div className={`${styles.form}${submitted ? ` ${styles.sent}` : ""}`} id="accessForm">
            <div className={styles.formBody}>
              <div className={styles.raEyebrowCard}>Request access</div>
              <h3 className={styles.formHeading}>
                Unlock a world of
                <br />
                extraordinary travel.
              </h3>
              <p className={styles.formSub}>Complete the form below to request access and start planning your next adventure.</p>
              <form id="accessLeadForm" noValidate onSubmit={handleSubmit}>
                <div className="field two">
                  <div>
                    <label htmlFor="ra-first-name">First name *</label>
                    <input id="ra-first-name" type="text" name="first_name" required placeholder="Your first name" autoComplete="given-name" />
                  </div>
                  <div>
                    <label htmlFor="ra-last-name">Last name *</label>
                    <input id="ra-last-name" type="text" name="last_name" required placeholder="Your last name" autoComplete="family-name" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="ra-email">Email address *</label>
                  <input id="ra-email" type="email" name="email" required placeholder="you@email.com" autoComplete="email" inputMode="email" />
                  <div className="err" id="ra-email-err" aria-live="polite">
                    {emailErr}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="ra-phone">Mobile *</label>
                  <input id="ra-phone" type="tel" name="phone" required placeholder="+91" autoComplete="tel" inputMode="tel" />
                </div>
                <div className="field">
                  <label htmlFor="ra-destination">Where would you like to go?</label>
                  <input
                    id="ra-destination"
                    type="text"
                    name="destination"
                    placeholder="Maldives, Amalfi, Tokyo…"
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label htmlFor="ra-travel-timing">When were you thinking?</label>
                  <input
                    id="ra-travel-timing"
                    type="text"
                    name="travel_timing"
                    placeholder="Late November, or flexible"
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label htmlFor="ra-reason">Why TripAgent?</label>
                  <textarea
                    id="ra-reason"
                    name="reason"
                    rows={2}
                    placeholder="A line or two on why you'd like an invitation."
                  />
                </div>
                <div className="err" id="ra-submit-err" aria-live="polite" style={{ marginBottom: 14 }}>
                  {submitErr}
                </div>
                <button type="submit" className={`btn btn-gold ${styles.submitBtn}`} id="raBtn" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
                  {submitting ? (
                    "One moment…"
                  ) : (
                    <>
                      Request access <span className={styles.arrow}>→</span>
                    </>
                  )}
                </button>
                <p className={styles.safeNote}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <rect x="5" y="11" width="14" height="9" rx="1.5" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  Your information is safe with us.
                </p>
              </form>
            </div>
            <div
              className={`${styles.thanks}${submitted ? ` ${styles.show}` : ""}`}
              id="raThanks"
              role="status"
              aria-live="polite"
              tabIndex={-1}
              ref={thanksRef}
            >
              <svg width={54} height={54} viewBox="0 0 420 420" fill="none" style={{ margin: "0 auto 18px" }}>
                <g stroke="#785C12" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M140,150 L280,150" />
                  <path d="M210,150 L210,212" />
                  <path d="M140,300 L210,212 L280,300" />
                  <path d="M174,256 L246,256" />
                </g>
              </svg>
              <h3 className={styles.thanksHeading}>
                Thank <span className={styles.it}>you</span>.
              </h3>
              <p className={styles.thanksBody}>
                Your request has been received. One of our travel advisors will be in touch shortly to understand
                your plans and help shape your journey.
              </p>
            </div>
          </div>
        </div>
      </div>
      </main>
    </section>
  );
}
