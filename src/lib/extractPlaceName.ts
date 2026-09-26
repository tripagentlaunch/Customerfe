// Extracts a candidate named-place phrase from a plan slot's freeform
// `text` (e.g. "Enter the Taj Mahal at first light..." -> "Taj Mahal"),
// for querying Places API (New) Text Search. Conservative by design, same
// "skip rather than guess" ethos as tools/backfill-plan-coords.mjs: if no
// confident proper-noun phrase is found, returns null rather than
// fabricating a query that could resolve to the wrong place.
//
// Heuristic: capitalized word runs are usually real names, not sentence
// structure — EXCEPT the sentence's own leading word, and a handful of
// generic capitalized activity words that show up mid-sentence too
// ("Dinner at Esphahan", "Return via the ateliers"). Multi-word phrases
// ("Taj Mahal", "Fatehpur Sikri") are preferred over single-word ones
// ("Esphahan") since they're less likely to be a false positive; a
// single-word candidate is only accepted if it's long enough (>=5 chars)
// to not just be common-word noise.

const EXCLUDE_WORDS = new Set(
  [
    "a", "an", "the", "enter", "rest", "dinner", "lunch", "breakfast",
    "return", "drive", "walk", "walking", "board", "cross", "crossing",
    "continue", "sunset", "sundowners", "sundown", "sunrise", "arrive",
    "arriving", "check", "last", "final", "day", "morning", "afternoon",
    "evening", "night", "early", "before", "after", "then", "start",
    "and", "or", "with", "at", "in", "on", "to", "of", "via", "from",
  ].map((w) => w.toLowerCase()),
);

function isCapitalizedWord(token: string): boolean {
  return /^[A-Z][a-zA-Z'-]*$/.test(token);
}

// Hyphenated single tokens are ambiguous: "Diwan-i-Khas" is a real compound
// place name, "Taj-facing" is an adjective that just happens to start with
// a capitalized place name. A small blocklist of common adjective-suffix
// endings catches the latter without needing a real dictionary.
const HYPHEN_SUFFIX_BLOCKLIST = new Set([
  "facing", "style", "inspired", "adjacent", "view", "side", "themed", "esque", "style",
]);

function isLikelyAdjectiveCompound(word: string): boolean {
  if (!word.includes("-")) return false;
  const lastSegment = word.split("-").pop()?.toLowerCase() ?? "";
  return HYPHEN_SUFFIX_BLOCKLIST.has(lastSegment);
}

export function extractPlaceCandidate(text: string | undefined | null): string | null {
  if (!text) return null;

  // Strip leading/trailing punctuation (quote marks, stray apostrophes at a
  // word's edge) while keeping interior hyphens/apostrophes intact so real
  // compounds ("Diwan-i-Khas") and possessives survive.
  const rawTokens = text.split(/\s+/).map((t) => t.replace(/^[^A-Za-z]+/, "").replace(/[^A-Za-z]+$/, ""));

  type Phrase = { words: string[]; startIndex: number };
  const phrases: Phrase[] = [];
  let current: string[] = [];
  let currentStart = -1;

  rawTokens.forEach((token, i) => {
    if (isCapitalizedWord(token) && !EXCLUDE_WORDS.has(token.toLowerCase())) {
      if (current.length === 0) currentStart = i;
      current.push(token);
    } else {
      if (current.length > 0) phrases.push({ words: current, startIndex: currentStart });
      current = [];
    }
  });
  if (current.length > 0) phrases.push({ words: current, startIndex: currentStart });

  // Prefer multi-word phrases (in reading order), then fall back to a
  // single long word if that's all there is.
  const multiWord = phrases.filter((p) => p.words.length >= 2);
  if (multiWord.length > 0) {
    return multiWord[0].words.join(" ");
  }
  const singleWord = phrases.find((p) => p.words[0].length >= 5 && !isLikelyAdjectiveCompound(p.words[0]));
  if (singleWord) return singleWord.words[0];

  return null;
}
