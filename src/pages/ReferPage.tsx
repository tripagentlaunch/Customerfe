import { useEffect, useRef, useState } from "react";
import { Gift, Sparkles, Users, CheckCircle2 } from "lucide-react";
import { useScrollReveal } from "../lib/useScrollReveal";
import { useNavVariant } from "../lib/navVariant";
import { useAuth } from "../lib/auth";
import { useSignInModal } from "../lib/signInModal";
import styles from "./refer-page.module.css";

// Refer a Friend (/refer) — premium editorial redesign of the same
// signed-in-only referral flow this page has always had. POST /referrals
// (backend/app/routers/referral_router.py), which reuses
// invite_service.create_invitation_code() end to end: same code
// generation, same Resend send, same /claim → redeem_invite() flow on the
// friend's side. Visual pass + a third field (mobile number) only — the
// submit handler's known-good payload keys (friend_name/friend_email) are
// unchanged, and the still-auth-gated submit path (signInModal.open() when
// signed out) is unchanged too, since that's this route's real backend
// contract, not something this repo can safely relax. See the
// friend_phone/friend_country_code note in handleSubmit below.

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const COUNTRY_CODES = ["+91", "+1", "+44", "+971", "+65", "+61", "+49", "+33", "+41"];

// Real, already-present assets (public/img/cities/*) — no new images
// downloaded, per spec. Santorini / Maldives / Paris / Switzerland, the
// four destinations the spec calls out.
const COLLAGE = [
  { src: "/img/cities/santorini.jpg", alt: "" },
  { src: "/img/cities/male-maldives.jpg", alt: "" },
  { src: "/img/cities/paris.jpg", alt: "" },
  { src: "/img/cities/st-moritz.jpg", alt: "" },
];

const BENEFITS = [
  { icon: Gift, text: "They get exclusive travel perks" },
  { icon: Sparkles, text: "You get travel rewards" },
  { icon: Users, text: "More trips, more memories" },
];

