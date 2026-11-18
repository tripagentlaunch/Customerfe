import { useEffect } from "react";
import conciergeData from "../data/concierge-page.generated.json";
import type { ConciergePageData } from "../types/concierge-page";
import { useAuth } from "../lib/auth";
import { taraChatUrl } from "../lib/taraChat";

const data = conciergeData as unknown as ConciergePageData;

// /concierge leads to Tara AI only (2026-11-04, direct request): the page goes straight on to the
// Tara chatbot, signed in as the member (their invite code rides in the #fragment, as with every
// "Talk to Tara AI" button — see taraChat.ts). It used to render the older built-in "Aanya" chat
// (src/concierge-chat/), which is no longer shown here. replace(), so Back doesn't land on this
// page and bounce forward again.
export default function ConciergePage() {
  const { signedIn, member, loading } = useAuth();
  const code = signedIn ? member?.invitation_code : null;

  useEffect(() => {
    if (data.seo.title) document.title = data.seo.title;
  }, []);

  useEffect(() => {
    if (loading) return; // wait for the session, so a signed-in member arrives signed in
    window.location.replace(taraChatUrl() + (code ? `#code=${encodeURIComponent(code)}` : ""));
  }, [loading, code]);

  return (
    <section className="cc-stage" style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
      <p style={{ margin: 0, opacity: 0.7 }}>Opening Tara AI…</p>
    </section>
  );
}
