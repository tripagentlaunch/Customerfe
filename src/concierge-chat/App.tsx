import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ChatThread from "./components/ChatThread";
import ChatInput from "./components/ChatInput";
import type { ChatMessage } from "./types";
import { askConcierge, citySlugFromPage } from "./api";

function newId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const citySlug = citySlugFromPage();

  useEffect(() => {
    setMessages([
      {
        id: newId(),
        role: "aanya",
        timestamp: Date.now(),
        // Turn 0 of the fixed 6-turn flow (Whatsapp_Agent_-_Questions.pdf,
        // aanya_flow.py backend-side) — free-text opener, deliberately no
        // buttons/chips here, and the same opener regardless of page
        // context (the old city-page-aware variant invited open-ended
        // "ask me anything" Q&A, which doesn't fit this flow's strict
        // turn sequence).
        text: "I'm Aanya, your TripAgent concierge. Tell me what you're dreaming of — where, roughly when, and who with. I'll take it from there. 🌏",
      },
    ]);
    // Seeded once on mount — citySlug comes from the URL and won't change
    // mid-session.
  }, []);

  async function handleSend(text: string) {
    const memberMessage: ChatMessage = { id: newId(), role: "member", text, timestamp: Date.now() };
    const typingMessage: ChatMessage = { id: newId(), role: "aanya", text: "", timestamp: Date.now(), pending: true };
    setMessages((prev) => [...prev, memberMessage, typingMessage]);
    setBusy(true);

    try {
      const response = await askConcierge(text, { citySlug });
      // One ChatMessage per bubble (see claude_client.py's SYSTEM_PROMPT —
      // Claude splits its own reply into 2-4 short texts on a \n\n boundary,
      // the backend turns that into `bubbles`) — falls back to the single
      // joined `intro` if bubbles is ever empty. Handoff/cards attach only
      // to the LAST bubble so they render once, after the text.
      const bubbleTexts = response.bubbles.length > 0 ? response.bubbles : [response.intro];
      const now = Date.now();
      const bubbleMessages: ChatMessage[] = bubbleTexts.map((bubbleText, i) => {
        const isLast = i === bubbleTexts.length - 1;
        return {
          id: newId(),
          role: "aanya",
          timestamp: now,
          text: bubbleText,
          handoff: isLast ? response.handoff ?? null : null,
          cards: isLast && response.cards.length > 0 ? response.cards : undefined,
          demoConfirmation: isLast ? response.demo_confirmation ?? null : null,
        };
      });
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingMessage.id),
        ...bubbleMessages,
      ]);
    } catch {
      // Deliberately NO handoff here — a failed request (a non-200 from
      // /ai/concierge/chat, a network error, ...) is not a completed
      // hand-off: no advisor was notified, no enquiry exists for this
      // session. Reproduced live: this used to attach the same
      // advisor_prompt handoff a genuine "done" close does, so a plain
      // Anthropic API timeout rendered an identical "Advisor notified"
      // card — misleading, since nothing was actually notified. `retry`
      // carries the original query back so "Try again" genuinely resends
      // it (via onChipClick -> handleSend) rather than being a dead button.
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingMessage.id),
        {
          id: newId(),
          role: "aanya",
          timestamp: Date.now(),
          text: "Something went wrong on my end — no message sent, and no advisor notified.",
          retry: { retryText: text },
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ta-cc">
      <div className="ta-cc-bar">
        {/* Layout.tsx hides the site-wide nav in full-screen mode on this
            route — this is the only way back, the same "‹" pattern the
            WhatsApp reference itself uses for its top bar. */}
        <Link className="ta-cc-back" to="/" aria-label="Back to TripAgent">
          ‹
        </Link>
        <div className="ta-cc-bar-avatar" aria-hidden="true">A</div>
        <div className="ta-cc-bar-id">
          <div className="ta-cc-bar-who">
            Aanya <span className="ta-cc-tick" aria-label="Verified">✓</span>
          </div>
          <div className="ta-cc-bar-status">your concierge · online</div>
        </div>
        {/* A button, not a link — tapping this stays in the thread and lets
            the backend's own "talk to a human" fast-path (ai_router.py)
            render the same in-chat handoff card, it never navigates. */}
        <button type="button" className="ta-cc-human" onClick={() => handleSend("Talk to a human")}>
          Prefer a person? Tap here →
        </button>
      </div>
      <ChatThread messages={messages} onChipClick={handleSend} />
      <ChatInput onSend={handleSend} disabled={busy} />
    </div>
  );
}
