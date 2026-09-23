import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import goin from "../data/goin.generated.json";
import type { GoInData } from "../types/goin";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./goin-page.module.css";

const GOIN = goin as unknown as Record<string, GoInData>;

function CpLines({ points }: { points: string[] }) {
  return (
    <ul className={styles.cpLines}>
      {points.map((p, i) => (
        <li key={i}>
          <span className="ck">✦</span>
          <span dangerouslySetInnerHTML={{ __html: p }} />
        </li>
      ))}
    </ul>
  );
}

export default function GoInPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? GOIN[pageSlug] : undefined;

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

  const { hero, intro, where, avoid, indianAngle, signature, flightsVisas, monthNav, closing } = data;

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
        {hero.cornerLabel && (
          <div className={styles.dpMeta}>
            <div className="k">{hero.cornerLabel.key}</div>
            <div className="t">{hero.cornerLabel.value}</div>
          </div>
        )}
      </header>

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

      <section className="band tight" id={where.anchorId ?? undefined} style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "32ch" }}>
            <div className="eyebrow">{where.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,4vw,58px)" }}>{where.heading}</h2>
          </div>
          <ol className={`${styles.idx} reveal d1`}>
            {where.items.map((item, i) => (
              <li key={i}>
                <div>
                  <h3>{item.heading}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band">
        <div className={`wrap ${styles.vrow}`}>
          <div className="reveal">
            <div className="eyebrow">{avoid.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{avoid.heading}</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              {avoid.lede}
            </p>
            <CpLines points={avoid.points} />
          </div>
          {avoid.image.src && (
            <div className="reveal d1">
              <img
                className="ov-img"
                src={avoid.image.src}
                width={1600}
                height={1067}
                loading="lazy"
                decoding="async"
                alt={avoid.image.alt ?? ""}
              />
            </div>
          )}
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch" }}>
            <div className="eyebrow">{indianAngle.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{indianAngle.heading}</h2>
          </div>
          <div className="reveal d1">
            <CpLines points={indianAngle.points} />
          </div>
        </div>
      </section>

      <section className="sig" style={{ backgroundImage: `url('${signature.image}')` }}>
        <div className="wrap">
          <div className={`${styles.by} reveal`}>{signature.by}</div>
          <p className={`${styles.pull} reveal d1`}>{signature.pull}</p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="reveal" style={{ maxWidth: "34ch" }}>
            <div className="eyebrow">{flightsVisas.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{flightsVisas.heading}</h2>
          </div>
          <div className="reveal d1">
            <CpLines points={flightsVisas.points} />
          </div>
        </div>
      </section>

      <section className="band tight center">
        <div className="wrap">
          <div className="eyebrow reveal">{monthNav.eyebrow}</div>
          <div className={`${styles.mnav} reveal d1`} style={{ justifyContent: "center", marginTop: 18 }}>
            {monthNav.links.map((l, i) => (
              <Link to={toRoute(l.href)} key={i}>
                {l.label}
              </Link>
            ))}
          </div>
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
