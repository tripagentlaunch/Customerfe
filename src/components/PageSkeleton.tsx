import styles from "./PageSkeleton.module.css";

// Shown for the moment a page's own code is downloading (pages load on
// demand — see PageRouter.tsx), so the visitor sees the page taking shape
// under the header instead of a blank white screen.
export default function PageSkeleton() {
  return (
    <div className="wrap band" aria-busy="true" aria-label="Loading">
      <div className={styles.sk}>
        <span className={`${styles.bar} ${styles.eyebrow}`} />
        <span className={`${styles.bar} ${styles.title}`} />
        <span className={`${styles.bar} ${styles.title2}`} />
        <span className={`${styles.bar} ${styles.line}`} />
        <span className={`${styles.bar} ${styles.line}`} />
        <span className={`${styles.bar} ${styles.short}`} />
      </div>
    </div>
  );
}
