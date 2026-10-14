import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// This app lives at tripagent-site-main/app/ — one level inside the existing
// static site (tripagent-site-main/), which stays fully live and untouched
// (see docs/PRODUCT-KRA.md's build-alongside directive). `server.fs.allow`
// widens Vite's dev-server file access one level up so `src/` can import the
// REAL site.css directly from ../css/site.css (see src/main.tsx) — visual
// parity without copying or forking the stylesheet. Cutover/deployment (does
// the built app end up serving from the site root, a subpath, or replace the
// static files outright) is an explicit later decision, not decided here.

// Ported pages carry hero/section images as Vercel's image-optimization proxy
// URLs (`/_vercel/image?url=%2Fimg%2F...`) verbatim from the source HTML —
// that endpoint is a Vercel platform feature with no local equivalent, so in
// dev it 404s through to the SPA catch-all and every such image renders
// blank. This dev-only middleware unwraps the proxy: it decodes the `url`
// query param and serves that file directly from public/img (symlinked to
// ../../img, same pattern as public/fonts -> ../../fonts), which is exactly
// what Vercel does in production minus the resizing/compression.
function vercelImageProxy(): Plugin {
  return {
    name: "vercel-image-proxy-dev",
    apply: "serve",
    configureServer(server) {
      // @types/node isn't installed in this app, so the connect middleware's
      // (req, res, next) params fall back to explicit `any` here.
      server.middlewares.use((req: any, _res: any, next: any) => {
        if (!req.url?.startsWith("/_vercel/image?")) return next();
        const params = new URL(req.url, "http://localhost").searchParams;
        const target = params.get("url");
        if (!target) return next();
        req.url = target;
        next();
      });
    },
  };
}

// Every prefix the FastAPI backend (../backend/main.py) actually serves,
// proxied to the local backend so the frontend can call plain relative paths
// in both dev and prod — no VITE_API_BASE_URL/VITE_ASSISTANT_ENDPOINT needed.
const BACKEND_PROXY = {
  target: "http://localhost:8000",
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react(), vercelImageProxy()],
  server: {
    fs: { allow: [".."] },
    proxy: {
      "/cities": BACKEND_PROXY,
      "/config": BACKEND_PROXY,
      "/auth": BACKEND_PROXY,
      "/me": BACKEND_PROXY,
      "/my-year": BACKEND_PROXY,
      "/api": BACKEND_PROXY,
      "/ai": BACKEND_PROXY,
      "/enquiries": BACKEND_PROXY,
      "/invite": BACKEND_PROXY,
      "/access-requests": BACKEND_PROXY,
      "/referrals": BACKEND_PROXY,
    },
  },
  // Page-scoped CSS files (app/src/pages/*.module.css) auto-hash their class
  // names per file, so short names like .pull/.sig/.idx can never collide
  // across pages again (see tools/css_modules_rewrite.py). Genuinely shared
  // classes are wrapped :global() in those files and stay unhashed — the
  // one real global stylesheet, css/site.css, is untouched and unaffected.
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
});