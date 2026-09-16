import { Navigate, useParams } from "react-router-dom";
import CityPage from "./CityPage";
import ZonePage from "./ZonePage";
import HealthPage from "./HealthPage";
import RoutePage from "./RoutePage";
import ItineraryPage from "./ItineraryPage";
import DestinationPage from "./DestinationPage";
import BrowsePage from "./BrowsePage";
import GoInPage from "./GoInPage";
import JournalPage from "./JournalPage";
import VisaPage from "./VisaPage";
import LegalPage from "./LegalPage";
import ContactPage from "./ContactPage";
import NotFoundPage from "./NotFoundPage";
import NewPage from "./NewPage";
import JoinPage from "./JoinPage";
import TripPage from "./TripPage";
import SearchPage from "./SearchPage";
import EnquirePage from "./EnquirePage";
import CollectionsPage from "./CollectionsPage";
import JourneysPage from "./JourneysPage";
import OffersPage from "./OffersPage";
import ItinerariesPage from "./ItinerariesPage";
import WhatsOnPage from "./WhatsOnPage";
import CitiesIndexPage from "./CitiesIndexPage";
import WhereToGoPage from "./WhereToGoPage";
import DestinationsIndexPage from "./DestinationsIndexPage";
import FlightsPage from "./FlightsPage";
import HotelsPage from "./HotelsPage";
import VisasPage from "./VisasPage";
import FlightGuidesPage from "./FlightGuidesPage";
import StayGuidesPage from "./StayGuidesPage";
import PointsPage from "./PointsPage";
import BusinessVsFirstPage from "./BusinessVsFirstPage";
import CabinGuidePage from "./CabinGuidePage";
import SuitesWorthItPage from "./SuitesWorthItPage";
import VillaOrHotelPage from "./VillaOrHotelPage";
import TheRightRoomPage from "./TheRightRoomPage";
import HotelProgrammesPage from "./HotelProgrammesPage";
import ComparePage from "./ComparePage";
import ExoticPage from "./ExoticPage";
import FamilyTravelPage from "./FamilyTravelPage";
import HoneymoonPage from "./HoneymoonPage";
import MilestoneTripsPage from "./MilestoneTripsPage";
import FirstInternationalTripPage from "./FirstInternationalTripPage";
import AboutPage from "./AboutPage";
import ConciergePage from "./ConciergePage";
import HowItWorksPage from "./HowItWorksPage";
import HowWeWorkPage from "./HowWeWorkPage";
import CareersPage from "./CareersPage";
import HelpPage from "./HelpPage";
import ProtectionPage from "./ProtectionPage";
import MembershipPage from "./MembershipPage";
import ServicesPage from "./ServicesPage";
import PortalPage from "./PortalPage";
import DaysPage from "./DaysPage";
import HealthIndexPage from "./HealthIndexPage";
import JournalIndexPage from "./JournalIndexPage";
import WhenToGoPage from "./WhenToGoPage";
import InvitationPage from "./InvitationPage";
import AcceptInvitePage from "./AcceptInvitePage";
import HomePage from "./HomePage";
import routes from "../data/routes.generated.json";
import redirects from "../data/redirects.generated.json";
import { toRoute } from "../lib/toRoute";

// The 20 old meta-refresh redirect stubs (18 destination-<country>.html
// that now live under city-<slug>, plus family-stays->family-travel and
// honeymoon-stays->honeymoon). Checked first since e.g. "destination-"
// stubs would otherwise be swallowed by the destination-page dispatch
// below. See tools/extract_redirects.py.
const REDIRECTS = redirects as unknown as Record<string, string>;

const HEALTH_PREFIXES = [
  "health-hospital-",
  "health-destination-",
  "health-specialty-",
  "health-guide-",
  "health-longevity-",
  "health-pathway-",
];

