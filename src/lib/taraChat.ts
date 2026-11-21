import { useEffect, useRef } from "react";

// "Talk to Tara AI" opens the Tara chatbot (2026-10-09, direct request).
// Every Tara CTA on the site — ~140 of them: city pages, the floating button,
// menus, footer, page bodies; many labels and links come from the generated
// JSON content — used to link to /enquire or other pages. Rather than rewrite
// each link, one document-level click handler catches any link or button
// whose label names Tara AI and opens the chatbot in a new tab instead.

// On the production site Tara lives at tripagent.vip/chat: vercel.json proxies /chat to the chatbot app.
const PROD_CHAT_URL = "/chat";
// Dev opens the dev chatbot at its own domain (/chat: it signs the member in from the #code on any path).
const DEV_CHAT_URL = "https://chatbot.tripagent.vip/chat";
// The production site's hosts; everything else (customerfe-dev, previews,
// localhost) gets the dev chatbot.
const PROD_HOSTS = ["tripagent.vip", "www.tripagent.vip", "customerfe-mocha.vercel.app"];

export function taraChatUrl(): string {
  const override = (import.meta.env.VITE_TARA_CHAT_URL ?? "").trim();
  if (override) return override;
  return PROD_HOSTS.includes(window.location.hostname) ? PROD_CHAT_URL : DEV_CHAT_URL;
}

// "Talk to Tara AI", "Speak with TaraAI" (the AI is a <sup>), "Have Tara AI
// arrange the stay"... Capital T and a word boundary, so "Anantara" doesn't match.
const TARA_LABEL = /\bTara\s*AI\b/;

function isTaraCta(el: Element): boolean {
  if (el.hasAttribute("data-tara-handoff")) return false; // the trip drawer's button hands the trip over itself (tripHandoff.ts)
  if (el.hasAttribute("data-tara-chat")) return true;
  const label = `${el.getAttribute("aria-label") || ""} ${el.textContent || ""}`;
  return TARA_LABEL.test(label);
}

// One login across the site and the chatbot. The member's access code no longer rides in the link
// (2026-11-21, P0 privacy fix: a code is a reusable credential): the site asks Tara for a one-time ticket
// (valid once, for two minutes) and only that goes in the #fragment. #from= is the page they are on, for
// Tara's "Back to …" button.
export async function signInTicket(memberCode?: string | null): Promise<string | null> {
  const api = (await import("./tripHandoff")).taraApiUrl();
  if (!memberCode || !api) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);   // the dev backend can be waking up
    const res = await fetch(`${api}/api/session/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: memberCode }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return res.ok ? ((await res.json()) as { ticket: string }).ticket : null;
  } catch {
    return null;
  }
}

export function openTaraChat(memberCode?: string | null): void {
  // A visitor without a membership has no way into the chat: they go to ask for an invitation instead of
  // a code screen they can't pass (2026-11-21, website flow review: every CTA dead-ended at a login wall).
  if (!memberCode) {
    window.location.assign(`/request-access?from=${encodeURIComponent(window.location.pathname)}`);
    return;
  }
  // The tab opens inside the click (no pop-up blocker), then goes to the chat once the ticket is back.
  const tab = window.open("about:blank", "_blank");
  if (tab) tab.opener = null;
  const from = window.location.href;
  void signInTicket(memberCode).then((ticket) => {
    const hash = new URLSearchParams({ ...(ticket ? { ticket } : {}), from });
    const url = `${taraChatUrl()}#${hash.toString()}`;
    if (tab) tab.location.href = url;
    else window.open(url, "_blank", "noopener");
  });
}

export function useTaraChatLinks(memberCode?: string | null): void {
  const code = useRef(memberCode);
  code.current = memberCode;
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.("a, button");
      if (!el || !isTaraCta(el)) return;
      e.preventDefault();
      e.stopPropagation();
      openTaraChat(code.current);
    };
    // Capture phase: runs before React Router's <Link> handler navigates.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}
