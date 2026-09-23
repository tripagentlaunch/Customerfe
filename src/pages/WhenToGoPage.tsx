import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import whenToGoData from "../data/when-to-go-page.generated.json";
import type { WhenToGoPageData } from "../types/when-to-go-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./when-to-go-page.module.css";

const data = whenToGoData as unknown as WhenToGoPageData;

// The 73-destination x 12-month table is populated by an inline <script>
// from a hardcoded literal array — fully static/local, no backend — ported
// as a real hover-highlight table (useState for the hovered column) rather
// than deferred, same category as destinations.js.
function BestTimeTable({ bestTime }: { bestTime: WhenToGoPageData["bestTime"] }) {
  const [col, setCol] = useState<number | null>(null);

  return (
    <div className={`${styles.btmWrap} reveal d1`}>
      <table className={styles.btm} aria-label="Best time to travel, by destination and month">
        <thead>
          <tr>
            <th className={styles.btmCorner} scope="col">
              Destination
            </th>
            {bestTime.months.map((m, i) => (
              <th scope="col" key={i} className={col === i ? styles.colHi : undefined} onMouseEnter={() => setCol(i)} onMouseLeave={() => setCol(null)}>
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bestTime.regions.map((region, ri) => (
            <Fragment key={ri}>
              <tr className={styles.btmRegion}>
                <th colSpan={13} scope="colgroup">
                  {region.name}
                </th>
              </tr>
              {region.rows.map((row, i) => (
                <tr key={i}>
                  <th scope="row">{row.slug ? <Link to={toRoute(`destination-${row.slug}.html`)}>{row.name}</Link> : row.name}</th>
                  {row.code.split("").map((v, ci) => (
                    <td key={ci} className={col === ci ? styles.colHi : undefined} onMouseEnter={() => setCol(ci)} onMouseLeave={() => setCol(null)}>
                      {v === "2" && <i className={`${styles.btmDot} ${styles.peak}`} />}
                      {v === "1" && <i className={`${styles.btmDot} ${styles.good}`} />}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// js/when-global.js (gated to only run on /when-to-go) injects a whole new
// "Tell us when, we'll tell you where" section right after the hero,
// backed by a real date-range ranking engine reading city-when.json +
// city-decision.json + city-images.json — genuine scoring infrastructure,
// same category as where-to-go.html/compare.html. Deferred with a static
// placeholder in the same position, keeping the CONVERT path alive.
function ByDatePlaceholder() {
  return (
    <section className={`band ${styles.wtgBydate}`}>
      <div className="wrap">
        <div className={`${styles.wtgBydatePanel} reveal`}>
          <div className="eyebrow">By your dates</div>
          <div className="rule" />
          <h2 style={{ fontSize: "clamp(30px,4.2vw,54px)" }}>
            Tell us when. <span className="it">We'll tell you where.</span>
          </h2>
          <p className="lede" style={{ marginTop: 12 }}>
            The date-matched ranking is on its way. In the meantime, tell your advisor your dates and they'll find where's at its best.
          </p>
          <Link className="btn btn-gold" to="/enquire">
            Plan around a date
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function WhenToGoPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, intro, months, bestTime, season, calendar, sig, quiet, cta } = data;

  return (
    <main>
      <header className={`hero left ${styles.dpHero}`} style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "60% 50%" }}>
        <div className="wrap hero-inner">
          <div className={styles.dpCopy}>
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className={`${styles.dpCta} reveal d2`}>
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaHref)}>
                {hero.ctaLabel}
              </Link>
              <a className="cta on-dark" href={hero.jumpHref}>
                {hero.jumpLabel}
              </a>
            </div>
          </div>
        </div>
      </header>

      <ByDatePlaceholder />

      <section className="band">
        <div className="wrap editorial">
          <div className="ed-grid">
            <div className="ed-meta reveal">
              <div className="eyebrow">{intro.eyebrow}</div>
              <p className="ed-note">{intro.note}</p>
            </div>
            <div className="reveal d1">
              <p className="ed-statement">{intro.statement}</p>
              <p className="lede" style={{ marginTop: 22 }} dangerouslySetInnerHTML={{ __html: intro.ledeHtml ?? "" }} />
            </div>
          </div>
        </div>
      </section>

      <section className="band tight" id="months" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "32ch" }}>
            <div className="eyebrow">{months.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{months.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {months.lede}
            </p>
          </div>
          <div className={`${styles.mgrid} reveal d1`}>
            {months.cards.map((m, i) => (
              <Link className="mcard" to={toRoute(m.href)} key={i}>
                <div className="mpic" style={{ backgroundImage: `url('${m.image}')` }} />
                <div className={styles.mbody}>
                  <div className={styles.mno}>{m.no}</div>
                  <h3>{m.name}</h3>
                  <p>{m.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" id="best-time">
        <div className="wrap">
          <div className={`${styles.btmHead} reveal`} style={{ maxWidth: "50ch" }}>
            <div className="eyebrow">{bestTime.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{bestTime.heading}</h2>
            <p className="lede" style={{ marginTop: 18 }}>
              {bestTime.lede}
            </p>
          </div>
          <BestTimeTable bestTime={bestTime} />
          <div className={`${styles.btmLegend} reveal d1`}>
            <span>
              <i className={`${styles.btmDot} ${styles.peak}`} /> {bestTime.legend[0]}
            </span>
            <span>
              <i className={`${styles.btmDot} ${styles.good}`} /> {bestTime.legend[1]}
            </span>
            <span style={{ color: "var(--ink-soft)" }}>{bestTime.legend[2]}</span>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch" }}>
            <div className="eyebrow">{season.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{season.heading}</h2>
          </div>
          <div className={`${styles.srow} reveal d1`}>
            {season.cols.map((c, i) => (
              <div className={styles.scol} key={i}>
                <div className={styles.sk}>{c.kicker}</div>
                <h3>{c.heading}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch" }}>
            <div className="eyebrow">{calendar.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{calendar.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {calendar.lede}
            </p>
          </div>
          <ul className={`${styles.cal} reveal d1`}>
            {calendar.items.map((it, i) => (
              <li key={i}>
                <span className="ck">{it.tag}</span>
                <p>{it.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${sig.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{sig.by}</div>
          <p className={`${styles.pull} reveal d1`}>{sig.pull}</p>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{quiet.eyebrow}</div>
          <div className="rule center reveal d1" />
          <p className={`${styles.when} reveal d1`} style={{ margin: "18px auto 0" }}>
            {quiet.text}
          </p>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${cta.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }}>
            {cta.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {cta.buttons.map((b, i) => (
              <Link className={i === 0 ? "btn btn-gold on-dark" : "btn btn-ghost on-dark"} to={toRoute(b.href)} key={i}>
                {b.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
