import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./request-access-page.module.css";

// The public "Ask for an invitation" form — a stranger applying has no
// session. POSTs to Customerbe's /access-requests; an admin reviews it in
// adminfe's Access requests panel, and approval emails a /claim code.
//
// Redesigned 2026-10-08 (direct request) as a single-column, dark,
// mobile-first form. Only name, email and mobile are required; "Anything
// we should know" is optional and is stored as `reason`. Site chrome (nav,
// footer, tab bar) is hidden on this route for signed-out visitors — see
// Layout.tsx's BARE_FOR_GUESTS_PATHS.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// At least 7 digits once spaces/dashes/+ are stripped — loose on purpose,
// numbers are checked by a person at the Desk.
const MIN_PHONE_DIGITS = 7;

// Hero photo — replace this file to change the image; no code change needed.
const HERO_SRC = "/images/tripagent-request-access-fallback.jpg";

const DESK_EMAIL = "invite@tripagent.vip";

type FieldErrors = Partial<Record<"name" | "email" | "phone", string>>;

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

export default function RequestAccessPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Ask for an invitation — TripAgent";
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
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

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/claim");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const note = String(fd.get("note") || "").trim();

    const next: FieldErrors = {};
    if (!name) next.name = "Please tell us your name.";
    if (!EMAIL_RE.test(email)) next.email = "Please enter a valid email.";
    if (phone.replace(/\D/g, "").length < MIN_PHONE_DIGITS) next.phone = "Please enter a valid mobile number.";
    setErrors(next);
    setSubmitErr("");
    const firstBad = (["name", "email", "phone"] as const).find((k) => next[k]);
    if (firstBad) {
      form.querySelector<HTMLInputElement>(`#ra-${firstBad}`)?.focus();
      return;
    }

    const { first, last } = splitName(name);
    setSubmitting(true);
    let succeeded = false;
    try {
      const r = await fetch(`/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          email,
          phone,
          reason: note,
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

  return (
    <section className={styles.raRoot}>
      <div className={styles.raColumn}>
        <div className={styles.hero}>
          <img className={styles.heroImg} src={HERO_SRC} alt="" aria-hidden="true" />
          <button type="button" className={styles.backBtn} onClick={goBack} aria-label="Go back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {submitted ? (
            <div className={styles.thanks} role="status" aria-live="polite" tabIndex={-1} ref={thanksRef}>
              <h1 className={styles.heading}>
                Thank <span className={styles.it}>you.</span>
              </h1>
              <p className={styles.lede}>
                Your request is with the Desk. A person reads every one — if it's a fit, your invitation code will
                arrive by email.
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
              <h1 className={styles.heading}>
                Ask for an <span className={styles.it}>invitation.</span>
              </h1>
              <p className={styles.lede}>
                Tell us how to reach you. A person at the Desk reads every request — no code is issued
                automatically, and nothing here creates an account.
              </p>

              <form className={styles.form} noValidate onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label htmlFor="ra-name">Your name</label>
                  <input
                    className="ra-input"
                    id="ra-name"
                    name="name"
                    type="text"
                    required
                    placeholder="First and last name"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "ra-name-err" : undefined}
                  />
                  {errors.name && <div className={styles.err} id="ra-name-err">{errors.name}</div>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="ra-email">Email</label>
                  <input
                    className="ra-input"
                    id="ra-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "ra-email-err" : undefined}
                  />
                  {errors.email && <div className={styles.err} id="ra-email-err">{errors.email}</div>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="ra-phone">Mobile</label>
                  <input
                    className="ra-input"
                    id="ra-phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+91 ....."
                    autoComplete="tel"
                    inputMode="tel"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "ra-phone-err" : undefined}
                  />
                  {errors.phone && <div className={styles.err} id="ra-phone-err">{errors.phone}</div>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="ra-note">
                    Anything we should know <span className={styles.optional}>· optional</span>
                  </label>
                  <input
                    className="ra-input"
                    id="ra-note"
                    name="note"
                    type="text"
                    placeholder="Where you are hoping to go, or who introduced you"
                    autoComplete="off"
                  />
                </div>

                {submitErr && (
                  <div className={styles.err} role="alert">
                    {submitErr}
                  </div>
                )}

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? "One moment…" : "Send to the Desk"}
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
