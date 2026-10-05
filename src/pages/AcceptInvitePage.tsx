import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TaraAI } from "../components/TaraAI";

// /accept-invite?token=... — where a customer lands from the advisor panel's
// "Invite Customer" email. NOT the same system as invitation.html's 16-char
// "code" ceremony (InvitationPage.tsx): this token is minted by a completely
// separate backend (tripagent-full/backend's POST /advisor/customers/invite,
// a different project from this one) against a different table
// (customer_invites, not site_invitation_codes), and would be validated by
// that backend's GET/POST /invite/{token} — which isn't reachable from here
// (a real request against the currently-running instance returned a raw,
// unhandled 500, no graceful error, no CORS headers) and isn't even the
// domain the invite email actually points at (tripagent-one.vercel.app, not
// this app). Same shell-only-defer-logic treatment as invitation.html: an
// honest "not live yet" message and a real advisor-contact fallback, no
// fake preview/accept flow pretending to validate a token this app can't
// reach.
const EMAIL_CTA_HREF = "mailto:maison@tripsure.com";

export default function AcceptInvitePage() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    document.title = "Accept your invitation — TripAgent";
    try {
      setHasToken(!!new URLSearchParams(window.location.search).get("token"));
    } catch {
      setHasToken(false);
    }
  }, []);

  return (
    <section className="band" style={{ minHeight: "60svh", display: "flex", alignItems: "center" }}>
      <div className="wrap" style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div className="eyebrow">{hasToken ? "You're invited" : "Accept invitation"}</div>
        <h1 style={{ fontSize: "clamp(28px,3.6vw,40px)", marginTop: 10 }}>
          {hasToken ? "Not live on the site yet" : "This link is missing its invitation code"}
        </h1>
        <p className="lede" style={{ marginTop: 16 }}>
          {hasToken
            ? "Accepting an invitation here isn't wired up yet. Write to your advisor directly and they'll set up your account by hand."
            : "This link doesn't have an invitation code attached to it. If your advisor sent you here, ask them to resend it, or write to them directly."}
        </p>
        <div className="btn-row center" style={{ marginTop: 28 }}>
          <a className="btn btn-gold" href={EMAIL_CTA_HREF}>
            Email <TaraAI />
          </a>
          <Link className="btn btn-ghost" to="/">
            Back to TripAgent
          </Link>
        </div>
      </div>
    </section>
  );
}
