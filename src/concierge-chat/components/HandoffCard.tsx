import type { Handoff, HandoffKind } from "../types";

// This card is the entire "human handoff" experience now — deliberately not
// a link. See the accompanying summary for why: the site used to point this
// at enquire.html; nothing here does that anymore, in-chat or otherwise.
const ICON: Record<HandoffKind, string> = {
  advisor_prompt: "→",
  flight_booking: "✈",
  hotel_booking: "🏨",
  visa_application: "📄",
};

const TITLE: Record<HandoffKind, string> = {
  advisor_prompt: "Advisor notified",
  flight_booking: "Flight request sent",
  hotel_booking: "Hotel request sent",
  visa_application: "Visa request sent",
};

export default function HandoffCard({ handoff }: { handoff: Handoff }) {
  return (
    <div className="ta-cc-handoff-card" role="status">
      <div className="ta-cc-handoff-icon" aria-hidden="true">
        {ICON[handoff.kind] ?? "→"}
      </div>
      <div className="ta-cc-handoff-body">
        <div className="ta-cc-handoff-title">{TITLE[handoff.kind] ?? handoff.label}</div>
        {handoff.summary ? <div className="ta-cc-handoff-summary">{handoff.summary}</div> : null}
        <div className="ta-cc-handoff-note">
          Your TripAgent advisor has this and will reach out to confirm and complete it —
          nothing further needed from you here.
        </div>
      </div>
    </div>
  );
}
