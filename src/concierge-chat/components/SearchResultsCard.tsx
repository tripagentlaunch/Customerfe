import type { SearchResultCard } from "../types";

// Renders search_flights/search_hotels results as tappable cards instead of
// prose. Hotel fields are verified against js/hotel-search.js's own
// hotelCard() (the real, already-live rendering of this exact endpoint) —
// flight fields are best-effort (see concierge_tools.py's
// _normalize_flight_option) since no real TripSure flight-search response
// shape has ever been captured in this repo; a flight card only renders the
// fields that came back recognizable, never a fabricated placeholder.
function inr(amount?: number | null): string | null {
  if (amount == null || Number.isNaN(amount)) return null;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function optionLabel(card: SearchResultCard): string {
  if (card.kind === "hotel") return card.name || "that hotel";
  const bits = [card.airline, card.flight_number].filter(Boolean);
  return bits.length > 0 ? bits.join(" ") : "that flight";
}

export default function SearchResultsCard({
  cards,
  onSelect,
}: {
  cards: SearchResultCard[];
  onSelect: (text: string) => void;
}) {
  return (
    <div className="ta-cc-results">
      {cards.map((card, i) => {
        const price = inr(card.price_inr);
        return (
          <button
            key={i}
            type="button"
            className="ta-cc-result-card"
            onClick={() => onSelect(`I'll take the ${optionLabel(card)} one`)}
          >
            {card.kind === "hotel" && card.image && (
              <div className="ta-cc-result-pic" style={{ backgroundImage: `url('${card.image}')` }} />
            )}
            <div className="ta-cc-result-body">
              {card.kind === "hotel" ? (
                <>
                  <h4>{card.name || "Hotel"}</h4>
                  <p className="ta-cc-result-meta">
                    {card.city}
                    {card.star_rating ? ` · ${card.star_rating}★` : ""}
                  </p>
                </>
              ) : (
                <>
                  <h4>{card.airline || "Flight option"}</h4>
                  <p className="ta-cc-result-meta">
                    {[card.flight_number, card.departure_time, card.duration,
                      card.stops != null ? `${card.stops === 0 ? "nonstop" : `${card.stops} stop${card.stops === 1 ? "" : "s"}`}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              )}
              {price && (
                <p className="ta-cc-result-price">
                  {price}
                  <span>{card.kind === "hotel" ? "Total stay" : "Fare"}</span>
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
