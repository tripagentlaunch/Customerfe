import { useEffect, useRef, useState } from "react";

// An odometer: every digit is a vertical reel of 0-9 that rolls upward and
// settles on its final digit, the first time the number scrolls into view.
// The roll is one CSS transform transition per reel (compositor-driven, no
// per-frame React updates), so it stays smooth. Under reduced motion the reels
// start on the final digits.
const CELL = 1.1; // em
const DURATION = 2200; // ms
const EASE = "cubic-bezier(0.215, 0.61, 0.355, 1)"; // ease-out: quick start, slow settle

function Reel({ digit, spins, go, animate }: { digit: number; spins: number; go: boolean; animate: boolean }) {
  const cells = Array.from({ length: (spins + 1) * 10 }, (_, i) => i % 10);
  const y = go ? -(spins * 10 + digit) * CELL : 0;
  return (
    <span style={{ display: "inline-block", height: `${CELL}em`, overflow: "hidden", verticalAlign: "top" }}>
      <span
        style={{
          display: "block",
          transform: `translate3d(0, ${y}em, 0)`,
          transition: go && animate ? `transform ${DURATION}ms ${EASE}` : "none",
          willChange: "transform",
        }}
      >
        {cells.map((c, i) => (
          <span key={i} style={{ display: "block", height: `${CELL}em`, lineHeight: `${CELL}em` }}>
            {c}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [go, setGo] = useState(false);
  const [animate, setAnimate] = useState(true);
  const text = value.toLocaleString("en-US");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setAnimate(false);
      setGo(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setGo(true);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      role="text"
      aria-label={`${text}${suffix}`}
      style={{ display: "inline-flex", fontVariantNumeric: "tabular-nums", lineHeight: `${CELL}em` }}
    >
      {[...text, ...suffix].map((ch, i) => {
        if (!/\d/.test(ch)) {
          return (
            <span key={i} aria-hidden="true" style={{ display: "inline-block", height: `${CELL}em`, lineHeight: `${CELL}em` }}>
              {ch}
            </span>
          );
        }
        // each reel travels only 5-14 digits to land: digits 0-4 take one
        // full turn (so a 0 still visibly rolls), 5-9 just count up to it
        const digit = Number(ch);
        return <Reel key={i} digit={digit} spins={digit < 5 ? 1 : 0} go={go} animate={animate} />;
      })}
    </span>
  );
}
