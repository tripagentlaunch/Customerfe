import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import wheretogoData from "../data/wheretogo.generated.json";
import type { WhereToGoPageData } from "../types/wheretogo";
import { useNavVariant } from "../lib/navVariant";
import { TaraAI } from "../components/TaraAI";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAuth } from "../lib/auth";
import { useSignInModal } from "../lib/signInModal";
import styles from "./wheretogo-page.module.css";

const data = wheretogoData as unknown as WhereToGoPageData;

// Hero photo (2026-11-10, direct request).
const HERO_IMAGE = "/img/h/destinations.jpg";

// The quiz UI is static and portable; "Show me where" is backed by a real
// client-side scoring engine reading ~400KB of local data (city-decision.json,
// city-when.json) plus localStorage origin/profile — a real JS application,
// same category as trip.html/search.html. Per the shell-only-defer-logic
// decision, the buttons toggle for real visual feedback but the results
// themselves are deferred.
// Desktop (2026-10-26, direct request): no second round of "tell Tara". The
// answers go straight to the member's advisor as an enquiry (POST /enquiries,
// the same queue EnquirePage feeds), and the page says the advisor will call.
// Phones keep the original "Matching is on its way" note.
type SendState = "idle" | "sending" | "sent" | "failed";

// Layered questions (2026-11-10, direct request). Each step has a main question and, for some answers, a
// follow-up that appears below it: "When" asks for months only after "I have dates in mind", and "Who"
// asks for the occasion / children's ages / group size. Mood, length and budget keep their options from the
// page data (data.questions[2..4]); the rest of the options are defined here. The old flat list of questions
// is data.questions[0] and [1] (month chips, who chips).
type Opt = { label: string; value: string };
type Group = { group: string; multi: boolean; labelHtml: string; options: Opt[] };
type Step = Group & { follow?: (single: Record<string, string>) => Group | null };
const fromData = (qi: number): Opt[] => data.questions[qi].options.map((o) => ({ label: o.label ?? "", value: o.value ?? "" }));
const mk = (labels: string[]): Opt[] => labels.map((l) => ({ label: l, value: l }));

const MONTHS_FOLLOW: Group = {
  group: "month",
  multi: true,
  labelHtml: 'Which <b>months</b>? <span style="font-size:14px;color:var(--stone)">pick any</span>',
  options: fromData(0).filter((o) => o.label !== "Flexible"),
};
const OCCASION: Group = { group: "occasion", multi: false, labelHtml: "What's the <b>occasion</b>?", options: mk(["Honeymoon", "Anniversary", "Just us"]) };
const AGES: Group = { group: "ages", multi: true, labelHtml: "How old are the <b>children</b>? <span style=\"font-size:14px;color:var(--stone)\">pick any</span>", options: mk(["Under 5", "5 to 12", "Teens"]) };
// Multi-generation trips (2026-11-13, direct request): the option was "Several generations", which read oddly and
// asked nothing more. Now it says who is in the party and asks who is coming along.
const GENERATIONS: Group = { group: "gens", multi: true, labelHtml: 'Who is <b>coming along</b>? <span style="font-size:14px;color:var(--stone)">pick any</span>', options: mk(["Grandparents", "Parents", "Young children", "Teens", "Aunts, uncles and cousins"]) };
const GROUP_SIZE: Group = { group: "groupsize", multi: false, labelHtml: "How many of <b>you</b>?", options: mk(["3 to 4", "5 to 8", "9 or more"]) };

const STEPS: Step[] = [
  {
    group: "when",
    multi: false,
    labelHtml: data.questions[0].labelHtml ?? "",
    options: [
      { label: "Flexible", value: "flexible" },
      { label: "I have dates in mind", value: "dates" },
    ],
    follow: (single) => (single.when === "dates" ? MONTHS_FOLLOW : null),
  },
  {
    group: "who",
    multi: false,
    labelHtml: data.questions[1].labelHtml ?? "",
    options: mk(["Just me", "Two of us", "Family with children", "Grandparents, parents and children", "A group of friends"]),
    follow: (single) => (single.who === "Two of us" ? OCCASION : single.who === "Family with children" ? AGES : single.who === "Grandparents, parents and children" ? GENERATIONS : single.who === "A group of friends" ? GROUP_SIZE : null),
  },
  { group: "vibe", multi: true, labelHtml: data.questions[2].labelHtml ?? "", options: fromData(2) },
  { group: "length", multi: false, labelHtml: data.questions[3].labelHtml ?? "", options: fromData(3) },
  { group: "budget", multi: false, labelHtml: data.questions[4].labelHtml ?? "", options: fromData(4) },
];
// "Send to my advisor" hands the answers to the chat instead of posting an enquiry.
const CHAT_HANDOFF = true as boolean;
const CHAT_HANDOFF_KEY = "ta-chat-prefill";