// "route-" is ambiguous between two different templates: the city-pair
// flight-route guides (route-<origin>-<destination>, Phase 4, keyed in
// routes.generated.json) and the itinerary teasers (route-<theme-name>,
// Phase 5). Membership in ROUTE_SLUGS disambiguates; every other
// "route-"/"hub-" slug is an itinerary teaser.
const ROUTE_SLUGS = new Set(Object.keys(routes));

// Standalone-page batch A: exact-slug matches, not prefixes. terms/privacy/
// refund turned out to share one byte-identical structure (see
// tools/extract_legal_pages.py) despite being "standalone" pages.
const EXACT_SLUG_PAGES: Record<string, () => JSX.Element> = {
  terms: () => <LegalPage />,
  privacy: () => <LegalPage />,
  refund: () => <LegalPage />,
  contact: () => <ContactPage />,
  "404": () => <NotFoundPage />,
  // Standalone-page batch B: new/join are static content pages; trip/search
  // are JS-application mount points on the static site with no portable
  // static content, and enquire's form submission normally hits a live
  // Supabase backend — all 3 are shell-only, interactive/backend logic
  // deferred to a dedicated future phase (see tools/extract_*_page.py).
  new: () => <NewPage />,
  join: () => <JoinPage />,
  trip: () => <TripPage />,
  search: () => <SearchPage />,
  enquire: () => <EnquirePage />,
  // Standalone-page batch C: collections/journeys/offers/itineraries/whats-on
  // are static (whats-on's month-nav is a plain in-page anchor, no JS behind
  // it). cities' A-Z grid is static/primary; its citysearch.js overlay is
  // deferred, same pattern as Batch B. where-to-go's quiz UI is static and
  // interactive (buttons really toggle), but its match-scoring engine reads
  // ~400KB of local data + localStorage — deferred, same pattern as
  // trip/search. destinations' real content is a dynamic region->country->
  // city hierarchy built from data/cities.json (js/destinations.js hides the
  // page's own static 36-country grid once it loads) — ported the real
  // (dynamic) hierarchy directly since data/cities.json is safe static data,
  // plus the interactive world-map (embedded pin coordinates, fully
  // portable, no backend). See tools/extract_*_page.py for each.
  collections: () => <CollectionsPage />,
  journeys: () => <JourneysPage />,
  offers: () => <OffersPage />,
  itineraries: () => <ItinerariesPage />,
  "whats-on": () => <WhatsOnPage />,
  cities: () => <CitiesIndexPage />,
  "where-to-go": () => <WhereToGoPage />,
  destinations: () => <DestinationsIndexPage />,
  // Standalone-page batch D: flights/visas/flight-guides/stay-guides/points
  // are fully static (each page's own <script> tags load only the standard
  // site.js/account.js/shell.js/backend.js). hotels.html is the exception —
  // its #hs-app mount (js/hotel-search.js) is a real live hotel
  // search -> room -> guest -> book -> cancel flow talking to a local proxy
  // that holds real TripSure API credentials — genuine booking/payment
  // infrastructure, not a lead form. Deferred per CLAUDE.md ("DB writes /
  // payment / real supplier wiring need Amit's named OK"), same
  // shell-only-defer-logic pattern as trip/search/enquire.
  flights: () => <FlightsPage />,
  hotels: () => <HotelsPage />,
  visas: () => <VisasPage />,
  "flight-guides": () => <FlightGuidesPage />,
  "stay-guides": () => <StayGuidesPage />,
  points: () => <PointsPage />,
  // Standalone-page batch E: business-vs-first/cabin-guide/villa-or-hotel
  // are each bespoke; suites-worth-it/the-right-room/hotel-programmes share
  // one byte-identical "deep guide" template (see extract_deep_guide_pages.py
  // + DeepGuideLayout, same pattern as the flight/stay-guides hub layout).
  // compare.html's picker is static/real but selecting destinations triggers
  // a real weighted scoring engine reading data/city-decision.json — same
  // category as where-to-go.html, deferred the same way.
  "business-vs-first": () => <BusinessVsFirstPage />,
  "cabin-guide": () => <CabinGuidePage />,
  "villa-or-hotel": () => <VillaOrHotelPage />,
  "suites-worth-it": () => <SuitesWorthItPage />,
  "the-right-room": () => <TheRightRoomPage />,
  "hotel-programmes": () => <HotelProgrammesPage />,
  compare: () => <ComparePage />,
  // Standalone-page batch F: family-travel/honeymoon/milestone-trips share
  // one byte-identical CSS template (see extract_collection_pages.py +
  // CollectionPageLayout) — honeymoon simply omits the optional pull-quote
  // section the other two have. first-international-trip is structurally
  // distinct (extra reassurance cards, reversed visa vrow) — built bespoke.
  // exotic.html's #exotic-list mount is populated at runtime by js/exotic.js
  // from data/exotic.json (32 spots, static local data, no backend/scoring)
  // — same category as destinations.js (Batch C) — ported the real content
  // directly, replicating exotic.js's category grouping/ordering in Python.
  exotic: () => <ExoticPage />,
  "family-travel": () => <FamilyTravelPage />,
  honeymoon: () => <HoneymoonPage />,
  "milestone-trips": () => <MilestoneTripsPage />,
  "first-international-trip": () => <FirstInternationalTripPage />,
  // Standalone-page batch G: about/careers/help/how-it-works/how-we-work/
  // membership/services/protection are all fully static/editorial (no extra
  // <script src="js/..."> beyond the standard site.js/account.js/shell.js/
  // backend.js bundle). concierge.html's #concierge-chat-root is the one
  // exception — self-mounted at runtime by a separate React app
  // (concierge-chat/) — "Aanya", a real AI concierge with tool-calling and a
  // live draft-then-confirm booking flow against a backend — deferred per
  // CLAUDE.md, same shell-only-defer-logic pattern as trip/search/enquire/
  // hotels. how-it-works.html/how-we-work.html share a reusable
  // IPhoneMock WhatsApp-widget component (2 instances per page).
  about: () => <AboutPage />,
  concierge: () => <ConciergePage />,
  "how-it-works": () => <HowItWorksPage />,
  "how-we-work": () => <HowWeWorkPage />,
  careers: () => <CareersPage />,
  help: () => <HelpPage />,
  protection: () => <ProtectionPage />,
  membership: () => <MembershipPage />,
  services: () => <ServicesPage />,
  // Standalone-page batch H: flagged in Phase 1 as riskier (account/portal &
  // interactive tools). portal.html is a hybrid — its first two <main>
  // children (#my-year, #portal-member) are real auth-gated widgets
  // (js/account.js's renderMyYear()/renderPortalHome(), re-rendered on
  // TA_ACCOUNT.onChange) with no session/backend here to drive them; the
  // real site already shows nothing for either when signed out, so they're
  // faithfully omitted rather than deferred to a placeholder — everything
  // else on the page is static guest-marketing content, ported directly.
  // days.html is a single empty mount for a genuine MapLibre GL trip-day
  // planner (js/days.js): live geocoding against photon.komoot.io, an
  // agentic text->plan parser, haversine day-clustering, Supabase-backed
  // venue search — same real-interactive-tool category as trip/search/
  // hotels/where-to-go, deferred the same way.
  portal: () => <PortalPage />,
  days: () => <DaysPage />,
  // Standalone-page batch I: index/hub pages, distinct from the entity/
  // article templates they link out to (never duplicated). health.html is
  // the Health & Longevity hub -> the 129 health-*.html entity pages
  // (Phase 3, types/health.ts). journal.html is the Journal hub -> the
  // journal-*.html article template (Phase 9). Both pages' own inline
  // <style> blocks turned out to be ~98% dead cruft (0 matches in their
  // actual markup — copy-pasted leftovers from other templates); only the
  // rules genuinely used were ported. when-to-go.html's 73-destination x
  // 12-month table is populated by an inline <script>'s hardcoded literal
  // array (safe local data, ported for real as a hover-highlight table);
  // its js/when-global.js (gated to /when-to-go only) injects a real
  // date-range ranking engine reading city-when/city-decision/city-images
  // JSON right after the hero — same scoring-engine category as
  // where-to-go.html/compare.html, deferred with a static placeholder in
  // the same position.
  health: () => <HealthIndexPage />,
  journal: () => <JournalIndexPage />,
  "when-to-go": () => <WhenToGoPage />,
  // Standalone-page batch J (1 of 2 — index.html/HomePage is part 2, wired
  // above the exact-slug table since it has no pageSlug at all): invitation.html
  // is the 5-step code-redemption ceremony. All four of its backend touchpoints
  // are broken or stale in the source
  // itself (redeem hits a hardcoded loopback-address, non-standard-port
  // dev-only proxy; capture/site-lead/site-pay all point at the stale
  // Supabase project ref documented in app/.env.example's header comment)
  // — same shell-only-defer-logic pattern as trip/search/enquire, but every
  // submission shows a visible "not live yet" message immediately rather
  // than a silent no-op. See the TODO(backend) block at the top of
  // InvitationPage.tsx for what each of the four endpoints needs.
  invitation: () => <InvitationPage />,
  // /accept-invite?token=... — the advisor panel's "Invite Customer" email
  // link. A different token system entirely from invitation.html's 16-char
  // "code" above (see AcceptInvitePage.tsx's header comment): minted and
  // meant to be validated by a completely separate backend project
  // (tripagent-full/backend), not reachable from here (a real request
  // against the running instance returned a raw 500, no CORS) and not even
  // the domain the invite email points at. Same shell-only-defer-logic
  // treatment — honest "not live yet" + a real advisor-contact fallback,
  // no fake token validation.
  "accept-invite": () => <AcceptInvitePage />,
};

