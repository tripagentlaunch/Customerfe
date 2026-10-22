import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import exoticData from "../data/exotic-page.generated.json";
import exoticPhotos from "../data/exotic-photos.json";
import type { ExoticPageData, ExoticSpot } from "../types/exotic-page";
import { TaraAI } from "../components/TaraAI";
import styles from "./exotic-page.module.css";

const data = exoticData as unknown as ExoticPageData;
const photos = exoticPhotos as Record<string, { credit: string; license: string; source: string }>;

// #exotic-list is populated at runtime by js/exotic.js from data/exotic.json
// (32 spots, static local data — no backend/scoring). Ported the real
// (dynamic) content directly, replicating exotic.js's own category
// grouping/ordering and per-fact conditional rendering, same pattern as
// destinations.js in Batch C.
function advisorHref(name: string) {
  // window.TA_WA (WhatsApp number) isn't provisioned yet — this replicates
  // exotic.js's fallback path, same as ContactPage's default state.
  return `/enquire?dest=${encodeURIComponent(name)}`;
}

// Photos (2026-10-22): one per place in public/img/exotic, freely licensed
// from Wikimedia Commons (credits in src/data/exotic-photos.json, shown in the
// details sheet and at the foot of the page). Served resized through Vercel's
// image optimiser, like the city photos.
function img(id: string, w: number) {
  return `/_vercel/image?url=${encodeURIComponent(`/img/exotic/${id}.jpg`)}&w=${w}&q=72`;
}
function srcSet(id: string, widths: number[]) {
  return widths.map((w) => `${img(id, w)} ${w}w`).join(", ");
}
function credit(id: string) {
  const c = photos[id];
  return c ? `${c.credit} · ${c.license}` : null;
}
const slug = (category: string) => category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Short by default (2026-10-22): a card shows the place, its one line and
// when to go; the full write-up and the practical facts open on request.
const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const RANGE = new RegExp(`(?:(?:late|early|mid)[ -])?(${MONTHS})(?:\\s*(?:to|–|-)\\s*(?:(?:late|early|mid)[ -])?(${MONTHS}))?`, "gi");

/** "November to March only — the austral summer…" -> "Nov – Mar". Only the
 *  first sentence, and a second window only when joined by "and". */
function bestMonths(season: string | null): string | null {
  if (!season) return null;
  if (/^\s*(year-round|two seasons|two distinct)/i.test(season)) return "Year-round";
  const first = season.split(/\.\s/)[0];
  const out: string[] = [];
  let prevEnd = -1;
  for (const m of first.matchAll(RANGE)) {
    if (out.length && (!m[2] || !/\band\b/i.test(first.slice(prevEnd, m.index)))) break;
    prevEnd = (m.index ?? 0) + m[0].length;
    const a = m[1].slice(0, 3);
    const b = m[2] ? m[2].slice(0, 3) : null;
    const range = b && b !== a ? `${a} – ${b}` : a;
    if (!out.includes(range)) out.push(range);
    if (out.length === 2) break;
  }
  return out.length ? out.join(" · ") : null;
}

