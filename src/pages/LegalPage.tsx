import { useEffect } from "react";
import { useParams } from "react-router-dom";
import legal from "../data/legal.generated.json";
import type { LegalData, LegalNode } from "../types/legal";
import { useScrollReveal } from "../lib/useScrollReveal";
import { useNavVariant } from "../lib/navVariant";
import styles from "./legal-page.module.css";
import NotFoundPage from "./NotFoundPage";

const LEGAL = legal as unknown as Record<string, LegalData>;

function ProseNode({ node }: { node: LegalNode }) {
  switch (node.kind) {
    case "heading":
      return <h3 dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    case "paragraph":
      return <p dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    case "list":
      return (
        <ul>
          {node.items.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </ul>
      );
    case "raw":
      return <div dangerouslySetInnerHTML={{ __html: node.html ?? "" }} />;
    default:
      return null;
  }
}

export default function LegalPage() {
  const { pageSlug } = useParams<{ pageSlug: string }>();
  const data = pageSlug ? LEGAL[pageSlug] : undefined;

  useNavVariant("solid");

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title;
  }, [data]);

  useScrollReveal([data]);

  if (!data) {
    return <NotFoundPage />;
  }

  const { hero, nodes, note } = data;

  return (
    <div style={{ background: "var(--ivory)" }}>
      <header className={styles.legalHead}>
        <div className="wrap">
          <div className="eyebrow">{hero.eyebrow}</div>
          <div className="rule" />
          <h1>{hero.heading}</h1>
          <p className={styles.stand}>{hero.standfirst}</p>
          <p className={styles.updated}>{hero.updated}</p>
        </div>
      </header>
      <section className={styles.legalBody}>
        <div className="wrap">
          <div className="prose">
            {nodes.map((n, i) => (
              <ProseNode node={n} key={i} />
            ))}
            {note && <div className={styles.note} dangerouslySetInnerHTML={{ __html: note }} />}
          </div>
        </div>
      </section>
    </div>
  );
}
