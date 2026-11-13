import { useEffect } from "react";
import { Link } from "react-router-dom";
import visasData from "../data/visas.generated.json";
import countryVisas from "../data/visa.generated.json";
import journalData from "../data/journal.generated.json";
import type { VisaData } from "../types/visa";
import type { VisasPageData } from "../types/visas";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";
import styles from "./visas-page.module.css";

const data = visasData as unknown as VisasPageData;

// Design refresh (2026-11-13, direct request), same treatment as Flights and Hotels: photo hero, outlined tiles,
// photo splits, four-step row, shared closing band. Copy is unchanged; the two pull quotes are hidden.
const HANDLE_ICONS = [
  // eligibility, checked
  '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
  // documents prepared
  '<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
  // filed & submitted
  '<path d="M4 12l16-8-6 16-3-6.5z"/>',
  // appointments managed
  '<rect x="4" y="5" width="16" height="15"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  // tracking & reminders
  '<path d="M6 17h12M8 17a4 4 0 0 1 8 0M12 6V4M5 6l1.5 1.5M19 6l-1.5 1.5"/>',
  // sequenced with your trip
  '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 12h8M14 9l3 3-3 3"/>',
];
const HERO_PHOTO = "/img/h/visas.jpg";

// "By destination" (the country visa guides) and "Before you apply" (reading on visas) moved here from the Visa guides
// page (2026-11-13, direct request); that page is gone. Built from the country guides themselves, so adding a country
// guide adds its card, exactly as the old page did.
const COUNTRIES = countryVisas as unknown as Record<string, VisaData>;
const JOURNAL = journalData as unknown as Record<string, { hero?: { headingHtml?: string | null; lede?: string | null; image?: string | null } }>;
const stripHtml = (html: string | null | undefined) => (html ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const regionOf = (eyebrow: string | null | undefined) => (eyebrow ?? "").split("·")[0].trim() || null;
const firstSentence = (text: string | null | undefined) => {
  const t = (text ?? "").trim();
  const m = t.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : t).trim() || null;
};
const rawImg = (src?: string | null) => {
  if (!src) return "";
  try {
    return new URL(src, "http://x").searchParams.get("url") || src;
  } catch {
    return src;
  }
};
const GUIDES = Object.values(COUNTRIES)
  .sort((a, b) => stripHtml(a.hero.headingHtml).localeCompare(stripHtml(b.hero.headingHtml)))
  .map((g) => ({
    cap: [regionOf(g.hero.eyebrow), g.facts?.[0]?.value].filter(Boolean).join(" · "),
    heading: stripHtml(g.hero.headingHtml),
    body: firstSentence(g.hero.lede),
    image: rawImg(g.hero.image),
    href: `visa-${g.slug}.html`,
  }));
const READING = ["journal-evisa-or-sticker", "journal-visa-free-for-indians"]
  .map((slug) => ({ slug, hero: JOURNAL[slug]?.hero }))
  .filter((j) => j.hero)
  .map((j) => ({ cap: "Journal", heading: stripHtml(j.hero?.headingHtml), body: firstSentence(j.hero?.lede), image: rawImg(j.hero?.image), href: `${j.slug}.html` }));
const EARLY_PHOTO = "/img/h/journal-visa-free-for-indians.jpg";
const SIG_PHOTO = "/img/h/journal-evisa-or-sticker.jpg";

