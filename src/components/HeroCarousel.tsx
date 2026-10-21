import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Swiper from "swiper";
import { A11y, Autoplay, EffectFade, Keyboard, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import type { HeroSlide } from "../types/homepage";
import { toRoute } from "../lib/toRoute";
import { PrimaryInverseButton, SecondaryInverseButton } from "./buttons/InverseButtons";
import { withTaraAI } from "./TaraAI";
import { useIsMobile } from "../hooks/useIsMobile";
import styles from "./HeroCarousel.module.css";

// 720p web encodes (public/videos/homepage/web/, 2026-10-13) of the 1080p
// originals beside them — the hero sits under a dark scrim, so 720p reads
// the same at a fraction of the bytes. Each has a first-frame poster (.jpg)
// so the hero is never blank while a video loads.
const toVideos = (names: string[]) =>
  names.map((name) => ({ src: `/videos/homepage/web/${name}.mp4`, poster: `/videos/homepage/web/${name}.jpg` }));
// Desktop (2026-10-21): the landscape "Dream Destinations" montage — the 4K
// master (Tripagent-Desktop-4K-Mixed-Source-Master.mp4, 3840x2160, 17.1s),
// served byte-for-byte as supplied, no re-encode — is the main hero, then the Bali water temple at dusk. Each plays through
// to its own end before the carousel fades on (see the effect below), so a
// fixed slide timer never cuts either one off mid-shot. `end` stops a clip
// early: the montage's last ~0.7s is a baked-in dissolve back to its opening
// Eiffel Tower shot (made for looping), which flashed Paris just before Bali.
const HERO_VIDEOS: { src: string; poster: string; end?: number }[] = [
  { ...toVideos(["tripagent-desktop-4k"])[0], end: 16 },
  ...toVideos(["13707600_1920_1080_25fps"]),
];
// Phones get the portrait "Dream Destinations" clip (2026-10-16), 17s long. The four
// slides each start it at a different point, so a 5.5s slide never replays what the
// previous one just showed.
const PHONE_HERO_VIDEOS = toVideos(["dream-destinations", "dream-destinations", "dream-destinations", "dream-destinations"]);
const PHONE_CLIP_SECONDS = 17;

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

    const playThrough = window.matchMedia("(min-width: 721px)").matches;
    const swiper = new Swiper(el, {
      modules: [EffectFade, Autoplay, Keyboard, A11y, Navigation],
      loop: true,
      speed: 1100,
      effect: "fade",
      fadeEffect: { crossFade: true },
      grabCursor: false,
      keyboard: { enabled: true },
      a11y: { enabled: true },
      // Desktop advances when the active video ends (below), not on a timer.
      autoplay: reduce || playThrough
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

    // Only the slide on screen plays; the rest wait with preload="none"
    // until their turn, so the first video doesn't share bandwidth with all
    // the others on page load.
    const playActive = () => {
      el.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
        const slide = v.closest(".swiper-slide");
        if (slide?.classList.contains("swiper-slide-active") && !reduce) {
          if (v.preload !== "auto") v.preload = "auto";
          // Desktop: every video starts from its beginning when its slide comes up.
          if (playThrough && v.paused && v.readyState > 0) v.currentTime = 0;
          v.play().catch(() => {
            // Autoplay blocked: fall back to a timed advance so the hero never sticks.
            if (playThrough && !reduce) fallback = window.setTimeout(() => swiper.slideNext(), 8000);
          });
        } else {
          v.pause();
        }
      });
    };
    // Desktop: the active video ending is what moves the carousel on.
    let fallback = 0;
    const onEnded = (e: Event) => {
      if (playThrough && !reduce && (e.target as HTMLElement).closest(".swiper-slide-active")) swiper.slideNext();
    };
    el.addEventListener("ended", onEnded, true);
    // A clip with an `end` (data-end) moves on there instead, before its tail.
    const onTime = (e: Event) => {
      const v = e.target as HTMLVideoElement;
      const end = Number(v.dataset.end);
      if (playThrough && !reduce && end && v.currentTime >= end && v.closest(".swiper-slide-active")) swiper.slideNext();
    };
    el.addEventListener("timeupdate", onTime, true);
    swiper.on("slideChange", () => window.clearTimeout(fallback));
    swiper.on("slideChange", playActive);
    swiper.on("slideChangeTransitionStart", playActive);
    playActive();

    return () => {
      el.removeEventListener("ended", onEnded, true);
      el.removeEventListener("timeupdate", onTime, true);
      window.clearTimeout(fallback);
      swiper.destroy(true, true);
    };
  }, []);

  // Content is fixed — only the background photo cycles between slides.
  // Taken from the first slide, once, rather than re-read per active slide.
  const content = slides[0];
  // Phone (mobile handoff): the first CTA reads "Browse cities".
  const isMobile = useIsMobile();
  const heroVideos: { src: string; poster: string; end?: number }[] = isMobile ? PHONE_HERO_VIDEOS : HERO_VIDEOS;

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
              <div className={styles.heroSlideBg} style={{ backgroundImage: `url('${heroVideos[i % heroVideos.length].poster}')` }}>
                <video
                  className={styles.heroSlideVideo}
                  src={heroVideos[i % heroVideos.length].src}
                  poster={heroVideos[i % heroVideos.length].poster}
                  preload={i === 0 ? "auto" : "none"}
                  loop={isMobile}
                  data-end={isMobile ? undefined : heroVideos[i % heroVideos.length].end}
                  muted
                  playsInline
                  onLoadedMetadata={(e) => {
                    if (isMobile) e.currentTarget.currentTime = (i % 4) * (PHONE_CLIP_SECONDS / 4);
                  }}
                />
              </div>
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
            <div className="eyebrow on-dark">{isMobile ? (content.eyebrow ?? "").replace(/\s*·\s*by invitation\s*$/i, "") : content.eyebrow}</div>
            <div className="rule" />
            <h1 className={`display ${styles.display}`} dangerouslySetInnerHTML={{ __html: content.headingHtml ?? "" }} />
            <p className={`lede on-dark ${styles.lede}`} style={{ marginTop: 24 }}>
              {/* Desktop: the promise "until you are home" is the closing banner's
                  headline and the signature section's line — not repeated here. */}
              {isMobile ? content.lede : (content.lede ?? "").replace(/\s*—\s*until you are home\.?$/i, ".")}
            </p>
            <div className={styles.heroCtaRow}>
              {content.ctaLinks.map((cta, ci) => {
                if (ci === 0) {
                  return (
                    <PrimaryInverseButton to={cta.href} key={ci}>
                      {isMobile ? "Browse cities" : cta.label}
                    </PrimaryInverseButton>
                  );
                }
                if (ci === 1) {
                  return (
                    <SecondaryInverseButton to={cta.href} key={ci}>
                      {withTaraAI(cta.label)}
                    </SecondaryInverseButton>
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
