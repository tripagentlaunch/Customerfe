import { useEffect } from "react";
import contactData from "../data/contact.generated.json";
import type { ContactData } from "../types/contact";
import { useScrollReveal } from "../lib/useScrollReveal";
import { useNavVariant } from "../lib/navVariant";
import { withTaraAI } from "../components/TaraAI";
import styles from "./contact-page.module.css";

const data = contactData as unknown as ContactData;

export default function ContactPage() {
  useNavVariant("solid");

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useScrollReveal([]);

  const { hero, rows, detail, noteHtml } = data;

  return (
    <>
      <section className="band" style={{ padding: 0 }}>
        <div className="wrap">
          <div className={styles.ctHero}>
            <div className="reveal">
              <div className={styles.ctEyebrow}>{hero.eyebrow}</div>
              <div className="rule" />
              <h1 dangerouslySetInnerHTML={{ __html: hero.headingHtml ?? "" }} />
              <p className={styles.ctLede}>{hero.lede}</p>
            </div>
            <figure className={`${styles.ctFigure} reveal d1`} style={{ backgroundImage: `url('${hero.image}')` }}>
              <figcaption className="cap">
                <div className="t">{hero.caption}</div>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="band tight" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className={`${styles.ctMethods} reveal`}>
            {rows.map((r, i) => (
              <div className={styles.ctRow} key={i}>
                <div className="k">{withTaraAI(r.label)}</div>
                <div className="v">
                  <a href={r.valueHref} target={r.valueHref.startsWith("http") ? "_blank" : undefined} rel={r.valueHref.startsWith("http") ? "noopener" : undefined}>
                    {r.valueText}
                  </a>
                </div>
                <p>{r.note}</p>
              </div>
            ))}
          </div>

          <div className={`${styles.ctDetail} reveal d1`}>
            {detail.map((d, i) => (
              <div key={i}>
                <h3>{d.heading}</h3>
                <p dangerouslySetInnerHTML={{ __html: d.bodyHtml ?? "" }} />
              </div>
            ))}
            <p className={styles.ctNote} dangerouslySetInnerHTML={{ __html: noteHtml ?? "" }} />
          </div>
        </div>
      </section>
    </>
  );
}