export default function ReferPage() {
  useNavVariant("solid");
  const { signedIn, session } = useAuth();
  const signInModal = useSignInModal();

  useEffect(() => {
    document.title = "Refer a friend — TripAgent";
  }, []);

  useScrollReveal([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [nameErr, setNameErr] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [phoneErr, setPhoneErr] = useState("");
  const [submitErr, setSubmitErr] = useState("");
  const thanksRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!submitted) return;
    thanksRef.current?.focus({ preventScroll: true });
  }, [submitted]);

  function resetForm() {
    formRef.current?.reset();
    setNameErr("");
    setEmailErr("");
    setPhoneErr("");
    setSubmitErr("");
    setSubmitted(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    if (!signedIn || !session) {
      signInModal.open("Sign in to refer a friend.");
      return;
    }

    const form = e.currentTarget;
    setNameErr("");
    setEmailErr("");
    setPhoneErr("");
    setSubmitErr("");

    const fd = new FormData(form);
    const friendName = String(fd.get("friend_name") || "").trim();
    const friendEmail = String(fd.get("friend_email") || "").trim();
    const friendPhone = String(fd.get("friend_phone") || "").trim();

    let valid = true;
    if (!friendName) {
      setNameErr("Please enter your friend's name.");
      valid = false;
    }
    if (!EMAIL_RE.test(friendEmail)) {
      setEmailErr("Please enter a valid email.");
      valid = false;
    }
    if (!friendPhone) {
      setPhoneErr("Please enter a mobile number.");
      valid = false;
    }
    if (!valid) return;

    setSubmitting(true);
    let succeeded = false;
    let errorDetail = "";
    try {
      const r = await fetch(`${API_BASE}/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          // Known-accepted keys — unchanged from before this redesign.
          friend_name: friendName,
          friend_email: friendEmail,
          // Best-effort addition for the new "Friend's mobile number"
          // field — /referrals' current accepted body (visible above, and
          // in this same handler before this redesign) is friend_name +
          // friend_email only. Whether friend_phone/friend_country_code
          // are persisted or dropped as unrecognised JSON keys is
          // unverified from this repo. If they're not yet accepted,
          // backend/app/routers/referral_router.py's request model needs
          // friend_phone (and optionally friend_country_code) added to
          // actually store this answer.
          friend_phone: friendPhone,
          friend_country_code: fd.get("country_code"),
        }),
      });
      succeeded = r.ok;
      if (!succeeded) {
        const body = await r.json().catch(() => null);
        errorDetail = (body?.detail as string) || "";
      }
    } catch {
      succeeded = false;
    }
    setSubmitting(false);

    if (!succeeded) {
      setSubmitErr(
        errorDetail === "email_taken"
          ? "Looks like your friend is already on TripAgent."
          : "We couldn't send that just now. Please try again in a moment."
      );
      return;
    }

    setSubmitted(true);
  }

  return (
    <section className={styles.rfRoot}>
      <div className={`wrap ${styles.rfWrap}`}>
        <div className={`${styles.rfAside} reveal`}>
          <div className={styles.rfEyebrow}>Share the joy of travel</div>
          <h1 className={styles.rfHeading}>
            Refer a <span className={styles.it}>friend.</span>
          </h1>
          <p className={styles.rfLede}>
            Your next adventure is better together. Invite your friends to TripAgent and help them plan their dream
            trips — while you both get rewarded.
          </p>

          <div className={styles.benefits}>
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div className={styles.benefitItem} key={text}>
                <span className={styles.benefitIcon} aria-hidden="true">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                {text}
              </div>
            ))}
          </div>

          <div className={styles.collage} aria-hidden="true">
            {COLLAGE.map((img) => (
              <img key={img.src} className={styles.collagePhoto} src={img.src} alt={img.alt} loading="lazy" />
            ))}
          </div>

          <p className={styles.accentQuote}>
            Good trips
            <br />
            are better
            <br />
            shared.
          </p>
        </div>

        <div className="reveal d2">
          <div className={`${styles.form}${submitted ? ` ${styles.sent}` : ""}`} id="referForm">
            <div className={styles.formBody}>
              {!signedIn ? (
                <div className={styles.signinPanel}>
                  <h3>Sign in to refer a friend.</h3>
                  <p>Sign in with the email on your invitation, then send one of your own.</p>
                  <button
                    type="button"
                    className={`btn btn-gold ${styles.submitBtn}`}
                    onClick={() => signInModal.open("Sign in to refer a friend.")}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.formEyebrow}>Refer a friend</div>
                  <h3 className={styles.formHeading}>
                    Invite your friends
                    <br />
                    to explore the world.
                  </h3>
                  <p className={styles.formSub}>
                    Share TripAgent with your friends and family. They'll get exclusive travel perks, and you'll earn
                    rewards too.
                  </p>
                  <form id="referLeadForm" noValidate onSubmit={handleSubmit} ref={formRef}>
                    <div className="rf-field">
                      <label htmlFor="refer-friend-name">Friend's name *</label>
                      <input
                        id="refer-friend-name"
                        type="text"
                        name="friend_name"
                        placeholder="Enter your friend's name"
                        autoComplete="off"
                      />
                      <div className={styles.fieldErr} aria-live="polite">
                        {nameErr}
                      </div>
                    </div>
                    <div className="rf-field">
                      <label htmlFor="refer-friend-email">Friend's email *</label>
                      <input
                        id="refer-friend-email"
                        type="email"
                        name="friend_email"
                        placeholder="Enter your friend's email address"
                        autoComplete="off"
                        inputMode="email"
                      />
                      <div className={styles.fieldErr} aria-live="polite">
                        {emailErr}
                      </div>
                    </div>
                    <div className="rf-field">
                      <label htmlFor="refer-friend-phone">Friend's mobile number *</label>
                      <div className={styles.phoneRow}>
                        <select name="country_code" defaultValue="+91" aria-label="Country code">
                          {COUNTRY_CODES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          id="refer-friend-phone"
                          type="tel"
                          name="friend_phone"
                          placeholder="Enter mobile number"
                          autoComplete="off"
                          inputMode="tel"
                        />
                      </div>
                      <div className={styles.fieldErr} aria-live="polite">
                        {phoneErr}
                      </div>
                    </div>

                    <div className={styles.rewardPanel}>
                      <span className={styles.rewardIcon} aria-hidden="true">
                        <Gift size={18} strokeWidth={1.7} />
                      </span>
                      <p className={styles.rewardText}>
                        Once your friend signs up, they'll get exclusive travel perks. And you'll earn rewards too!
                      </p>
                    </div>

                    <div className={styles.fieldErr} aria-live="polite" style={{ marginBottom: 10 }}>
                      {submitErr}
                    </div>

                    <button type="submit" className={`btn btn-gold ${styles.submitBtn}`} disabled={submitting}>
                      {submitting ? (
                        "Sending…"
                      ) : (
                        <>
                          Send invitation <span className={styles.arrow}>→</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
            <div
              className={`${styles.thanks}${submitted ? ` ${styles.show}` : ""}`}
              role="status"
              aria-live="polite"
              tabIndex={-1}
              ref={thanksRef}
            >
              <span className={styles.thanksIcon} aria-hidden="true">
                <CheckCircle2 size={28} strokeWidth={1.7} />
              </span>
              <h3 className={styles.thanksHeading}>Invitation sent.</h3>
              <p className={styles.thanksBody}>
                Your invitation is on its way. We hope you and your friend have many great journeys ahead.
              </p>
              <button type="button" className={`btn btn-ghost ${styles.resetBtn}`} onClick={resetForm}>
                Refer another friend
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
