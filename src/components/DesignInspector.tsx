import { useEffect, useRef, useState } from "react";

// Dev-only design-token hover inspector. Hover any element to see its
// computed styles, with values that match a live :root custom property
// labeled with that token's name — lets you verify a component is really
// using the design system (see src/css/site.css's :root block) rather than
// a one-off value that happens to look similar.
//
// Gated on its own explicit env flag (not import.meta.env.DEV) so it can
// never accidentally end up live on a real deployment, and so it stays
// available on a build that's otherwise "production mode" if a dev
// explicitly wants it (e.g. a staging preview).
const ENABLED = import.meta.env.VITE_ENABLE_INSPECTOR === "true";

const ROOT_MARKER = "data-ta-inspector-root";

type Category = "color" | "shadow" | "radius" | "spacing" | "fontSize";

type TokenMaps = Record<Category, Map<string, string>>;

// The probe property each category is round-tripped through on a hidden
// scratch element, so a token's declared value (which getPropertyValue()
// returns verbatim, e.g. "#1A1714" or "clamp(22px,5vw,80px)") is compared
// against the SAME browser-normalized form a real element's computed style
// would produce (e.g. "rgb(26, 23, 20)" or "48px" at the current viewport) —
// without this, raw declared strings almost never equal computed ones.
// Site.css's spacing/radius tokens use clamp()/unitless zero rather than
// plain px, so — unlike a design system where those are already flat
// numbers — every category here benefits from the round-trip, not just
// color/shadow.
const PROBE_PROP: Record<Category, string> = {
  color: "color",
  shadow: "boxShadow",
  radius: "borderRadius",
  spacing: "paddingLeft",
  fontSize: "fontSize",
};

// Categorizes a custom property by name, following this codebase's actual
// token-naming convention (src/css/site.css's :root block) — adapt these
// patterns if the design system's own conventions ever change.
function categorize(name: string, rawValue: string): Category | null {
  if (/^--shadow/i.test(name)) return "shadow";
  if (/^--r(-|$)/i.test(name)) return "radius"; // --r, --r-lg, --r-pill
  if (/^--s\d+$/i.test(name) || name === "--gutter" || name === "--pad" || name === "--sec") return "spacing";
  if (/^--fs-|^--font-size/i.test(name)) return "fontSize";
  // Everything else defaults to the color bucket, but only if it actually
  // looks like one — skips font-stack tokens (--serif, --fr, ...), easing
  // curves (--ease, --ease-lux, ...) and layout values (--maxw) that would
  // otherwise get bucketed in here and produce bogus matches.
  if (/^#|^rgb|^rgba|^hsl/i.test(rawValue.trim())) return "color";
  return null;
}

function buildTokenMaps(): TokenMaps {
  const maps: TokenMaps = {
    color: new Map(),
    shadow: new Map(),
    radius: new Map(),
    spacing: new Map(),
    fontSize: new Map(),
  };

  const rootStyle = getComputedStyle(document.documentElement);
  const names: string[] = [];
  for (let i = 0; i < rootStyle.length; i++) {
    const prop = rootStyle.item(i);
    if (prop && prop.startsWith("--")) names.push(prop);
  }

  const scratch = document.createElement("div");
  scratch.style.position = "fixed";
  scratch.style.top = "-9999px";
  scratch.style.left = "-9999px";
  scratch.style.visibility = "hidden";
  scratch.style.pointerEvents = "none";
  document.body.appendChild(scratch);
  const scratchComputed = getComputedStyle(scratch);

  for (const name of names) {
    const raw = rootStyle.getPropertyValue(name).trim();
    if (!raw) continue;
    const category = categorize(name, raw);
    if (!category) continue;

    const probeProp = PROBE_PROP[category];
    let normalized = raw;
    try {
      (scratch.style as unknown as Record<string, string>)[probeProp] = raw;
      const computedVal = (scratchComputed as unknown as Record<string, string>)[probeProp];
      if (computedVal) normalized = computedVal;
    } catch {
      // keep the raw declared value if the browser rejects it as this property
    } finally {
      (scratch.style as unknown as Record<string, string>)[probeProp] = "";
    }

    // First-declared token wins on a value collision — good enough for a dev tool.
    const map = maps[category];
    if (!map.has(normalized)) map.set(normalized, name);
  }

  document.body.removeChild(scratch);
  return maps;
}

function withMatch(value: string, token: string | null | undefined): string {
  return token ? `${value} (${token})` : value;
}

function rgbToHex(rgbString: string): string {
  const m = rgbString.match(/rgba?\(([^)]+)\)/i);
  if (!m) return rgbString;
  const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
  const [r, g, b, a] = parts;
  if ([r, g, b].some((n) => Number.isNaN(n))) return rgbString;
  if (a === 0) return "transparent";
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a !== undefined && a < 1) hex += Math.round(a * 255).toString(16).padStart(2, "0");
  return hex.toUpperCase();
}

