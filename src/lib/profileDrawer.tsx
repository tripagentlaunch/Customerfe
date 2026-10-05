import { createContext, useContext, useState, type ReactNode } from "react";

// Open/close state for the Profile sidebar — same shape as tripDrawer.tsx:
// the Profile button lives in Header, the drawer itself is mounted once in
// Layout, so both need a common toggle.
//
// `dismiss` is close + "bring the navbar back for a moment": used when the
// visitor backs out of the sidebar (the cross, or clicking outside it).
// Header watches `peekTick` and flashes itself visible the same way the
// initial page-load peek does. Plain `close` (a link inside the sidebar was
// followed, or hand-off to another drawer) doesn't trigger it.
const ProfileDrawerContext = createContext<{
  isOpen: boolean;
  open: () => void;
  close: () => void;
  dismiss: () => void;
  peekTick: number;
} | null>(null);

export function ProfileDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [peekTick, setPeekTick] = useState(0);
  return (
    <ProfileDrawerContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        dismiss: () => {
          setIsOpen(false);
          setPeekTick((t) => t + 1);
        },
        peekTick,
      }}
    >
      {children}
    </ProfileDrawerContext.Provider>
  );
}

export function useProfileDrawer() {
  const ctx = useContext(ProfileDrawerContext);
  if (!ctx) throw new Error("useProfileDrawer() must be used inside <ProfileDrawerProvider>");
  return ctx;
}
