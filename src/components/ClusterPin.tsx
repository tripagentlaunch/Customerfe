import styles from "./ClusterPin.module.css";

// A group of nearby map pins collapsed into one badge: a left and a right
// circle (the same round shape as a single pin) with a middle one stacked on
// top of both, carrying the count. Dark and glyph-free, so it can't be mistaken for a place. The caller
// owns positioning and what clicking does (zoom in to the group).
export default function ClusterPin({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" className={styles.cluster} aria-label={`${count} places — zoom in`} onClick={onClick}>
      <span className={`${styles.disc} ${styles.left}`} aria-hidden="true" />
      <span className={`${styles.disc} ${styles.right}`} aria-hidden="true" />
      <span className={`${styles.disc} ${styles.mid}`}>{count}</span>
    </button>
  );
}