function formatBoxSides(top: string, right: string, bottom: string, left: string, map: Map<string, string>): string {
  const mt = withMatch(top, map.get(top));
  if (top === right && right === bottom && bottom === left) return mt;
  const mr = withMatch(right, map.get(right));
  const mb = withMatch(bottom, map.get(bottom));
  const ml = withMatch(left, map.get(left));
  return `${mt} / ${mr} / ${mb} / ${ml}`;
}

interface Snapshot {
  tagLabel: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: string;
  lineHeight: string;
  color: string;
  backgroundColor: string;
  padding: string;
  margin: string;
  flexContainer: string | null;
  gridContainer: string | null;
  flexItem: string;
  borderRadius: string;
  border: string;
  boxShadow: string;
}

function readSnapshot(el: Element, maps: TokenMaps): Snapshot {
  const cs = getComputedStyle(el);

  const tag = el.tagName.toLowerCase();
  const classes = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
  const tagLabel = classes.length ? `${tag}.${classes.slice(0, 2).join(".")}` : tag;

  const fontFamily = cs.fontFamily.split(",")[0]?.trim().replace(/^["']|["']$/g, "") ?? cs.fontFamily;
  const fontSize = withMatch(cs.fontSize, maps.fontSize.get(cs.fontSize));

  const colorHex = rgbToHex(cs.color);
  const color = withMatch(colorHex, maps.color.get(cs.color));
  const bgHex = rgbToHex(cs.backgroundColor);
  const backgroundColor = withMatch(bgHex, maps.color.get(cs.backgroundColor));

  // Matched per side (not just when all 4 are equal) — a top/bottom-only
  // pattern like .band{padding:var(--sec) 0} is common in this codebase and
  // should still surface its token, not just get silently collapsed away.
  const padding = formatBoxSides(cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft, maps.spacing);
  const margin = formatBoxSides(cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft, maps.spacing);

  const flexContainer = cs.display.includes("flex")
    ? `direction ${cs.flexDirection}, gap ${cs.columnGap}/${cs.rowGap}, justify ${cs.justifyContent}, align ${cs.alignItems}, wrap ${cs.flexWrap}`
    : null;

  const gridContainer = cs.display.includes("grid")
    ? `columns ${cs.gridTemplateColumns}, gap ${cs.columnGap}/${cs.rowGap}`
    : null;

  const flexItem = `grow ${cs.flexGrow}, shrink ${cs.flexShrink}, basis ${cs.flexBasis}`;

  const borderRadius = withMatch(cs.borderRadius, maps.radius.get(cs.borderRadius));

  const border =
    cs.borderTopWidth === "0px"
      ? "none"
      : withMatch(`${cs.borderTopWidth} ${cs.borderTopStyle} ${rgbToHex(cs.borderTopColor)}`, maps.color.get(cs.borderTopColor));

  const boxShadow = cs.boxShadow === "none" ? "none" : withMatch(cs.boxShadow, maps.shadow.get(cs.boxShadow));

  return {
    tagLabel,
    fontFamily,
    fontWeight: cs.fontWeight,
    fontSize,
    lineHeight: cs.lineHeight,
    color,
    backgroundColor,
    padding,
    margin,
    flexContainer,
    gridContainer,
    flexItem,
    borderRadius,
    border,
    boxShadow,
  };
}

// Shared by the on-screen tooltip and the click-to-copy text, so they can
// never drift apart.
function formatSnapshotText(s: Snapshot): string {
  const lines = [
    s.tagLabel,
    `font: ${s.fontFamily} ${s.fontWeight} ${s.fontSize}`,
    `line-height: ${s.lineHeight}`,
    `color: ${s.color}`,
    `background: ${s.backgroundColor}`,
    `padding: ${s.padding}`,
    `margin: ${s.margin}`,
    ...(s.flexContainer ? [`flex(container): ${s.flexContainer}`] : []),
    ...(s.gridContainer ? [`grid(container): ${s.gridContainer}`] : []),
    `flex(item): ${s.flexItem}`,
    `radius: ${s.borderRadius}`,
    `border: ${s.border}`,
    `shadow: ${s.boxShadow}`,
  ];
  return lines.join("\n");
}

const PILL_STYLE: React.CSSProperties = {
  position: "fixed",
  top: 12,
  right: 12,
  zIndex: 999999,
  pointerEvents: "none",
  background: "rgba(20,18,16,0.88)",
  color: "#fff",
  font: "500 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  padding: "6px 12px",
  borderRadius: 6,
  whiteSpace: "nowrap",
};

const TOOLTIP_BASE_STYLE: React.CSSProperties = {
  position: "fixed",
  zIndex: 999999,
  pointerEvents: "none",
  background: "rgba(20,18,16,0.92)",
  color: "#f2f0ec",
  font: "12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
  padding: "10px 12px",
  borderRadius: 6,
  maxWidth: 300,
  whiteSpace: "pre-wrap",
};

export default function DesignInspector() {
  if (!ENABLED) return null;
  return <DesignInspectorInner />;
}

function DesignInspectorInner() {
  const [active, setActive] = useState(false);
  const [locked, setLocked] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [justCopied, setJustCopied] = useState(false);

  const tokenMapsRef = useRef<TokenMaps | null>(null);
  const lockedRef = useRef(false);
  const copiedTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    if (!active) {
      setLocked(false);
      setSnapshot(null);
    }
  }, [active]);

  useEffect(() => {
    return () => window.clearTimeout(copiedTimeoutRef.current);
  }, []);

  // Keyboard toggles — ignored while typing in a real form field, or while
  // Ctrl/Cmd/Alt is held, so a signed-out visitor typing "i"/"l" into a
  // sign-in form (or any other input) is never hijacked.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isFormEl = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
      if (isFormEl || e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "i") {
        setActive((a) => !a);
      } else if (key === "l") {
        if (!active) return;
        setLocked((l) => !l);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function onMouseMove(e: MouseEvent) {
      if (lockedRef.current) return;

      const targetEl = (e.target as Element | null) ?? document.elementFromPoint(e.clientX, e.clientY);
      if (!targetEl || targetEl.closest(`[${ROOT_MARKER}]`)) return;

      if (!tokenMapsRef.current) {
        try {
          tokenMapsRef.current = buildTokenMaps();
        } catch (err) {
          console.warn("DesignInspector: failed to build token maps", err);
          return;
        }
      }

      try {
        setSnapshot(readSnapshot(targetEl, tokenMapsRef.current));
      } catch (err) {
        console.warn("DesignInspector: failed to read computed style", err);
      }

      const offset = 16;
      const maxX = window.innerWidth - 320;
      const maxY = window.innerHeight - 260;
      setPos({ x: Math.min(e.clientX + offset, Math.max(0, maxX)), y: Math.min(e.clientY + offset, Math.max(0, maxY)) });
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [active]);

  // Click-to-copy: copies whatever's actually under the cursor at click
  // time (not necessarily the frozen `snapshot`, so this still works
  // correctly while locked onto a different element). Captured so it wins
  // over the real element's own click behavior (link nav, button, etc.) —
  // inspect mode takes over the click instead of triggering the page.
  useEffect(() => {
    if (!active) return;

    function onClick(e: MouseEvent) {
      const targetEl = (e.target as Element | null) ?? document.elementFromPoint(e.clientX, e.clientY);
      if (!targetEl || targetEl.closest(`[${ROOT_MARKER}]`)) return;

      e.preventDefault();
      e.stopPropagation();

      if (!tokenMapsRef.current) {
        try {
          tokenMapsRef.current = buildTokenMaps();
        } catch (err) {
          console.warn("DesignInspector: failed to build token maps", err);
          return;
        }
      }

      try {
        const clicked = readSnapshot(targetEl, tokenMapsRef.current);
        navigator.clipboard
          .writeText(formatSnapshotText(clicked))
          .then(() => {
            setJustCopied(true);
            window.clearTimeout(copiedTimeoutRef.current);
            copiedTimeoutRef.current = window.setTimeout(() => setJustCopied(false), 1200);
          })
          .catch((err) => console.warn("DesignInspector: clipboard write failed", err));
      } catch (err) {
        console.warn("DesignInspector: failed to read computed style", err);
      }
    }

    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, [active]);

  const pillLabel = justCopied
    ? "Copied to clipboard"
    : !active
      ? 'Press "I" to inspect'
      : locked
        ? 'Inspect: LOCKED ("L" to unlock)'
        : 'Inspect: ON ("L" to lock, click to copy)';

  return (
    <div {...{ [ROOT_MARKER]: "true" }}>
      <div style={PILL_STYLE}>{pillLabel}</div>
      {active && snapshot && (
        <div style={{ ...TOOLTIP_BASE_STYLE, left: pos.x, top: pos.y }}>{formatSnapshotText(snapshot)}</div>
      )}
    </div>
  );
}
