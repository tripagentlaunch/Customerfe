import { useEffect, useRef, useState } from "react";
import { useNavVariant } from "../lib/navVariant";
import { useScrollReveal } from "../lib/useScrollReveal";
import styles from "./request-access-page.module.css";

// Ported from request-access.html — the public "Request Access" lead form
// (distinct from EnquirePage.tsx's signed-in-only enquiry form, though the
// two share the same field/trust/thanks markup shape in the source, since
// they're siblings on the backend: access_request_router.py next to
// enquiry_router.py). No auth here — a stranger applying has no session.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Same-origin in prod, VITE_API_BASE_URL for local dev — mirrors
// ClaimPage.tsx/InvitationPage.tsx/EnquirePage.tsx's API_BASE convention.
// The source (request-access.html's inline script) instead re-implemented
// its own isLocalDevHost()/localhost:8000 check, since it has no build
// step and no access to Vite env vars — that's this project's existing
// equivalent seam for the same local-dev override, reused rather than
// re-implemented.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export default function RequestAccessPage() {
  useNavVariant("solid");
  useScrollReveal([]);

  useEffect(() => {
    document.title = "Request access — TripAgent";
  }, []);

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
          first_name: fd.get("first_name"),
          last_name: fd.get("last_name"),
          email,
          phone: fd.get("phone"),
          destination: fd.get("destination"),
          travel_date: fd.get("travel_date"),
          reason: fd.get("why"),
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
    <section>
      <div className={`wrap ${styles.raWrap}`}>
        <div className={`${styles.raAside} reveal`}>
          <div className="eyebrow">Request access</div>
          <div className="rule" />
          <h1 style={{ fontFamily: "var(--logo)", fontWeight: 500, fontSize: "clamp(38px,5vw,68px)", lineHeight: 1.04 }}>
            Welcome to <span className="it">TripAgent</span>.
          </h1>
          <p className="lede" style={{ marginTop: 20 }}>
            TripAgent is a small, invitation-only practice — we don&apos;t take a public queue. If no one has given
            you a key yet, tell us a little about yourself, and we&apos;ll see whether we&apos;re a fit.
          </p>
          <p className="lede" style={{ marginTop: 16 }}>
            There&apos;s no fee to ask, and no obligation either way. If it&apos;s a match, an invitation follows — a
            single key, and a named advisor on the other side of it.
          </p>
          <p className={styles.tagline}>
            Better trips.
            <br />
            Personalized.
          </p>

          <div className={styles.credList}>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Personalized itineraries
            </div>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Trusted travel experts
            </div>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Global destinations
            </div>
            <div className={styles.credItem}>
              <span className={styles.credDot} />
              Premium experiences
            </div>
          </div>

          <div className={styles.collage} aria-hidden="true">
            <img className={styles.collagePhoto} src="/img/cities/venice.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/dest-santorini-goldenhour.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/cities/male-maldives.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/cities/st-moritz.jpg" alt="" loading="lazy" />
            <img className={styles.collagePhoto} src="/img/cities/amalfi-coast.jpg" alt="" loading="lazy" />
          </div>
        </div>

        <div className="reveal d2">
          <div className={`${styles.form}${submitted ? ` ${styles.sent}` : ""}`} id="accessForm">
            <div className={styles.formBody}>
              <h3 className={styles.formHeading}>Tell us about you</h3>
              <p className={styles.formSub}>A few details are enough. We read every request personally.</p>
              <form id="accessLeadForm" noValidate onSubmit={handleSubmit}>
                <div className="field two">
                  <div>
                    <label htmlFor="ra-first-name">First name</label>
                    <input id="ra-first-name" type="text" name="first_name" required placeholder="Your first name" autoComplete="given-name" />
                  </div>
                  <div>
                    <label htmlFor="ra-last-name">Last name</label>
                    <input id="ra-last-name" type="text" name="last_name" required placeholder="Your last name" autoComplete="family-name" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="ra-email">Email</label>
                  <input id="ra-email" type="email" name="email" required placeholder="you@email.com" autoComplete="email" inputMode="email" />
                  <div className="err" id="ra-email-err" aria-live="polite">
                    {emailErr}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="ra-phone">Mobile</label>
                  <input id="ra-phone" type="tel" name="phone" required placeholder="+91" autoComplete="tel" inputMode="tel" />
                </div>
                <div className="field two">
                  <div>
                    <label htmlFor="ra-destination">Where would you like to go?</label>
                    <input id="ra-destination" type="text" name="destination" placeholder="Maldives, Amalfi, Tokyo…" />
                  </div>
                  <div>
                    <label htmlFor="ra-travel-date">When were you thinking?</label>
                    <input id="ra-travel-date" type="text" name="travel_date" placeholder="Late November, or flexible" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="ra-why">Why TripAgent?</label>
                  <textarea id="ra-why" name="why" rows={4} required placeholder="A line or two on why you'd like an invitation." />
                </div>
                <div className={styles.trust} style={{ margin: "2px 0 14px" }}>
                  Your details stay private. A person reads every request, never a bot.
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
                <p className={styles.safeNote}>Your information is safe with us.</p>
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
              <h3 style={{ fontSize: 30 }}>
                Thank <span className="it">you</span>.
              </h3>
              <p className="lede" style={{ margin: "12px auto 8px", maxWidth: "40ch" }}>
                Your request has been received. Our team will be in touch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
