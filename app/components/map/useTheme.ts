"use client";

/**
 * app/components/map/useTheme.ts
 *
 * Custom hook untuk membaca dan toggle tema dark/light.
 * - Observe `data-theme` attribute pada `<html>` via MutationObserver
 * - Persist ke localStorage dengan key "sig-theme"
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface UseThemeReturn {
  isDark:           boolean;
  handleToggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const [isDark, setIsDark]   = useState(false);
  const isDarkRef             = useRef(false);

  // Sync ref agar handleToggleTheme tidak stale
  useEffect(() => { isDarkRef.current = isDark; }, [isDark]);

  // Baca initial nilai & pasang observer
  useEffect(() => {
    const read = () =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes:      true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  const handleToggleTheme = useCallback(() => {
    const next = isDarkRef.current ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("sig-theme", next); } catch { /* quota / private mode */ }
  }, []);

  return { isDark, handleToggleTheme };
}
