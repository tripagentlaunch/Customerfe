import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ThemeToggle } from "./ThemeToggle";
import { TripDrawer } from "./TripDrawer";
import { AdvisorButton } from "./AdvisorButton";
import { MobileTabbar } from "./MobileTabbar";
import { SignInModal } from "./SignInModal";
import { NavVariantProvider } from "../../lib/navVariant";
import { NavMenuProvider } from "../../lib/navMenu";
import { TripDrawerProvider } from "../../lib/tripDrawer";
import { SignInModalProvider } from "../../lib/signInModal";

// concierge.html is full-screen, chat-only — no site chrome (nav/tab-bar/
// floating helpers), matching a messaging app's own window rather than a
// website with a chat widget on it. Ported from that page's own <style>
// block (html,body{height:100%;overflow:hidden}, #content sized to the
// viewport) since Layout renders the same chrome on every other route.
const FULLSCREEN_CHAT_PATHS = new Set(["/concierge"]);

// request-access.html is a cold, unauthenticated lead form — direct
// request to drop the header/nav row and the floating "Talk to your
// advisor" button on this route only (not the fullscreen-chat treatment
// above: footer/tab-bar/trip-drawer stay exactly as on every other page,
// only Header + AdvisorButton are skipped here).
const NO_HEADER_NO_ADVISOR_PATHS = new Set(["/request-access"]);

export function Layout() {
  const { pathname } = useLocation();
  const isFullscreenChat = FULLSCREEN_CHAT_PATHS.has(pathname);
  const hideHeaderAndAdvisor = NO_HEADER_NO_ADVISOR_PATHS.has(pathname);

  // js/shell.js sets this on <html> once the shell header is built; several
  // mobile (<900px) rules in css/site.css key off it — bottom padding for
  // the tab bar, and hiding the floating advisor button in favor of the tab
  // bar's own "Advisor" tab. Skipped on the full-screen chat route, which
  // renders neither.
  useEffect(() => {
    if (isFullscreenChat) {
      document.documentElement.classList.remove("ta-has-shell");
      return;
    }
    document.documentElement.classList.add("ta-has-shell");
    return () => document.documentElement.classList.remove("ta-has-shell");
  }, [isFullscreenChat]);

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

  // React Router doesn't reset scroll on client-side navigation (unlike a
  // full page load) — without this, a new route inherits whatever scrollY
  // the previous page was at, clamped to its own (often shorter) height, so
  // it can land at the bottom instead of the top. css/site.css sets a global
  // html{scroll-behavior:smooth} — per spec, behavior:"auto" just defers to
  // that CSS property (so it would still animate); "instant" is what
  // actually bypasses it for the jump a normal page load gives you.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <NavVariantProvider>
      <NavMenuProvider>
        <TripDrawerProvider>
          <SignInModalProvider>
            {!isFullscreenChat && !hideHeaderAndAdvisor && <Header />}
            <main id="content" style={isFullscreenChat ? { height: "100dvh", display: "flex" } : undefined}>
              <Outlet />
            </main>
            {!isFullscreenChat && (
              <>
                <Footer />
                <ThemeToggle />
                {!hideHeaderAndAdvisor && <AdvisorButton />}
                <TripDrawer />
                <MobileTabbar />
              </>
            )}
            <SignInModal />
          </SignInModalProvider>
        </TripDrawerProvider>
      </NavMenuProvider>
    </NavVariantProvider>
  );
}
