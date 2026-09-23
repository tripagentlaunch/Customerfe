import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import journal from "../data/journal.generated.json";
import type { JournalData, JournalNode } from "../types/journal";
import { useScrollReveal } from "../lib/useScrollReveal";
import { toRoute } from "../lib/toRoute";
import styles from "./journal-page.module.css";

const JOURNAL = journal as unknown as Record<string, JournalData>;

function ProseNode({ node }: { node: JournalNode }) {
  switch (node.kind) {
    case "leadPara":
      return <p className={`${styles.leadCap} reveal d1`} dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    case "paragraph":
      return <p className="reveal" dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    case "heading":
      return <h2 className="reveal" dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    case "blockquote":
      return <blockquote className="reveal" dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    case "list":
      return (
        <ul className={`reveal${node.className ? " " + node.className : ""}`}>
          {node.items.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </ul>
      );
    case "rule":
      return <div className={`${styles.artRule} reveal`} />;
    case "raw":
      return <div className="reveal" dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    default:
      return null;
  }
}

export default function JournalPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? JOURNAL[pageSlug] : undefined;

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

  const { hero, prose, miniQuote, closing } = data;

  return (
    <>
      <header
        className={`hero left ${styles.artHero}`}
        data-hero
        style={{ backgroundImage: `url('${hero.image}')`, backgroundPosition: hero.imagePosition ?? undefined }}
      >
        <div className="wrap hero-inner">
          <div className="hs-copy">
            {hero.backLink && (
              <Link className={`cta on-dark ${styles.backlink} reveal`} to={toRoute(hero.backLink.href)}>
                {hero.backLink.label}
              </Link>
            )}
            <div className={`${styles.artKicker} reveal`}>{hero.kicker}</div>
            <div className="rule reveal d1" />
            <h1 className="display reveal d1" dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
            <p className="lede on-dark reveal d2" style={{ marginTop: 20 }}>
              {hero.lede}
            </p>
            <div className={`${styles.artMeta} reveal d2`}>
              {hero.meta.map((m, i) => (
                <span key={i}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="band">
        <div className="wrap prose">
          <p className={`${styles.standfirst} reveal`} dangerouslySetInnerHTML={{ __html: prose.standfirst ?? "" }} />
          {prose.nodes.map((n, i) => (
            <ProseNode node={n} key={i} />
          ))}
        </div>
      </section>

      {miniQuote && (
        <section className="band tight">
          <div className="wrap">
            <div className="pq reveal">
              <p>{miniQuote}</p>
            </div>
          </div>
        </section>
      )}

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
          <div className="btn-row center reveal d3" style={{ marginTop: 28 }}>
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
