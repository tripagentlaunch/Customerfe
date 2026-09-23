import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Swiper from "swiper";
import { A11y, Autoplay, EffectFade, Keyboard, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import type { HeroSlide } from "../types/homepage";
import { toRoute } from "../lib/toRoute";
import styles from "./HeroCarousel.module.css";

// Ported from index.html's own boot() script 1:1 — loop + fade cross-fade,
// keyboard/a11y on, autoplay paused under reduced motion, hairline
// prev/next arrows (no pagination dots — Swiper's own bullets are wired
// but never rendered, same as source). Vanilla Swiper core (not the React
// wrapper) to match how every other interactive port in this app drives
// real DOM behaviour through a ref, not a swiper-specific abstraction.
export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nextElRef = useRef<HTMLButtonElement | null>(null);
  const prevElRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const swiper = new Swiper(el, {
      modules: [EffectFade, Autoplay, Keyboard, A11y, Navigation],
      loop: true,
      speed: 1100,
      effect: "fade",
      fadeEffect: { crossFade: true },
      grabCursor: false,
      keyboard: { enabled: true },
      a11y: { enabled: true },
      autoplay: reduce
        ? false
        : {
            delay: 5500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          },
      navigation: {
        nextEl: nextElRef.current,
        prevEl: prevElRef.current,
      },
    });

    return () => {
      swiper.destroy(true, true);
    };
  }, []);

  // Content is fixed — only the background photo cycles between slides.
  // Taken from the first slide, once, rather than re-read per active slide.
  const content = slides[0];

  return (
    <header className={`hero left ${styles.heroEd}`} aria-roledescription="carousel" aria-label="A private travel maison">
      <div className={`swiper ${styles.swiperRoot}`} ref={containerRef}>
        <div className="swiper-wrapper">
          {slides.map((slide, i) => (
            <div className={`swiper-slide ${styles.heroSlide}`} key={i}>
              {/* Background image lives on a child, never on .swiper-slide
                  itself — Swiper's destroy(true, true) (called from this
                  component's own effect cleanup, which React 18 StrictMode
                  runs once immediately in dev) does slideEl.removeAttribute
                  ('style') on every slide, which silently wiped a
                  backgroundImage set directly here and never got restored
                  since nothing re-renders this subtree afterward. Swiper
                  never touches a slide's children, only the slide/wrapper/
                  container elements' own style attributes. */}
              <div
                className={styles.heroSlideBg}
                style={{ backgroundImage: slide.image ? `url('${slide.image}')` : undefined }}
              />
              {/* Kept in the DOM for data parity with the source, but hidden by
                  the same `.hero-inset,.hero-nextup{display:none!important}`
                  rule as index.html — the A&K-style hero ships uncluttered
                  (image + scrim + copy + arrows only), no inset photo or
                  next-up teaser. */}
              <figure className={styles.heroInset}>
                <div className={styles.pic} style={{ backgroundImage: slide.insetImage ? `url('${slide.insetImage}')` : undefined }} />
                <figcaption className={styles.cap}>
                  <div className={styles.k}>{slide.insetCaptionK}</div>
                  <div className={styles.t}>{slide.insetCaptionT}</div>
                </figcaption>
              </figure>
              <div className={styles.heroNextup}>
                <span className={styles.nxK}>{slide.nextLabel}</span>
                {slide.nextLinkHref && <Link to={toRoute(slide.nextLinkHref)}>{slide.nextLinkLabel}</Link>}
              </div>
            </div>
          ))}
        </div>
        <button className="swiper-button-prev" type="button" aria-label="Previous slide" ref={prevElRef} />
        <button className="swiper-button-next" type="button" aria-label="Next slide" ref={nextElRef} />
      </div>

      {/* Static content overlay — sits on top of the whole swiper, not tied
          to any one slide, so it never changes as the background cycles. */}
      <div className={styles.slideInner}>
        <div className="wrap">
          <div className={styles.hsCopy}>
            <div className="eyebrow on-dark">{content.eyebrow}</div>
            <div className="rule" />
            <h1 className={`display ${styles.display}`} dangerouslySetInnerHTML={{ __html: content.headingHtml ?? "" }} />
            <p className={`lede on-dark ${styles.lede}`} style={{ marginTop: 24 }}>
              {content.lede}
            </p>
            <div className={styles.heroCtaRow}>
              {content.ctaLinks.map((cta, ci) => {
                if (ci === 0) {
                  return (
                    <Link className={`btn btn-gold on-dark btn-square ${styles.heroCta}`} to={toRoute(cta.href)} key={ci}>
                      <span className={styles.heroCtaLabel}>
                        {cta.label}
                        <span className={styles.heroCtaArrow} aria-hidden="true">
                          →
                        </span>
                      </span>
                    </Link>
                  );
                }
                if (ci === 1) {
                  return (
                    <Link className={`btn btn-ghost on-dark ${styles.heroCtaSecondary}`} to={toRoute(cta.href)} key={ci}>
                      <span className={styles.heroCtaLabel}>
                        {cta.label}
                        <span className={styles.heroCtaArrow} aria-hidden="true">
                          →
                        </span>
                      </span>
                    </Link>
                  );
                }
                // Tertiary: plain text + arrow, no border/box — underline
                // appears on hover (see HeroCarousel.module.css's
                // .heroCtaTertiary). Lowest-weight of the 3 CTAs.
                return (
                  <Link className={styles.heroCtaTertiary} to={toRoute(cta.href)} key={ci}>
                    {cta.label}
                    <span aria-hidden="true">→</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
