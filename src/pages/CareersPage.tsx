import { useEffect } from "react";
import { Link } from "react-router-dom";
import careersData from "../data/careers-page.generated.json";
import type { CareersPageData } from "../types/careers-page";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./careers-page.module.css";

const data = careersData as unknown as CareersPageData;

// mailto: links aren't routable — toRoute() only passes through "#"/"http"
// hrefs untouched, so mailto CTAs render as plain <a>, not <Link>.
function isMailto(href: string) {
  return href.startsWith("mailto:");
}

export default function CareersPage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, model, hire, role, ai, steps, why, close } = data;

  return (
    <main>
      <header className="hero hero-ed" style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: "60% 35%" }}>
        <div className="wrap hero-inner">
          <div className="hs-copy">
            <div className="eyebrow on-dark">{hero.eyebrow}</div>
            <div className="rule" />
            <h1 className="display" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark" style={{ marginTop: 24 }}>
              {hero.lede}
            </p>
            <div className="hero-cta-row">
              <a className="btn btn-gold on-dark btn-square" href={hero.cta.href}>
                {hero.cta.label}
              </a>
            </div>
          </div>
        </div>
        <div className="scrolldown">Scroll</div>
      </header>

      <section className="band">
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{model.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,3.6vw,54px)" }}>{model.heading}</h2>
            {model.ledes.map((l, i) => (
              <p className="lede" style={{ marginTop: i === 0 ? 18 : 16 }} key={i}>
                {l}
              </p>
            ))}
          </div>
          <div className="reveal d2">
            <div className="pic" style={{ height: "clamp(280px,40vw,480px)", borderRadius: 18, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${model.image}')` }} />
          </div>
        </div>
      </section>

      <section className="band tight" style={{ background: "var(--bone)" }}>
        <div className="wrap">
          <div className="eyebrow reveal">{hire.eyebrow}</div>
          <div className="rule reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "20ch" }}>
            {hire.heading}
          </h2>
          <div className={styles.crBar} style={{ marginTop: 34 }}>
            {hire.feats.map((f, i) => (
              <div className={i % 2 === 0 ? "feat reveal" : "feat reveal d1"} key={i}>
                <div className="n">{f.label}</div>
                <h3>{f.heading}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2" style={{ direction: "rtl" }}>
          <div className="reveal" style={{ direction: "ltr" }}>
            <div className="eyebrow">{role.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,3.6vw,54px)" }}>{role.heading}</h2>
            <p className="lede" style={{ marginTop: 18 }}>
              {role.lede}
            </p>
            <ul className="incl" style={{ marginTop: 24, maxWidth: "none" }}>
              {role.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal d2" style={{ direction: "ltr" }}>
            <div className="pic" style={{ height: "clamp(280px,40vw,480px)", borderRadius: 18, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${role.image}')` }} />
          </div>
        </div>
      </section>

      <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${ai.image}')` }}>
        <div className="wrap">
          <div className="eyebrow on-dark reveal">{ai.eyebrow}</div>
          <div className="rule center reveal d1" />
          <h2 className="reveal d1" style={{ maxWidth: "22ch", margin: "0 auto" }}>
            {ai.heading}
          </h2>
          <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
            {ai.lede}
          </p>
        </div>
      </section>

      <section className="band tight">
        <div className="wrap">
          <div className="steps reveal" style={{ maxWidth: 760, margin: "0 auto" }}>
            {steps.items.map((s, i) => (
              <div className="step" key={i}>
                <div className="si">{s.n}</div>
                <div>
                  <h4>{s.heading}</h4>
                  <p>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band" style={{ background: "var(--bone)" }}>
        <div className="wrap grid-2">
          <div className="reveal">
            <div className="eyebrow">{why.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(30px,3.6vw,54px)" }}>{why.heading}</h2>
            <p className="lede" style={{ marginTop: 18 }}>
              {why.lede}
            </p>
            <ul className="incl" style={{ marginTop: 24, maxWidth: "none" }}>
              {why.items.map((it, i) => (
                <li key={i}>
                  <span className="ck">✦</span>
                  <span dangerouslySetInnerHTML={{ __html: it ?? "" }} />
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal d2">
            <div className="pic" style={{ height: "clamp(280px,40vw,480px)", borderRadius: 18, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${why.image}')` }} />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap grid-2" style={{ alignItems: "center" }}>
          <div className="reveal">
            <div className="eyebrow">{close.eyebrow}</div>
            <div className="rule" />
            <h2 style={{ fontSize: "clamp(32px,4.2vw,60px)", maxWidth: "15ch" }} dangerouslySetInnerHTML={{ __html: close.headingHtml ?? "" }} />
          </div>
          <div className="reveal d1">
            <p className="lede" style={{ maxWidth: "40ch" }}>
              {close.lede}
            </p>
            <div className="btn-row" style={{ marginTop: 28 }}>
              {close.buttons.map((b, i) =>
                isMailto(b.href) ? (
                  <a className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} href={b.href} key={i}>
                    {b.label}
                  </a>
                ) : (
                  <Link className={i === 0 ? "btn btn-gold" : "btn btn-ghost"} to={toRoute(b.href)} key={i}>
                    {b.label}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
