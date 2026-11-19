import { useEffect } from "react";
import { Link } from "react-router-dom";
import homepageData from "../data/homepage.generated.json";
import type { HomepageData } from "../types/homepage";
import { useScrollReveal } from "../lib/useScrollReveal";
import { useParallax } from "../lib/useParallax";
import { useBareChromeForGuests } from "../lib/bareChrome";
import { PrimaryInverseButton } from "../components/buttons/InverseButtons";
import CountUp from "../components/CountUp";
import styles from "./home-page.module.css";
import ctaStyles from "./landing-page.module.css";

const data = homepageData as unknown as HomepageData;

// Background photos for the 3 "What is TripAgent" cards, in card order (A
// real person, An AI concierge, On WhatsApp) — existing lifestyle photos
// already in the project, reused rather than anything new or literal.
const WAY_CARD_IMAGES = ["/img/h/membership.jpg", "/img/h/portal.jpg", "/img/h/contact.jpg"];

// Landing-page copy, kept here rather than in the generated homepage JSON
// (which HomePage still reads). Calm, complete sentences; sentence case.
const COPY = {
  heroLede:
    "TripAgent pairs every member with a named advisor who plans, books and looks after each journey, with AI working behind them so that nothing is missed.",
  wayLede:
    "Most travel is now booked alone, on a screen. We believe a journey is better looked after by someone who knows you, so every member has one named advisor, with AI working quietly behind them.",
  wayCards: [
    { kicker: "Yours", heading: "One named advisor", body: "The same person every time, who remembers how you like to travel, so you never explain yourself twice." },
    { kicker: "In seconds", heading: "AI behind your advisor", body: "Research and drafts are ready in moments, and your advisor checks every detail before it reaches you." },
    { kicker: "Always", heading: "With you throughout", body: "On WhatsApp from your first message until you are home, including when plans change while you travel." },
  ],
  statsHeadingHtml: 'A personal service with a <span class="it">global reach</span>.',
  servicesHeadingHtml: 'What we do <span class="it">best</span>.',
  servicesLede: "Flights, hotels and visas, arranged together and managed by your advisor.",
};

const STATS = [
  { value: 300000, suffix: "+", label: "Hotels & villas" },
  { value: 190, suffix: "+", label: "Countries" },
  { value: 110, suffix: "", label: "Cities, planned day by day" },
  { value: 24, suffix: "/7", label: "Your advisor, on call" },
];

