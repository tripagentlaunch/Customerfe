import { useEffect, useState } from "react";

// True when the viewport is at most `maxWidth` px wide (default 720: phones).
// Used where a narrow screen gets a different component, not just different
// CSS. Follows live resizes (e.g. the dev phone frame vs. a desktop window).
export function useIsMobile(maxWidth = 720) {
  const query = `(max-width: ${maxWidth}px)`;
  const [mobile, setMobile] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return mobile;
}
