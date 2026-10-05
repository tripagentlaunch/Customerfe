import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import destinations from "../data/destinations.generated.json";
import type { DestBlock, DestinationData, DestGuidePanel } from "../types/destination";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import { PrimaryInverseButton, SecondaryInverseButton } from "../components/buttons/InverseButtons";

const DESTINATIONS = destinations as unknown as Record<string, DestinationData>;

const GUIDE_TAB_LABELS: Record<string, string> = {
  stay: "Where to stay",
  do: "What to do",
  eat: "Where to eat",
  party: "Nightlife",
};

function Hero({ block }: { block: Extract<DestBlock, { type: "hero" }> }) {
  const back = block.backLink;
  const backLinkEl = back && (
    <Link className={back.class ?? "cta on-dark reveal"} to={toRoute(back.href)} style={back.outsideCopy ? undefined : { marginBottom: 20 }}>
      {back.label}
    </Link>
  );

  return (
    <header
      className={block.headerClass}
      data-hero
      style={{ backgroundImage: `url('${block.image}')`, backgroundPosition: block.imagePosition ?? undefined }}
    >
      {back?.outsideCopy && backLinkEl}
      <div className="wrap hero-inner">
        <div className={block.copyClass ?? undefined}>
          {back && !back.outsideCopy && backLinkEl}
          <div className="eyebrow on-dark reveal">{block.eyebrow}</div>
          <div className={`${block.ruleClass} reveal d1`} />
          <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: block.name ?? "" }} />
          <p className="lede on-dark reveal d2">{block.lede}</p>
          {block.ctaPrimary && (
            <div className="dp-cta reveal d2">
              <Link className="btn btn-gold on-dark btn-square" to={toRoute(block.ctaPrimary.href)}>
                {block.ctaPrimary.label}
              </Link>
              {block.ctaSecondary && (
                <a className="cta on-dark" href={block.ctaSecondary.href}>
                  {block.ctaSecondary.label}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      {block.corner?.kind === "meta" && (
        <div className="dp-meta">
          <div className="k">{block.corner.key}</div>
          <div className="t">{block.corner.value}</div>
        </div>
      )}
      {block.corner?.kind === "coords" && <div className="hero-coords">{block.corner.text}</div>}
    </header>
  );
}

function TheCities({ block }: { block: Extract<DestBlock, { type: "theCities" }> }) {
  return (
    <section className="band ta-content ta-dh" id="the-cities">
      <div className="wrap">
        <div className="reveal" style={{ maxWidth: "56ch", marginBottom: 26 }}>
          <div className="eyebrow">The cities</div>
          <div className="rule" />
          <h2 style={{ fontSize: "clamp(28px,3.6vw,48px)" }}>
            Where to go in <span className="it">{block.country}</span>.
          </h2>
          <p className="lede" style={{ marginTop: 12 }}>
            Each one, in full — the guide, the calendar, the flights and the stays.
          </p>
        </div>
        <div className="dh-grid reveal d1">
          {block.cities.map((c) => (
            <Link className="dh-city" to={`/city-${c.slug}`} key={c.slug}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function GuideBlockView({ block }: { block: Extract<DestBlock, { type: "guide" }> }) {
  return (
    <section className="band" id={block.anchorId ?? "stay"} style={{ scrollMarginTop: 96 }}>
      <div className="wrap">
        <div className="reveal cg-head">
          <div className="eyebrow">{block.eyebrow}</div>
          <div className="rule" />
          <h2 style={{ fontSize: "clamp(30px,4vw,56px)" }} dangerouslySetInnerHTML={{ __html: block.headingHtml ?? "" }} />
          <p className="lede" style={{ marginTop: 16 }}>
            {block.lede}
          </p>
        </div>
        <div className="cg-guide reveal d1">
          <div className="cg-tabs" role="tablist">
            {block.panels.map((p: DestGuidePanel, i: number) => (
              <button key={p.key} data-cg={p.key} role="tab" aria-selected={i === 0}>
                {GUIDE_TAB_LABELS[p.key ?? ""] ?? p.key}
              </button>
            ))}
          </div>
          {block.panels.map((p: DestGuidePanel, i: number) => (
            <div className={`cg-panel${i === 0 ? " on" : ""}`} data-cg={p.key ?? undefined} key={p.key}>
              {p.tiers.map((tier, ti) =>
                tier.label ? (
                  <div className="cg-tier" key={ti}>
                    <div className="tl">{tier.label}</div>
                    <ul className="cg-list">
                      {tier.items.map((item, ii) => (
                        <li key={ii}>
                          <span className="nm">{item.name}</span>
                          {item.area && <span className="ar">{item.area}</span>}
                          <span className="ds">{item.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="cg-list cg-num" key={ti}>
                    {tier.items.map((item, ii) => (
                      <li key={ii}>
                        <span className="nm">{item.name}</span>
                        {item.area && <span className="ar">{item.area}</span>}
                        <span className="ds">{item.description}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderBlock(block: DestBlock, key: number) {
  switch (block.type) {
    case "hero":
      return null; // rendered separately, always first
    case "theCities":
      return <TheCities block={block} key={key} />;
    case "guide":
      return <GuideBlockView block={block} key={key} />;
    case "introEditorial":
      return (
        <section className="band" key={key}>
          <div className="wrap editorial">
            <div className="ed-grid">
              <div className="ed-meta reveal">
                <div className="eyebrow">{block.eyebrow}</div>
                <p className="ed-note">{block.note}</p>
              </div>
              <div className="reveal d1">
                <p className="ed-statement">{block.statement}</p>
                <p className="lede" style={{ marginTop: 22 }}>
                  {block.lede}
                </p>
              </div>
            </div>
          </div>
        </section>
      );
    case "introPullQuote":
      return (
        <section className="band center pull" style={{ background: "var(--bone)" }} key={key}>
          <div className="wrap">
            <div className="eyebrow reveal">{block.eyebrow}</div>
            <div className="rule center reveal d1" />
            <p className="pq reveal d1" dangerouslySetInnerHTML={{ __html: block.quoteHtml ?? "" }} />
            <p className="lede reveal d2" style={{ margin: "26px auto 0" }}>
              {block.lede}
            </p>
          </div>
        </section>
      );
    case "miniPullQuote":
      return (
        <section className="band tight" key={key}>
          <div className="wrap">
            <div className="pq reveal">
              <p dangerouslySetInnerHTML={{ __html: block.textHtml ?? "" }} />
            </div>
          </div>
        </section>
      );
    case "signatureBand":
      return (
        <section className="sig" style={{ backgroundImage: `url('${block.image}')` }} key={key}>
          <div className="wrap">
            <div className="by reveal">{block.by}</div>
            <p className="pull reveal d1" dangerouslySetInnerHTML={{ __html: block.pull ?? "" }} />
          </div>
        </section>
      );
    case "twoCellPair":
      return (
        <section className="band tight" key={key}>
          <div className="wrap">
            <div className="pair reveal">
              {block.cells.map((cell, i) => (
                <div className="cell" style={{ backgroundImage: `url('${cell.image}')` }} key={i}>
                  <div className="cap">
                    <div className="k">{cell.key}</div>
                    <div className="t">{cell.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "gettingThereIdx":
      return (
        <section className="band tight" style={{ background: "var(--bone)" }} key={key}>
          <div className="wrap">
            <div className="reveal" style={{ maxWidth: "30ch" }}>
              <div className="eyebrow" id="flights">
                {block.eyebrow}
              </div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(28px,3.4vw,58px)" }}>{block.heading}</h2>
              <p className="lede" style={{ marginTop: 16 }}>
                {block.lede}
              </p>
            </div>
            <ol className={`${block.listClassName} reveal d1`}>
              {block.items.map((item, i) => (
                <li key={i}>
                  {item.number && <span className="no">{item.number}</span>}
                  <p dangerouslySetInnerHTML={{ __html: item.html ?? "" }} />
                </li>
              ))}
            </ol>
          </div>
        </section>
      );
    case "gettingThereLines":
    case "visaLines":
      return (
        <section className="band tight" style={{ background: "var(--bone)" }} key={key}>
          <div className="wrap grid-2">
            <div className="reveal">
              <div className="eyebrow" id={block.type === "gettingThereLines" ? "flights" : undefined}>
                {block.eyebrow}
              </div>
              <div className="rule" />
              <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)" }}>{block.heading}</h2>
              <p className="lede" style={{ marginTop: 16 }}>
                {block.lede}
              </p>
              <ul className="cp-lines">
                {block.points.map((p, i) => (
                  <li key={i}>
                    <span className="ck">✦</span>
                    <span dangerouslySetInnerHTML={{ __html: p }} />
                  </li>
                ))}
              </ul>
            </div>
            {block.image && (
              <div className="reveal d2">
                <div
                  className="pic"
                  style={{ height: "clamp(280px,40vw,480px)", borderRadius: 18, backgroundSize: "cover", backgroundPosition: "center", backgroundImage: `url('${block.image}')` }}
                />
              </div>
            )}
          </div>
        </section>
      );
    case "whenToGo":
      return (
        <section className="band center" key={key}>
          <div className="wrap">
            <div className="eyebrow reveal">{block.eyebrow}</div>
            <div className="rule center reveal d1" />
            <p className="when reveal d1" style={{ margin: "18px auto 0" }}>
              {block.text}
            </p>
          </div>
        </section>
      );
    case "closingCta":
      return (
        <section className="band-dark band center" style={{ backgroundImage: `var(--scrim), url('${block.image}')` }} key={key}>
          <div className="wrap">
            <div className="eyebrow on-dark reveal">{block.eyebrow}</div>
            <div className="rule center reveal d1" />
            <h2 className="reveal d1" style={{ maxWidth: "20ch", margin: "0 auto" }}>
              {block.heading}
            </h2>
            <p className="lede on-dark reveal d2" style={{ margin: "22px auto 0" }}>
              {block.lede}
            </p>
            <div className="btn-row center reveal d2" style={{ marginTop: 28 }}>
              {block.ctaPrimary && <PrimaryInverseButton to={block.ctaPrimary.href}>{block.ctaPrimary.label}</PrimaryInverseButton>}
              {block.ctaSecondary && (
                <SecondaryInverseButton to={block.ctaSecondary.href}>{block.ctaSecondary.label}</SecondaryInverseButton>
              )}
            </div>
          </div>
        </section>
      );
    case "planEssentials":
      return (
        <section className="sec plan-essentials" style={{ padding: "clamp(46px,7vw,84px) 0", borderTop: "1px solid var(--line)" }} key={key}>
          <div className="wrap" style={{ textAlign: "center" }}>
            <p className="eyebrow reveal">{block.eyebrow}</p>
            <h2 className="reveal d1" style={{ maxWidth: "18ch", margin: "6px auto 0" }}>
              {block.heading}
            </h2>
            <p className="lede reveal d1" style={{ margin: "18px auto 0", maxWidth: "54ch" }}>
              {block.lede}
            </p>
            <div className="plan-trio reveal d2" style={{ marginTop: 30, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              {block.links.map((l, i) => (
                <Link className="btn btn-ghost" to={toRoute(l.href)} key={i}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      );
    case "statementBlock":
      return (
        <section className="band" key={key}>
          <div className="wrap">
            {block.eyebrow && <div className="eyebrow reveal">{block.eyebrow}</div>}
            {block.headingHtml && <h2 className="reveal d1" dangerouslySetInnerHTML={{ __html: block.headingHtml }} />}
            {block.bodyParagraphs.map((p, i) => (
              <p className="lede reveal d1" style={{ marginTop: i === 0 ? 16 : 12 }} key={i} dangerouslySetInnerHTML={{ __html: p }} />
            ))}
            {block.image && (
              <div className="reveal d1" style={{ marginTop: 24 }}>
                <div
                  style={{
                    height: "clamp(280px,40vw,480px)",
                    borderRadius: 4,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundImage: `url('${block.image}')`,
                  }}
                />
              </div>
            )}
          </div>
        </section>
      );
    default:
      return null;
  }
}

export default function DestinationPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? DESTINATIONS[pageSlug] : undefined;

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

  const hero = data.blocks.find((b) => b.type === "hero") as Extract<DestBlock, { type: "hero" }> | undefined;
  const rest = data.blocks.filter((b) => b.type !== "hero");

  return (
    <>
      {data.rawStyle && <style>{data.rawStyle}</style>}
      {hero && <Hero block={hero} />}
      {rest.map((b, i) => renderBlock(b, i))}
    </>
  );
}
