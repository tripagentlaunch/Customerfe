# "How It Works" homepage section — creative brief

Context document from a brainstorming session (no implementation done yet).
Purpose: capture everything decided so far so that AI image-generation
prompts (ChatGPT/DALL·E) can be written one at a time, per stage, on
request — this doc is the shared context those prompts will draw from.

## What this replaces

The current homepage section — the live WhatsApp-style chat demo
(`ConciergeChatDemo.tsx`) plus a plain 3-step list ("Tell us, in a line" /
"Your advisor curates" / "We stay, until you're home") — is being replaced
entirely by the section described here. It is not an addition alongside the
old section; the old section goes away.

The existing chat demo's underlying mechanic (typing-delay choreography,
scripted message sequences) is a genuinely good asset and is being **reused**
as the illustration for the new section's first stage (Enquiry) rather than
discarded.

## Structure

- **5 stages, shown as tabs that autoadvance** (exact timing/progress-
  indicator style not yet decided — deferred).
- **One fixed scenario runs through all 5 stages** — not switchable by the
  visitor. (The current chat demo lets visitors pick between 3 scenario
  chips — Maldives anniversary / Tokyo cherry blossom / business class to
  London. The new section drops that entirely: one story, no switching.)
- Interactivity is minimal — "interactive via hover at the most" was raised
  and then explicitly deferred; not part of the concept discussion.
- Each stage has a **left-side illustration** and (per the original ask)
  copy on the right, mirroring the current section's two-column layout
  (illustration left, "Watch a wish become a journey" copy right).
- **No single recurring illustration anchor** (e.g. no one object/character,
  like a persistent phone, appearing in every stage). Coherence across the
  5 stages comes from two things instead:
  1. A consistent **narrative device**: the section opens on a chat
     exchange (Enquiry) and closes on one too (Home) — a deliberate
     bookend implying an ongoing relationship, not a one-off transaction.
  2. Two consistent **visual families** (see "Visual language" below), not
     a shared object.
- **Element count varies per stage on purpose** — some stages are richer
  (Enquiry has 4 accessories) than others (Departure has 2). Not meant to
  be even.
- Each stage has one **main element** (the thing that *is* that stage) and
  a small number of **accessory elements** around it.

## The fixed scenario (reused verbatim from the existing chat demo)

This is the one story that runs through all 5 stages. Source: the
"maldives" scenario in `src/data/homepage.generated.json` →
`howItWorks.scenarios.maldives`.

> **Customer:** Our anniversary's the first week of December. Somewhere
> warm, just the two of us — over the water.
>
> **AI:** The Maldives is at its best then — dry, the lagoon at its
> clearest. An over-water villa with a private pool, and the seaplane
> timed for golden hour?
>
> **AI:** I can hold business class from Mumbai at a good fare. Visa on
> arrival — nothing for you to file.
>
> **Aarav (human advisor):** It's Aarav. I've held villas at Soneva and
> Cheval Blanc — photos tonight. And the corner table you loved last year
> is noted.
>
> **Customer:** Perfect. Do it.
>
> **Aarav:** Consider it done. Full itinerary with you by morning.

Key details this scenario establishes, which later stages pay off:
- It's an **anniversary trip** — implies romance/celebration tone.
- **"The corner table you loved last year"** implies this couple has done
  this exact trip before — it's an *annual, recurring* trip. This is the
  seed for Home's closing "next year" beat.
- **"The seaplane timed for golden hour"** — originally considered as
  Departure's main visual, later simplified away (too hard to illustrate
  well) in favor of a "Now Boarding" sign. The golden-hour seaplane detail
  is no longer the visual focus of any stage but remains true to the
  script.
- Business class from **Mumbai**, villas at **Soneva and Cheval Blanc**
  (Maldives resorts), visa-on-arrival — all real, specific details worth
  reflecting in generated imagery (brand names optional/stylized, but the
  *type* of villa/flight/visa should feel accurate).

## Emotional arc across the 5 stages

Ease → Certainty → Anticipation → Real-time care → Warmth/continuity

## Visual language — two families

1. **Analog / tactile** — handwriting, paper, physical objects, warm and
   personal. Used at the very start and very end of the arc (Enquiry,
   Home) — the "before" and "after" of the trip.
2. **Digital / UI** — clean interface chrome: stamps, signage, cards,
   buttons, notifications. Used for the middle of the arc (Booking,
   Departure, In-trip) — the operational, "things getting handled" part.

This analog → digital → digital → digital → analog rhythm is intentional
and should come through in the actual rendering style of each stage's
imagery, not just the content.

---

## Stage 1 — Enquiry

**Emotional beat:** Ease. Saying a vague wish out loud is enough; no effort
required to be understood.

