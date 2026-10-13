import styles from "./ClusterPin.module.css";

// A group of nearby map pins collapsed into one badge: a light disc with the
// count in the signature colour and a soft halo that marks it as a group
// (2026-10-13, direct request — replaced the heavy black stacked discs).
// Glyph-free, so it can't be mistaken for a place. The caller owns
// positioning and what clicking does (zoom in to the group).
export default function ClusterPin({ count, onClick }: { count: number; onClick: () => void }) {
  const size = count >= 100 ? styles.lg : count >= 10 ? styles.md : styles.sm;
  return (
    <button type="button" className={`${styles.cluster} ${size}`} aria-label={`${count} places — zoom in`} onClick={onClick}>
      {count}
    </button>
  );
}
