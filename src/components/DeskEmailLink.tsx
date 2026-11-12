import { useEffect, useRef, useState } from "react";

// "invite@tripagent.vip" as a link that always ends up in an email. A mailto: link opens the computer's mail app, and in a browser with
// none set up (very common: a private window, a work laptop that uses web mail) it silently does nothing. So the click is watched: if the
// page is still in front a moment later, no mail app took over, and the person is offered the same message in Gmail or Outlook on the web,
// or the address to copy. The webmail links are real clicks (a pop-up blocker would stop one opened by a timer).

const SUBJECT = "My TripAgent invitation";
const BODY = "Hello, I'd like help with my TripAgent invitation.";

export function webmailLinks(to: string, subject: string = SUBJECT, body: string = BODY) {
  const q = encodeURIComponent;
  return {
    gmail: "https://mail.google.com/mail/?view=cm&fs=1&to=" + q(to) + "&su=" + q(subject) + "&body=" + q(body),
    outlook: "https://outlook.office.com/mail/deeplink/compose?to=" + q(to) + "&subject=" + q(subject) + "&body=" + q(body),
  };
}

const WAIT_MS = 1300;

export function DeskEmailLink({ address, linkClassName }: { address: string; linkClassName?: string }) {
  const [stuck, setStuck] = useState(false); // no mail app opened
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function onClick() {
    setStuck(false);
    setCopied(false);
    let left = false;
    const leave = () => {
      left = true;
    };
    // A mail app taking over blurs this window or hides the tab; if neither happens the click did nothing.
    window.addEventListener("blur", leave, { once: true });
    document.addEventListener("visibilitychange", leave, { once: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      window.removeEventListener("blur", leave);
      document.removeEventListener("visibilitychange", leave);
      if (!left) setStuck(true);
    }, WAIT_MS);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // clipboard blocked: the address is on the page to select
    }
    setCopied(true);
  }

  const web = webmailLinks(address);
  const plain: React.CSSProperties = { background: "none", border: 0, padding: 0, font: "inherit", cursor: "pointer" };
  return (
    <>
      <a href={"mailto:" + address} className={linkClassName} onClick={onClick}>
        {address}
      </a>
      {stuck ? (
        <span role="status" style={{ display: "block", marginTop: 10, fontSize: "0.92em", lineHeight: 1.6 }}>
          No email app opened. Write to us in{" "}
          <a href={web.gmail} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            Gmail
          </a>
          ,{" "}
          <a href={web.outlook} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            Outlook
          </a>
          , or{" "}
          <button type="button" className={linkClassName} style={plain} onClick={copy}>
            copy the address
          </button>
          {copied ? " (copied)" : ""}.
        </span>
      ) : null}
    </>
  );
}
