"use client";

/**
 * app/components/map/useDragResize.ts
 *
 * Custom hook untuk drag‑to‑resize antara panel peta dan panel tabel.
 * - Mendengarkan mousemove/touchmove di window agar drag tetap lancar
 *   meskipun kursor keluar dari elemen handle
 * - Membatas range 20%–85% tinggi container
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface UseDragResizeReturn {
  mapHeightPct: number;
  onDragStart:  (e: React.MouseEvent | React.TouchEvent) => void;
}

export function useDragResize(
  containerRef: React.RefObject<HTMLDivElement | null>,
): UseDragResizeReturn {
  const [mapHeightPct, setMapHeightPct] = useState(62);
  const dragging = useRef(false);

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    dragging.current           = true;
    document.body.style.cursor     = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const getY = (e: MouseEvent | TouchEvent) =>
      "touches" in e ? e.touches[0]!.clientY : e.clientY;

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMapHeightPct(
        Math.max(20, Math.min(85, ((getY(e) - rect.top) / rect.height) * 100)),
      );
    };

    const onUp = () => {
      if (!dragging.current) return;
      dragging.current           = false;
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
  }, [containerRef]);

  return { mapHeightPct, onDragStart };
}
