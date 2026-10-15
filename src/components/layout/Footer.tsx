import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { TaraAI } from "../TaraAI";
import { useWhatsAppNumber } from "../../lib/useWhatsAppNumber";

// Extracted verbatim from index.html's <footer class="footer"> — same
// content, same classes. The placeholder legal address is copied as-is from
// the live site (see GAPS.md item A2); not fixed here, since this is a
// structural port, not a content pass. The WhatsApp link *was* also a
// hardcoded dead "REPLACE_NUMBER" placeholder (GAPS.md item A1) — fixed by
// porting js/account.js's own handoff() fallback (WA configured ? real
// wa.me link : /enquire), the same known-correct pattern already used
// elsewhere in the source, via the backend's /config endpoint (unset there
// today, so this resolves to /enquire until a real number is configured).

// Footer columns (2026-10-13, direct request: it read like a site map —
// Explore alone had 13 links). Each column shows its few key links; the
// rest sit behind a "More" toggle so every page stays reachable. On
// phones each column also folds into its own dropdown.
type FooterLink = { to: string; label: ReactNode; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[]; more?: FooterLink[] };

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.external || /^(https?:|mailto:)/.test(link.to)) {
    return (
      <a href={link.to} {...(link.to.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {link.label}
      </a>
    );
  }
  return <Link to={link.to}>{link.label}</Link>;
}

// Columns open on wider screens, folded into dropdowns on phones.
function useWideFooter(): boolean {
  const query = "(min-width: 641px)";
  const [wide, setWide] = useState(() => (typeof window === "undefined" ? true : window.matchMedia(query).matches));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return wide;
}

function FooterCol({ col, wide }: { col: FooterColumn; wide: boolean }) {
  const body = (
    <>
      {col.links.map((l, i) => (
        <FooterLinkItem link={l} key={i} />
      ))}
      {col.more && (
        <details className="fmore">
          <summary>More</summary>
          {col.more.map((l, i) => (
            <FooterLinkItem link={l} key={i} />
          ))}
        </details>
      )}
    </>
  );
  if (wide) {
    return (
      <div>
        <p className="fcol">{col.title}</p>
        {body}
      </div>
    );
  }
  return (
    <details className="fcol-fold">
      <summary className="fcol">{col.title}</summary>
      {body}
    </details>
  );
}

export function Footer() {
  const whatsappNumber = useWhatsAppNumber();
  const advisorHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "/enquire";
  const wide = useWideFooter();
  // The footer outlives page changes, so a folded column (or its "More") the
  // visitor opened stayed open on the next page. Close them all on navigation,
  // and when a link in one is tapped (covers a link to the page you're on).
  const footerRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const closeFolds = () => {
    footerRef.current?.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
  };
  useEffect(closeFolds, [pathname]);

  const columns: FooterColumn[] = [
    {
      title: "Explore",
      links: [
        { to: "/destinations", label: "Destinations" },
        { to: "/when-to-go", label: "When to go" },
        { to: "/how-it-works", label: "How it works" },
        { to: "/how-we-work", label: <TaraAI /> },
        { to: "/journal", label: "Journal" },
        { to: "/about", label: "About" },
      ],
      more: [
        { to: "/journeys", label: "Journeys" },
        { to: "/services", label: "What we handle" },
        { to: "/membership", label: "Membership" },
        { to: "/portal", label: "Member portal" },
        { to: "/protection", label: "Protection" },
        { to: "/careers", label: "Careers" },
      ],
    },
    {
      title: "Services",
      links: [
        { to: "/flights", label: "Flights" },
        { to: "/hotels", label: "Hotels" },
        { to: "/visas", label: "Visas" },
        { to: "/points", label: "Points & payments" },
        { to: "/offers", label: "Offers" },
      ],
      more: [
        { to: "/visa-guides", label: "Visa guides" },
        { to: "/flight-guides", label: "Flight guides" },
        { to: "/stay-guides", label: "Stay guides" },
      ],
    },
    {
      title: "Get started",
      links: [
        { to: "/enquire", label: "Plan a trip" },
        { to: "/invitation", label: "By invitation" },
        {
          to: advisorHref,
          external: !!whatsappNumber,
          label: (
            <>
              Speak with <TaraAI />
            </>
          ),
        },
        { to: "/refer", label: "Refer a friend" },
        { to: "/trip", label: "Build a trip" },
        { to: "mailto:invite@tripagent.vip", label: "invite@tripagent.vip" },
      ],
    },
    {
      title: "Help & legal",
      links: [
        { to: "/help", label: "Help" },
        { to: "/contact", label: "Contact" },
        { to: "/terms", label: "Terms" },
        { to: "/privacy", label: "Privacy" },
        { to: "/refund", label: "Refund of fees" },
      ],
    },
  ];

  return (
    <footer
      className="footer"
      ref={footerRef}
      onClick={(e) => {
        if (e.target instanceof Element && e.target.closest("a")) closeFolds();
      }}
    >
      <div className="wrap">
        <div>
          <div className="brand">
            <svg className="mk" width="24" height="24" viewBox="0 0 420 420" fill="none">
              <g strokeWidth={26} strokeLinecap="round" strokeLinejoin="round">
                <path d="M140,150 L280,150" />
                <path d="M210,150 L210,212" />
                <path d="M140,300 L210,212 L280,300" />
                <path d="M174,256 L246,256" />
              </g>
            </svg>{" "}
            TripAgent
          </div>
          <div className="tagline">Until you are home.</div>
          <p className="fdesc" style={{ fontSize: 13, maxWidth: "30ch" }}>
            A private travel maison. Flights, hotels and visas — handled, completely.
          </p>
        </div>
        {columns.map((col) => (
          <FooterCol col={col} wide={wide} key={col.title} />
        ))}
        <div className="legal">
          <span>
            © 2026 TripAgent<span className="faddr"> · 44 Kingfisher Towers, Bangalore 560 001</span>
          </span>
          <span className="fstay">We stay.</span>
        </div>
      </div>
    </footer>
  );
}
