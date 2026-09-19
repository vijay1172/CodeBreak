"use client";

import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <NextThemeProvider attribute="class" storageKey="codebreak-theme" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</NextThemeProvider>;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const dark = mounted && resolvedTheme === "dark";
  return <button type="button" className="theme-toggle" aria-label="Dark mode" aria-pressed={dark}
    disabled={!mounted} title={dark ? "Switch to light mode" : "Switch to dark mode"}
    onClick={() => setTheme(dark ? "light" : "dark")}>
    <Moon className="theme-moon" aria-hidden="true" size={18}/>
    <Sun className="theme-sun" aria-hidden="true" size={18}/>
    <span>Dark mode</span>
  </button>;
}
