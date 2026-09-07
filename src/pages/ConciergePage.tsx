import { useEffect } from "react";
import conciergeData from "../data/concierge-page.generated.json";
import type { ConciergePageData } from "../types/concierge-page";
import ConciergeChatApp from "../concierge-chat/App";
import "../concierge-chat/styles.css";

const data = conciergeData as unknown as ConciergePageData;

// Aanya, wired to the real, already-deployed concierge backend
// (backend/app/routers/ai_router.py, on Render) via the concierge-chat/
// app's own components — reused as-is (src/concierge-chat/), not rebuilt.
// Layout.tsx hides the site-wide chrome (header/footer/tabbar/floating
// buttons) and gives #content the full-screen flex layout on this route,
// matching concierge.html's own full-screen "this page is the chat"
// treatment.
export default function ConciergePage() {
  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  return (
    <section className="cc-stage" style={{ flex: "1 1 auto", display: "flex", minHeight: 0 }}>
      <ConciergeChatApp />
    </section>
  );
}
