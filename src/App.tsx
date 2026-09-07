import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { AuthProvider } from "./lib/auth";
import { ThemeProvider } from "./lib/theme";
import PageRouter from "./pages/PageRouter";

// AuthProvider is mounted here because Header.tsx calls useAuth()
// unconditionally and throws without it — with no session yet this is just
// a local getSession() check, no DB call.
//
// Ported so far: city-*.html (Phase 2), health-{hospital,destination,
// specialty,guide,longevity,pathway}-*.html (Phase 3). Every other slug
// falls through to PageRouter's placeholder — those templates land in later
// phases, one group at a time.
//
// The index route ("/") has no :pageSlug param at all, so it's routed to
// the same PageRouter — which renders HomePage for the undefined-pageSlug
// case — rather than duplicating the redirect/dispatch logic here.
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<PageRouter />} />
            <Route path=":pageSlug" element={<PageRouter />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
