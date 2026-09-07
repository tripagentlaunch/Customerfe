import type { DemoBookingConfirmation, DemoConfirmationKind } from "../types";

// Rendered instead of HandoffCard when the backend confirms a flight/hotel
// booking with settings.demo_mode=true (see ai_models.py's
// ConciergeChatResponse docstring, concierge_tools.py's module docstring).
// Deliberately looks like a real, satisfying "booked" moment — polished
// layout, a real-looking confirmation number, a green "confirmed" accent —
// but the DEMO badge and the disclaimer line are never optional or
// removable: this must never be mistaken for a real booking, even in a
// screenshot taken out of context.
const ICON: Record<DemoConfirmationKind, string> = {
  flight_booking_demo: "✈",
  hotel_booking_demo: "🏨",
};

const TITLE: Record<DemoConfirmationKind, string> = {
  flight_booking_demo: "Flight booking confirmed",
  hotel_booking_demo: "Hotel booking confirmed",
};

export default function DemoConfirmationCard({ confirmation }: { confirmation: DemoBookingConfirmation }) {
  return (
    <div className="ta-cc-demo-card" role="status">
      <div className="ta-cc-demo-badge" aria-hidden="true">DEMO</div>
      <div className="ta-cc-demo-head">
        <div className="ta-cc-demo-icon" aria-hidden="true">
          {ICON[confirmation.kind] ?? "✓"}
        </div>
        <div className="ta-cc-demo-title">{TITLE[confirmation.kind] ?? "Booking confirmed"}</div>
      </div>
      <div className="ta-cc-demo-name">{confirmation.title}</div>
      <div className="ta-cc-demo-rows">
        <div className="ta-cc-demo-row">
          <span>Dates</span>
          <span>{confirmation.dates}</span>
        </div>
        {confirmation.guests_or_passengers && (
          <div className="ta-cc-demo-row">
            <span>{confirmation.kind === "hotel_booking_demo" ? "Guests" : "Passengers"}</span>
            <span>{confirmation.guests_or_passengers}</span>
          </div>
        )}
        {confirmation.price_display && (
          <div className="ta-cc-demo-row">
            <span>Total</span>
            <span>{confirmation.price_display}</span>
          </div>
        )}
      </div>
      <div className="ta-cc-demo-confirmation">
        Confirmation <strong>{confirmation.confirmation_number}</strong>
      </div>
      <div className="ta-cc-demo-disclaimer">{confirmation.disclaimer}</div>
    </div>
  );
}
