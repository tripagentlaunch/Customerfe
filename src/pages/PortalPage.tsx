import { useEffect } from "react";
import { Link } from "react-router-dom";
import portalData from "../data/portal-page.generated.json";
import type { PortalPageData } from "../types/portal-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { useAuth } from "../lib/auth";
import MyYearCalendar from "../components/MyYearCalendar";
import styles from "./portal-page.module.css";

const data = portalData as unknown as PortalPageData;

// portal.html's first two <main> children — #my-year and #portal-member —
// were real auth-gated widgets, filled at runtime by js/account.js's
// renderMyYear()/renderPortalHome(). #my-year is now a genuine, Supabase-
// backed React port (MyYearCalendar, reading site_saved_items — see
// docs/ACCOUNTS-CALENDAR-ARCH.md §4.3) rather than the omitted-for-guests
// placeholder this page used to be: a signed-in member sees their real
// calendar in place of the guest-marketing page below. #portal-member
// (trip/preferences/documents) is still out of scope — signed-in visitors
// just see the calendar on its own.
export default function PortalPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { signedIn, member } = useAuth();

  const { hero, intro, what, begins, sig, remembers, uses, inbuild, faq, cta } = data;

  if (signedIn && member) {
    return <MyYearCalendar member={member} />;
  }

  return (
    <main>
      <header className={`hero left ${styles.heroPrt}`} style={{ minHeight: "84svh", backgroundImage: `url('${hero.image}')`, backgroundPosition: "58% 46%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 className="display" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 22 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row">
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaHref)}>
                {hero.ctaLabel}
              </Link>
              <Link className={styles.prtTextlink} to={toRoute(hero.textHref)}>
                {hero.textLabel}
              </Link>
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className="band editorial">
        <div className="wrap ed-grid">
          <div className="ed-meta reveal">
            <div className="eyebrow">{intro.eyebrow}</div>
            <p className="ed-note">{intro.note}</p>
          </div>
          <div className="ed-main reveal d1">
            <h2 className="ed-statement" dangerouslySetInnerHTML={{ __html: intro.statementHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 26, maxWidth: "52ch" }}>
              {intro.lede}
            </p>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "28ch", marginBottom: "clamp(30px,3.6vw,50px)" }}>
            <div className="eyebrow">{what.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>{what.heading}</h2>
          </div>
          <div className={`${styles.idx} ${styles.two} reveal d1`}>
            {what.items.map((it, i) => (
              <div className={styles.row} key={i}>
                <div className="nn">{it.nn}</div>
                <div className={styles.bd}>
                  <h3>{it.heading}</h3>
                  <p>{it.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{begins.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{begins.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {begins.lede}
            </p>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <Link className="btn btn-gold" to={toRoute(begins.ctaHref)}>
                {begins.ctaLabel}
              </Link>
            </div>
          </div>
          <div className="reveal d2">
            <div className="deep-img" style={{ backgroundImage: `url('${begins.image}')` }} />
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${sig.image}')` }}>
        <div className="wrap">
          <div className="eyebrow reveal">{sig.eyebrow}</div>
          <div className="rule reveal d1" />
          <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: sig.headingHtml ?? "" }} />
          <p className="lede reveal d2">{sig.lede}</p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap grid-2">
          <div className="reveal d2">
            <div className="deep-img" style={{ backgroundImage: `url('${remembers.image}')` }} />
          </div>
          <div className="reveal">
            <div className="eyebrow">{remembers.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{remembers.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {remembers.lede}
            </p>
            <ul className={`incl ${styles.plain}`} style={{ marginTop: 22, maxWidth: "none" }}>
              {remembers.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{uses.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{uses.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {uses.lede}
            </p>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <Link className="btn btn-gold" to={toRoute(uses.ctaHref)}>
                {uses.ctaLabel}
              </Link>
            </div>
          </div>
          <div className="reveal d2">
            <div className="steps">
              {uses.steps.map((s, i) => (
                <div className="step" key={i}>
                  <div className="si">{s.n}</div>
                  <div>
                    <h4>{s.heading}</h4>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap center" style={{ maxWidth: "64ch", margin: "0 auto" }}>
          <div className="reveal">
            <span className={styles.soonTag}>{inbuild.tag}</span>
            <div className="rule center" />
            <h2>{inbuild.heading}</h2>
            <p className="lede reveal d2" style={{ margin: "18px auto 0" }}>
              {inbuild.lede}
            </p>
            <div className="btn-row center reveal d3" style={{ marginTop: 28 }}>
              <Link className="btn btn-gold" to={toRoute(inbuild.ctaHref)}>
                {inbuild.ctaLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap">
          <div className="center" style={{ marginBottom: 40 }}>
            <div className="eyebrow reveal">{faq.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1">{faq.heading}</h2>
          </div>
          <div className="faq reveal d2">
            {faq.items.map((it, i) => (
              <details key={i}>
                <summary>{it.question}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.answerHtml ?? "" }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <h2 className="reveal" style={{ fontSize: "clamp(30px,4vw,58px)" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <div className="btn-row center reveal d2" style={{ marginTop: 26 }}>
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
