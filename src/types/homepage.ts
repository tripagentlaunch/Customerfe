// Shape produced by tools/extract_homepage.py from index.html.

export interface HeroCtaLink {
  label: string | null;
  href: string;
}

export interface HeroSlide {
  image: string | null;
  eyebrow: string | null;
  headingHtml: string | null;
  lede: string | null;
  ctaLinks: HeroCtaLink[];
  insetImage: string | null;
  insetCaptionK: string | null;
  insetCaptionT: string | null;
  nextLabel: string | null;
  nextLinkLabel: string | null;
  nextLinkHref: string | null;
}

export interface DecideCard {
  kicker: string | null;
  heading: string | null;
  body: string | null;
  goLabel: string | null;
  href: string;
}

export interface WayFeature {
  kicker: string | null;
  heading: string | null;
  body: string | null;
}

export interface ServiceCard {
  image: string | null;
  number: string | null;
  heading: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string;
}

export interface StatItem {
  isCountUp: boolean;
  count: string | null;
  suffix: string | null;
  staticValue: string | null;
  label: string | null;
}

export interface ShiftItem {
  value: string | null;
  labelHtml: string | null;
  source: string | null;
}

export interface PlannerCity {
  name: string;
  slug: string;
  /** 12-char string, one digit (0/1/2) per month — 2 = at its best, 1 = a fine shoulder, 0 = not shown. */
  monthScore: string;
  image: string;
  topStays: string[];
}

export interface PlannerData {
  eyebrow: string | null;
  headingHtml: string | null;
  lede: string | null;
  months: string[];
  footTextHtml: string | null;
  footLinkLabel: string | null;
  footLinkHref: string;
  cities: PlannerCity[];
}

export type ChatWho = "me" | "ai" | "human";

export interface ChatMessage {
  who: ChatWho;
  t: string;
}

export interface ScenarioChip {
  label: string | null;
  key: string;
  active: boolean;
}

export interface HowItWorksStep {
  number: string | null;
  heading: string | null;
  body: string | null;
}

export interface HowItWorksData {
  liveLabel: string | null;
  headingHtml: string | null;
  lede: string | null;
  steps: HowItWorksStep[];
  tryLabel: string | null;
  scenarioChips: ScenarioChip[];
  scenarios: Record<string, ChatMessage[]>;
}

export interface TripItem {
  image: string | null;
  place: string | null;
  description: string | null;
}

export interface MembershipCta {
  label: string | null;
  href: string;
}

export type SignatureNodeKind = "node" | "gate" | "seal";

export interface SignatureNode {
  kind: SignatureNodeKind;
  on: boolean;
  at: string | null;
  left: string | null;
  label: string | null;
  sublabel: string | null;
}

export interface TestimonialQuote {
  quote: string | null;
  attribution: string | null;
  // The guest's trip and month, e.g. "Maldives honeymoon · March 2026" —
  // only with the guest's consent; shown under the attribution when set.
  trip?: string | null;
}

export interface HomepageData {
  seo: { title: string | null; description: string | null };
  hero: { slides: HeroSlide[] };
  discover: {
    eyebrow: string | null;
    headingHtml: string | null;
    sub: string | null;
    searchLabelHtml: string | null;
    recommenderLead: string | null;
    recommenderRestHtml: string | null;
    recommenderHref: string;
    browseLabel: string | null;
    browseHref: string;
  };
  decide: {
    eyebrow: string | null;
    headingHtml: string | null;
    lede: string | null;
    cards: DecideCard[];
  };
  planner: PlannerData;
  problem: {
    eyebrow: string | null;
    note: string | null;
    statementHtml: string | null;
    lede: string | null;
  };
  way: {
    portraitImage: string | null;
    eyebrow: string | null;
    headingHtml: string | null;
    lede: string | null;
    features: WayFeature[];
    ctaLabel: string | null;
    ctaHref: string;
  };
  services: {
    eyebrow: string | null;
    headingHtml: string | null;
    lede: string | null;
    allLabel: string | null;
    allHref: string;
    cards: ServiceCard[];
  };
  stats: {
    backgroundImage: string | null;
    eyebrow: string | null;
    headingHtml: string | null;
    items: StatItem[];
  };
  shift: {
    eyebrow: string | null;
    headingHtml: string | null;
    lede: string | null;
    items: ShiftItem[];
    ctaLabel: string | null;
    ctaHref: string;
  };
  howItWorks: HowItWorksData;
  trips: {
    eyebrow: string | null;
    heading: string | null;
    hint: string | null;
    allLabel: string | null;
    allHref: string;
    items: TripItem[];
  };
  membership: {
    eyebrow: string | null;
    headingHtml: string | null;
    tier: string | null;
    amountHtml: string | null;
    free: string | null;
    included: string[];
    ctaPrimary: MembershipCta;
    ctaSecondary: MembershipCta;
    note: string | null;
  };
  signature: {
    eyebrow: string | null;
    titleHtml: string | null;
    nodes: SignatureNode[];
  };
  who: {
    eyebrow: string | null;
    quote: string | null;
    lede: string | null;
    ctaLabel: string | null;
    ctaHref: string;
  };
  testimonials: {
    placeholder: boolean;
    eyebrow: string | null;
    heading: string | null;
    quotes: TestimonialQuote[];
    footnote: string | null;
  };
  finalCta: {
    headingHtml: string | null;
    lede: string | null;
    primaryLabel: string | null;
    primaryHref: string;
    secondaryLabel: string | null;
  };
}
