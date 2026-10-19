"use client";
// src/components/providers/ThemeProvider.tsx

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type ColorTheme = "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan";

export interface ColorThemeOption {
  id: ColorTheme;
  name: string;
  accent: string;
  cssVar: string;
  gradient: string;
  previewClass: string;
}

export const COLOR_THEMES: ColorThemeOption[] = [
  {
    id: "blue",
    name: "Ocean Sapphire",
    accent: "#3b82f6",
    cssVar: "217 91% 60%",
    gradient: "linear-gradient(135deg, #2563eb, #3b82f6, #06b6d4)",
    previewClass: "from-blue-600 via-indigo-600 to-cyan-500",
  },
  {
    id: "violet",
    name: "Electric Violet",
    accent: "#8b5cf6",
    cssVar: "262 83% 58%",
    gradient: "linear-gradient(135deg, #7c3aed, #9333ea, #6366f1)",
    previewClass: "from-violet-600 via-purple-600 to-indigo-500",
  },
  {
    id: "emerald",
    name: "Cyber Emerald",
    accent: "#10b981",
    cssVar: "158 64% 45%",
    gradient: "linear-gradient(135deg, #059669, #10b981, #14b8a6)",
    previewClass: "from-emerald-600 via-teal-600 to-green-500",
  },
  {
    id: "amber",
    name: "Solar Amber",
    accent: "#f59e0b",
    cssVar: "38 92% 50%",
    gradient: "linear-gradient(135deg, #d97706, #f59e0b, #f97316)",
    previewClass: "from-amber-500 via-orange-500 to-yellow-500",
  },
  {
    id: "rose",
    name: "Ruby Rose",
    accent: "#f43f5e",
    cssVar: "346 84% 61%",
    gradient: "linear-gradient(135deg, #e11d48, #f43f5e, #fb7185)",
    previewClass: "from-rose-600 via-pink-600 to-red-500",
  },
  {
    id: "cyan",
    name: "Neon Cyan",
    accent: "#06b6d4",
    cssVar: "189 94% 43%",
    gradient: "linear-gradient(135deg, #0891b2, #06b6d4, #3b82f6)",
    previewClass: "from-cyan-600 via-blue-600 to-sky-500",
  },
];

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  colorTheme: "blue",
  setColorTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("blue");

  // Load stored theme & color theme on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    if (storedTheme) setThemeState(storedTheme);

    const storedColorTheme = localStorage.getItem("colorTheme") as ColorTheme | null;
    if (storedColorTheme && COLOR_THEMES.some((t) => t.id === storedColorTheme)) {
      setColorThemeState(storedColorTheme);
      document.documentElement.setAttribute("data-color-theme", storedColorTheme);
    } else {
      document.documentElement.setAttribute("data-color-theme", "blue");
    }
  }, []);

  // Update light/dark mode
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const resolve = () => {
      const resolved =
        theme === "system"
          ? mediaQuery.matches
            ? "dark"
            : "light"
          : theme;
      setResolvedTheme(resolved);
      root.classList.toggle("dark", resolved === "dark");
    };

    resolve();
    mediaQuery.addEventListener("change", resolve);
    return () => mediaQuery.removeEventListener("change", resolve);
  }, [theme]);

  // Update data-color-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-color-theme", colorTheme);
  }, [colorTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
  };

  const setColorTheme = (ct: ColorTheme) => {
    setColorThemeState(ct);
    localStorage.setItem("colorTheme", ct);
    document.documentElement.setAttribute("data-color-theme", ct);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        colorTheme,
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
