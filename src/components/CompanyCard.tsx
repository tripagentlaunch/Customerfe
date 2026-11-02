import { COMPANY } from "../lib/company";
import styles from "./company-card.module.css";

/* The company behind TripAgent, set out once, on Contact: who we are and where (email and phone
   are the page's own rows above it). The details payment and consumer rules ask a site to show. */
export default function CompanyCard({ title = "Company details" }: { title?: string }) {
  return (
    <aside className={styles.card} aria-label={title}>
      <div className={styles.head}>
        <div className={styles.eyebrow}>{title}</div>
        <p className={styles.lede}>
          {COMPANY.brand} is a brand of <b>{COMPANY.legalName}</b>.
        </p>
      </div>
      <dl className={styles.grid}>
        <div>
          <dt>Address</dt>
          <dd>
            {COMPANY.addressLines.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </dd>
        </div>
        <div>
          <dt>GSTIN</dt>
          <dd className={styles.mono}>{COMPANY.gstin}</dd>
        </div>
      </dl>
    </aside>
  );
}
