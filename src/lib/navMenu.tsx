import { createContext, useContext, useState, type ReactNode } from "react";

// Shared mobile-menu / mega-menu "room" state — the header (rooms live
// inside it) and the mobile bottom tab bar (a Layout-level sibling that
// needs to open those same rooms, per js/shell.js's openRoom()) both need
// to read and drive this.
// TODO (tracked follow-up, not yet built, 2026-09-25): add a third room,
// e.g. "account", surfacing signed-in-only items — "My Year" (/portal) and
// "Refer a friend" (/refer) at minimum, with room for profile/sign-out
// later. Desktop already has both via Header.tsx's .ta-hd-cluster
// (gated on useAuth()'s signedIn); mobile currently has no equivalent —
// MobileTabbar.tsx's 4 slots (Discover/Plan/My Trip/Advisor) are fixed and
// NOT account-scoped, and site.css hides .ta-hd-year/.ta-hd-adv outright
// below the mobile breakpoint with nothing replacing them. This should be
// a new room alongside "discover"/"plan" (additive here + a new panel
// component, same pattern as DiscoverMega/PlanMega), not a redesign of
// MobileTabbar's existing fixed layout.
export type RoomKey = "discover" | "plan" | null;

type NavMenuValue = {
  menuOpen: boolean;
  openRoom: RoomKey;
  toggleMenu: () => void;
  closeMenu: () => void;
  toggleRoom: (room: RoomKey) => void;
  openMenuWithRoom: (room: RoomKey) => void;
};

const NavMenuContext = createContext<NavMenuValue | null>(null);

export function NavMenuProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openRoom, setOpenRoom] = useState<RoomKey>(null);

  const value: NavMenuValue = {
    menuOpen,
    openRoom,
    toggleMenu: () => setMenuOpen((v) => !v),
    closeMenu: () => {
      setMenuOpen(false);
      setOpenRoom(null);
    },
    toggleRoom: (room) => setOpenRoom((cur) => (cur === room ? null : room)),
    openMenuWithRoom: (room) => {
      setMenuOpen(true);
      setOpenRoom(room);
    },
  };

  return <NavMenuContext.Provider value={value}>{children}</NavMenuContext.Provider>;
}

export function useNavMenu() {
  const ctx = useContext(NavMenuContext);
  if (!ctx) throw new Error("useNavMenu() must be used inside <NavMenuProvider>");
  return ctx;
}
