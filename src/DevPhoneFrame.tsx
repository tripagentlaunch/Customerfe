import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Dev-only phone viewport: visit any page with ?viewport=mobile and the app
// renders inside a 390x844 iframe on a grey backdrop. An iframe (not a narrow
// div) is needed because @media queries and matchMedia follow the real window
// width, so the framed app sees a true phone-width viewport. ?viewport=desktop
// (or removing the param) leaves it.
const FLAG = "viewport";
const PHONE = { w: 390, h: 844 };

export const isTopWindow = () => window.self === window.top;

export const wantsPhoneFrame = () =>
  import.meta.env.DEV &&
  isTopWindow() &&
  new URLSearchParams(window.location.search).get(FLAG) === "mobile";

export function PhoneFrame() {
  const src = (() => {
    const u = new URL(window.location.href);
    u.searchParams.delete(FLAG);
    return u.pathname + u.search + u.hash;
  })();
  const scale = Math.min(1, (window.innerHeight - 40) / PHONE.h);
  return (
    <div style={{ minHeight: "100vh", background: "#1c1c1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <iframe
        title="Phone viewport"
        src={src}
        style={{
          width: PHONE.w, height: PHONE.h, border: 0, borderRadius: 28, background: "#fff",
          boxShadow: "0 0 0 8px #000, 0 20px 60px rgba(0,0,0,.5)",
          transform: `scale(${scale})`, transformOrigin: "center",
        }}
      />
    </div>
  );
}

// Inside the frame: mirror the route to the parent URL so a reload of the
// parent returns to the same page.
export function PhoneFrameRouteSync() {
  const loc = useLocation();
  useEffect(() => {
    if (!import.meta.env.DEV || isTopWindow()) return;
    try {
      const u = new URL(loc.pathname + loc.search + loc.hash, window.location.origin);
      u.searchParams.set(FLAG, "mobile");
      window.parent.history.replaceState(null, "", u.pathname + u.search + u.hash);
    } catch { /* cross-origin parent: ignore */ }
  }, [loc]);
  return null;
}
