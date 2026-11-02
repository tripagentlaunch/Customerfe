import { COMPANY } from "../lib/company";
import styles from "./company-card.module.css";

/* The company behind TripAgent, set out plainly: who we are, where, how to reach us. Closes the
   legal pages and Contact (the details payment and consumer rules ask every site to show). */
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
          <dt>Registered company</dt>
          <dd>{COMPANY.legalName}</dd>
        </div>
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
        <div>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>
            <a href={COMPANY.phoneHref}>{COMPANY.phone}</a>
          </dd>
        </div>
      </dl>
    </aside>
  );
}
