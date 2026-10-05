import type { ReactNode } from "react";

// The "advisor" persona is branded as Tara AI sitewide — every "Ask/Talk to/
// Speak with your advisor" CTA became "Ask/Talk to/Speak with Tara AI", with
// "AI" set as a superscript. Two ways to get that superscript depending on
// where the text comes from:
//  - Hardcoded JSX strings: use <TaraAI /> directly, e.g. `Talk to <TaraAI />`.
//  - Labels sourced from generated JSON (plain strings, can't carry JSX):
//    the JSON itself was updated to literally contain "Tara AI" — withTaraAI
//    finds that substring at render time and swaps just the "AI" part for
//    <sup>, leaving the rest of the string (verb, arrow, punctuation) intact.
//
// Both return a real <span>, not a fragment: every button label here ends up
// inside a `display: inline-flex` wrapper (InverseButtons.module.css's
// .label, and similar hand-rolled spans elsewhere). A fragment's children
// become separate anonymous flex items of that flex row, and flex's
// `align-items: center` vertically centers each one independently —
// silently overriding the plain inline `vertical-align: super` that makes
// <sup> look superscripted in normal flow. Wrapping in one <span> keeps
// "Tara"+<sup> (and any surrounding text) as ordinary inline content inside
// a single flex item, where vertical-align works as expected.
export function TaraAI() {
  return (
    <span>
      Tara<sup>AI</sup>
    </span>
  );
}

export function withTaraAI(text: string | null | undefined): ReactNode {
  if (!text) return text;
  const idx = text.indexOf("Tara AI");
  if (idx === -1) return text;
  return (
    <span>
      {text.slice(0, idx)}
      Tara<sup>AI</sup>
      {text.slice(idx + "Tara AI".length)}
    </span>
  );
}
