import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import whatsonData from "../data/whatson.generated.json";
import type { WhatsOnPageData } from "../types/whatson";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./whatson-page.module.css";

const data = whatsonData as unknown as WhatsOnPageData;

// Card photo (2026-11-10, direct request): each event links to its city page, so the city's photo is
// used. Tries /img/cities/<slug>.jpg, then <slug>-v2.jpg, then a generic fallback.
function EventImg({ href }: { href: string }) {
  const slug = /^\/?city-(.+?)(?:\.html)?$/.exec(href)?.[1];
  const sources = [...(slug ? [`/img/cities/${slug}.jpg`, `/img/cities/${slug}-v2.jpg`] : []), "/img/h/when-to-go.jpg"];
  const [i, setI] = useState(0);
  return <img className={styles.woEvImg} src={sources[i]} alt="" loading="lazy" onError={() => setI((n) => Math.min(n + 1, sources.length - 1))} />;
}

export default function WhatsOnPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  // Month strip (2026-11-10, direct request): the tab for the month we are in is highlighted when the page
  // opens, and the highlight follows whichever month section is at the top as you scroll.
  const nowId = `m${new Date().getMonth() + 1}`;
  const [activeId, setActiveId] = useState(nowId);
  useEffect(() => {
    const onScroll = () => {
      let current: string | null = null;
      for (const m of data.months) {
        const el = m.id ? document.getElementById(m.id) : null;
        if (el && el.getBoundingClientRect().top <= 140) current = m.id;
      }
      setActiveId(current ?? nowId);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [nowId]);

  const { hero, monthLinks, months } = data;

  return (
    <>
      {/* Hero photo (2026-11-10, direct request). */}
      <header className={styles.woHero} style={{ backgroundImage: "linear-gradient(rgba(10,8,6,.66), rgba(10,8,6,.74)), url('/img/h/when-to-go.jpg')" }}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1 dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
          <p>{hero.lede}</p>
        </div>
      </header>
      <div className={styles.woNav}>
        <div className="wrap">
          {monthLinks.map((m) => (
            <a className={`${styles.woMlink}${m.id === activeId ? ` ${styles.woMlinkOn}` : ""}`} href={`#${m.id}`} key={m.id} aria-current={m.id === activeId ? "true" : undefined}>
              {m.label}
              {m.id === nowId && <i className={styles.woNowDot} title="This month" aria-hidden="true" />}
            </a>
          ))}
        </div>
      </div>
      <main>
        {months.map((m, i) => (
          <section className={styles.woMonth} id={m.id ?? undefined} key={m.id ?? i}>
            <div className="wrap">
              <div className={styles.woMh}>
                <h2>{m.name}</h2>
                <div className="ln" />
                <span className="ct">{m.count}</span>
              </div>
              <div className={styles.woGrid}>
                {m.events.map((ev, j) => (
                  <Link className={styles.woEv} to={toRoute(ev.href)} key={j}>
                    <EventImg href={ev.href} />
                    <div className={styles.woEvBody}>
                      <div className={styles.en}>{ev.name}</div>
                      <div className={styles.ec}>{ev.meta}</div>
                      <p className={styles.eo}>{ev.body}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
