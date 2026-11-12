/* Invitation codes on the claim page: how a typed or pasted code is cleaned and shown, whether a person's details are good
 * enough to take a seat on a shared invitation, and the welcome message to their advisor. Kept free of React so it is easy to check. */

export const CODE_LEN = 8;

/** What was typed or pasted, as the code the server knows: upper case, letters and digits only, at most 8. */
export function cleanCode(raw: string): string {
  return String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LEN);
}

/** KM4TQR2X -> KM4T-QR2X: two groups of four are easier to read out and to type. The dash is never part of the code. */
export function prettyCode(code: string): string {
  const c = cleanCode(code);
  return c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** The code carried in a page address (?code=), or "" when there is not a whole one. A half code is never acted on. */
export function codeFromSearch(search: string): string {
  try {
    const c = cleanCode(new URLSearchParams(search).get("code") || "");
    return c.length === CODE_LEN ? c : "";
  } catch {
    return "";
  }
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface SeatDetails {
  name: string;
  email: string;
  phone: string;
}

/** What is wrong with the details a person gave to join a shared invitation, in words for them; null when they are fine. */
export function seatDetailsProblem(d: SeatDetails): string | null {
  if (d.name.trim().length < 2) return "Please tell us your name.";
  if (!EMAIL.test(d.email.trim())) return "Please enter your email address.";
  const digits = d.phone.replace(/\D/g, "");
  if (d.phone.trim() && (digits.length < 7 || digits.length > 15)) return "That phone number doesn't look right. You can leave it blank.";
  return null;
}

/** The body sent to claim a seat: only what was filled in. */
export function seatBody(d: SeatDetails): { name: string; email: string; phone?: string } {
  const phone = d.phone.trim();
  return { name: d.name.trim(), email: d.email.trim().toLowerCase(), ...(phone ? { phone } : {}) };
}

/** First word of a name, for greeting. */
export function firstName(name: string | null | undefined): string {
  return String(name || "").trim().split(/\s+/)[0] || "";
}

/** The message that opens the chat with the person's advisor (or the desk) from the welcome screen. */
export function welcomeMessage(member: string | null | undefined, advisor: string | null | undefined): string {
  const who = firstName(member);
  const to = firstName(advisor) || "team";
  return `Hello ${to}, ${who ? `this is ${who}. ` : ""}I've just joined TripAgent and would love your help planning.`;
}

/** wa.me link for a number in any common spelling ("+91 98765 43210"); null when there is no usable number. */
export function whatsappLink(number: string | null | undefined, text: string): string | null {
  const digits = String(number || "").replace(/\D/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
