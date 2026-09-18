"use client";

import { useTheme as useNextTheme } from "next-themes";

type Theme = "light" | "dark";

export const useTheme = (): { theme: Theme; toggleTheme: () => void } => {
  const { resolvedTheme, setTheme } = useNextTheme();

  const theme = (resolvedTheme as Theme) ?? "light";
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, toggleTheme };
};
