import { useEffect, useState } from "react"; // useRef unused while the "Our Promise" scroll-drawn line is shelved (see below) — restore alongside it
import { Link } from "react-router-dom";
import homepageData from "../data/homepage.generated.json";
import type { HomepageData } from "../types/homepage";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import HeroCarousel from "../components/HeroCarousel";
import DestinationPlanner from "../components/DestinationPlanner";
import WorldMap from "../components/WorldMap";
import HowItWorksTabs from "../components/HowItWorksTabs";
// import ConciergeChatDemo from "../components/ConciergeChatDemo"; — shelved with the HOW IT WORKS section below, not deleted
import styles from "./home-page.module.css";

const data = homepageData as unknown as HomepageData;

// Same real/fallback wa.me pattern as Footer.tsx (VITE_WHATSAPP_NUMBER unset
// today -> /enquire, a real working page, instead of the dead
// wa.me/REPLACE_NUMBER placeholder the source hardcodes here too).
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;
const ADVISOR_HREF = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}` : "/enquire";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function HomePage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);
  useScrollReveal([]);

  // `who` ("Who it's for"), `shift` ("The shift"), `problem` ("The world
  // today"), `way` ("What we did"), and `membership` were all removed from
  // the homepage per request — sections and data references alike.
  const { discover, decide, planner, services, trips, testimonials, finalCta } = data;
  // `howItWorks` and `stats`/`signature` (data.howItWorks/.stats/.signature) are unused while their sections below are shelved — restore these destructures alongside them.

  // ---------------- Discover: "Continue planning" rail ----------------
  // Read-only from localStorage, exactly like index.html's own script —
  // degrades to nothing until something else in the app writes ta_saved /
  // ta_trip (nothing does yet), same as a first-time visitor on the real site.
  const [continueChips, setContinueChips] = useState<string[]>([]);
  useEffect(() => {
    try {
      const chips: string[] = [];
      const seen = new Set<string>();
      const trip = readJSON("ta_trip") as { city?: unknown; slug?: unknown; cities?: unknown } | null;
      if (trip) {
        const tcity = trip.city ?? trip.slug ?? (Array.isArray(trip.cities) ? trip.cities[0] : undefined);
        if (typeof tcity === "string") {
          chips.push(tcity);
          seen.add(tcity);
        }
      }
      const saved = readJSON("ta_saved");
      if (Array.isArray(saved)) {
        for (let i = saved.length - 1; i >= 0 && chips.length < 5; i--) {
          const s = saved[i];
          if (typeof s === "string" && !seen.has(s)) {
            chips.push(s);
            seen.add(s);
          }
        }
      }
      setContinueChips(chips.slice(0, 5));
    } catch {
      // silent — rail simply stays hidden
    }
  }, []);

  // ---------------- Signature moment: the scroll-drawn line ----------------
  // Shelved along with the "Our Promise" section below (not deleted) — its
  // journey narrative is now covered by <HowItWorksTabs/>. Restore this
  // ref/effect, the `stats`/`signature` destructure below, and `useRef` in
  // the import above together if the section comes back.
  /*
  const lhTrackRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const track = lhTrackRef.current;
    if (!track) return;
    const nodeEls = Array.from(track.querySelectorAll<HTMLElement>("[data-at]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 820px)").matches;
    track.classList.add("drawn");
    function draw() {
      track!.style.setProperty("--draw-a", "1");
      setTimeout(() => track!.style.setProperty("--draw-b", "1"), reduce ? 0 : 650);
      nodeEls.forEach((n, i) => setTimeout(() => n.classList.add("lit"), reduce ? 0 : 260 + i * 240));
    }
    if (reduce || mobile) {
      draw();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            draw();
            io.disconnect();
          }
        });
      },
      { threshold: 0.5, rootMargin: "0px 0px -12% 0px" }
    );
    io.observe(track);
    return () => io.disconnect();
  }, []);
  */

  return (
    <main className={styles.home}>
      <HeroCarousel slides={data.hero.slides} />

      {/* WORLD MAP — World + 11 region tabs (see map-tabs.generated.json),
          each serviced country/region shown as a plain outline; nothing
          inside any country is shown. Zoom-to-region + city markers on tab
          click aren't wired up yet — see the conversation this was built
          from for the full chunk plan.
          The map itself is deliberately NOT inside a `.wrap` — it's meant
          to run full page width, unlike every other section on this page,
          so it sits directly in the section instead (`.band`/`.tight`
          only add vertical padding, no horizontal, so a direct child here
          already spans edge-to-edge with no extra work). */}
      <section className="band tight">
        <div className="wrap">
          <div className={styles.mapIntro}>
            <div>
              <div className="eyebrow reveal">Where we go</div>
              <div className="rule" />
              <h2 className={`reveal d1 ${styles.mapHeading}`}>
                The world, within <em>reach.</em>
              </h2>
              <p className={`reveal d1 ${styles.mapSub}`}>
                Explore extraordinary destinations and start planning your next journey with our expert advisors.
              </p>
            </div>
            <dl className={`reveal d2 ${styles.mapStats}`}>
              <div>
                <dt>100+</dt>
                <dd>Destinations</dd>
              </div>
              <div>
                <dt>50+</dt>
                <dd>Expert advisors</dd>
              </div>
              <div>
                <dt>24/7</dt>
                <dd>Personal support</dd>
              </div>
            </dl>
          </div>
        </div>
        <div className={`reveal d2 ${styles.worldMapWrap}`}>
          <WorldMap />
        </div>
      </section>

      {/* DISCOVER — the first interaction */}
      <section className={`band tight ${styles.disc}`} aria-label="Where shall we take you?">
        <div className="wrap">
          <div className={`${styles.discHead} reveal`}>
            <div className="eyebrow">{discover.eyebrow}</div>
            <div className="rule" />
            <h2 dangerouslySetInnerHTML={{ __html: discover.headingHtml ?? "" }} />
            <p className={`${styles.discSub} reveal`}>{discover.sub}</p>
          </div>

          {/* index.html's own search affordance opens a site-wide ⌘K palette
              (js/site.js) that isn't ported into this app — routes to the
              real (if shell-only) /search page instead of a dead trigger. */}
          <Link className={`${styles.discSearch} reveal d1`} to="/search" aria-label="Search a place, a hotel, or a city">
            <svg className={styles.dsIc} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="11" cy="11" r="7" />
              <line x1="20.5" y1="20.5" x2="16.5" y2="16.5" />
            </svg>
            <span className={styles.dsLabel} dangerouslySetInnerHTML={{ __html: discover.searchLabelHtml ?? "" }} />
          </Link>

          {/* Moved here from its own former "DECIDE" section (which only
              ever held this card grid — no longer rendered separately) so
              it reads as more ways to search, right under the search bar. */}
          <div className={`${styles.decGrid} reveal d1`}>
            {decide.cards.map((card, i) => (
              <Link className={styles.decCard} to={toRoute(card.href)} key={i}>
                <div className={styles.dn}>{card.kicker}</div>
                <h3>{card.heading}</h3>
                <p>{card.body}</p>
                <span className={styles.go}>{card.goLabel}</span>
              </Link>
            ))}
          </div>

          <div className={`${styles.discPaths} reveal d1`}>
            <Link className={styles.discRec} to={toRoute(discover.recommenderHref)}>
              <span className={styles.drLead}>{discover.recommenderLead}</span>{" "}
              <span dangerouslySetInnerHTML={{ __html: discover.recommenderRestHtml ?? "" }} />
            </Link>
          </div>

          {continueChips.length > 0 && (
            <div className={`${styles.discCont} reveal`}>
              <div className={styles.dcK}>Continue planning</div>
              <div className={styles.dcRail}>
                {continueChips.map((slug) => (
                  <Link className={styles.dcChip} to={`/city-${encodeURIComponent(slug)}`} key={slug}>
                    {titleCase(slug)}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <DestinationPlanner planner={planner} />

      {/* SERVICES */}
      <section className="band">
        <div className="wrap">
          <div className="reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "24px 40px", marginBottom: 50 }}>
            <div style={{ maxWidth: "72ch" }}>
              <div className="eyebrow">{services.eyebrow}</div>
              <div className="rule" />
              <h2 style={{ maxWidth: "18ch" }} dangerouslySetInnerHTML={{ __html: services.headingHtml ?? "" }} />
              <p className={`lede ${styles.servicesLede}`} style={{ marginTop: 18 }}>
                {services.lede}
              </p>
            </div>
            <Link className="cta" to={toRoute(services.allHref)} style={{ whiteSpace: "nowrap", paddingBottom: 6 }}>
              {services.allLabel}
            </Link>
          </div>
          <div className="grid-3" style={{ textAlign: "left" }}>
            {services.cards.map((card, i) => (
              <div className={`svc reveal d${i + 1}`} key={i}>
                <div className="pic" style={{ backgroundImage: `url('${card.image}')` }} />
                <h3 style={{ marginTop: 22 }}>{card.heading}</h3>
                <p>{card.body}</p>
                <Link className="cta" to={toRoute(card.ctaHref)} style={{ marginTop: 22, marginBottom: 26, display: "inline-block" }}>
                  {card.ctaLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* "Our Promise" (STATS section's own content already removed per an
          earlier request; this SIGNATURE MOMENT timeline replaced it on top
          of the same background image) — shelved, not deleted: its journey
          narrative is now covered by <HowItWorksTabs/> above. Restore this
          along with the `stats`/`signature` destructure and `lhTrackRef`
          ref/effect above if needed. See home-page.module.css's
          `.promiseOnDark` for the dark-photo color overrides this needs —
          none of `.lh-*`'s base styling (site.css) is dark-background-aware
          on its own.
      <section
        className={`band-dark band ${styles.promiseOnDark}`}
        style={{
          backgroundImage: `var(--scrim),url('${stats.backgroundImage}')`,
          backgroundPosition: "center top",
        }}
      >
        <div className="wrap">
          <div className="lh-head">
            <div className="eyebrow reveal">{signature.eyebrow}</div>
            <h2 className="lh-title reveal d1" dangerouslySetInnerHTML={{ __html: signature.titleHtml ?? "" }} />
          </div>
          <div className="lh-track" ref={lhTrackRef}>
            <svg className="lh-svg" viewBox="0 0 1200 240" fill="none" preserveAspectRatio="none" aria-hidden="true">
              <path className="lh-path lh-a" d="M90,60 L500,60" pathLength={1} />
              <path className="lh-path lh-b" d="M500,60 L1080,60" pathLength={1} />
            </svg>
            {signature.nodes.map((node, i) => {
              if (node.kind === "gate") {
                return (
                  <div className="lh-gate" data-at={node.at ?? undefined} style={{ left: node.left ?? undefined }} key={i}>
                    <span className="gline" />
                    <span className="glab">{node.label}</span>
                  </div>
                );
              }
              if (node.kind === "seal") {
                return (
                  <div className={`lh-seal${node.on ? " on" : ""}`} data-at={node.at ?? undefined} style={{ left: node.left ?? undefined }} key={i}>
                    <span className="seal-ring">
                      <svg width="30" height="30" viewBox="0 0 420 420" fill="none">
                        <g strokeWidth={30} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M140,150 L280,150" />
                          <path d="M210,150 L210,212" />
                          <path d="M140,300 L210,212 L280,300" />
                          <path d="M174,256 L246,256" />
                        </g>
                      </svg>
                    </span>
                    <div className="lab">
                      <b>{node.label}</b>
                      <i>{node.sublabel}</i>
                    </div>
                  </div>
                );
              }
              return (
                <div className={`lh-node${node.on ? " on" : ""}`} data-at={node.at ?? undefined} style={{ left: node.left ?? undefined }} key={i}>
                  <span className="dot" />
                  <div className="lab">
                    <b>{node.label}</b>
                    <i>{node.sublabel}</i>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      */}

      <HowItWorksTabs />

      {/* HOW IT WORKS (phone mock + live chat demo) — shelved, not deleted.
          Being replaced by a new autoadvancing 5-stage tabbed section (see
          the conversation this was built from); restore this block and the
          `howItWorks` destructure/ConciergeChatDemo import above if needed.
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap grid-2">
          <div className="reveal" style={{ display: "flex", justifyContent: "center" }}>
            <ConciergeChatDemo chips={howItWorks.scenarioChips} scenarios={howItWorks.scenarios} tryLabel={howItWorks.tryLabel} />
          </div>
          <div className="reveal d2">
            <div className="eyebrow">
              <span className="demo-live">{howItWorks.liveLabel}</span>
            </div>
            <h2 style={{ fontSize: "clamp(30px,3.6vw,52px)", marginTop: 14 }} dangerouslySetInnerHTML={{ __html: howItWorks.headingHtml ?? "" }} />
            <p className="lede" style={{ marginTop: 14 }}>
              {howItWorks.lede}
            </p>
            <div className="steps" style={{ marginTop: 30 }}>
              {howItWorks.steps.map((s, i) => (
                <div className="step" key={i}>
                  <div className="si">{s.number}</div>
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
      */}

      {/* TRIPS GALLERY */}
      <section className="band tight">
        <div className="wrap">
          <div className="reveal" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "14px 40px" }}>
            <div>
              <div className="eyebrow">{trips.eyebrow}</div>
              <h2 style={{ marginTop: 14 }}>{trips.heading}</h2>
            </div>
            <Link className="cta" to={toRoute(trips.allHref)} style={{ whiteSpace: "nowrap", paddingBottom: 6 }}>
              {trips.allLabel}
            </Link>
          </div>
        </div>
        <div className={styles.tripsViewport}>
          <div className="trips-row reveal d2">
            {trips.items.map((t, i) => (
              <div className="trip" style={{ backgroundImage: `url('${t.image}')` }} key={i}>
                <div className="cap">
                  <div className="pl">{t.place}</div>
                  <div className="d">{t.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — source marks this copy as placeholder pending real
          member quotes before launch (testimonials.placeholder === true in
          homepage.generated.json); same "known placeholder, not a content
          pass" treatment as Footer.tsx's legal address. */}
      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{testimonials.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ margin: "0 auto 50px" }}>
            {testimonials.heading}
          </h2>
          <div className="quote-grid">
            {testimonials.quotes.map((q, i) => (
              <figure className={`tq reveal d${i + 1}`} key={i}>
                <blockquote>{q.quote}</blockquote>
                <figcaption>{q.attribution}</figcaption>
              </figure>
            ))}
          </div>
          <p className="muted reveal d3" style={{ fontSize: 12, marginTop: 34, letterSpacing: "0.04em" }}>
            {testimonials.footnote}
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="band-dark band center" style={{ backgroundImage: "var(--scrim),url('/_vercel/image?url=%2Fimg%2Fcities%2Fsantorini.jpg&w=2048&q=80')" }}>
        <div className="wrap">
          <svg width="50" height="50" viewBox="0 0 420 420" fill="none" className="reveal" style={{ margin: "0 auto 24px" }}>
            <g stroke="#F6F1E6" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round">
              <path d="M140,150 L280,150" />
              <path d="M210,150 L210,212" />
              <path d="M140,300 L210,212 L280,300" />
              <path d="M174,256 L246,256" />
            </g>
          </svg>
          <h2 className="reveal d1" style={{ fontSize: "clamp(34px,5vw,72px)", marginBottom: 30 }} dangerouslySetInnerHTML={{ __html: finalCta.headingHtml ?? "" }} />
          <div className="btn-row center reveal d3">
            {WHATSAPP_NUMBER ? (
              <a className="btn btn-gold on-dark" href={ADVISOR_HREF} target="_blank" rel="noopener noreferrer">
                {finalCta.secondaryLabel}
              </a>
            ) : (
              <Link className="btn btn-gold on-dark" to={ADVISOR_HREF}>
                {finalCta.secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
