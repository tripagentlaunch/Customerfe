import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./request-access-page.module.css";

// The public "Request Access" form — a stranger applying has no session.
// POSTs to Customerbe's /access-requests; an admin reviews it in adminfe's
// Access requests panel, and approval emails a /claim code.
//
// 2026-10-08 (direct request): same two-column layout and fields as before,
// restyled dark — rounded filled fields with labels above, cream pill CTA,
// serif heading with a gold italic accent. Required: first name, last name,
// email, mobile. Destination, timing and "why" are optional. No page-local
// nav: site chrome is hidden on this route for signed-out visitors (see
// Layout.tsx's BARE_FOR_GUESTS_PATHS).

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// At least 7 digits once spaces/dashes/+ are stripped — loose on purpose,
// numbers are checked by a person at the Desk.
const MIN_PHONE_DIGITS = 7;

// Drop a real clip at VIDEO_SRC to replace the background; the photo shows
// whenever the video can't load, and always for prefers-reduced-motion.
const VIDEO_SRC = "/videos/travel-background.mp4";
const VIDEO_FALLBACK_SRC = "/images/tripagent-request-access-fallback.jpg";

const DESK_EMAIL = "invite@tripagent.vip";

type FieldName = "first_name" | "last_name" | "email" | "phone";
type FieldErrors = Partial<Record<FieldName, string>>;
const REQUIRED_ORDER: FieldName[] = ["first_name", "last_name", "email", "phone"];

