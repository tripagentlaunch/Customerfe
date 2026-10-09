import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useBareChromeForGuests } from "../lib/bareChrome";
import styles from "./request-access-page.module.css";

// The public "Request Access" form — a stranger applying has no session.
// POSTs to Customerbe's /access-requests; an admin reviews it in adminfe's
// Access requests panel, and approval emails a /claim code.
//
// 2026-10-08 (direct request): form follows the "Ask for an invitation"
// mock — Your name / Email / Mobile required, "Anything we should know"
// optional, "Send to the Desk", code + email links underneath — in the
// page's original colours (cream frosted card, oxblood accents, gold
// eyebrow over the video). No navbar of any kind for signed-out visitors
// (useBareChromeForGuests); signed-in members get the normal site Header.

// 2026-10-09: inputs are constrained as they're typed and checked again on
// submit; Customerbe's /access-requests applies the same rules server-side
// (the real gate — anyone can POST there directly).
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
// Indian mobile: exactly 10 digits, starting 6-9. Sent as +91XXXXXXXXXX.
const MOBILE_RE = /^[6-9]\d{9}$/;
// Letters (any script), spaces and . ' - — no digits, markup or symbols.
const NAME_RE = /^\p{L}[\p{L} .'-]*$/u;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const REASON_MAX = 500;

// Digits only, max 10. A pasted/autofilled "+91 98765 43210" or
// "098765 43210" keeps the 10-digit number, not the country/trunk prefix.
const onlyDigits = (v: string) => {
  let d = v.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  else if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
};
const nameChars = (v: string) => v.replace(/[^\p{L} .'-]/gu, "").slice(0, NAME_MAX);
// Invisible/control characters never belong in a form field.
const stripControl = (v: string) => v.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g, "");

// Drop a real clip at VIDEO_SRC to replace the background; the photo shows
// whenever the video can't load, and always for prefers-reduced-motion.
const VIDEO_SRC = "/videos/travel-background.mp4";
const VIDEO_FALLBACK_SRC = "/images/tripagent-request-access-fallback.jpg";

const DESK_EMAIL = "invite@tripagent.vip";

type FieldName = "name" | "email" | "phone";
type FieldErrors = Partial<Record<FieldName, string>>;
const REQUIRED_ORDER: FieldName[] = ["name", "email", "phone"];

// "First and last name" in one box — first word is first_name, the rest
// last_name (may be empty; the backend accepts a single-word name).
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") };
}

export default function RequestAccessPage() {
  useBareChromeForGuests();

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
  const [phoneDigits, setPhoneDigits] = useState("");
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
    const name = stripControl(val("name")).replace(/\s+/g, " ");
    const email = stripControl(val("email")).toLowerCase();
    const phone = phoneDigits;

    const next: FieldErrors = {};
    if (!name) next.name = "Please tell us your name.";
    else if (!NAME_RE.test(name)) next.name = "Please use letters only.";
    if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) next.email = "Please enter a valid email.";
    if (!MOBILE_RE.test(phone)) next.phone = "Please enter a valid 10-digit mobile number.";
    setErrors(next);
    setSubmitErr("");
    const firstBad = REQUIRED_ORDER.find((k) => next[k]);
    if (firstBad) {
      form.querySelector<HTMLInputElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }

    const { first, last } = splitName(name);
    setSubmitting(true);
    let succeeded = false;
    try {
      const r = await fetch(`/access-requests`, {
        method: "POST",
        // X-Requested-With: the backend's CSRF check (same as /auth).
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          email,
          phone: `+91${phone}`,
          reason: stripControl(val("reason")).slice(0, REASON_MAX),
        }),
      });
      succeeded = r.ok;
      if (!r.ok) {
        const detail = ((await r.json().catch(() => ({}))) as { detail?: string }).detail;
        const fieldErr: FieldErrors =
          detail === "bad_phone" ? { phone: "Please enter a valid 10-digit mobile number." }
          : detail === "bad_email" ? { email: "Please enter a valid email." }
          : detail === "bad_name" ? { name: "Please use letters only." }
          : {};
        if (Object.keys(fieldErr).length) {
          setSubmitting(false);
          setErrors(fieldErr);
          return;
        }
        if (r.status === 429) {
          setSubmitting(false);
          setSubmitErr(`Too many requests from this connection. Please try again in a few minutes, or write to ${DESK_EMAIL}.`);
          return;
        }
      }
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

      <div className={styles.raWrap}>
        <div className={styles.raAside}>
          <div className={styles.eyebrow}>By invitation</div>
          <h1 className={styles.heading}>
            Your next journey starts with a <span className={styles.it}>request.</span>
          </h1>
          <p className={styles.lede}>
            Personal travel planning, curated experiences and expert advisors — for members, by invitation.
          </p>
        </div>

        <div className={styles.card}>
          {submitted ? (
            <div className={styles.thanks} role="status" aria-live="polite" tabIndex={-1} ref={thanksRef}>
              <h2 className={styles.cardHeading}>
                Thank <span className={styles.cardIt}>you.</span>
              </h2>
              <p className={styles.cardSub}>
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
              <h2 className={styles.cardHeading}>
                Ask for an <span className={styles.cardIt}>invitation.</span>
              </h2>
              <p className={styles.cardSub}>
                Tell us how to reach you. A person at the Desk reads every request — no code is issued automatically,
                and nothing here creates an account.
              </p>

              <form className={styles.form} noValidate onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label htmlFor="ra-name">Your name</label>
                  <input
                    className="ra-input"
                    id="ra-name"
                    name="name"
                    type="text"
                    placeholder="First and last name"
                    autoComplete="name"
                    maxLength={NAME_MAX}
                    onChange={(e) => {
                      const v = nameChars(e.target.value);
                      if (v !== e.target.value) e.target.value = v;
                    }}
                    {...errProps("name")}
                  />
                  {errLine("name")}
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
                    maxLength={EMAIL_MAX}
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
                    placeholder="10-digit mobile number"
                    autoComplete="tel-national"
                    inputMode="numeric"
                    pattern="[6-9][0-9]{9}"
                    value={phoneDigits}
                    onChange={(e) => setPhoneDigits(onlyDigits(e.target.value))}
                    {...errProps("phone")}
                  />
                  {errLine("phone")}
                </div>

                <div className={styles.field}>
                  <label htmlFor="ra-reason">
                    Anything we should know <span className={styles.optional}>· optional</span>
                  </label>
                  <input
                    className="ra-input"
                    id="ra-reason"
                    name="reason"
                    type="text"
                    placeholder="Where to, or who introduced you"
                    autoComplete="off"
                    maxLength={REASON_MAX}
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