/** "Antarctica (via Ushuaia, Argentina)" -> "Antarctica". */
function shortRegion(region: string): string {
  return region.replace(/\s*\(.*$/, "");
}

function facts(s: ExoticSpot): [string, string][] {
  const all: [string, string | null][] = [
    ["Getting there", s.getting_there],
    ["When", s.season],
    ["From India", s.india],
    ["We handle", s.handle],
    ["Where you stay", s.stay],
  ];
  return all.filter((f): f is [string, string] => !!f[1]);
}

// Every card the same shape (2026-10-22): a photo, then fixed slots for the
// name and its line, the season and access note pinned above the actions.
// The write-up opens over the page, never inside the card.
function Card({ s, index, onDetails }: { s: ExoticSpot; index: number; onDetails: () => void }) {
  const best = bestMonths(s.season);
  return (
    <article className={`${styles.exCard} ex-rise`} style={{ "--i": index % 3 } as CSSProperties}>
      <button type="button" className={styles.exCardMedia} onClick={onDetails} aria-label={`${s.name}: details`} tabIndex={-1}>
        <img src={img(s.id, 828)} srcSet={srcSet(s.id, [640, 828, 1080])} sizes="(max-width:620px) 100vw, (max-width:960px) 50vw, 400px"
          alt="" loading="lazy" decoding="async" />
      </button>
      <div className={styles.exCardBody}>
        <div className={styles.exRegion}>{shortRegion(s.region)}</div>
        <h3 className={styles.exName}>{s.name}</h3>
        <p className={styles.exTag}>{s.tagline ?? "\u00a0"}</p>
        <p className={styles.exMeta}>
          {best && (
            <>
              <span className={styles.exMetaK}>Best</span> {best}
            </>
          )}
          {s.access_flag && <span className={styles.exAccess}>Access-dependent</span>}
        </p>
        <div className={styles.exActions}>
          <Link className={styles.exCta} to={advisorHref(s.name)}>
            Have <TaraAI /> plan it →
          </Link>
          <button type="button" className={styles.exToggle} onClick={onDetails} aria-haspopup="dialog">
            Details
            <span className={styles.exPlus} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

const SHEET_MS = 320;

function DetailsSheet({ spot, onClose }: { spot: ExoticSpot | null; onClose: () => void }) {
  // Kept on screen through the closing fade, then unmounted.
  const [shown, setShown] = useState<ExoticSpot | null>(spot);
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (spot) {
      setShown(spot);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setShown(null), SHEET_MS);
    return () => window.clearTimeout(t);
  }, [spot]);

  useEffect(() => {
    if (!spot) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [spot, onClose]);

  if (!shown) return null;
  const best = bestMonths(shown.season);
  const photoCredit = credit(shown.id);
  return createPortal(
    <div className={`${styles.exSheetWrap}${visible ? ` ${styles.exSheetOn}` : ""}`} onClick={onClose}>
      <div className={styles.exSheet} role="dialog" aria-modal="true" aria-labelledby="ex-sheet-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className={styles.exSheetClose} aria-label="Close" onClick={onClose} />
        <figure className={styles.exSheetMedia}>
          <img src={img(shown.id, 1080)} srcSet={srcSet(shown.id, [828, 1080, 1600])} sizes="(max-width:620px) 100vw, 640px" alt="" />
          {photoCredit && (
            <figcaption>
              <a href={photos[shown.id].source} target="_blank" rel="noopener noreferrer">Photo: {photoCredit}</a>
            </figcaption>
          )}
        </figure>
        <div className={styles.exSheetBody}>
          <div className={styles.exRegion}>{shortRegion(shown.region)}</div>
          <h3 id="ex-sheet-title" className={styles.exSheetName}>{shown.name}</h3>
          {shown.tagline && <p className={styles.exSheetTag}>{shown.tagline}</p>}
          {(best || shown.access_flag) && (
            <p className={`${styles.exMeta} ${styles.exSheetMeta}`}>
              {best && (
                <>
                  <span className={styles.exMetaK}>Best</span> {best}
                </>
              )}
              {shown.access_flag && <span className={styles.exAccess}>Access-dependent</span>}
            </p>
          )}
          {shown.why && <p className={styles.exWhy}>{shown.why}</p>}
          <dl className={styles.exFacts}>
            {facts(shown).map(([label, value]) => (
              <Fragment key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </Fragment>
            ))}
          </dl>
          <Link className={styles.exCta} to={advisorHref(shown.name)} onClick={onClose}>
            Have <TaraAI /> plan it →
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Scroll-linked motion (2026-10-22): every [data-parallax] element gets
 *  --py, its offset from the viewport's centre times its speed; the hero gets
 *  --hero (0 at the top, 1 once scrolled past). Cards and chapter heads with
 *  .ex-rise get .ex-in as they enter. One rAF per frame; nothing with reduced
 *  motion. */
function useExoticMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-exotic]");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rising = root.querySelectorAll<HTMLElement>(".ex-rise");
    let io: IntersectionObserver | null = null;
    if (reduce || !("IntersectionObserver" in window)) {
      rising.forEach((el) => el.classList.add("ex-in"));
    } else {
      io = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("ex-in");
            io?.unobserve(e.target);
          }
        }),
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      rising.forEach((el) => io!.observe(el));
    }
    if (reduce) return () => io?.disconnect();

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    const hero = root.querySelector<HTMLElement>("[data-hero]");
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of layers) {
        const r = el.parentElement!.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const speed = Number(el.dataset.parallax) || 0.2;
        el.style.setProperty("--py", `${((r.top + r.height / 2 - vh / 2) * -speed).toFixed(1)}px`);
      }
      if (hero) {
        const h = hero.offsetHeight || vh;
        hero.style.setProperty("--hero", Math.min(1, Math.max(0, window.scrollY / h)).toFixed(3));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

/** The chapter in view, for the chapter bar. */
function useActiveChapter(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const HERO_ID = "antarctica-peninsula";

export default function ExoticPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);
  useExoticMotion();

  const { hero, groups, note } = data;
  const chapters = groups.map((g) => slug(g.category));
  const active = useActiveChapter(chapters);
  const [detailsOf, setDetailsOf] = useState<ExoticSpot | null>(null);
  const closeDetails = useCallback(() => setDetailsOf(null), []);
  const total = groups.reduce((n, g) => n + g.spots.length, 0);

  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className={styles.exPage} data-exotic>
      <section className={styles.exHero} data-hero>
        <div className={styles.exHeroMedia} data-parallax="0.35">
          <img src={img(HERO_ID, 1600)} srcSet={srcSet(HERO_ID, [1080, 1600, 2048])} sizes="100vw" alt="" fetchPriority="high" />
        </div>
        <div className={styles.exHeroShade} />
        <div className={styles.exHeroIn}>
          <div className={styles.exEyebrow}>{hero.eyebrow}</div>
          <h1 className={styles.exHeroH}>
            {(hero.heading ?? "").split(" ").map((w, i) => (
              <Fragment key={i}>
                <span className={styles.exWord} style={{ "--w": i } as CSSProperties}>
                  <span>{w}</span>
                </span>{" "}
              </Fragment>
            ))}
          </h1>
          <p className={styles.exHeroLede}>{hero.lede?.split(/(?<=\.)\s/)[0]}</p>
          <p className={styles.exHeroCount}>
            {total} places · {groups.length} chapters
          </p>
        </div>
        <a className={styles.exCue} href={`#${chapters[0]}`} onClick={goTo(chapters[0])} aria-label="Scroll to the places">
          <span />
        </a>
        {credit(HERO_ID) && <span className={styles.exCredit}>Photo: {credit(HERO_ID)}</span>}
      </section>

      <nav className={styles.exChapters} aria-label="Chapters">
        <div className={styles.exChaptersIn}>
          {groups.map((g, i) => {
            const id = chapters[i];
            return (
              <a key={id} href={`#${id}`} onClick={goTo(id)} className={active === id ? styles.exChapOn : undefined}
                aria-current={active === id ? "true" : undefined}>
                <span className={styles.exChapN}>{String(i + 1).padStart(2, "0")}</span>
                {g.category}
              </a>
            );
          })}
        </div>
      </nav>

      {groups.map((g, gi) => {
        const id = chapters[gi];
        const band = g.spots[g.spots.length - 1];
        return (
          <section className={styles.exChapter} id={id} key={id}>
            <div className={styles.exBand}>
              <div className={styles.exBandMedia} data-parallax="0.18">
                <img src={img(band.id, 1600)} srcSet={srcSet(band.id, [1080, 1600, 2048])} sizes="100vw" alt="" loading="lazy" decoding="async" />
              </div>
              <div className={styles.exBandShade} />
              <div className={`${styles.exBandIn} ex-rise`}>
                <span className={styles.exNum}>{String(gi + 1).padStart(2, "0")}</span>
                <h2 className={styles.exBandH}>{g.category}</h2>
                <span className={styles.exBandCount}>
                  {g.spots.length} {g.spots.length === 1 ? "place" : "places"}
                </span>
              </div>
              {credit(band.id) && <span className={styles.exCredit}>Photo: {credit(band.id)}</span>}
            </div>
            <div className={styles.exWrap}>
              <div className={styles.exGrid}>
                {g.spots.map((s, i) => (
                  <Card s={s} key={s.id} index={i} onDetails={() => setDetailsOf(s)} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <div className={styles.exFoot}>
        <p className={styles.exNote}>{note}</p>
        <details className={styles.exCredits}>
          <summary>Photo credits</summary>
          <ul>
            {groups.flatMap((g) => g.spots).map((s) =>
              photos[s.id] ? (
                <li key={s.id}>
                  {s.name}: <a href={photos[s.id].source} target="_blank" rel="noopener noreferrer">{credit(s.id)}</a>, via Wikimedia Commons
                </li>
              ) : null,
            )}
          </ul>
        </details>
      </div>
      <DetailsSheet spot={detailsOf} onClose={closeDetails} />
    </main>
  );
}
