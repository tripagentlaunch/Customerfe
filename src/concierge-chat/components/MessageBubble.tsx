import type { ChatMessage } from "../types";
import DemoConfirmationCard from "./DemoConfirmationCard";
import ErrorRetryCard from "./ErrorRetryCard";
import HandoffCard from "./HandoffCard";
import SearchResultsCard from "./SearchResultsCard";
import TypingIndicator from "./TypingIndicator";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MessageBubble({
  message,
  onChipClick,
  isGrouped,
}: {
  message: ChatMessage;
  onChipClick: (text: string) => void;
  isGrouped: boolean;
}) {
  const isMine = message.role === "member";

  return (
    <div className={"ta-cc-row " + (isMine ? "ta-cc-me" : "ta-cc-aanya") + (isGrouped ? " ta-cc-grouped" : "")}>
      {!isMine && (
        <div className="ta-cc-av" aria-hidden="true">
          {isGrouped ? "" : "A"}
        </div>
      )}
      <div className="ta-cc-col">
        {!isMine && !isGrouped && (
          <div className="ta-cc-who">
            Aanya <span className="ta-cc-tick" aria-label="Verified">✓</span>
          </div>
        )}
        {message.pending ? (
          <TypingIndicator />
        ) : (
          <>
            {message.text && (
              <div className={"ta-cc-bubble" + (isMine ? " ta-cc-mine" : "")}>
                {message.text}
                <span className="ta-cc-timestamp">
                  {formatTime(message.timestamp)}
                  {/* Cosmetic only — there's no real delivery/read-receipt
                      channel behind this chat (it's a demo standing in for
                      the WhatsApp Business API integration, not a live one).
                      Always shown as "read" for the WhatsApp look; it does
                      not reflect any actual delivery state. */}
                  {isMine && <span className="ta-cc-tickread" aria-hidden="true">✓✓</span>}
                </span>
              </div>
            )}
            {message.cards && message.cards.length > 0 && (
              <SearchResultsCard cards={message.cards} onSelect={onChipClick} />
            )}
            {message.handoff && <HandoffCard handoff={message.handoff} />}
            {message.demoConfirmation && <DemoConfirmationCard confirmation={message.demoConfirmation} />}
            {message.retry && <ErrorRetryCard retry={message.retry} onRetry={onChipClick} />}
          </>
        )}
      </div>
    </div>
  );
}
