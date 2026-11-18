// What the customer's email to the desk says. It is written FOR them, from what is on their screen, so the desk can help in one reply: the
// exact message they are looking at, their code, and the details we already know from this browser (name, email, mobile), with a line for
// anything we don't know. They can edit it before sending. Nothing is sent from here: it only fills in the compose window.
import { readProfile } from "./profileStore";

export type DeskMail = { subject: string; body: string };

function when(): string {
  try {
    return new Date().toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function sentFrom(): string {
  try {
    return "Sent from " + window.location.origin + window.location.pathname + " on " + when() + ".";
  } catch {
    return "";
  }
}

const line = (label: string, value?: string | null) => label + ": " + (value && value.trim() ? value.trim() : "");
const quote = (seen?: string | null) => (seen && seen.trim() ? "What I see on the page:\n“" + seen.trim() + "”\n\n" : "");

/** Which kind of trouble a message on the claim page describes, so the subject says it before the email is even opened. */
export function claimTrouble(seen?: string | null): "claimed" | "expired" | "inactive" | "taken" | "other" | "none" {
  const t = (seen || "").toLowerCase();
  if (!t) return "none";
  if (/already been claimed/.test(t)) return "claimed";
  if (/expired/.test(t)) return "expired";
  if (/no longer active|revoked/.test(t)) return "inactive";
  if (/already attached/.test(t)) return "taken";
  return "other";
}

const CLAIM_SUBJECT: Record<ReturnType<typeof claimTrouble>, string> = {
  claimed: "My invitation code says it's already claimed",
  expired: "My TripAgent invitation has expired",
  inactive: "My TripAgent invitation is no longer active",
  taken: "My email is already attached to another membership",
  other: "Trouble with my TripAgent invitation",
  none: "Help with my TripAgent invitation",
};

/** The claim page: `seen` is the message on screen (if any), `code` what they typed or opened. */
export function claimHelpMail(p: { code?: string | null; seen?: string | null }): DeskMail {
  const me = readProfile();
  return {
    subject: CLAIM_SUBJECT[claimTrouble(p.seen)],
    body:
      "Hello TripAgent team,\n\nI need help getting in with my invitation.\n\n" +
      quote(p.seen) +
      line("My invitation code", p.code) + "\n" +
      line("My name", me.name) + "\n" +
      line("The email I was invited on", me.email) + "\n" +
      line("My mobile number", me.phone) + "\n\n" +
      "Thank you.\n\n" +
      sentFrom(),
  };
}

/** The request-access page: what they typed in the form (read at the moment they click) and the message on screen, if any. */
export function requestHelpMail(p: { name?: string | null; email?: string | null; phone?: string | null; seen?: string | null }): DeskMail {
  const me = readProfile();
  return {
    subject: p.seen ? "Trouble with my TripAgent invitation request" : "Help with my TripAgent invitation request",
    body:
      "Hello TripAgent team,\n\nI asked for an invitation and I need help.\n\n" +
      quote(p.seen) +
      line("My name", p.name || me.name) + "\n" +
      line("My email", p.email || me.email) + "\n" +
      line("My mobile number", p.phone || me.phone) + "\n\n" +
      "Thank you.\n\n" +
      sentFrom(),
  };
}

export const DEFAULT_DESK_MAIL: DeskMail = {
  subject: "My TripAgent invitation",
  body: "Hello, I'd like help with my TripAgent invitation.",
};

// Mail apps want CRLF line breaks in a mailto: body; web mail is happy with either.
export function mailtoUrl(to: string, mail: DeskMail): string {
  const q = encodeURIComponent;
  return "mailto:" + to + "?subject=" + q(mail.subject) + "&body=" + q(mail.body.replace(/\n/g, "\r\n"));
}
