"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

// Sun/moon switch for the admin shell. The visible icon is driven purely by
// the `dark` class on <html> (set by next-themes before paint), so there's no
// hydration mismatch and no mounted-state effect needed — Moon shows in light
// mode, Sun in dark mode. The click handler reads resolvedTheme (available
// after hydration) to flip to the opposite theme.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Cambiar tema"
      className="rounded-lg p-2 text-gray-500 transition hover:bg-black/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <Moon className="h-4 w-4 dark:hidden" strokeWidth={1.75} />
      <Sun className="hidden h-4 w-4 dark:block" strokeWidth={1.75} />
    </button>
  );
}
