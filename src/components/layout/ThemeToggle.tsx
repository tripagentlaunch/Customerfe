import { useTheme, type ThemeName } from "../../lib/theme";

// Ported verbatim (markup/classes/icons) from js/site.js's THEME SWITCHER —
// css/site.css's .ta-theme rules apply with zero changes.
const OPTIONS: { name: ThemeName; cls: string; label: string; icon: JSX.Element }[] = [
  {
    name: "ivory",
    cls: "sw-ivory",
    label: "Light",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.1} strokeLinecap="round">
        <circle cx="12" cy="12" r="4.1" />
        <path d="M12 2.3v2.3M12 19.4v2.3M2.3 12h2.3M19.4 12h2.3M5 5l1.6 1.6M17.4 17.4l1.6 1.6M19 5l-1.6 1.6M6.6 17.4L5 19" />
      </svg>
    ),
  },
  {
    name: "dark",
    cls: "sw-dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.6 13.3A8.3 8.3 0 1 1 10.7 3.4a6.5 6.5 0 0 0 9.9 9.9z" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="ta-theme" role="group" aria-label="Background theme">
      {OPTIONS.map((o) => (
        <button
          key={o.name}
          type="button"
          className={o.cls}
          title={`${o.label} theme`}
          aria-label={`${o.label} theme`}
          aria-pressed={theme === o.name}
          onClick={() => setTheme(o.name)}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}
