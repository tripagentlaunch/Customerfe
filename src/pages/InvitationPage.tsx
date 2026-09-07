import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import invitationData from "../data/invitation.generated.json";
import type { InvitationPageData } from "../types/invitation";
import { useScrollReveal } from "../lib/useScrollReveal";
import styles from "./invitation-page.module.css";

const data = invitationData as unknown as InvitationPageData;

const EMAIL_CTA_HREF = "mailto:maison@tripsure.com";
const EMAIL_CTA_LABEL = "Email your advisor";

// Same-origin in prod, VITE_API_BASE_URL for local dev — mirrors
// EnquirePage.tsx's API_BASE convention (itself matching
// concierge-chat/src/api.ts's PROD_DEFAULT_ENDPOINT pattern). Points at the
// real, deployed backend/app/routers/invite_router.py.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type RedeemResponse = {
  valid?: boolean;
  used?: boolean;
  error?: string;
  months?: number;
  memberId?: string | null;
  advisorName?: string | null;
};

// TODO(backend): three endpoints still need real wiring before this page
// goes fully live (redeem — item 1 below — is now wired). Each currently
// shows a visible "not live yet" message instead of calling out — see the
// handleXxxSubmit functions below, each has a single
// `// TODO(backend): wire here` marking exactly where the real call goes.
//
//   2. site-signup (TA_INVITE.capture) — attaches captured member details
//      (name/phone/email/city) to the redeemed membership. The legacy
//      source posts to TA_API.base, which is hardcoded to the stale
//      Supabase project ref documented in app/.env.example's header
//      comment (superseded by the live project referenced in
//      app/.env.local). Needs both a real endpoint AND the corrected
//      project ref.
//
//   3. site-lead — the same Supabase edge function EnquirePage.tsx already
//      defers; the "Request an invitation" fallback form posts here. Same
//      stale-ref fix as above applies.
//
//   4. site-pay — Razorpay card-on-file setup (zero-amount authorisation).
//      Explicitly a stub in the source itself ("TEAM INTEGRATION POINT:
//      Razorpay card-capture element") — needs a Razorpay key_id/order_id
//      from the backend before any real UI work here is meaningful. The
//      card step's own "Enter the maison"/"Later" buttons don't call this
//      themselves (same as source — they're pure navigation), so nothing
//      to defer there beyond the stub copy already being honest about it.

type StepKey = "code" | "reveal" | "capture" | "card" | "welcome";

