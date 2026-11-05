import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorMode } from "@chakra-ui/react";

interface ThemeContextType {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => { },
  toggleTheme: () => { },
  isDark: false,
});

export const useTheme = () => {
  return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const { setColorMode } = useColorMode();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("talkative_theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        setColorMode(saved);
      } else if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches
      ) {
        setTheme("light");
        setColorMode("light");
      } else {
        setTheme("dark");
        setColorMode("dark");
      }
    } catch (e) {
      // ignore SSR
    }
  }, [setColorMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    try {
      setColorMode(theme);
    } catch (e) {}
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
      root.classList.add("dark");
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      root.setAttribute("data-theme", "light");
      root.classList.remove("dark");
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    }
    try {
      localStorage.setItem("talkative_theme", theme);
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;

