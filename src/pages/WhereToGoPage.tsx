import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import wheretogoData from "../data/wheretogo.generated.json";
import type { WhereToGoPageData } from "../types/wheretogo";
import { useNavVariant } from "../lib/navVariant";
import { TaraAI } from "../components/TaraAI";
import styles from "./wheretogo-page.module.css";

const data = wheretogoData as unknown as WhereToGoPageData;

// The quiz UI is static and portable; "Show me where" is backed by a real
// client-side scoring engine reading ~400KB of local data (city-decision.json,
// city-when.json) plus localStorage origin/profile — a real JS application,
// same category as trip.html/search.html. Per the shell-only-defer-logic
// decision, the buttons toggle for real visual feedback but the results
// themselves are deferred.
export default function WhereToGoPage() {
  useNavVariant("solid");
  const [submitted, setSubmitted] = useState(false);

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
            <button type="button" className="btn btn-gold btn-square" onClick={() => setSubmitted(true)}>
              {data.goLabel}
            </button>
          </div>
        </div>
        <div className={styles.wtgResults}>
          {submitted && (
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
