import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Ported from js/site.js's THEME SWITCHER (~line 600-630). Only 'dark' is
// ever persisted/applied; any other/stale value falls back to the pure-white
// default ("ivory" = no data-theme attribute at all).
const KEY = "ta-theme";
export type ThemeName = "ivory" | "dark";

function readStored(): ThemeName {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "ivory";
  } catch {
    return "ivory";
  }
}

const ThemeContext = createContext<{ theme: ThemeName; setTheme: (t: ThemeName) => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(readStored);

  useEffect(() => {
    if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  }, [theme]);

  function setTheme(t: ThemeName) {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      // ignore
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme() must be used inside <ThemeProvider>");
  return ctx;
}
