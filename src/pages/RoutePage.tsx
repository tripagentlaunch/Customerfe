import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import routes from "../data/routes.generated.json";
import type { RouteData } from "../types/route";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./route-page.module.css";

const ROUTES = routes as unknown as Record<string, RouteData>;

export default function RoutePage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? ROUTES[pageSlug] : undefined;

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  if (!data) {
    return (
      <div className="wrap band">
        <p>Not yet ported to the app.</p>
      </div>
    );
  }

  const { hero, facts, intro, list, connection, signature, traps, secure, whenToBook, closing } = data;

  return (
    <>
      <header
        className={`hero left ${styles.dpHero}`}
        data-hero
        style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: hero.imagePosition ?? undefined }}
      >
        <div className="wrap hero-inner">
          <div className={styles.dpCopy}>
            {hero.backLink && (
              <Link className="cta on-dark reveal" to={toRoute(hero.backLink.href)} style={{ marginBottom: 20 }}>
                {hero.backLink.label}
              </Link>
            )}
            <div className="eyebrow on-dark reveal">{hero.eyebrow}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2">{hero.lede}</p>
            <div className={`${styles.dpCta} reveal d2`}>
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(hero.ctaPrimary.href)}>
                {hero.ctaPrimary.label}
              </Link>
              <a className="cta on-dark" href={hero.ctaSecondary.href}>
                {hero.ctaSecondary.label}
              </a>
            </div>
          </div>
        </div>
        <div className={styles.dpMeta}>
          <div className="k">{hero.cornerLabel.key}</div>
          <div className="t">{hero.cornerLabel.value}</div>
        </div>
      </header>

      <section className="band tight">
        <div className="wrap">
          <div className={`${styles.facts} reveal`}>
            {facts.map((f, i) => (
              <div className={styles.f} key={i}>
                <div className="k">{f.label}</div>
                <div className="v">{f.value}</div>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap editorial">
          <div className="ed-grid">
            <div className="ed-meta reveal">
              <div className="eyebrow">{intro.eyebrow}</div>
              <p className="ed-note">{intro.note}</p>
            </div>
            <div className="reveal d1">
              <p className="ed-statement">{intro.statement}</p>
              <p className="lede" style={{ marginTop: 22 }}>
                {intro.lede}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }} id={list.anchorId ?? undefined}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch" }}>
            <div className="eyebrow">{list.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,56px)" }}>{list.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {list.lede}
            </p>
          </div>
          <ul className={`${styles.carriers} reveal d1`}>
            {list.items.map((item, i) => (
              <li key={i}>
                <div className="nm">
                  {item.name} {item.tag && <span className={styles.al}>{item.tag}</span>}
                </div>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.vrow}`}>
          <div className="reveal">
            <div className="eyebrow">{connection.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{connection.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {connection.lede}
            </p>
            <ul className={styles.cpLines}>
              {connection.points.map((p, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: p }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal d1">
            {connection.image.src && (
              <img
                className="ov-img"
                src={connection.image.src}
                width={1600}
                height={1067}
                loading="lazy"
                decoding="async"
                alt={connection.image.alt ?? ""}
              />
            )}
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{signature.by}</div>
          <p className={`${styles.pull} reveal d1`}>{signature.pull}</p>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "32ch" }}>
            <div className="eyebrow">{traps.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{traps.heading}</h2>
          </div>
          <ol className={`${styles.idx} reveal d1`}>
            {traps.items.map((item, i) => (
              <li key={i}>
                <p dangerouslySetInnerHTML={{ __html: item }} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{secure.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.2vw,46px)" }}>{secure.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {secure.lede}
            </p>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <Link className="btn btn-gold" to={toRoute(secure.cta.href ?? "/enquire")}>
                {secure.cta.label}
              </Link>
            </div>
          </div>
          <div className="reveal d1">
            <div className="steps">
              {secure.steps.map((s, i) => (
                <div className="step" key={i}>
                  <div className="si">{s.n}</div>
                  <div>
                    <h4>{s.title}</h4>
                    <p>{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="band center">
        <div className="wrap">
          <div className="eyebrow reveal">{whenToBook.eyebrow}</div>
          <div className="rule center reveal d1" />
          <p className={`${styles.when} reveal d1`} style={{ margin: "18px auto 0" }}>
            {whenToBook.text}
          </p>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${closing.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{closing.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }}>
            {closing.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {closing.lede}
          </p>
          <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
            {closing.ctaPrimary && (
              <Link className="btn btn-gold on-dark" to={toRoute(closing.ctaPrimary.href)}>
                {closing.ctaPrimary.label}
              </Link>
            )}
            {closing.ctaSecondary && (
              <Link className="btn btn-ghost on-dark" to={toRoute(closing.ctaSecondary.href)}>
                {closing.ctaSecondary.label}
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