export default function VisasPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, idx, feat, startEarly, vtable, signature, howItWorks, faq, cta } = data;

  return (
    <main>
      <header className={styles.fHero} style={{ backgroundImage: `linear-gradient(90deg, rgba(8,6,5,.82) 0%, rgba(8,6,5,.6) 45%, rgba(8,6,5,.4) 100%), url('${HERO_PHOTO}')` }}>
        {/* <video autoPlay loop muted playsInline src="/videos/visas/hero.mp4" /> (replaced by the photo) */}
        <div className="wrap">
          <div className={styles.fHeroCopy}>
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className={`btn-row ${styles.fHeroBtns} reveal d3`}>
              {hero.buttons.map((b, i) =>
                i === 0 ? (
                  <PrimaryInverseButton to={b.href} key={i}>
                    {b.label}
                  </PrimaryInverseButton>
                ) : (
                  <SecondaryInverseButton to={b.href} key={i}>
                    {b.label}
                  </SecondaryInverseButton>
                )
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{idx.eyebrow}</div>
            <div className="rule" />
            <h2>{idx.heading}</h2>
            <p className="lede">{idx.lede}</p>
          </div>
          <div className={`${styles.fTiles} reveal d1`}>
            {idx.rows.map((r, i) => (
              <div className={styles.fTile} key={i}>
                <svg className={styles.fIcon} viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HANDLE_ICONS[i % HANDLE_ICONS.length] }} />
                <h3>{r.heading}</h3>
                <p>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.fSplit}`}>
          <div className={`${styles.fSplitPic} reveal`} style={{ backgroundImage: `url('${feat.image}')` }} />
          <div className="reveal d1">
            <div className="eyebrow">{feat.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,46px)" }} dangerouslySetInnerHTML={{ __html: feat.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 16 }}>
              {feat.lede}
            </p>
            <ul className={styles.fChecks}>
              {feat.items.map((it, i) => (
                <li key={i}>
                  <span aria-hidden="true">✓</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pull quote ("A visa left too late...") hidden 2026-11-13, in line with Hotels. */}
      {false && (
        <section className="band tight">
          <div className="wrap">
            <div className="pq reveal">
              <p>{data.pullq2}</p>
            </div>
          </div>
        </section>
      )}

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className={`wrap ${styles.fSplit} ${styles.rev}`}>
          <div className="reveal d1">
            <div className="eyebrow">{startEarly.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,44px)" }}>{startEarly.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {startEarly.lede}
            </p>
            <ul className={styles.fChecks}>
              {startEarly.items.map((it, i) => (
                <li key={i}>
                  <span aria-hidden="true">✓</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${styles.fSplitPic} reveal`} style={{ backgroundImage: `url('${EARLY_PHOTO}')` }} />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{vtable.eyebrow}</div>
            <div className="rule" />
            <h2>{vtable.heading}</h2>
            <p className="lede">{vtable.lede}</p>
          </div>
          <div className={`${styles.vtableWrap} ${styles.fTable} reveal d1`} style={{ maxWidth: "none" }}>
            <table className={styles.vtable}>
              <thead>
                <tr>
                  {vtable.headers.map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vtable.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="dest">{r.dest}</td>
                    <td>{r.visaType}</td>
                    <td>{r.processing}</td>
                    <td className={r.biometricsYes ? styles.bioY : styles.bioN}>{r.biometrics}</td>
                    <td className={styles.note}>{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`${styles.vtableNote} reveal d1`}>{vtable.note}</p>
        </div>
      </section>

      {/* By destination: one card per country visa guide, a scrolling strip. */}
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">By destination</div>
            <div className="rule" />
            <h2>{GUIDES.length} visa guides</h2>
            <p className="lede">Pick a country for the visa you need, what to prepare, and how long it takes.</p>
          </div>
          <div className={`${styles.fStrip} reveal d1`} role="list" aria-label="Visa guides by destination">
            {GUIDES.map((g, i) => (
              <Link className={styles.fGuide} to={toRoute(g.href)} key={i} role="listitem">
                <div className={styles.fGuidePic}>
                  <span style={{ backgroundImage: `url('${g.image}')` }} />
                </div>
                <div className={styles.fGuideCap}>{g.cap}</div>
                <h3>{g.heading}</h3>
                <p>{g.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Before you apply: reading on visas. */}
      <section className="band tight">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">Before you apply</div>
            <div className="rule" />
            <h2>Reading on visas</h2>
          </div>
          <div className={`${styles.fCabins} reveal d1`}>
            {READING.map((g, i) => (
              <Link className={styles.fGuide} to={toRoute(g.href)} key={i}>
                <div className={styles.fGuidePic}>
                  <span style={{ backgroundImage: `url('${g.image}')` }} />
                </div>
                <div className={styles.fGuideCap}>{g.cap}</div>
                <h3>{g.heading}</h3>
                <p>{g.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={`signature ${styles.fSig}`} style={{ backgroundImage: `url('${SIG_PHOTO}')` }}>
        <div className="wrap">
          <div className={`${styles.sigEyebrow} reveal`}>{signature.eyebrow}</div>
          <p className={`${styles.sigLine} reveal d1`} dangerouslySetInnerHTML={{ __html: signature.lineHtml ?? "" }} />
          <p className={`${styles.sigSub} lede reveal d2`}>{signature.sub}</p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{howItWorks.eyebrow}</div>
            <div className="rule" />
            <h2>{howItWorks.heading}</h2>
            <p className="lede">{howItWorks.lede}</p>
          </div>
          <div className={`${styles.fSteps} reveal d1`}>
            {howItWorks.steps.map((st, i) => (
              <div className={styles.fStep} key={i}>
                <div className={styles.fStepN}>{st.n}</div>
                <h4>{st.heading}</h4>
                <p>{st.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`${styles.fHead} reveal`}>
            <div className="eyebrow">{faq.eyebrow}</div>
            <div className="rule" />
            <h2>{faq.heading}</h2>
          </div>
          <div className={`${styles.fFaq} faq reveal d1`}>
            {faq.items.map((it, i) => (
              <details key={i}>
                <summary>{it.summary}</summary>
                <p dangerouslySetInnerHTML={{ __html: it.bodyHtml ?? "" }} />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${HERO_PHOTO}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{cta.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: cta.headingHtml ?? "" }} />
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {cta.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {cta.buttons.map((b, i) =>
              i === 0 ? (
                <PrimaryInverseButton to={b.href} key={i}>
                  {b.label}
                </PrimaryInverseButton>
              ) : (
                <SecondaryInverseButton to={b.href} key={i}>
                  {b.label}
                </SecondaryInverseButton>
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
