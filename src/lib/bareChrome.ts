import { useLayoutEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { LayoutOutletContext } from "../components/layout/Layout";

// Hides the site chrome (Header, footer, tab bar, floating helpers) for
// signed-out visitors while the calling page is mounted — see Layout.tsx.
// Layout effect so the chrome is gone before the first paint, not after.
export function useBareChromeForGuests(): void {
  const { setBareForGuests } = useOutletContext<LayoutOutletContext>();
  useLayoutEffect(() => {
    setBareForGuests(true);
    return () => setBareForGuests(false);
  }, [setBareForGuests]);
}
