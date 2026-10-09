import { useEffect } from "react";

// "Talk to Tara AI" opens the Tara chatbot (2026-10-09, direct request).
// Every Tara CTA on the site — ~140 of them: city pages, the floating button,
// menus, footer, page bodies; many labels and links come from the generated
// JSON content — used to link to /enquire or other pages. Rather than rewrite
// each link, one document-level click handler catches any link or button
// whose label names Tara AI and opens the chatbot in a new tab instead.

const PROD_CHAT_URL = "https://chatbot-fe-ten.vercel.app/login";
const DEV_CHAT_URL = "https://chatbot-fe-dev.vercel.app/login";
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
  const label = `${el.getAttribute("aria-label") || ""} ${el.textContent || ""}`;
  return TARA_LABEL.test(label);
}

export function openTaraChat(): void {
  window.open(taraChatUrl(), "_blank", "noopener");
}

export function useTaraChatLinks(): void {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.("a, button");
      if (!el || !isTaraCta(el)) return;
      e.preventDefault();
      e.stopPropagation();
      openTaraChat();
    };
    // Capture phase: runs before React Router's <Link> handler navigates.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}
