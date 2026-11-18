import type { ReactNode } from "react";
import styles from "./Collapse.module.css";

// Animated show/hide for state-driven accordions (2026-11-16, direct request). The content stays mounted and its height
// animates between 0 and its natural height (grid-template-rows 0fr -> 1fr), so opening and closing are both smooth.
// Closed content is visibility:hidden, so it can't be tabbed into or read out.
export default function Collapse({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.collapse}${open ? ` ${styles.open}` : ""}${className ? ` ${className}` : ""}`} aria-hidden={!open}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