// The pre-membership teaser a visitor without an invitation sees at "/"
// (PageRouter.tsx) instead of landing straight on the RequestAccessPage
// form. Reuses the homepage's own hero and "What we do best" sections
// (hero stripped of its CTAs, service cards made non-interactive — nothing
// here is reachable yet) then closes with a CTA that sends them to the real
// form at /request-access.
export default function LandingPage() {
  useBareChromeForGuests();
  useEffect(() => {
    document.title = "TripAgent — Membership, by invitation";
  }, []);
  useScrollReveal([]);
  useParallax("[data-landing]");

  const { way, services } = data;

  return (
    <main className={styles.home} data-landing>
      {/* HERO — dark panel, copy left, one framed photo flush right (no
          carousel), after the reference the user supplied. The one button
          goes to the real form; nothing else on this page is reachable yet. */}
      <header className={ctaStyles.intro}>
        <div className={ctaStyles.introCopy}>
          <div className={ctaStyles.introBrand}>
            <svg width="22" height="22" viewBox="0 0 420 420" fill="none" aria-hidden="true">
              <g strokeWidth={26} strokeLinecap="round" strokeLinejoin="round">
                <path d="M140,150 L280,150" />
                <path d="M210,150 L210,212" />
                <path d="M140,300 L210,212 L280,300" />
                <path d="M174,256 L246,256" />
              </g>
            </svg>
            <span>TripAgent</span>
          </div>
          <div className={`eyebrow on-dark ${ctaStyles.introEyebrow}`}>Your private travel desk</div>
          <h1 className={ctaStyles.introH}>
            One advisor
            <br />
            <span className={ctaStyles.introIt}>who knows how you travel.</span>
          </h1>
          <p className={`lede on-dark ${ctaStyles.introLede}`}>{COPY.heroLede}</p>
          <div className={ctaStyles.introCta}>
            <PrimaryInverseButton to="/request-access">Request an invitation</PrimaryInverseButton>
          </div>
        </div>
        <div className={ctaStyles.introMedia}>
          <img src="/images/home-hero/2-desert-oasis.jpg" alt="" fetchPriority="high" />
        </div>
      </header>

      {/* WHAT IS TRIPAGENT — the homepage's own shelved "What we did"
          section (data.way, still in homepage.generated.json, unused since
          HomePage.tsx dropped it), as a grid-3 card row — same header +
          grid-3 rhythm as "What we do best" right below it — instead of
          the original's stacked .feat rows beside a portrait photo. No CTA
          button here (its original "How it works" link isn't reachable
          pre-membership) — same nothing-clickable-yet treatment as the
          services cards below. */}
      <section className="band" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`reveal ${styles.servicesHead}`} style={{ textAlign: "center", marginBottom: 50 }}>
            <div className="eyebrow">{way.eyebrow}</div>
            <div className="rule center" />
            <h2 style={{ margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: way.headingHtml ?? "" }} />
            <p className="lede" style={{ margin: "18px auto 0" }}>
              {COPY.wayLede}
            </p>
          </div>
          <div className="grid-3">
            {COPY.wayCards.map((f, i) => (
              <div className={`${ctaStyles.wayCard} reveal d${i + 1}`} key={i}>
                <div className={ctaStyles.picWrap}>
                  <div className="pic" style={{ backgroundImage: `url('${WAY_CARD_IMAGES[i] ?? WAY_CARD_IMAGES[0]}')` }} />
                </div>
                <div className={ctaStyles.wayBody}>
                  <div className="n">{f.kicker}</div>
                  <h3>{f.heading}</h3>
                  <p>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE DO BEST */}
      <section className="band">
        <div className="wrap">
          <div className={`reveal ${styles.servicesHead}`} style={{ textAlign: "center", marginBottom: 50 }}>
            <div className="eyebrow">{services.eyebrow}</div>
            <div className="rule center" />
            <h2 style={{ margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: COPY.servicesHeadingHtml }} />
            <p className="lede" style={{ margin: "18px auto 0" }}>
              {COPY.servicesLede}
            </p>
          </div>
          <div className={`grid-3 ${styles.servicesGrid}`} style={{ textAlign: "center" }}>
            {services.cards.map((card, i) => (
              <div className={`svc reveal d${i + 1}`} key={i}>
                <div className={`${ctaStyles.picWrap} ${ctaStyles.picRound}`}>
                  <div className="pic" style={{ backgroundImage: `url('${card.image}')` }} />
                </div>
                <h3 style={{ marginTop: 22 }}>{card.heading}</h3>
                <p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NUMBERS — the health page's own .med-stats row, each figure ticking
          up from zero as it scrolls into view. Eyebrow/heading are the
          homepage's shelved "stats" copy; the figures are that section's
          count-up items plus the city count from city-plans.json. */}
      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className={`reveal ${styles.servicesHead}`} style={{ textAlign: "center", marginBottom: 36 }}>
            <div className="eyebrow">{data.stats.eyebrow}</div>
            <div className="rule center" />
            <h2 style={{ margin: "0 auto", fontSize: "clamp(26px, 3.3vw, 48px)" }} dangerouslySetInnerHTML={{ __html: COPY.statsHeadingHtml }} />
          </div>
          <div className={`med-stats ${ctaStyles.stats} reveal d1`}>
            {STATS.map((s, i) => (
              <div className="med-stat" key={i}>
                <span className="n">
                  <CountUp value={s.value} suffix={s.suffix} />
                </span>
                <span className="l">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA PLACARD — a frosted cream card (same treatment as the
          RequestAccessPage form itself) over the closing photo, so this
          reads as an actual placard rather than bare text on the image.
          Deliberately NOT `band-dark`: that class forces every heading/
          eyebrow/lede/button inside it to the on-photo white treatment
          (site.css's "#99 safety net"), which fought the card's own light
          background and left white-on-cream, barely-legible text and a
          button whose hover fill read as black-on-black. Plain `.band`
          lets the card's contents use the site's normal light-background
          styling — the same look as any other card elsewhere on the site.
          The photo itself is now its own parallaxed layer (ctaMedia, see
          landing-page.module.css) rather than a plain backgroundImage, so
          it can drift with scroll the way ExoticPage.tsx's band/hero
          photos do; ctaShade carries the scrim that used to be baked into
          that same backgroundImage as a second CSS layer. */}
      <section
        className={`band center ${ctaStyles.ctaSection}`}
        style={{ minHeight: "100svh", display: "flex", alignItems: "center" }}
      >
        <div
          className={ctaStyles.ctaMedia}
          data-parallax="0.18"
          style={{ backgroundImage: "url('/_vercel/image?url=%2Fimg%2Fcities%2Fsantorini.jpg&w=2048&q=80')" }}
        />
        <div className={ctaStyles.ctaShade} />
        <div className="wrap" style={{ position: "relative" }}>
          <div className={`${ctaStyles.ctaCard} reveal`}>
            <div className={ctaStyles.brandMark}>
              <svg width="22" height="22" viewBox="0 0 420 420" fill="none" className="mk">
                <g stroke="currentColor" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M140,150 L280,150" />
                  <path d="M210,150 L210,212" />
                  <path d="M140,300 L210,212 L280,300" />
                  <path d="M174,256 L246,256" />
                </g>
              </svg>
              <span>TripAgent</span>
            </div>
            <div className="eyebrow">Private membership</div>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,42px)", margin: "14px 0 0" }}>
              Membership <span className="it">by invitation.</span>
            </h2>
            <p className="lede" style={{ margin: "14px auto 0" }}>
              Each member is paired with a named advisor who looks after every journey. Request an invitation and we will be in touch.
            </p>
            <div className="btn-row center" style={{ marginTop: 28 }}>
              <Link className="btn btn-gold" to="/request-access">
                Request an invitation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