const ALL_GROUPS: Group[] = [...STEPS, MONTHS_FOLLOW, OCCASION, AGES, GENERATIONS, GROUP_SIZE];
// Answers that depend on another answer, cleared when that answer changes.
const DEPENDENTS: Record<string, string[]> = { when: ["month"], who: ["occasion", "ages", "gens", "groupsize"] };

export default function WhereToGoPage() {
  useNavVariant("solid");
  const [submitted, setSubmitted] = useState(false);
  const desk = !useIsMobile();
  const { signedIn } = useAuth();
  const signInModal = useSignInModal();
  const navigate = useNavigate();
  // Preview helper (2026-11-13): /where-to-go?preview=sent or ?preview=failed shows the card's
  // confirmation / error state without sending anything. Harmless; remove when no longer wanted.
  const preview = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("preview") : null;
  const [send, setSend] = useState<SendState>(preview === "sent" ? "sent" : preview === "failed" ? "failed" : "idle");
  const [summary, setSummary] = useState<{ k: string; v: string }[]>(
    preview === "sent"
      ? [
          { k: "When", v: "Flexible" },
          { k: "Who", v: "Two of us" },
          { k: "Occasion", v: "Honeymoon" },
          { k: "Mood", v: "Beach & Sun, Romance" },
          { k: "How long", v: "A week" },
          { k: "Budget", v: "₹4-7L" },
        ]
      : []
  );
  const resultRef = useRef<HTMLDivElement>(null);
  // Guided questionnaire (2026-11-10, direct request): one question at a time, Back / Next.
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");

  const initial = useMemo(() => ({ single: { when: "flexible" } as Record<string, string>, multi: {} as Record<string, Set<string>> }), []);

  const [single, setSingle] = useState(initial.single);
  const [multi, setMulti] = useState(initial.multi);

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  function toggle(group: string | null, value: string | null, isMulti: boolean) {
    if (!group) return;
    if (isMulti) {
      setMulti((prev) => {
        const next = new Set(prev[group] ?? []);
        if (value === null) return prev;
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return { ...prev, [group]: next };
      });
    } else {
      const gone = DEPENDENTS[group] ?? [];
      setSingle((prev) => {
        const next = { ...prev, [group]: value ?? "" };
        gone.forEach((g) => delete next[g]);
        return next;
      });
      if (gone.length) {
        setMulti((prev) => {
          const next = { ...prev };
          gone.forEach((g) => delete next[g]);
          return next;
        });
      }
    }
  }

  // The chosen option label(s) for a group, in the order the quiz lists them.
  function picked(group: string): string[] {
    const g = ALL_GROUPS.find((x) => x.group === group);
    if (!g) return [];
    return g.options.filter((o) => (g.multi ? multi[group]?.has(o.value) : group in single && single[group] === o.value)).map((o) => o.label);
  }

  async function sendToAdvisor() {
    if (send === "sending" || send === "sent") return;
    if (!CHAT_HANDOFF && !signedIn) {
      signInModal.open("Sign in so your advisor can call you about this trip.");
      return;
    }
    const when = single.when === "dates" ? picked("month").join(", ") : "Flexible";
    const who = picked("who")[0];
    const occasion = picked("occasion")[0];
    const ages = picked("ages");
    const gens = picked("gens");
    const groupSize = picked("groupsize")[0];
    const mood = picked("vibe");
    const length = picked("length")[0];
    const budget = picked("budget")[0];
    const rows = [
      { k: "When", v: when },
      { k: "Who", v: who },
      { k: "Occasion", v: occasion },
      { k: "Children", v: ages.join(", ") },
      { k: "Travelling together", v: gens.join(", ") },
      { k: "Group size", v: groupSize },
      { k: "Mood", v: mood.join(", ") },
      { k: "How long", v: length },
      { k: "Budget", v: budget },
    ].filter((r) => r.v);
    // 2026-11-13 (direct request): "Send to my advisor" opens the chat and sends these answers as the
    // visitor's first message, so the conversation starts for them. The text goes through
    // sessionStorage (not the URL). The enquiry POST below is kept as the fallback (CHAT_HANDOFF = false).
    if (CHAT_HANDOFF) {
      const text = [
        "Hi, I'd like help working out where to go. Here are my answers.",
        ...rows.map((r) => `${r.k}: ${r.v}.`),
      ].join(" ");
      try {
        sessionStorage.setItem(CHAT_HANDOFF_KEY, JSON.stringify({ text, send: true }));
      } catch {
        /* storage blocked: the chat just opens empty */
      }
      navigate("/concierge?from=where-to-go");
      return;
    }
    setSummary(rows);
    setSend("sending");
    try {
      const res = await fetch(`/enquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({
          dates: when || undefined,
          trip_type: who || undefined,
          budget: budget ? `${budget} (per couple per week)` : undefined,
          notes: ["From the \"Where should you go?\" questions.", mood.length ? `Mood: ${mood.join(", ")}.` : "", occasion ? `Occasion: ${occasion}.` : "", ages.length ? `Children's ages: ${ages.join(", ")}.` : "", gens.length ? `Travelling together: ${gens.join(", ")}.` : "", groupSize ? `Group size: ${groupSize}.` : "", length ? `Length: ${length}.` : ""]
            .filter(Boolean)
            .join(" "),
        }),
      });
      setSend(res.ok ? "sent" : "failed");
    } catch {
      setSend("failed");
    }
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  return (
    <>
      <main className={styles.wtgRoot}>
        {/* Built like the access pages (2026-11-10, direct request): photo background + overlay, intro on the left, the questionnaire in a frosted card on the right. */}
        <img className={styles.wtgBg} src={HERO_IMAGE} alt="" aria-hidden="true" />
        <div className={styles.wtgOverlay} aria-hidden="true" />
        <div className={styles.wtgWrap}>
          <div className={styles.wtgIntro}>
            {/* Matches the "Match" card on the homepage (2026-11-10, direct request). Was: data.hero.eyebrow / headingHtml / lede. */}
            <div className={styles.wtgEyebrow}>Match</div>
            <h1>Five questions, one answer</h1>
            <p>Tell us when you are free, who is travelling and the mood: we will show you where.</p>
          </div>
          <div className={styles.wtgColumn}>
        <div className={styles.wtgCard} ref={resultRef}>
          {(() => {
            // After "Send": the card itself shows the confirmation or the error (2026-11-10, direct request).
            if (desk && send === "sent") {
              return (
                <div className={styles.wtgPanel} role="status" aria-live="polite">
                  <div className={styles.wtgSent}>
                    <div className="eyebrow">With your advisor</div>
                    <h2>
                      Your advisor will <span className="it">call you shortly.</span>
                    </h2>
                    <p className={styles.wtgSentLede}>They have your answers, and will come back with where to go, when, and where to stay.</p>
                    {summary.length > 0 && (
                      <dl className={styles.wtgSummary}>
                        {summary.map((r) => (
                          <div key={r.k}>
                            <dt>{r.k}</dt>
                            <dd>{r.v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <p className={styles.wtgSentMore}>
                      Until then, explore <Link to="/collections">Collections</Link>, <Link to="/destinations">Destinations</Link> or <Link to="/when-to-go">When to go</Link>.
                    </p>
                  </div>
                </div>
              );
            }
            if (desk && send === "failed") {
              return (
                <div className={`${styles.wtgPanel} ${styles.wtgPanelAlert}`} role="alert">
                  <div className={styles.wtgSent}>
                    <div className="eyebrow">Not sent</div>
                    <h2>
                      We couldn't send <span className="it">that just now.</span>
                    </h2>
                    <p className={styles.wtgSentLede}>
                      Your answers are still here. Please try again in a moment, or <Link to="/enquire">write to your advisor</Link>.
                    </p>
                    <div className={styles.wtgPanelBtns}>
                      <button type="button" className="btn btn-ghost" onClick={() => setSend("idle")}>
                        Edit answers
                      </button>
                      <button type="button" className="btn btn-gold" onClick={sendToAdvisor}>
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            if (!desk && submitted) {
              return (
                <div className={styles.wtgPanel}>
                  <div className={styles.wtgSent}>
                    <div className="eyebrow">Almost there</div>
                    <h2>
                      Matching is <span className="it">on its way.</span>
                    </h2>
                    <p className={styles.wtgSentMore}>
                      Meanwhile, browse <Link to="/collections">Collections</Link>, <Link to="/destinations">Destinations</Link>, or{" "}
                      <Link to="/enquire">
                        tell <TaraAI />
                      </Link>{" "}
                      what you're after.
                    </p>
                    <div className={styles.wtgPanelBtns}>
                      <button type="button" className="btn btn-ghost" onClick={() => setSubmitted(false)}>
                        Edit answers
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
            const total = STEPS.length;
            const q = STEPS[step];
            const last = step === total - 1;
            const follow = q.follow?.(single) ?? null;
            // A single-choice question needs an answer before Next (the mood question is optional); months are needed once "I have dates in mind" is picked.
            const answered = q.multi || (q.group in single && single[q.group] !== undefined);
            const canNext = answered && !(follow?.group === "month" && !(multi.month?.size > 0));
            const go = (n: number) => {
              setDir(n > step ? "fwd" : "back");
              setStep(n);
            };
            return (
              <>
                <div className={styles.wtgProgress} aria-hidden="true">
                  <span className={styles.wtgStepNo}>
                    {step + 1} of {total}
                  </span>
                  <span className={styles.wtgSegs}>
                    {STEPS.map((_, n) => (
                      <span key={n} className={n <= step ? styles.wtgSegOn : undefined} />
                    ))}
                  </span>
                </div>
                {/* Keyed by step so each question animates in (direction-aware). */}
                <div className={`${styles.wtgQ} ${dir === "fwd" ? styles.wtgInFwd : styles.wtgInBack}`} key={step} role="group" aria-label={`Question ${step + 1} of ${total}`}>
                  <div className={styles.ql} dangerouslySetInnerHTML={{ __html: q.labelHtml ?? "" }} />
                  <div className={styles.wtgOpts}>
                    {q.options.map((o) => {
                      const on = q.multi ? multi[q.group]?.has(o.value) : single[q.group] === o.value;
                      return (
                        <button type="button" className={`${styles.wtgOpt}${on ? " on" : ""}`} key={o.value} aria-pressed={!!on} onClick={() => toggle(q.group, o.value, q.multi)}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  {follow && (
                    <div className={styles.wtgFollow} key={follow.group}>
                      <div className={styles.ql} dangerouslySetInnerHTML={{ __html: follow.labelHtml }} />
                      <div className={styles.wtgOpts}>
                        {follow.options.map((o) => {
                          const on = follow.multi ? multi[follow.group]?.has(o.value) : single[follow.group] === o.value;
                          return (
                            <button type="button" className={`${styles.wtgOpt}${on ? " on" : ""}`} key={o.value} aria-pressed={!!on} onClick={() => toggle(follow.group, o.value, follow.multi)}>
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.wtgNav}>
                  <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 0}>
                    Back
                  </button>
                  {!last && (
                    <button type="button" className="btn btn-gold" onClick={() => go(step + 1)} disabled={!canNext}>
                      Next
                    </button>
                  )}
                  {last && (
                    <div className={styles.wtgGoInline}>
                      {desk ? (
                        <button type="button" className="btn btn-gold" onClick={sendToAdvisor} disabled={send === "sending" || send === "sent"}>
                          {send === "sending" ? "Sending…" : send === "sent" ? "Sent to your advisor" : "Send to my advisor"}
                        </button>
                      ) : (
                        <button type="button" className="btn btn-gold" onClick={() => setSubmitted(true)}>
                          {data.goLabel}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
        {/* The confirmation / error now show inside the card (2026-11-10, direct request); this block used to render below it. */}
          </div>
        </div>
      </main>
    </>
  );
}
