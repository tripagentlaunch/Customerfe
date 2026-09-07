import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import enquireData from "../data/enquire.generated.json";
import type { EnquirePageData } from "../types/enquire";
import { useScrollReveal } from "../lib/useScrollReveal";
import { useNavVariant } from "../lib/navVariant";
import { titleCase } from "../lib/tripState";
import { useAuth } from "../lib/auth";
import { useSignInModal } from "../lib/signInModal";
import styles from "./enquire-page.module.css";

const data = enquireData as unknown as EnquirePageData;

// Same-origin in prod (mirrors concierge-chat/src/api.ts's
// PROD_DEFAULT_ENDPOINT convention) — set VITE_API_BASE_URL for local dev,
// where the backend runs on its own port.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

// Phase A: gated behind sign-in (site_members already holds name/email/
// phone — enquiries.member_id links to that row server-side, resolved from
// the caller's session token, never duplicated onto the enquiry itself).
// Submits into the real `enquiries` table via POST /enquiries
// (backend/app/routers/enquiry_router.py). The "Not quite live yet" panel
// now only shows on a genuine submission failure (network error, backend
// down, session rejected) — not unconditionally.
export default function EnquirePage() {
  useNavVariant("solid");
  const { signedIn, session } = useAuth();
  const signInModal = useSignInModal();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notLive, setNotLive] = useState(false);
  const thanksRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const showThanks = submitted || notLive;

  // Carries context from "Talk to your advisor" links/floating button/trip
  // handoff (?dest=<city-slug> or ?shortlist=<slug,slug>) into the
  // destination field — the fallback path when WhatsApp isn't configured
  // still needs to arrive pre-filled, per the CONVERT KRA.
  const dest = searchParams.get("dest");
  const shortlist = searchParams.get("shortlist");
  const destPrefill = dest ? titleCase(dest) : shortlist ? shortlist.split(",").map(titleCase).join(", ") : "";

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  useEffect(() => {
    if (!showThanks) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      thanksRef.current?.focus({ preventScroll: true });
    } catch {
      // no-op
    }
  }, [showThanks]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!signedIn || !session) {
      signInModal.open("Sign in to send your enquiry.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const travellersRaw = fd.get("travellers");
    const body = {
      destination: (fd.get("destination") as string) || undefined,
      dates: (fd.get("dates") as string) || undefined,
      travellers: travellersRaw ? Number(travellersRaw) : undefined,
      trip_type: (fd.get("trip_type") as string) || undefined,
      cabin: (fd.get("cabin") as string) || undefined,
      budget: (fd.get("budget") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    };
    try {
      const res = await fetch(`${API_BASE}/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`enquiry submit failed: ${res.status}`);
      setSubmitted(true);
    } catch {
      setNotLive(true);
    } finally {
      setSubmitting(false);
    }
  }

  const { aside, form } = data;

  return (
    <>
      <section id="ta-intent" aria-label="Open a trip you've already decided on" />

      <section>
        <div className={`wrap ${styles.enqWrap}`}>
          <div className={`${styles.enqAside} reveal`}>
            <div className="eyebrow">{aside.eyebrow}</div>
            <div className="rule" />
            <h1
              style={{ fontFamily: "var(--logo)", fontWeight: 500, fontSize: "clamp(38px,5vw,72px)", lineHeight: 1.04 }}
              dangerouslySetInnerHTML={{ __html: aside.headingHtml ?? "" }}
            />
            <p className="lede" style={{ marginTop: 20 }}>
              {aside.lede}
            </p>
            <ul className="incl" style={{ marginTop: 28 }}>
              {aside.incl.map((line, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="reveal d2">
            <div className={`${styles.form}${showThanks ? ` ${styles.sent}` : ""}`} id="enquireForm">
              {!signedIn ? (
                <div className={styles.formBody}>
                  <h3 style={{ fontSize: 26, marginBottom: 4 }}>Sign in to send your enquiry.</h3>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
                    TripAgent is by invitation — sign in with the email on your invitation so your advisor knows
                    exactly who's reaching out.
                  </p>
                  <button
                    type="button"
                    className="btn btn-gold"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => signInModal.open("Sign in to send your enquiry.")}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
              <div className={styles.formBody}>
                <h3 style={{ fontSize: 26, marginBottom: 4 }}>{form.heading}</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 22 }}>
                  {form.muted}
                </p>
                <form id="leadForm" noValidate onSubmit={handleSubmit}>
                  {form.fields.map((f) => (
                    <div className="field" key={f.id}>
                      <label htmlFor={f.id ?? undefined} dangerouslySetInnerHTML={{ __html: f.labelHtml ?? "" }} />
                      {f.tag === "select" ? (
                        <select id={f.id ?? undefined} name={f.name ?? undefined}>
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : f.tag === "textarea" ? (
                        <textarea id={f.id ?? undefined} name={f.name ?? undefined} rows={3} placeholder={f.placeholder ?? undefined} />
                      ) : (
                        <input
                          id={f.id ?? undefined}
                          type={f.type ?? "text"}
                          name={f.name ?? undefined}
                          required={f.required}
                          placeholder={f.placeholder ?? undefined}
                          defaultValue={f.id === "f-dest" && destPrefill ? destPrefill : undefined}
                        />
                      )}
                    </div>
                  ))}
                  <div className={styles.trust} style={{ margin: "2px 0 14px" }}>
                    {form.trust}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-gold"
                    style={{ width: "100%", justifyContent: "center" }}
                    disabled={submitting}
                  >
                    {submitting ? "Sending…" : form.submitLabel}
                  </button>
                </form>
                <div style={{ textAlign: "center", marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--line-soft)" }}>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
                    {form.emailPrompt}
                  </p>
                  <a className="btn btn-ghost" href={form.emailCta.href} style={{ width: "100%", justifyContent: "center" }}>
                    {form.emailCta.label}
                  </a>
                </div>
              </div>
              )}
              <div className={`${styles.thanks}${showThanks ? ` ${styles.show}` : ""}`} role="status" aria-live="polite" tabIndex={-1} ref={thanksRef}>
                <svg width={54} height={54} viewBox="0 0 420 420" fill="none" style={{ margin: "0 auto 18px" }}>
                  <g stroke="#785C12" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M140,150 L280,150" />
                    <path d="M210,150 L210,212" />
                    <path d="M140,300 L210,212 L280,300" />
                    <path d="M174,256 L246,256" />
                  </g>
                </svg>
                {submitted ? (
                  <>
                    <h3 style={{ fontSize: 30 }}>Thank you — we've got it.</h3>
                    <p className="lede" style={{ margin: "12px auto 8px", maxWidth: "40ch" }}>
                      Your advisor will be in touch shortly to help shape this trip.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 style={{ fontSize: 30 }}>Not quite live yet.</h3>
                    <p className="lede" style={{ margin: "12px auto 8px", maxWidth: "40ch" }}>
                      Enquiry submission is on its way. For now, please write to your advisor directly and they'll pick it up right away.
                    </p>
                    <a className="btn btn-gold" href={form.emailCta.href}>
                      {form.emailCta.label}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