const CODE_FILTER = /[^A-Z0-9]/g;

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function InvitationPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);
  useScrollReveal([]);
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<StepKey>("code");

  function show(next: StepKey) {
    setStep(next);
    try {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    } catch {
      // no-op
    }
  }

  // ---------------- STEP 1 — code entry ----------------
  const segRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);
  const [filled, setFilled] = useState([false, false, false, false]);
  const [ann, setAnn] = useState<{ text: string; kind: "hint" | "err" } | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redemption, setRedemption] = useState<{
    months: number;
    memberId: string | null;
    advisorName: string | null;
  } | null>(null);
  // Segment inputs (segRefs) unmount once step leaves "code" — the redeemed
  // code has to be captured into state here so the capture step can still
  // send it (the backend re-validates memberId against this exact code).
  const [redeemedCode, setRedeemedCode] = useState<string | null>(null);

  function fullCode() {
    return segRefs.current.map((el) => el?.value ?? "").join("");
  }

  function setSegValue(i: number, v: string) {
    const el = segRefs.current[i];
    if (!el) return;
    el.value = v;
    setFilled((prev) => {
      const next = [...prev];
      next[i] = v.length === 4;
      return next;
    });
  }

  function handleSegInput(i: number) {
    const el = segRefs.current[i];
    if (!el) return;
    const v = el.value.toUpperCase().replace(CODE_FILTER, "").slice(0, 4);
    setSegValue(i, v);
    setAnn(null);
    if (v.length === 4 && i < 3) {
      const next = segRefs.current[i + 1];
      next?.focus();
      next?.select();
    }
  }

  function handleSegKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const el = segRefs.current[i];
    if (!el) return;
    if (e.key === "Backspace" && el.value === "" && i > 0) {
      e.preventDefault();
      const prev = segRefs.current[i - 1];
      prev?.focus();
      if (prev) setSegValue(i - 1, prev.value.slice(0, -1));
    }
    if (e.key === "ArrowLeft" && el.selectionStart === 0 && i > 0) segRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && el.selectionStart === el.value.length && i < 3) segRefs.current[i + 1]?.focus();
  }

  function distributeCode(clean: string, focusPreference: "last-filled" | "none") {
    for (let k = 0; k < 4; k++) {
      setSegValue(k, clean.slice(k * 4, k * 4 + 4));
    }
    if (focusPreference === "last-filled") {
      const last = Math.min(3, Math.max(0, Math.floor((clean.length - 1) / 4)));
      segRefs.current[last]?.focus();
    }
  }

  function handleSegPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const raw = e.clipboardData.getData("text") || "";
    const clean = raw.toUpperCase().replace(CODE_FILTER, "");
    if (!clean) return;
    distributeCode(clean, "last-filled");
    setAnn(null);
  }

  // Auto-fill (never auto-submit) a key carried in ?code= — e.g. an emailed
  // per-customer invite link. The visitor still has to click "Open the
  // door" themselves.
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("code") || "";
      const clean = raw.toUpperCase().replace(CODE_FILTER, "");
      if (!clean) {
        segRefs.current[0]?.focus({ preventScroll: true });
        return;
      }
      distributeCode(clean, "last-filled");
    } catch {
      segRefs.current[0]?.focus({ preventScroll: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update the reveal step's <b id="revealMonths"> with the real,
  // backend-authoritative month count once it's known — dangerouslySetInnerHTML
  // can't take a dynamic child, so this mirrors the legacy source's direct
  // DOM write (invitation.html: `document.getElementById('revealMonths').textContent = word`).
  useEffect(() => {
    if (step !== "reveal" || !redemption) return;
    const el = document.getElementById("revealMonths");
    if (!el) return;
    const m = redemption.months;
    el.textContent = `${m} month${m === 1 ? "" : "s"}`;
  }, [step, redemption]);

  async function handleKeySubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = fullCode();
    if (code.length < 16) {
      setAnn({ text: "Your key has 16 characters — a few are still missing.", kind: "hint" });
      const firstIncomplete = segRefs.current.find((el) => el && el.value.length < 4);
      (firstIncomplete ?? segRefs.current[0])?.focus();
      return;
    }
    if (redeeming) return;
    setAnn({ text: "Verifying your key…", kind: "hint" });
    setRedeeming(true);
    try {
      const res = await fetch(`${API_BASE}/invite/${encodeURIComponent(code)}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setAnn({ text: "We couldn't reach the door just now. Please try again in a moment.", kind: "err" });
        return;
      }
      const data = (await res.json()) as RedeemResponse;
      const months = Number(data.months);
      // GUARDRAIL: validity + free-months are decided by the backend only —
      // a "valid" response with no usable months is never trusted or
      // defaulted client-side.
      if (data.valid === true && Number.isFinite(months) && months >= 1 && months <= 24) {
        setAnn(null);
        setRedemption({ months, memberId: data.memberId ?? null, advisorName: data.advisorName ?? null });
        setRedeemedCode(code);
        show("reveal");
        return;
      }
      if (data.used === true) {
        setAnn({ text: "This invitation has already been opened.", kind: "err" });
        return;
      }
      setAnn({ text: "That key isn't recognised.", kind: "err" });
    } catch {
      setAnn({ text: "We couldn't reach the door just now. Please try again in a moment.", kind: "err" });
    } finally {
      setRedeeming(false);
    }
  }

  // ---------------- STEP 2 → 3 ----------------
  function handleContinue() {
    show("capture");
  }

  // ---------------- STEP 3 — member capture ----------------
  // Attaches the captured details to the site_members row redeem() already
  // created — NOT the separate, richer `members` table enquiry_router.py
  // uses (that one keys off auth_user_id post-sign-in and has no bearing on
  // an unauthenticated invite redemption). Confirmed against invite_service.py:
  // redeem_invite()'s returned memberId is a site_members.id.
  const [capturing, setCapturing] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);
  const [member, setMember] = useState<{ name: string } | null>(null);

  async function handleCapSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (capturing) return;
    const fd = new FormData(form);
    const payload = {
      code: redeemedCode,
      memberId: redemption?.memberId ?? null,
      name: fd.get("name"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      city: fd.get("city"),
    };
    setCapError(null);
    setCapturing(true);
    try {
      const res = await fetch(`${API_BASE}/invite/${encodeURIComponent(redeemedCode ?? "")}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setCapError("We couldn't reach the door just now. Please try again in a moment.");
        return;
      }
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok === true) {
        setMember({ name: String(fd.get("name") ?? "") });
        show("card");
        return;
      }
      if (data.error === "bad_email") {
        setCapError("Please enter a valid email.");
      } else if (data.error === "email_taken") {
        setCapError("That email is already attached to another membership. Please use a different one, or reach us on WhatsApp.");
      } else {
        setCapError("Something went wrong saving your details. Please try again, or reach us on WhatsApp.");
      }
    } catch {
      setCapError("We couldn't reach the door just now. Please try again in a moment.");
    } finally {
      setCapturing(false);
    }
  }

  // ---------------- STEP 4 — card on file ----------------
  // Pure navigation in the source too (no backend call happens on either
  // button — the real Razorpay mount, TODO item 4, only calls site-pay once
  // a person actually adds a card, which this stub can't do), so nothing to
  // defer here beyond the stub copy already being honest about it.
  function finishToWelcome() {
    show("welcome");
  }

  // ---------------- Request an invitation (site-lead) ----------------
  const [reqOpen, setReqOpen] = useState(false);
  const [reqDeferred, setReqDeferred] = useState(false);
  const reqNameRef = useRef<HTMLInputElement>(null);
  const reqThanksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reqOpen) {
      try {
        reqNameRef.current?.focus();
      } catch {
        // no-op
      }
    }
  }, [reqOpen]);

  useEffect(() => {
    if (reqDeferred) {
      try {
        reqThanksRef.current?.focus({ preventScroll: true });
      } catch {
        // no-op
      }
    }
  }, [reqDeferred]);

  function handleReqSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO(backend): wire here — replace this branch with the real
    // TA_API.post('site-lead', ...) call (file-header TODO, item 3) — same
    // endpoint EnquirePage.tsx already defers.
    setReqDeferred(true);
  }

  return (
    <>
      <section className={styles.gate} id="gate">
        <div className={styles.gateInner}>
          {/* STEP 1 — the threshold / code entry */}
          {step === "code" && (
            <div>
              <div className={`${styles.seal}`} id="codeSeal">
                <span className={styles.ring} aria-hidden="true" />
                <SealMark />
              </div>
              <div className="eyebrow">{data.step1.eyebrow}</div>
              <h1 dangerouslySetInnerHTML={{ __html: data.step1.headingHtml ?? "" }} />
              <hr className={styles.hair} />
              <p className="lede">{data.step1.lede}</p>

              <form onSubmit={handleKeySubmit} noValidate>
                <div className={styles.keylabel} id="codeLabel">
                  {data.step1.keyLabel}
                </div>
                <div className={styles.segs} role="group" aria-labelledby="codeLabel">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`${styles.seg}${filled[i] ? ` ${styles.filled}` : ""}`}>
                      {i > 0 && <span className={styles.dash} aria-hidden="true" />}
                      <input
                        ref={(el) => {
                          segRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="text"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        maxLength={4}
                        placeholder="••••"
                        aria-label={`Key, group ${i + 1} of 4`}
                        spellCheck={false}
                        onInput={() => handleSegInput(i)}
                        onKeyDown={(e) => handleSegKeyDown(i, e)}
                        onPaste={handleSegPaste}
                      />
                    </div>
                  ))}
                </div>
                <div className={`${styles.ann}${ann ? ` ${ann.kind === "err" ? styles.annErr : styles.annHint}` : ""}`} aria-live="polite">
                  {ann?.text}
                </div>
                <div className={styles.ctaRow}>
                  <button type="submit" className="btn btn-gold" disabled={redeeming}>
                    {redeeming ? "Verifying…" : data.step1.openLabel}
                  </button>
                </div>
              </form>

              <div className={styles.byinv}>
                {data.step1.requestPromptText}{" "}
                <button type="button" className={styles.byinvLink} onClick={() => setReqOpen((v) => !v)}>
                  {data.step1.requestLinkLabel}
                </button>
              </div>
              <p className={styles.scarcity}>{data.step1.scarcity}</p>

              {reqOpen && !reqDeferred && (
                <form className={styles.capform} onSubmit={handleReqSubmit} noValidate>
                  <p style={{ fontFamily: "var(--fr)", fontSize: 13.5, color: "rgba(246,241,230,.6)", lineHeight: 1.6, margin: "0 0 22px" }}>
                    {data.step1.requestForm.introText}
                  </p>
                  {data.step1.requestForm.fields.map((f) => (
                    <div className={styles.fld} key={f.id}>
                      <label htmlFor={f.id ?? undefined} dangerouslySetInnerHTML={{ __html: f.labelHtml ?? "" }} />
                      <input
                        ref={f.id === "rq-name" ? reqNameRef : undefined}
                        id={f.id ?? undefined}
                        type={f.type ?? "text"}
                        placeholder={f.placeholder ?? undefined}
                      />
                    </div>
                  ))}
                  <div className={styles.ctaRow} style={{ marginTop: 6 }}>
                    <button type="submit" className="btn btn-gold">
                      {data.step1.requestForm.submitLabel}
                    </button>
                  </div>
                </form>
              )}
              {reqDeferred && (
                <div className={styles.deferredNote} role="status" aria-live="polite" tabIndex={-1} ref={reqThanksRef}>
                  Not quite live yet — request submission is on its way. For now, please write to your advisor directly
                  and they'll pick it up right away.
                  <div style={{ marginTop: 14 }}>
                    <a className="btn btn-gold" href={EMAIL_CTA_HREF}>
                      {EMAIL_CTA_LABEL}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — the reveal (ceremony peak) */}
          {step === "reveal" && (
            <div className={styles.stagger}>
              <div className={styles.seal} id="revealSeal">
                <span className={styles.ring} aria-hidden="true" />
                <SealMark />
              </div>
              <div className="eyebrow">{data.step2.eyebrow}</div>
              {/* headingHtml already carries the extracted <b id="revealMonths">—</b> —
                  real months are backend-authoritative and never invented client-side;
                  the em dash placeholder is replaced with the real count by the
                  useEffect above once redeem() succeeds. */}
              <h2 className={styles.gift} dangerouslySetInnerHTML={{ __html: data.step2.headingHtml ?? "" }} />
              <hr className={styles.hair} />
              <p className="lede">{data.step2.lede}</p>
              <div className={styles.ctaRow}>
                <button type="button" className="btn btn-gold" onClick={handleContinue}>
                  {data.step2.continueLabel}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — member capture */}
          {step === "capture" && (
            <div>
              <div className="eyebrow">{data.step3.eyebrow}</div>
              <h2 style={{ fontSize: "clamp(32px,4.4vw,54px)" }} dangerouslySetInnerHTML={{ __html: data.step3.headingHtml ?? "" }} />
              <form className={styles.capform} noValidate onSubmit={handleCapSubmit}>
                {data.step3.fields.map((f) => (
                  <div className={styles.fld} key={f.id}>
                    <label htmlFor={f.id ?? undefined} dangerouslySetInnerHTML={{ __html: f.labelHtml ?? "" }} />
                    <input
                      id={f.id ?? undefined}
                      name={f.name ?? undefined}
                      type={f.type ?? "text"}
                      required={f.required}
                      placeholder={f.placeholder ?? undefined}
                    />
                    {f.sub && <div className={styles.fldSub}>{f.sub}</div>}
                  </div>
                ))}
                {capError && (
                  <div className={`${styles.ann} ${styles.annErr}`} role="alert" aria-live="polite" style={{ marginBottom: 14 }}>
                    {capError}
                  </div>
                )}
                <div className={styles.ctaRow}>
                  <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={capturing}>
                    {capturing ? "Saving…" : data.step3.submitLabel}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 4 — card on file (Razorpay card-capture mounts here) */}
          {step === "card" && (
            <div>
              <div className="eyebrow">{data.step4.eyebrow}</div>
              <h2 style={{ fontSize: "clamp(32px,4.4vw,54px)" }} dangerouslySetInnerHTML={{ __html: data.step4.headingHtml ?? "" }} />
              <hr className={styles.hair} />
              <p className="lede">{data.step4.lede}</p>
              <div className={styles.cardstub}>
                <span className={styles.stubtag}>{data.step4.stubTag}</span>
                <div className={styles.rz}>
                  <div className={styles.box}>Card number · expiry · CVC</div>
                </div>
                <p className={styles.charge} dangerouslySetInnerHTML={{ __html: data.step4.chargeLineTemplate ?? "" }} />
                <p className={styles.charge} style={{ marginTop: 8 }}>
                  {data.step4.chargeNote}
                </p>
              </div>
              <div className={styles.ctaRow}>
                <button type="button" className="btn btn-gold" style={{ minWidth: 240 }} onClick={finishToWelcome}>
                  {data.step4.enterLabel}
                </button>
              </div>
              <div style={{ marginTop: 14 }}>
                <button type="button" className="btn btn-ghost on-dark" style={{ minWidth: 240 }} onClick={finishToWelcome}>
                  {data.step4.laterLabel}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 — welcome + hand-off */}
          {step === "welcome" && (
            <div>
              <div className={styles.seal} style={reducedMotion ? undefined : { animation: "sealrise 1s var(--ease) both" }}>
                <span className={styles.ring} aria-hidden="true" />
                <SealMark />
              </div>
              <div className="eyebrow">{data.step5.eyebrow}</div>
              <h2>{member?.name ? `You're a member, ${member.name.trim().split(/\s+/)[0]}.` : data.step5.defaultHeading}</h2>
              <hr className={styles.hair} />
              <p className="lede">{data.step5.defaultAdvisorLine}</p>
              <div className={styles.ctaRow}>
                <Link className="btn btn-gold on-dark" to="/enquire">
                  {data.step5.fallbackCtaLabel}
                </Link>
              </div>
              <div className={styles.sig}>{data.step5.signature}</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function SealMark() {
  return (
    <svg width={32} height={32} viewBox="0 0 420 420" fill="none">
      <g strokeWidth={24} strokeLinecap="round" strokeLinejoin="round">
        <path d="M140,150 L280,150" />
        <path d="M210,150 L210,212" />
        <path d="M140,300 L210,212 L280,300" />
        <path d="M174,256 L246,256" />
      </g>
    </svg>
  );
}
