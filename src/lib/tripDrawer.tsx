import { createContext, useContext, useState, type ReactNode } from "react";

// Shared open/close state for the "My Trip" cart drawer (js/shell.js's
// openCart()/closeCart()) — the trip button lives in Header, the drawer
// itself is mounted once in Layout, so both need a common toggle.
const TripDrawerContext = createContext<{ isOpen: boolean; open: () => void; close: () => void } | null>(null);

export function TripDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <TripDrawerContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </TripDrawerContext.Provider>
  );
}

export function useTripDrawer() {
  const ctx = useContext(TripDrawerContext);
  if (!ctx) throw new Error("useTripDrawer() must be used inside <TripDrawerProvider>");
  return ctx;
}
