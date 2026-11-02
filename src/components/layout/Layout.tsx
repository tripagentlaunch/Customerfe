import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ThemeToggle } from "./ThemeToggle";
import { TripDrawer } from "./TripDrawer";
import { ProfileDrawer } from "./ProfileDrawer";
import { AdvisorButton } from "./AdvisorButton";
import { SignInModal } from "./SignInModal";
import { NavVariantProvider } from "../../lib/navVariant";
import { NavMenuProvider } from "../../lib/navMenu";
import { TripDrawerProvider } from "../../lib/tripDrawer";
import { ProfileDrawerProvider } from "../../lib/profileDrawer";
import { SignInModalProvider } from "../../lib/signInModal";
import { useAuth } from "../../lib/auth";
import { useScrollRestoration } from "../../lib/useScrollRestoration";
import { useTaraChatLinks } from "../../lib/taraChat";

// concierge.html is full-screen, chat-only — no site chrome (nav/tab-bar/
// floating helpers), matching a messaging app's own window rather than a
// website with a chat widget on it. Ported from that page's own <style>
// block (html,body{height:100%;overflow:hidden}, #content sized to the
// viewport) since Layout renders the same chrome on every other route.
const FULLSCREEN_CHAT_PATHS = new Set(["/concierge"]);

// A page can ask for "bare" chrome via useBareChromeForGuests() (below):
// visitors who aren't signed in (i.e. not yet approved) then see only the
// page — no Header, footer, tab bar, theme toggle, advisor button or
// drawers; signed-in members get the normal site chrome. Page-driven rather
// than path-driven because RequestAccessPage renders at both
// /request-access and, on the dev preview, at "/" (PageRouter.tsx).
export type LayoutOutletContext = { setBareForGuests: (bare: boolean) => void };

export function Layout() {
  const { pathname } = useLocation();
  const isFullscreenChat = FULLSCREEN_CHAT_PATHS.has(pathname);
  const { signedIn, member } = useAuth(); // `loading` was used by the old guests-only bare check below
  const [bareForGuests, setBareForGuests] = useState(false);
  // 2026-10-28 (direct request): /request-access and /claim show no navbar,
  // footer or floating buttons for anyone, signed in or not.
  // Was (guests only, bare until auth resolved): const isBare = bareForGuests && (loading || !signedIn);
  const isBare = bareForGuests;
  const hideChrome = isFullscreenChat || isBare;

  // js/shell.js sets this on <html> once the shell header is built; several
  // mobile (<900px) rules in css/site.css key off it — bottom padding for
  // the tab bar, and hiding the floating advisor button in favor of the tab
  // bar's own "Advisor" tab. Skipped on the full-screen chat route, which
  // renders neither.
  useEffect(() => {
    if (hideChrome) {
      document.documentElement.classList.remove("ta-has-shell");
      return;
    }
    document.documentElement.classList.add("ta-has-shell");
    return () => document.documentElement.classList.remove("ta-has-shell");
  }, [hideChrome]);

  useEffect(() => {
    if (!isFullscreenChat) return;
    const { style } = document.documentElement;
    const prevHeight = style.height;
    const prevOverflow = style.overflow;
    document.documentElement.style.height = "100%";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    return () => {
      document.documentElement.style.height = prevHeight;
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.height = "";
      document.body.style.overflow = "";
      document.body.style.margin = "";
    };
  }, [isFullscreenChat]);

  // React Router doesn't manage scroll on client-side navigation. A new
  // page starts at the top; Back/Forward return to where the visitor was
  // on that page (it used to jump to the top on every URL change, Back
  // included). See useScrollRestoration.
  useScrollRestoration();
  // Every "Talk to Tara AI" CTA opens the Tara chatbot (see taraChat.ts).
  useTaraChatLinks(signedIn ? member?.invitation_code : null);

  return (
    <NavVariantProvider>
      <NavMenuProvider>
        <TripDrawerProvider>
          <ProfileDrawerProvider>
          <SignInModalProvider>
            {!hideChrome && <Header />}
            {/* At least a screen tall, so the footer never shows first while a page is still loading. */}
            <main id="content" style={isFullscreenChat ? { height: "100dvh", display: "flex" } : { minHeight: "100vh" }}>
              <Outlet context={{ setBareForGuests } satisfies LayoutOutletContext} />
            </main>
            {!hideChrome && (
              <>
                <Footer />
                <ThemeToggle />
                <AdvisorButton />
                <ProfileDrawer />
                <TripDrawer />
              </>
            )}
            <SignInModal />
          </SignInModalProvider>
          </ProfileDrawerProvider>
        </TripDrawerProvider>
      </NavMenuProvider>
    </NavVariantProvider>
  );
}
