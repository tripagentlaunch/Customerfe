import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PhoneFrame, PhoneFrameRouteSync, wantsPhoneFrame } from "./DevPhoneFrame";
// Real site stylesheets, imported directly — same files the static .html
// pages link, so pages render with real visual parity (see vite.config.ts's
// server.fs.allow comment). fonts.css must load before site.css uses the
// custom-font CSS vars (--serif/--fr/--logo), or text falls back to system
// fonts with different metrics — this was silently missing before.
import "./css/fonts.css";
import "./css/site.css";

// Pages load on demand (PageRouter.tsx). After a deploy, a tab opened
// before it asks for page files that no longer exist — reload once to pick
// up the new build instead of showing a broken page.
window.addEventListener("vite:preloadError", (event) => {
  try {
    if (sessionStorage.getItem("ta_chunk_reload")) return;
    sessionStorage.setItem("ta_chunk_reload", "1");
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});
window.addEventListener("load", () => {
  try {
    sessionStorage.removeItem("ta_chunk_reload");
  } catch {
    // storage unavailable
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {wantsPhoneFrame() ? (
      <PhoneFrame />
    ) : (
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PhoneFrameRouteSync />
        <App />
      </BrowserRouter>
    )}
  </StrictMode>
);
