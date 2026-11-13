# "Plan a trip" buttons open the chat with the city pre-filled (2026-11-13)

Direct request: every "Plan a trip" button takes the visitor to the chat page with the
city's details already in the message. Logged here because part of it needs follow-up
outside the front end.

## What the front end does now
- Chat page: `/concierge?plan=<city-slug>`.
- `src/lib/planMessage.ts` `buildPlanMessage(slug)` builds the text from the city list the
  Destinations cards use (`loadCityList` + `cardChips`): name, country, flight time from the
  visitor's origin, best months. Example:
  "I'd like to plan a trip to Paris, France (about 11.5h from Bengaluru, Best May-Aug). I'm flying from Bengaluru. Can you help me get started?"
- `ConciergePage` reads `?plan=`, passes `initialMessage` + `planSlug` to the chat app;
  `ChatInput` puts it in the box for the visitor to edit and Send. It is NOT auto-sent.
- `planSlug` is also sent as the existing `city_slug` field of the chat request (the same field
  the city pages already use), so the backend sees which city the chat is about.

## Which buttons were re-pointed (enquire -> concierge)
- Every data entry labelled "Plan a trip..." / "Plan this trip..." / "Plan a trip through XXX"
  (deep guides, journal, routes, goin, visa, destinations, itineraries, offers, how we work,
  flight/stay guides, villa-or-hotel, portal, destinations index).
- Every city page hero button "Plan <City>": now `concierge.html?plan=<slug>` (110 cities).
- Footer "Plan a trip" link and the Hotels page "Plan a trip with Tara AI" button.

## Not done / needs follow-up
1. Non-city "Plan a trip" buttons open the chat with an empty box (no city to load): home,
   journal, routes, guides, etc. Routes could pass the airport hub and go-in pages the month, if wanted.
2. Country/destination pages ("Plan this trip", 18 entries in destinations.generated.json)
   have a country, not a city slug. They open an empty chat. Needs a `plan` value per page
   (country name) and `buildPlanMessage` to accept a country.
3. BACKEND: confirm the chat endpoint (`/ai/concierge/chat`) is happy to receive `city_slug`
   when the page is `/concierge` (previously only sent on city pages) and that its
   fixed 6-turn flow copes with a first message that already names place, flight time and
   best months (it may re-ask where/when). Front end invented no new fields or endpoints.
4. City pages' other buttons ("Have Tara AI arrange the stay", "Speak to Tara AI") still go to
   `/enquire?dest=<slug>`; only the "Plan <City>" hero button was changed.
5. Generated data files were edited directly; regenerating them will revert the hrefs.

## Where to go: "Send to my advisor" now opens the chat (2026-11-13)
- The questionnaire no longer POSTs to `/enquiries` or asks the visitor to sign in. It builds a first-person message from the
  answers ("Hi, I'd like help working out where to go. Here are my answers. When: ... Who: ... Budget: ...."), stores it in
  `sessionStorage["ta-chat-prefill"]` as `{text, send: true}` (nothing personal goes in the URL) and navigates to
  `/concierge?from=where-to-go`. `ConciergePage` reads and clears it; `concierge-chat/App.tsx` auto-sends it once as the visitor's
  first message (prop `autoSend`).
- The old enquiry POST + sign-in path is still in `WhereToGoPage.tsx`, switched off with `CHAT_HANDOFF = false`.
- BACKEND: no enquiry record is created from this page any more; the conversation is the only record. Confirm the advisor
  hand-off still happens from the chat flow.
- Plan a trip buttons now AUTO-SEND too (2026-11-13): the city message is sent as the first message. (Pages with no city open an empty chat.) To go back to pre-fill only, drop `setAutoSend(true)` in ConciergePage.
