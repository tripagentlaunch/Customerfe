// Hand-authored content for the homepage's autoadvancing "How It Works"
// section (5 stages: Enquiry -> Booking -> Departure -> In-trip -> Home).
// Not part of homepage.generated.json since that file holds content
// scraped from the original static site — this is new, not ported.
//
// label/sublabel reuse the exact wording already used by the "Our Promise"
// timeline (data.signature.nodes in homepage.generated.json) so the two
// sections describe the same journey consistently.
//
// Images are placeholders generated from prompts drafted in the
// conversation this was built from (see HOW-IT-WORKS-SECTION-BRIEF.md) —
// swap the `image` paths once final assets exist.
export interface HowItWorksStage {
  key: string;
  label: string;
  sublabel: string;
  image: string;
  heading: string;
  lede: string;
}

export const HOW_IT_WORKS_STAGES: HowItWorksStage[] = [
  {
    key: "enquiry",
    label: "Enquiry",
    sublabel: "“Plan us something.”",
    image: "/img/how-it-works/enquiry.png",
    heading: "Your trip is one message away.",
    lede: "“Somewhere warm, just the two of us.” That's enough to start. While our intelligence maps out your every logistical nuance, your human advisor reviews and perfects the final arrangements, leaving nothing to do but pack.",
  },
  {
    key: "booking",
    label: "Booking",
    sublabel: "Held, priced, ticketed.",
    image: "/img/how-it-works/booking.png",
    heading: "Consider your bookings done.",
    lede: "Fares held, villas confirmed, visa cleared: the parts nobody wants to sit and do themselves, done before you've thought to ask about them.",
  },
  {
    key: "departure",
    label: "The Journey",
    sublabel: "Every document in hand.",
    image: "/img/how-it-works/departure.png",
    heading: "Effortless execution.",
    lede: "From stepping into the terminal to sinking into your hotel bed.",
  },
  {
    key: "intrip",
    label: "The Contingency Desk",
    sublabel: "Fixed before you wake.",
    image: "/img/how-it-works/intrip.png",
    heading: "Flawless continuity.",
    lede: "Real-time data engineering flags anomalies instantly behind the scenes, and we fix them before you even notice.",
  },
  {
    key: "home",
    label: "Home",
    sublabel: "We stay.",
    image: "/img/how-it-works/home.png",
    heading: "Until next time.",
    lede: "We're here whenever you need us.",
  },
];
