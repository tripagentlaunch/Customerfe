export interface AssistantContext {
  citySlug?: string | null;
}

// No `href`/URL field, deliberately — the whole point of this rebuild is that
// nothing in the concierge chat navigates the member away. `kind` picks the
// in-chat card's copy/icon; `summary` (when present) is the booking/visa
// brief to show inline. See HandoffCard.tsx.
export type HandoffKind = "advisor_prompt" | "flight_booking" | "hotel_booking" | "visa_application";

export interface Handoff {
  label: string;
  kind: HandoffKind;
  summary?: string | null;
}

export interface RetrievedSource {
  source_type: string;
  city_slug?: string | null;
  city_name?: string | null;
  score: number;
}

// Self-describing via `kind` — one shape per search tool. Fields are
// optional throughout: hotel fields are verified against js/hotel-search.js's
// own hotelCard() rendering, but flight fields are best-effort (no real
// TripSure flight-search response shape has ever been captured in this
// repo) — a card with only some fields present should still render usefully
// rather than assume every field is there.
export interface HotelResultCard {
  kind: "hotel";
  name?: string | null;
  city?: string | null;
  star_rating?: number | null;
  image?: string | null;
  price_inr?: number | null;
}

export interface FlightResultCard {
  kind: "flight";
  airline?: string | null;
  flight_number?: string | null;
  price_inr?: number | null;
  duration?: string | null;
  stops?: number | null;
  departure_time?: string | null;
}

export type SearchResultCard = HotelResultCard | FlightResultCard;

// Mutually exclusive with Handoff — see ai_models.py's ConciergeChatResponse
// docstring. Rendered by DemoConfirmationCard.tsx as a polished, clearly-
// labeled SIMULATED "booking confirmed" card: `disclaimer` is always shown,
// never omitted, regardless of how good the rest of the card looks.
export type DemoConfirmationKind = "flight_booking_demo" | "hotel_booking_demo";

export interface DemoBookingConfirmation {
  kind: DemoConfirmationKind;
  confirmation_number: string;
  title: string;
  dates: string;
  guests_or_passengers: string;
  price_display?: string | null;
  disclaimer: string;
}

export interface ConciergeChatResponse {
  intro: string;
  bubbles: string[];
  cards: SearchResultCard[];
  note?: string | null;
  handoff?: Handoff | null;
  demo_confirmation?: DemoBookingConfirmation | null;
  grounded: boolean;
  sources: RetrievedSource[];
}

export interface ConciergeChatRequestBody {
  query: string;
  context: AssistantContext;
  corpus_version?: string;
  session_id: string;
}

export type MessageRole = "member" | "aanya";

// A failed request (non-200 from /ai/concierge/chat, network error, ...) —
// deliberately NOT a Handoff. Reproduced live: the error bubble used to
// carry an `advisor_prompt` handoff too, so a network failure rendered the
// exact same "Advisor notified" card as a genuine completed hand-off, even
// though no advisor was notified and no enquiry exists for that session.
// `retryText` is the original member message that failed, so "Try again"
// can genuinely resend it rather than being a dead/fake button.
export interface RetryAction {
  retryText: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
  handoff?: Handoff | null;
  cards?: SearchResultCard[];
  demoConfirmation?: DemoBookingConfirmation | null;
  retry?: RetryAction | null;
  pending?: boolean; // renders as the typing indicator instead of bubble text
}
