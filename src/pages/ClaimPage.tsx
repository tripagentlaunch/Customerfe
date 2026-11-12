import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBareChromeForGuests } from "../lib/bareChrome";
import { useAuth } from "../lib/auth";
import { askForOrigin, canAskForOrigin, declineOrigin, type Position } from "../lib/origin";
import { useSignInModal } from "../lib/signInModal";
import { useWhatsAppNumber } from "../lib/useWhatsAppNumber";
import { cleanCode, codeFromSearch, firstName, prettyCode, seatBody, seatDetailsProblem, welcomeMessage, whatsappLink } from "../lib/inviteCode";
// import { useIsMobile } from "../hooks/useIsMobile"; // no longer needed: phones use the desktop layout
import styles from "./claim-page.module.css";

// Ported from claim.html — the 8-digit-code redemption page (distinct from
// invitation.html's 8-character, 4-step ceremony: InvitationPage.tsx).
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
  // Super key only: the id of this entry, which the location answer is filed against.
  entryId?: string | null;
  // A shared invitation: this person must give their own name and email to take one of the free seats.
  seatsLeft?: number;
  // Who the person is, for the welcome message to their advisor.
  name?: string | null;
};

// What the server says about a code before it is claimed (GET /invite/{code}): lets a link open on a greeting and one button.
type Peek = {
  found: boolean;
  firstName?: string;
  used?: boolean;
  expired?: boolean;
  joinable?: boolean;
  seatsLeft?: number;
  superKey?: boolean;
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

// Desktop (2026-10-28, direct request): the card, inputs and buttons take the
// request-access screen's look (dark frosted glass, square white button +
// outline glass button side by side, no arrows). The page keeps its own
// video / fallback photo and its centred layout. Phones are unchanged.
// (A logo mark was tried top-left and removed; this page has no logo.)

export default function ClaimPage() {
  useBareChromeForGuests();
  // 2026-10-29 (direct request): phones show the desktop layout too (the two buttons side by side, no arrow).
  // Was: const desk = !useIsMobile();
  const desk = true;

  useEffect(() => {
    document.title = "Claim your invitation | TripAgent";
  }, []);

  const navigate = useNavigate();
  const { refresh, signedIn, loading } = useAuth();
  const signIn = useSignInModal();
  const [claimedAlready, setClaimedAlready] = useState(false);
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

  // The code a link carries, read once: the first paint already shows the greeting, not an empty box for a moment.
  const [linkedCode] = useState(() => (typeof window === "undefined" ? "" : codeFromSearch(window.location.search)));
  const [code, setCode] = useState(linkedCode);
  // A link carries the code: the page then opens on a greeting and a single button instead of an empty box.
  const [peek, setPeek] = useState<Peek | null>(null);
  const [peeked, setPeeked] = useState(false);
  const [typeCode, setTypeCode] = useState(false); // "Use a different code" shows the box again
  // Joining a shared invitation: the person's own details (the approved person's are not theirs).
  const [needsJoin, setNeedsJoin] = useState(false);
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [jName, setJName] = useState("");
  const [jEmail, setJEmail] = useState("");
  const [jPhone, setJPhone] = useState("");
  // After claiming: who their advisor is, and the WhatsApp number of the desk, for the welcome.
  const [arrived, setArrived] = useState(false);
  const [welcome, setWelcome] = useState<{ advisor: string | null; name: string | null } | null>(null);
  const whatsappNumber = useWhatsAppNumber();
  const [ann, setAnn] = useState<{ text: string; kind: "hint" | "err" | "busy" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  // After the code is accepted: "Allow location" / "Don't allow" before the
  // homepage (2026-10-24, direct request). locating = the browser's own prompt
  // is up; choiceRef resumes handleSubmit once they have chosen.
  const [askLocation, setAskLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const choiceRef = useRef<(() => void) | null>(null);
  const allowRef = useRef<HTMLButtonElement>(null);
  const entryIdRef = useRef<string | null>(null);

  // A super key entry also reports the location answer, so the admin console can
  // show where the visitor came in from. Fire and forget: the visitor never waits on it.
  function reportLocation(code: string, pos: Position | null) {
    const entryId = entryIdRef.current;
    if (!entryId) return;
    try {
      void fetch(`/invite/${encodeURIComponent(code)}/location`, {
        method: "POST",
        credentials: "include",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pos ? { entryId, allowed: true, lat: pos.lat, lng: pos.lng } : { entryId, allowed: false }),
      }).catch(() => {});
    } catch {
      // not reported: the visitor is unaffected
    }
  }

  async function onAllowLocation() {
    if (locating) return;
    setLocating(true);
    const pos = await askForOrigin(); // resolves when the browser has answered
    reportLocation(code.toUpperCase().replace(/[^A-Z0-9]/g, ""), pos);
    choiceRef.current?.();
  }

  function onDenyLocation() {
    if (locating) return;
    declineOrigin();
    reportLocation(code.toUpperCase().replace(/[^A-Z0-9]/g, ""), null);
    choiceRef.current?.();
  }

  // Already a signed-in member (e.g. reopened the email link): nothing to
  // claim — straight to the home page. Not while this page's own claim is
  // finishing, which navigates on its own after the welcome.
  useEffect(() => {
    if (!loading && signedIn && !claimed && !busy) navigate("/", { replace: true });
  }, [loading, signedIn, claimed, busy, navigate]);

  // A code carried in ?code= is filled in, never claimed by itself (a mail scanner or a link preview opening the link
  // must not use up someone's invitation). The page asks the server about it so it can greet the person by name and
  // say at once if it is already claimed or has ended; they then claim with one tap.
  useEffect(() => {
    let live = true;
    const fromLink = codeFromSearch(window.location.search);
    if (fromLink) {
      setCode(fromLink);
      fetch(`/invite/${encodeURIComponent(fromLink)}`, { credentials: "include" })
        .then((r) => (r.ok ? (r.json() as Promise<Peek>) : null))
        .then((p) => {
          if (!live) return;
          setPeek(p && p.found ? p : null);
          if (p && p.found) {
            if (p.used) {
              setAnn({ text: "This code has already been claimed. Please sign in with your email.", kind: "err" });
              setClaimedAlready(true);
            } else if (p.expired) {
              setAnn({ text: "This invitation has expired. Please reach us on WhatsApp or write to invite@tripagent.vip for a new one.", kind: "err" });
            }
            if (p.joinable) {
              setNeedsJoin(true);
              setSeatsLeft(p.seatsLeft ?? null);
            }
          }
        })
        .catch(() => undefined) // no peek: the page works as before, with the code box
        .finally(() => live && setPeeked(true));
    } else {
      setPeeked(true);
      inputRef.current?.focus({ preventScroll: true });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Alphanumeric, not digits-only (2026-09-29 fix) — invite codes now
    // include letters (e.g. BH0325AN), matching handleSubmit's own
    // .toUpperCase().replace(/[^A-Z0-9]/g, "") sanitization below.
    // No maxLength on the input (2026-10-12): the browser cut a paste to 8
    // characters before this cleanup ran, so "K E 1 1 8 B H" (a key copied
    // with spaces) became "KE11". Cleaned first, then trimmed to 8.
    setCode(cleanCode(e.target.value));
    setAnn(null);
    setClaimedAlready(false);
    setNeedsJoin(false);
  }

  // Redeems against the same backend endpoint, same fail-safe contract, as
  // invitation.html's redeem step — POST {API_BASE}/invite/{code}/redeem.
  // No capture step here (deliberately, matching the source): member
  // profile details aren't collected at this step.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 8) {
      setAnn({ text: "Your code has 8 characters: a few are still missing.", kind: "hint" });
      inputRef.current?.focus();
      return;
    }
    if (busy) return;
    let body = {};
    if (needsJoin) {
      const problem = seatDetailsProblem({ name: jName, email: jEmail, phone: jPhone });
      if (problem) {
        setAnn({ text: problem, kind: "err" });
        return;
      }
      body = seatBody({ name: jName, email: jEmail, phone: jPhone });
    }

    setBusy(true);
    setAnn({ text: needsJoin ? "Taking your seat…" : "Verifying your code…", kind: "busy" });

    const clean = cleanCode(code);
    const [res] = await Promise.all([
      (async (): Promise<RedeemResponse> => {
        // The backend can be asleep or mid-deploy (2026-10-13): the request
        // then fails outright or comes back 502-504, which used to read as
        // a wrong code. Retried a few times; a retry after a redeem that did
        // go through finds the code already claimed (the member then signs in with their email).
        const waits = [1500, 4000, 8000];
        for (let attempt = 0; ; attempt++) {
          try {
            const r = await fetch(`/invite/${encodeURIComponent(clean)}/redeem`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            if (r.ok) return (await r.json()) as RedeemResponse;
            if (r.status === 429) return { valid: false, error: "too_many" };
            if (r.status < 502 || attempt >= waits.length) return { valid: false, error: "network" };
          } catch {
            if (attempt >= waits.length) return { valid: false, error: "network" };
          }
          await new Promise((w) => setTimeout(w, waits[attempt]));
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
      entryIdRef.current = res.entryId || null;
      setWelcome({ advisor: res.advisorName || null, name: res.name || null });
      setClaimed(true);
      try {
        welcomeRef.current?.focus({ preventScroll: true });
      } catch {
        // no-op
      }
      // The redeem response set the session cookie server-side; refresh
      // the auth state from it while the welcome shows, so the home page
      // opens signed in (full site chrome, profile) instead of as a guest
      // until the next reload.
      // A code entry is a new 90-day login: restart the site's own clock
      // too (auth.tsx only stamps when none exists), matching the backend.
      try {
        localStorage.removeItem("ta_session_started_at");
      } catch {
        // storage unavailable
      }
      const refreshed = refresh();
      if (canAskForOrigin()) {
        // Ask where they are flying from before the homepage; the session
        // refresh runs meanwhile. A browser with no location support skips this.
        await new Promise<void>((resolve) => {
          choiceRef.current = resolve;
          setAskLocation(true);
          window.setTimeout(() => allowRef.current?.focus({ preventScroll: true }), 50);
        });
        setAskLocation(false);
        await Promise.all([refreshed, new Promise((r) => setTimeout(r, 700))]);
      } else {
        await Promise.all([refreshed, new Promise((r) => setTimeout(r, 900))]);
      }
      // The welcome stays until they choose to go in: it names their advisor and offers one tap to say hello on WhatsApp.
      setArrived(true);
      return;
    }
    if (res.used === true) {
      setAnn({ text: "This code has already been claimed. Please sign in with your email.", kind: "err" });
      setClaimedAlready(true);
    } else if (res.error === "needs_details") {
      // A shared invitation that someone has already claimed: this person takes a seat of their own.
      setNeedsJoin(true);
      setSeatsLeft(res.seatsLeft ?? null);
      setAnn({ text: "This invitation has room for you. Tell us who you are to join.", kind: "hint" });
    } else if (res.error === "seats_full") {
      setAnn({ text: "Every place on this invitation is taken. Please ask your advisor to add one.", kind: "err" });
    } else if (res.error === "revoked") {
      setAnn({ text: "This invitation is no longer active. Please reach us on WhatsApp or write to invite@tripagent.vip.", kind: "err" });
    } else if (res.error === "bad_whatsapp") {
      setAnn({ text: "That phone number doesn't look right. You can leave it blank.", kind: "err" });
    } else if (res.error === "email_taken") {
      setAnn({
        text: needsJoin
          ? "That email already belongs to a member. Please sign in with it, or use another email."
          : "That email is already attached to another membership. Please reach us on WhatsApp or write to invite@tripagent.vip.",
        kind: "err",
      });
    } else if (res.error === "expired") {
      setAnn({
        text: "This invitation has expired. Please reach us on WhatsApp or write to invite@tripagent.vip for a new one.",
        kind: "err",
      });
    } else if (res.error === "too_many") {
      setAnn({ text: "Too many tries just now. Please wait a few minutes and try again.", kind: "err" });
    } else if (res.error === "network") {
      setAnn({ text: "We could not reach the door just now. Please try again in a moment.", kind: "err" });
    } else {
      setAnn({ text: "That code isn't recognised. Please check your email and try again.", kind: "err" });
    }
  }

  // A link opened on a code: greet them and offer one button. Anything else (a typed code, an unknown or used code) gets the box.
  const readyFromLink = !!linkedCode && code === linkedCode && !typeCode && (!peeked || (!!peek && !peek.used && !peek.expired));
  const greetName = readyFromLink ? firstName(peek?.firstName) : "";
  const waHref = whatsappLink(whatsappNumber, welcomeMessage(welcome?.name, welcome?.advisor));
  const deskWa = whatsappLink(whatsappNumber, "Hello, I'd like help with my TripAgent invitation.");
  // A mailto: link does nothing in a browser with no email app set up (often the case in a private window), so the address is
  // also copied and the person is told. The link still tries to open their email app first.
  const [emailCopied, setEmailCopied] = useState(false);
  function copyDeskEmail() {
    try {
      void navigator.clipboard?.writeText(DESK_EMAIL).then(() => setEmailCopied(true), () => setEmailCopied(true));
    } catch {
      // clipboard not allowed: the address is on the page for them to select
    }
    setEmailCopied(true);
  }

  return (
    <section className={`${styles.claimRoot}${desk ? ` ${styles.desk}` : ""}`}>
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
              <div className={styles.eyebrow}>{readyFromLink ? "Your invitation" : "Claim your invitation"}</div>
              <h1 className={styles.heading}>
                {greetName ? (
                  <>
                    Welcome, <span className={styles.it}>{greetName}.</span>
                  </>
                ) : (
                  <>
                    You&apos;ve been <span className={styles.it}>invited.</span>
                  </>
                )}
              </h1>
              <p className={styles.sub}>
                {needsJoin
                  ? `This invitation has room for you${seatsLeft ? ` (${seatsLeft} ${seatsLeft === 1 ? "place" : "places"} left)` : ""}. Tell us who you are.`
                  : readyFromLink
                    ? "Your invitation is ready. One tap and you're in."
                    : "Enter the 8-character code from your invitation email."}
              </p>

              <form className={styles.form} onSubmit={handleSubmit} noValidate>
                {readyFromLink ? (
                  <div className={styles.codeLine}>
                    Code <b>{prettyCode(code)}</b>
                    {" · "}
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => {
                        setTypeCode(true);
                        setNeedsJoin(false);
                        setAnn(null);
                        window.setTimeout(() => inputRef.current?.focus(), 0);
                      }}
                    >
                      Use a different code
                    </button>
                  </div>
                ) : (
                  <>
                    <label htmlFor="claim-code" className={styles.label}>
                      Invitation code
                    </label>
                    <input
                      ref={inputRef}
                      className={`ra-input ${styles.codeInput}`}
                      id="claim-code"
                      type="text"
                      inputMode="text"
                      autoComplete="one-time-code"
                      placeholder="KM4T-QR2X"
                      spellCheck={false}
                      value={prettyCode(code)}
                      onChange={handleInput}
                      aria-invalid={ann?.kind === "err"}
                      aria-describedby="claim-ann"
                    />
                  </>
                )}
                {needsJoin ? (
                  <div className={styles.joinFields}>
                    <input className={`ra-input ${styles.joinInput}`} type="text" autoComplete="name" placeholder="Your name" aria-label="Your name" value={jName} onChange={(e) => setJName(e.target.value)} />
                    <input className={`ra-input ${styles.joinInput}`} type="email" inputMode="email" autoComplete="email" placeholder="Your email" aria-label="Your email" value={jEmail} onChange={(e) => setJEmail(e.target.value)} />
                    <input className={`ra-input ${styles.joinInput}`} type="tel" inputMode="tel" autoComplete="tel" placeholder="Phone (optional)" aria-label="Your phone number, optional" value={jPhone} onChange={(e) => setJPhone(e.target.value)} />
                  </div>
                ) : null}
                <div
                  id="claim-ann"
                  className={`${styles.ann}${ann ? ` ${ann.kind === "err" ? styles.annErr : ann.kind === "busy" ? styles.annBusy : styles.annHint}` : ""}`}
                  aria-live="polite"
                >
                  {ann?.text}
                </div>
                {claimedAlready && (
                  <button type="button" className={styles.submitBtn} onClick={() => signIn.open()}>
                    Sign in
                  </button>
                )}
                {desk ? (
                  <div className={styles.btnRow}>
                    <button type="submit" className={styles.submitBtn} disabled={busy || (!!linkedCode && !peeked)}>
                      <span className={styles.btnLabel}>{busy ? "Verifying…" : needsJoin ? "Join with this invitation" : "Claim your invitation"}</span>
                    </button>
                    {readyFromLink ? null : (
                      <Link to="/request-access" className={styles.codeBtn}>
                        <span className={styles.btnLabel}>I don&apos;t have a code</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <button type="submit" className={styles.submitBtn} disabled={busy}>
                    {busy ? "Verifying…" : "Claim your invitation"}
                    {!busy && (
                      <span className={styles.arrow} aria-hidden="true">
                        →
                      </span>
                    )}
                  </button>
                )}
              </form>

              {/* Desktop: this is the "I don't have a code" button beside the submit button. */}
              {!desk && (
                <p className={styles.footLine}>
                  Don&apos;t have a code?{" "}
                  <Link to="/request-access" className={styles.footLink}>
                    Ask for an invitation
                  </Link>
                </p>
              )}
              <p className={styles.footLine}>
                Or write to{" "}
                <a href={`mailto:${DESK_EMAIL}`} className={styles.footLink} onClick={copyDeskEmail}>
                  {DESK_EMAIL}
                </a>
                {deskWa ? (
                  <>
                    {" "}or{" "}
                    <a href={deskWa} target="_blank" rel="noopener noreferrer" className={styles.footLink}>
                      message us on WhatsApp
                    </a>
                  </>
                ) : null}
              </p>
              {emailCopied ? (
                <p className={styles.footLine} role="status">
                  No email app opened? We&apos;ve copied {DESK_EMAIL}. Paste it into your email.
                </p>
              ) : null}
            </>
          ) : (
            <div className={styles.welcome} role="status" aria-live="polite" tabIndex={-1} ref={welcomeRef}>
              <div className={styles.eyebrow}>You&apos;re in</div>
              <h1 className={styles.heading}>
                Welcome to <span className={styles.it}>TripAgent.</span>
              </h1>
              {askLocation ? (
                <>
                  <p className={styles.sub}>
                    Allow your location and we&apos;ll show flights from the city nearest you.
                  </p>
                  <div className={styles.locChoices}>
                    <button ref={allowRef} type="button" className={styles.submitBtn} disabled={locating} onClick={onAllowLocation}>
                      {locating ? "Waiting for your answer…" : "Allow location"}
                    </button>
                    <button type="button" className={styles.ghostBtn} disabled={locating} onClick={onDenyLocation}>
                      Don&apos;t allow
                    </button>
                  </div>
                </>
              ) : arrived ? (
                <>
                  <p className={styles.sub}>
                    {welcome?.advisor
                      ? `${welcome.advisor} is your personal advisor and is expecting you.`
                      : "Your TripAgent advisors are one message away."}
                  </p>
                  <div className={styles.locChoices}>
                    {waHref ? (
                      <a className={styles.submitBtn} href={waHref} target="_blank" rel="noopener noreferrer">
                        Say hello{welcome?.advisor ? ` to ${firstName(welcome.advisor)}` : ""} on WhatsApp
                      </a>
                    ) : null}
                    <button type="button" className={waHref ? styles.ghostBtn : styles.submitBtn} onClick={() => navigate("/", { replace: true })}>
                      Enter TripAgent
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles.sub}>Setting things up…</p>
              )}
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