**Main element:** The chat conversation itself (the opening exchange from
the script above — "Our anniversary's the first week of December.
Somewhere warm, just the two of us, over the water" and the AI's reply).
This reuses the existing `ConciergeChatDemo` mechanic/timing, restyled.

**Accessory elements:**
- **Digital wishlist** — an app-style saved-places list, actual named
  destinations (e.g. Bali, Santorini), with small **thumbnail-sized**
  photos. Deliberately small/thumbnail scale so it reads as "browsing
  ideas," not a finished decision.
- **Sticky notes** — loose, handwritten **moods/phrases**, not place
  names (e.g. "somewhere warm," "just the two of us") — analog texture,
  contrasts with the digital wishlist above it.
- **Instagram reel** — shows the *same destination* the chat is about
  (Maldives), ideally an actual auto-playing video/gif snippet rather than
  a static frame. Represents "inspiration can come from anywhere, even
  something scrolled last week," reinforcing that TripAgent picks up on
  more than just what's typed.

**Visual family:** Analog + a little digital (wishlist app, reel) — the
richest/busiest stage, intentionally, since there are many ways someone
arrives with an idea (typed, jotted, saved, scrolled).

**Explicitly NOT included:** a generic destination photocard — reserved
for later stages so imagery doesn't feel interchangeable across stages.

---

## Stage 2 — Booking

**Emotional beat:** Certainty/relief. Invisible labor becomes visible for
a second — things are locking into place without the customer doing the
locking.

**Main element:** A "Booked" stamp landing/appearing — the moment of
finality.

**Accessory elements:**
- Flight ticket (business class, Mumbai departure).
- Hotel confirmation document (Soneva / Cheval Blanc villa).
- A credit card (subtle appearance/animation).
- A cursor/mouse clicking a button — represents some other task (visa,
  insurance, etc. — exact task still open) being resolved in one
  automated click. This is a distinct *technique* (a UI micro-interaction)
  from the physical documents around it, and from Booking's use of a
  stamp motif — gives Booking a small internal visual variety.

**Visual family:** Digital/UI — clean document and interface chrome, no
illustrated scene.

---

## Stage 3 — Departure

**Emotional beat:** Momentum/anticipation. It's actually happening now.

**Main element:** A **"Now Boarding" sign** — deliberately chosen over an
actual illustrated seaplane/airport scene (too big a production lift for
one moment). Route/gate information is built into the sign itself (a
separate "flight status card" idea was folded into this one element rather
than kept as a duplicate). Good candidate for a **split-flap
(mechanical airport board) flip animation** as its signature motion — a
purely typographic technique, elegant rather than illustrative.

**Accessory elements:**
- Boarding pass (business class, Mumbai → Malé).
- Passport.

**Visual family:** Digital/UI-adjacent signage — simple, iconic, not a
full illustrated scene.

---

## Stage 4 — In-trip

**Emotional beat:** Real-time care. This is the stage that actually
demonstrates TripAgent's core value: not just booking nice things, but
fixing what goes wrong, live. Originally considered as an idyllic
villa/photos/dinner-table scene; deliberately changed to a
problem-and-fix narrative instead, since that's more differentiating.

**Main element:** A **vertical stack of itinerary cards**, horizontal
cards arranged top-to-bottom, **recapping the trip already shown** in
earlier stages:
1. Flight there (Mumbai → Malé)
2. Villa stay (e.g. "Soneva — 3 days, 2 nights")
3. **Flight home** — this last card in the stack shows a **disruption, in
   red** (a delay — the specific problem is the return flight, not the
   outbound golden-hour transfer and not a hotel overbooking).
4. Below that disrupted card, a **new, bigger/more prominent card** shows
   the **fix**, accompanied by a **chat bubble** from the advisor
   explaining what got resolved (e.g. rebooked flight, adjusted plans).

**Visual family:** Digital/UI — itinerary/app card style, no illustrated
scene. Consistent in spirit with Enquiry's "digital wishlist" card
treatment, but this is not meant to be the same recurring object — just a
similar UI grammar.

**Narrative function:** Sets up Home — the disrupted *return* flight means
the story's tension resolves into actually, finally, being home.

---

## Stage 5 — Home

**Emotional beat:** Warmth and continuity. Not an ending — a relationship
carrying forward.

**Main element:** A **polaroid/scrapbook-style photo collage** from the
trip — 3–5 photos, arranged with some overlap/scatter, connected by a
**warm curved ribbon** (explicitly not the reference image's straight red
detective-board string — same connecting idea, softer material/color:
ribbon or twine, not string, and curved rather than straight lines).
Reference mood: a nostalgic personal scrapbook/memory board (see the
reference image already shared in this conversation for overall
composition — polaroids, a handwritten note, vintage paper textures —
adapted to TripAgent's warmer, more elegant brand tone rather than the
reference's moodier vintage-detective aesthetic).

**Accessory elements:**
- One or two handwritten notes (tone/content still open — could be a
  reflection, not necessarily a "thank you" like the reference).
- A **closing chat exchange** (not a note): the customer messages asking
  for next year's anniversary trip somewhere new, and TripAgent
  acknowledges it. This deliberately echoes Enquiry's opening chat
  exchange — the section's bookend device — and pays off the "corner
  table you loved last year" detail from the original script (this couple
  does this every year).

**Visual family:** Analog — returns to the tactile, handwritten register
of Enquiry, closing the arc's analog → digital → analog rhythm.

---

## Open / deferred items (not yet decided)

- Exact tab autoadvance timing and progress-indicator style (a filling bar
  per tab vs. something quieter) — deferred as an implementation-adjacent
  detail.
- Hover behavior — explicitly deferred, "let's focus on concept" (per this
  conversation).
- Exact rendering treatment per element (ink-stamp texture vs. clean
  vector "Booked" stamp; vintage mechanical vs. modern digital departure
  sign; skeuomorphic paper-ticket vs. flat app-UI itinerary cards) — this
  is exactly what the upcoming one-by-one image-generation prompts are
  meant to help pin down.
- What the "something else" task is that Booking's button-click
  represents (visa was suggested as an example, not confirmed).
- Exact content/tone of Home's handwritten note(s).

## How this doc will be used

The user wants to generate reference images via ChatGPT/DALL·E for each
stage's main and accessory elements, one at a time. This document is the
shared context; prompts will be written individually, on request, per
image — not all at once — drawing on the specifics above (scenario
details, emotional beat, main vs. accessory distinction, visual family,
and the explicit exclusions/corrections noted per stage).
