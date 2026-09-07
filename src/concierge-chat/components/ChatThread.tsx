import { useLayoutEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import MessageBubble from "./MessageBubble";

export default function ChatThread({
  messages,
  onChipClick,
}: {
  messages: ChatMessage[];
  onChipClick: (text: string) => void;
}) {
  const threadRef = useRef<HTMLDivElement>(null);

  // Pin to the newest message on every update — a new message from either
  // side, the typing indicator appearing/disappearing, or a card/handoff
  // attaching to the last message. Sets scrollTop directly on the
  // container rather than scrollIntoView() on a sentinel element:
  // scrollIntoView's "nearest" heuristic is known to behave inconsistently
  // once the scrollable element sits inside several nested flex containers
  // (this page's #content -> .cc-stage -> .ta-cc -> .ta-cc-thread chain),
  // and especially with mobile Safari's dynamic viewport resizing (this
  // page sizes itself with 100dvh, which shifts as the URL bar shows/hides
  // while typing) — a direct scrollTop assignment has no such ambiguity.
  // useLayoutEffect (not useEffect) so this runs before the browser paints,
  // avoiding a visible flash at the old scroll position first. CSS's
  // `scroll-behavior: smooth` on .ta-cc-thread still applies to this
  // programmatic change, so the animated feel is unchanged. `messages`
  // itself (not messages.length) is the dependency — App.tsx always
  // replaces the array with a new one on any relevant change, including
  // when a card/handoff attaches to the already-last message without the
  // array's length or the last item's `pending` flag changing.
  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="ta-cc-thread" ref={threadRef} data-lenis-prevent>
      {messages.map((m, i) => {
        // WhatsApp only shows the avatar/name once per consecutive run from
        // the same sender — a real pattern from the reference, not just
        // decoration: it's what makes back-to-back Aanya messages read as
        // one continuous turn instead of a wall of repeated avatars.
        const isGrouped = i > 0 && messages[i - 1].role === m.role;
        return (
          <MessageBubble key={m.id} message={m} onChipClick={onChipClick} isGrouped={isGrouped} />
        );
      })}
    </div>
  );
}
