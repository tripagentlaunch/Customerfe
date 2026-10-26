import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import wheretogoData from "../data/wheretogo.generated.json";
import type { WhereToGoPageData } from "../types/wheretogo";
import { useNavVariant } from "../lib/navVariant";
import { TaraAI } from "../components/TaraAI";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAuth } from "../lib/auth";
import { useSignInModal } from "../lib/signInModal";
import styles from "./wheretogo-page.module.css";

const data = wheretogoData as unknown as WhereToGoPageData;

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

export default function WhereToGoPage() {
  useNavVariant("solid");
  const [submitted, setSubmitted] = useState(false);
  const desk = !useIsMobile();
  const { signedIn } = useAuth();
  const signInModal = useSignInModal();
  const [send, setSend] = useState<SendState>("idle");
  const [summary, setSummary] = useState<{ k: string; v: string }[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  const initial = useMemo(() => {
    const single: Record<string, string> = {};
    const multi: Record<string, Set<string>> = {};
    data.questions.forEach((q) => {
      q.options.forEach((o) => {
        if (!o.group) return;
        if (o.multi) {
          multi[o.group] = multi[o.group] || new Set();
          if (o.defaultOn && o.value) multi[o.group].add(o.value);
        } else if (o.defaultOn) {
          single[o.group] = o.value ?? "";
        }
      });
    });
    return { single, multi };
  }, []);

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
      setSingle((prev) => ({ ...prev, [group]: value ?? "" }));
    }
  }

  // The chosen option label(s) for a group, in the order the quiz lists them.
  function picked(group: string): string[] {
    const out: string[] = [];
    data.questions.forEach((q) =>
      q.options.forEach((o) => {
        if (o.group !== group) return;
        const v = o.value ?? "";
        if (o.multi ? multi[group]?.has(v) : group in single && single[group] === v) out.push(o.label ?? "");
      })
    );
    return out;
  }

  async function sendToAdvisor() {
    if (send === "sending" || send === "sent") return;
    if (!signedIn) {
      signInModal.open("Sign in so your advisor can call you about this trip.");
      return;
    }
    const when = picked("month")[0];
    const who = picked("who")[0];
    const mood = picked("vibe");
    const length = picked("length")[0];
    const budget = picked("budget")[0];
    const rows = [
      { k: "When", v: when },
      { k: "Who", v: who },
      { k: "Mood", v: mood.join(", ") },
      { k: "How long", v: length },
      { k: "Budget", v: budget },
    ].filter((r) => r.v);
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
          notes: ["From the \"Where should you go?\" questions.", mood.length ? `Mood: ${mood.join(", ")}.` : "", length ? `Length: ${length}.` : ""]
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
      <header className={styles.wtgHero}>
        <div className="wrap">
          <div className="eyebrow">The decision, made simple</div>
          <h1 dangerouslySetInnerHTML={{ __html: data.hero.headingHtml ?? "" }} />
          <p>{data.hero.lede}</p>
        </div>
      </header>
      <main>
        <div className={styles.wtgQuiz}>
          {data.questions.map((q, i) => (
            <div className={styles.wtgQ} key={i}>
              <div className={styles.ql} dangerouslySetInnerHTML={{ __html: q.labelHtml ?? "" }} />
              <div className={styles.wtgOpts}>
                {q.options.map((o, j) => {
                  const on = o.multi ? multi[o.group ?? ""]?.has(o.value ?? "") : single[o.group ?? ""] === (o.value ?? "");
                  return (
                    <button
                      type="button"
                      className={`${styles.wtgOpt}${on ? " on" : ""}`}
                      key={j}
                      onClick={() => toggle(o.group, o.value, o.multi)}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className={styles.wtgGo}>
            {desk ? (
              <button type="button" className="btn btn-gold btn-square" onClick={sendToAdvisor} disabled={send === "sending" || send === "sent"}>
                {send === "sending" ? "Sending…" : send === "sent" ? "Sent to your advisor" : "Send to my advisor"}
              </button>
            ) : (
              <button type="button" className="btn btn-gold btn-square" onClick={() => setSubmitted(true)}>
                {data.goLabel}
              </button>
            )}
          </div>
        </div>
        <div className={styles.wtgResults} ref={resultRef}>
          {desk && send === "sent" && (
            <div className={styles.wtgSent} role="status" aria-live="polite">
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
                Until then, explore <Link to="/collections">Collections</Link>, <Link to="/destinations">Destinations</Link> or{" "}
                <Link to="/when-to-go">When to go</Link>.
              </p>
            </div>
          )}
          {desk && send === "failed" && (
            <div className={styles.wtgNotlive} role="alert">
              <p>
                We couldn't send that just now. Please try again in a moment, or{" "}
                <Link to="/enquire">write to your advisor</Link>.
              </p>
            </div>
          )}
          {!desk && submitted && (
            <div className={styles.wtgNotlive}>
              <p>
                Matching is on its way. Meanwhile, browse <Link to="/collections">Collections</Link>,{" "}
                <Link to="/destinations">Destinations</Link>, or{" "}
                <Link to="/enquire">
                  tell <TaraAI />
                </Link>{" "}
                what you're after.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