// react-router v6 can't match a partial segment like "city-:slug" — a
// dynamic segment must be the whole path segment — so every slug lands on
// one ":pageSlug" route (see App.tsx) and this dispatches by prefix.
// Extend HEALTH_PREFIXES/add a branch here as later phases port more
// template groups.
export default function PageRouter() {
  const { pageSlug } = useParams<{ pageSlug: string }>();

  // The index route ("/", App.tsx) has no :pageSlug segment at all — that's
  // index.html itself (Batch J, part 2 of 2 — invitation.html was part 1).
  if (!pageSlug) return <HomePage />;

  if (REDIRECTS[pageSlug]) return <Navigate to={toRoute(REDIRECTS[pageSlug])} replace />;
  if (pageSlug && EXACT_SLUG_PAGES[pageSlug]) return EXACT_SLUG_PAGES[pageSlug]();
  if (pageSlug?.startsWith("city-")) return <CityPage />;
  // Country/Zone template: a cluster of cities (a single country like
  // Greece, or a genuine multi-country zone) — its own template, separate
  // from the legacy destination-<country> pages below, which stay as-is.
  if (pageSlug?.startsWith("zone-")) return <ZonePage />;
  if (pageSlug && HEALTH_PREFIXES.some((p) => pageSlug.startsWith(p))) return <HealthPage />;
  if (pageSlug && ROUTE_SLUGS.has(pageSlug)) return <RoutePage />;
  if (pageSlug?.startsWith("route-")) return <ItineraryPage />;
  if (pageSlug?.startsWith("destination-")) return <DestinationPage />;
  if (pageSlug?.startsWith("browse-")) return <BrowsePage />;
  if (pageSlug?.startsWith("go-in-")) return <GoInPage />;
  if (pageSlug?.startsWith("journal-")) return <JournalPage />;
  // "visa-" also matches visa-guides.html (a standalone index, not in this
  // dataset) — VisaPage's own lookup falls through to the placeholder for
  // it, same as every other not-yet-ported slug.
  if (pageSlug?.startsWith("visa-")) return <VisaPage />;

  return (
    <div className="wrap band">
      <p>Not yet ported to the app.</p>
    </div>
  );
}
