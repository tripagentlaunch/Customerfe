import visasData from "../data/visa.generated.json";
import journalData from "../data/journal.generated.json";
import type { GuidesHubPageData } from "../types/guides-hub";
import type { VisaData } from "../types/visa";
import GuidesHubLayout from "./GuidesHubLayout";
import styles from "./stay-guides-page.module.css";

// /visa-guides (2026-10-09): the index every "← All visa guides" link, the
// footer and the journal point at. It was never ported, so it fell through
// to VisaPage's "visa-" prefix and showed "Not yet ported to the app." Built
// from the country guides themselves (visa.generated.json) on the same hub
// layout as Flight and Stay guides — adding a country guide adds its card.

const VISAS = visasData as unknown as Record<string, VisaData>;
const JOURNAL = journalData as unknown as Record<string, { hero?: { headingHtml?: string | null; lede?: string | null; image?: string | null } }>;

const stripHtml = (html: string | null | undefined) => (html ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const region = (eyebrow: string | null | undefined) => (eyebrow ?? "").split("·")[0].trim() || null;
const firstSentence = (text: string | null | undefined) => {
  const t = (text ?? "").trim();
  const m = t.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : t).trim() || null;
};

const guides = Object.values(VISAS).sort((a, b) => stripHtml(a.hero.headingHtml).localeCompare(stripHtml(b.hero.headingHtml)));
const reading = ["journal-evisa-or-sticker", "journal-visa-free-for-indians"]
  .map((slug) => ({ slug, hero: JOURNAL[slug]?.hero }))
  .filter((j) => j.hero);

const data: GuidesHubPageData = {
  seo: {
    title: "Visa Guides for Indian Passport Holders — TripAgent",
    description: "Visa guides for Indian passport holders: the visa type, documents, timings and pitfalls for each country, kept current.",
  },
  hero: {
    back: { label: "Visas", href: "visas.html" },
    eyebrow: "Visa guides · Indian passport",
    headingHtml: 'Visa guides, <span class="it">plainly</span>.',
    lede: "What each country asks of an Indian passport — the visa type, the documents, the timings and the pitfalls, in one place.",
    image: guides.find((g) => g.slug === "schengen")?.hero.image ?? guides[0]?.hero.image ?? null,
    buttons: [{ label: "How we handle visas", href: "visas.html", kind: "square" }],
  },
  pullq: {
    quoteHtml: 'The rules change. <span class="it">We keep up</span>.',
    lede: "Each guide is written for the Indian passport. When you travel with us, a person checks, prepares, files and tracks the application for you.",
  },
  routeGuides: {
    eyebrow: "By destination",
    heading: `${guides.length} visa guides`,
    lede: "Pick a country for the visa you need, what to prepare, and how long it takes.",
    cards: guides.map((g) => ({
      route: [region(g.hero.eyebrow), g.facts?.[0]?.value].filter(Boolean).join(" · ") || null,
      heading: stripHtml(g.hero.headingHtml),
      body: firstSentence(g.hero.lede),
      image: g.hero.image,
      href: `visa-${g.slug}.html`,
    })),
  },
  productGuides: {
    eyebrow: "Before you apply",
    heading: "Reading on visas",
    cards: reading.map((j) => ({
      eyebrow: "Journal",
      heading: stripHtml(j.hero?.headingHtml),
      body: firstSentence(j.hero?.lede),
      image: j.hero?.image ?? null,
      href: `${j.slug}.html`,
    })),
  },
  cta: {
    eyebrow: "Visas, handled",
    headingHtml: 'Leave the paperwork <span class="it">to us</span>.',
    lede: "Tell us where you're going. We'll tell you what's needed, prepare it with you, and see it through.",
    buttons: [
      { label: "Talk to Tara AI", href: "enquire.html" },
      { label: "How it works", href: "visas.html" },
    ],
  },
};

export default function VisaGuidesPage() {
  return <GuidesHubLayout data={data} styles={styles} />;
}