export default function RequestAccessPage() {
  useEffect(() => {
    document.title = "Request access — TripAgent";
  }, []);

  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [videoFailed, setVideoFailed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitErr, setSubmitErr] = useState("");
  const thanksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!submitted) return;
    try {
      thanksRef.current?.focus({ preventScroll: true });
    } catch {
      // no-op
    }
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const val = (k: string) => String(fd.get(k) || "").trim();
    const firstName = val("first_name");
    const lastName = val("last_name");
    const email = val("email");
    const phone = val("phone");

    const next: FieldErrors = {};
    if (!firstName) next.first_name = "Please enter your first name.";
    if (!lastName) next.last_name = "Please enter your last name.";
    if (!EMAIL_RE.test(email)) next.email = "Please enter a valid email.";
    if (phone.replace(/\D/g, "").length < MIN_PHONE_DIGITS) next.phone = "Please enter a valid mobile number.";
    setErrors(next);
    setSubmitErr("");
    const firstBad = REQUIRED_ORDER.find((k) => next[k]);
    if (firstBad) {
      form.querySelector<HTMLInputElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    let succeeded = false;
    try {
      const r = await fetch(`/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          destination: val("destination"),
          travel_date: val("travel_timing"),
          reason: val("reason"),
        }),
      });
      succeeded = r.ok;
    } catch {
      succeeded = false;
    }
    setSubmitting(false);

    if (!succeeded) {
      setSubmitErr(`We couldn't send that just now. Please try again in a moment, or write to ${DESK_EMAIL}.`);
      return;
    }
    setSubmitted(true);
  }

  function errProps(name: FieldName) {
    return {
      "aria-invalid": !!errors[name],
      "aria-describedby": errors[name] ? `ra-${name}-err` : undefined,
    };
  }

  function errLine(name: FieldName) {
    return errors[name] ? (
      <div className={styles.err} id={`ra-${name}-err`}>
        {errors[name]}
      </div>
    ) : null;
  }

  return (
    <section className={styles.raRoot}>
      {reduceMotion || videoFailed ? (
        <img className={styles.bg} src={VIDEO_FALLBACK_SRC} alt="" aria-hidden="true" />
      ) : (
        <video
          className={styles.bg}
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

      <div className={styles.raBrand}>
        <svg width="20" height="20" viewBox="0 0 420 420" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round">
            <path d="M140,150 L280,150" />
            <path d="M210,150 L210,212" />
            <path d="M140,300 L210,212 L280,300" />
            <path d="M174,256 L246,256" />
          </g>
        </svg>
        TripAgent
      </div>

      <div className={styles.raWrap}>
        <div className={styles.raAside}>
          <div className={styles.eyebrow}>By invitation</div>
          <h1 className={styles.heading}>
            Your next journey starts with a <span className={styles.it}>request.</span>
          </h1>
          <p className={styles.lede}>
            Tell us how to reach you. A person at the Desk reads every request — no code is issued automatically,
            and nothing here creates an account.
          </p>
          <ul className={styles.credList}>
            <li>Personal travel planning</li>
            <li>Curated experiences</li>
            <li>Expert advisors</li>
            <li>Trusted &amp; secure</li>
          </ul>
        </div>

        <div className={styles.card}>
          {submitted ? (
            <div className={styles.thanks} role="status" aria-live="polite" tabIndex={-1} ref={thanksRef}>
              <h2 className={styles.cardHeading}>
                Thank <span className={styles.it}>you.</span>
              </h2>
              <p className={styles.cardSub}>
                Your request is with the Desk. If it's a fit, your invitation code will arrive by email.
              </p>
              <p className={styles.footLine}>
                Already have a code?{" "}
                <Link to="/claim" className={styles.footLink}>
                  Open the door
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h2 className={styles.cardHeading}>
                Ask for an <span className={styles.it}>invitation.</span>
              </h2>
              <p className={styles.cardSub}>A few details and we'll be in touch.</p>

              <form className={styles.form} noValidate onSubmit={handleSubmit}>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label htmlFor="ra-first-name">First name</label>
                    <input
                      className="ra-input"
                      id="ra-first-name"
                      name="first_name"
                      type="text"
                      placeholder="First name"
                      autoComplete="given-name"
                      {...errProps("first_name")}
                    />
                    {errLine("first_name")}
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="ra-last-name">Last name</label>
                    <input
                      className="ra-input"
                      id="ra-last-name"
                      name="last_name"
                      type="text"
                      placeholder="Last name"
                      autoComplete="family-name"
                      {...errProps("last_name")}
                    />
                    {errLine("last_name")}
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="ra-email">Email</label>
                  <input
                    className="ra-input"
                    id="ra-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    {...errProps("email")}
                  />
                  {errLine("email")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="ra-phone">Mobile</label>
                  <input
                    className="ra-input"
                    id="ra-phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 ....."
                    autoComplete="tel"
                    inputMode="tel"
                    {...errProps("phone")}
                  />
                  {errLine("phone")}
                </div>

                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label htmlFor="ra-destination">
                      Where to <span className={styles.optional}>· optional</span>
                    </label>
                    <input
                      className="ra-input"
                      id="ra-destination"
                      name="destination"
                      type="text"
                      placeholder="Maldives, Tokyo…"
                      autoComplete="off"
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="ra-travel-timing">
                      When <span className={styles.optional}>· optional</span>
                    </label>
                    <input
                      className="ra-input"
                      id="ra-travel-timing"
                      name="travel_timing"
                      type="text"
                      placeholder="Late Nov, or flexible"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="ra-reason">
                    Anything we should know <span className={styles.optional}>· optional</span>
                  </label>
                  <textarea
                    className="ra-input"
                    id="ra-reason"
                    name="reason"
                    rows={2}
                    placeholder="Where you are hoping to go, or who introduced you"
                  />
                </div>

                {submitErr && (
                  <div className={styles.err} role="alert">
                    {submitErr}
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? "One moment…" : "Request access"}
                  {!submitting && (
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  )}
                </button>
              </form>

              <p className={styles.footLine}>
                Already have a code?{" "}
                <Link to="/claim" className={styles.footLink}>
                  Open the door
                </Link>
              </p>
              <p className={styles.footLine}>
                Or write to{" "}
                <a href={`mailto:${DESK_EMAIL}`} className={styles.footLink}>
                  {DESK_EMAIL}
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
