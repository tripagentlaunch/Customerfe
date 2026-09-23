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
    heading: "Say it, however loose.",
    lede: "“Somewhere warm, just the two of us.” That's enough to start. The moment it's sent, we're already listening — to the message, the places you've saved, even the reel you watched twice last week.",
  },
  {
    key: "booking",
    label: "Booking",
    sublabel: "Held, priced, ticketed.",
    image: "/img/how-it-works/booking.png",
    heading: "Held, priced, ticketed.",
    lede: "Fares held, villas confirmed, visa cleared — the parts nobody wants to sit and do themselves, done before you've thought to ask about them.",
  },
  {
    key: "departure",
    label: "Departure",
    sublabel: "Every document in hand.",
    image: "/img/how-it-works/departure.png",
    heading: "Every document in hand.",
    lede: "Boarding pass, passport, gate — nothing to dig for at the airport. Just walk up, and go.",
  },
  {
    key: "intrip",
    label: "In-trip",
    sublabel: "Fixed before you wake.",
    image: "/img/how-it-works/intrip.png",
    heading: "Fixed before you wake.",
    lede: "A delayed flight home is the kind of thing that ruins a trip for everyone else. For you, it's already rebooked — you hear about it after it's handled, not before.",
  },
  {
    key: "home",
    label: "Home",
    sublabel: "We stay.",
    image: "/img/how-it-works/home.png",
    heading: "We stay.",
    lede: "Long after you're back, the story isn't quite finished — just until the next one gets planned.",
  },
];
