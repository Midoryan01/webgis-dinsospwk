"use client";

/**
 * app/components/MapWrapper.tsx
 *
 * Orchestrator utama halaman peta. Semua logika berat sudah dipecah ke:
 * - map/constants.ts      — tile URL, CSS, stroke
 * - map/tooltipHelper.ts  — fungsi HTML tooltip
 * - map/useTheme.ts       — hook dark/light theme
 * - map/useDragResize.ts  — hook drag resize handle
 * - map/useGeoLayers.ts   — hook fetch GeoJSON, render & visibility
 * - map/LayerPanel.tsx    — panel layer dengan search + tree checkbox
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { MetricType, Warga } from "@/app/types";
import IndicatorControl from "@/app/components/IndicatorControl";
import WargaTable       from "@/app/components/WargaTable";
import LayerPanel       from "@/app/components/map/LayerPanel";
import { useTheme }     from "@/app/components/map/useTheme";
import { useDragResize } from "@/app/components/map/useDragResize";
import { useGeoLayers }  from "@/app/components/map/useGeoLayers";
import { TILE_LIGHT, TILE_DARK, ATTR_OSM, ATTR_CARTO, GLOBAL_CSS, MAP_CENTER, MAP_ZOOM } from "@/app/components/map/constants";

// ─── MapWrapper ────────────────────────────────────────────────────────────────
export default function MapWrapper() {
  // ── Map refs ─────────────────────────────────────────────────────────────
  const mapRef       = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const { isDark, handleToggleTheme } = useTheme();

  // ── Drag resize ───────────────────────────────────────────────────────────
  const { mapHeightPct, onDragStart } = useDragResize(containerRef);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [metric, setMetric]                   = useState<MetricType>("per1000");
  const [selectedWarga, setSelectedWarga]     = useState<Warga[]>([]);
  const [selectedWilayah, setSelectedWilayah] = useState<string | null>(null);
  const [loadState, setLoadState]             = useState<"idle"|"loading"|"success"|"error">("idle");
  const [errorMessage, setErrorMessage]       = useState("");
  const [tableCollapsed, setTableCollapsed]   = useState(false);

  // ── Layer visibility — per kecamatan dan per desa ─────────────────────────
  /** Mapping kecamatan → daftar desa (diisi setelah GeoJSON dimuat) */
  const [kecToDesa, setKecToDesa]   = useState<Record<string, string[]>>({});
  const [kecVisible, setKecVisible] = useState<Set<string>>(new Set());
  const [desaVisible, setDesaVisible] = useState<Set<string>>(new Set());

  /** Dipanggil hook setelah GeoJSON berhasil dimuat — inisialisasi semua checked.
   * desaVisible menggunakan composite key "kec:desa" agar desa dengan nama
   * identik di kecamatan berbeda (contoh: Citalang di Purwakarta & Tegalwaru)
   * dapat dikontrol secara independen.
   */
  const handleKecToDesaReady = useCallback((mapping: Record<string, string[]>) => {
    setKecToDesa(mapping);
    setKecVisible(new Set(Object.keys(mapping)));
    // Composite key: "NamaKec:NamaDesa"
    setDesaVisible(
      new Set(Object.entries(mapping).flatMap(([kec, desas]) => desas.map(d => `${kec}:${d}`))),
    );
  }, []);

  // ── Toggle handlers ───────────────────────────────────────────────────────
  const handleChangeKec = useCallback((name: string, checked: boolean) => {
    setKecVisible(prev => {
      const next = new Set(prev);
      checked ? next.add(name) : next.delete(name);
      return next;
    });
  }, []);

  const handleChangeDesa = useCallback((compositeKey: string, checked: boolean) => {
    // compositeKey = "NamaKec:NamaDesa"
    setDesaVisible(prev => {
      const next = new Set(prev);
      checked ? next.add(compositeKey) : next.delete(compositeKey);
      return next;
    });
  }, []);

  const handleChangeAllKec = useCallback((checked: boolean) => {
    setKecVisible(checked ? new Set(Object.keys(kecToDesa)) : new Set());
  }, [kecToDesa]);

  const handleChangeAllDesa = useCallback((checked: boolean) => {
    setDesaVisible(
      checked
        ? new Set(Object.entries(kecToDesa).flatMap(([kec, desas]) => desas.map(d => `${kec}:${d}`)))
        : new Set(),
    );
  }, [kecToDesa]);

  // ── GeoJSON layers via hook ───────────────────────────────────────────────
  useGeoLayers({
    mapRef,
    metric,
    isDark,
    kecVisible,
    desaVisible,
    onSelectWilayah: setSelectedWilayah,
    onSelectWarga:   setSelectedWarga,
    onLoadState:     setLoadState,
    onErrorMessage:  setErrorMessage,
    onKecToDesaReady: handleKecToDesaReady,
  });

  // ── Tile swap saat tema berubah ───────────────────────────────────────────
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(isDark ? TILE_DARK : TILE_LIGHT);
    tileLayerRef.current.options.attribution = isDark ? ATTR_CARTO : ATTR_OSM;
  }, [isDark]);

  // ── invalidateSize: dipanggil saat layout berubah ─────────────────────────
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 280);
    return () => clearTimeout(t);
  }, [tableCollapsed]);

  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.invalidateSize({ animate: false }), 50);
    return () => clearTimeout(t);
  }, [mapHeightPct]);

  // ── Inisialisasi map Leaflet (hanya sekali) ───────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;
    const map  = L.map("sig-map").setView(MAP_CENTER, MAP_ZOOM);
    const tile = L.tileLayer(TILE_LIGHT, { attribution: ATTR_OSM, maxZoom: 19 });
    tile.addTo(map);
    mapRef.current       = map;
    tileLayerRef.current = tile;
  }, []);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div ref={containerRef} style={{
        height: "100vh", display: "flex", flexDirection: "column",
        overflow: "hidden", background: "var(--map-panel-bg,#fff)",
      }}>
        {/* ── MAP SECTION ─────────────────────────────────────────────────── */}
        <div style={
          tableCollapsed
            ? { flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }
            : { height: `${mapHeightPct}%`, flexShrink: 0, position: "relative", overflow: "hidden" }
        }>
          <div id="sig-map" style={{ width: "100%", height: "100%" }} />

          {/* Indicator panel — top left */}
          <div style={{ position: "absolute", top: 85, left: 14, zIndex: 1000 }}>
            <IndicatorControl
              metric={metric} setMetric={setMetric}
              isDark={isDark} onToggleTheme={handleToggleTheme}
            />
          </div>

          {/* Layer panel — top right */}
          <div style={{ position: "absolute", top: 14, right: 14, zIndex: 1000 }}>
            <LayerPanel
              isDark={isDark}
              kecToDesa={kecToDesa}
              kecVisible={kecVisible}
              desaVisible={desaVisible}
              onChangeKec={handleChangeKec}
              onChangeDesa={handleChangeDesa}
              onChangeAllKec={handleChangeAllKec}
              onChangeAllDesa={handleChangeAllDesa}
            />
          </div>

          {/* Loading overlay */}
          {loadState === "loading" && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(10,21,32,0.75)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 2000, flexDirection: "column", gap: 14,
            }}>
              <div className="mw-spinner" />
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, margin: 0, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                Memuat data GeoJSON…
              </p>
            </div>
          )}

          {/* Error overlay */}
          {loadState === "error" && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(10,21,32,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 2000, flexDirection: "column", gap: 16, padding: 24,
              fontFamily: "'Inter','Segoe UI',sans-serif",
            }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div style={{ textAlign: "center" }}>
                <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: "0 0 6px" }}>Gagal Memuat Peta</p>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "0 0 4px", maxWidth: 280 }}>{errorMessage}</p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Pastikan file GeoJSON tersedia di folder /public/</p>
              </div>
              <button
                onClick={() => { setLoadState("idle"); setErrorMessage(""); window.location.reload(); }}
                style={{ padding: "8px 20px", background: "#dde8f0", color: "#0d1f33", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        {/* ── DRAG HANDLE (only when table open) ──────────────────────────── */}
        {!tableCollapsed && (
          <div
            className="mw-drag-handle"
            style={{
              background: "var(--map-panel-bg,#fff)",
              borderTop:    "1px solid var(--map-panel-border,#e2e9f0)",
              borderBottom: "1px solid var(--map-panel-border,#e2e9f0)",
            }}
            onMouseDown={onDragStart} onTouchStart={onDragStart}
            role="separator" aria-orientation="horizontal"
            aria-label="Seret untuk mengubah ukuran" title="Seret untuk mengubah ukuran panel"
          >
            {[0,1,2,3,4].map(i => <div key={i} className="mw-drag-dot" />)}
          </div>
        )}

        {/* ── TABLE SECTION ─────────────────────────────────────────────── */}
        <div style={
          tableCollapsed
            ? { flexShrink: 0, height: 44, overflow: "hidden" }
            : { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }
        }>
          <WargaTable
            selectedWilayah={selectedWilayah}
            selectedWarga={selectedWarga}
            isCollapsed={tableCollapsed}
            onToggle={() => setTableCollapsed(v => !v)}
          />
        </div>
      </div>
    </>
  );
}
