import React from "react";

type Theme = "dark" | "light";
type ThemeContextValue = {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  toggle: () => void;
};

const STORAGE_KEY = "theme";
const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  });

  React.useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const value = React.useMemo(
    () => ({ theme, setTheme, toggle }),
    [theme, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
