import type { RetryAction } from "../types";

// A failed request's own distinct state — deliberately NOT HandoffCard.
// Styled as a plain, muted notice (no gold accent, no "notified" language)
// so it can never be mistaken for a successful hand-off. See RetryAction's
// own note in types.ts for the bug this replaced.
export default function ErrorRetryCard({
  retry,
  onRetry,
}: {
  retry: RetryAction;
  onRetry: (text: string) => void;
}) {
  return (
    <div className="ta-cc-error-card" role="alert">
      <button
        type="button"
        className="ta-cc-error-retry"
        onClick={() => onRetry(retry.retryText)}
      >
        ↻ Try again
      </button>
    </div>
  );
}
