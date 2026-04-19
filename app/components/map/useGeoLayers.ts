"use client";

/**
 * app/components/map/useGeoLayers.ts
 *
 * Custom hook untuk mengelola GeoJSON layer Leaflet:
 * - Fetch + cache (tidak re-fetch saat metric/theme berubah)
 * - Render kecamatan & desa layer dengan choropleth style
 * - Visibility per wilayah tanpa rebuild: setStyle(opacity 0) + pointer-events:none
 *   sehingga fitur yang dinonaktifkan TIDAK menampilkan tooltip / menerima klik
 * - Legend update otomatis saat isDark berubah
 */

import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import type { MetricType, Warga } from "@/app/types";
import type { LoadState, GeoCache } from "@/app/types";
import { dummyKecamatan, dummyDesa, dummyMasyarakat } from "@/app/data/dummy";
import {
  valueFor,
  quantileBreaks,
  getColorFor,
  createLegendHTML,
  STROKE_KEC,
  STROKE_DESA,
} from "@/app/utils/mapUtils";
import { tooltipHtml } from "./tooltipHelper";
import { GEOJSON_KEC, GEOJSON_DESA } from "./constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseGeoLayersOptions {
  mapRef:           React.RefObject<L.Map | null>;
  metric:           MetricType;
  isDark:           boolean;
  kecVisible:       Set<string>;
  desaVisible:      Set<string>;
  onSelectWilayah:  (wilayah: string | null) => void;
  onSelectWarga:    (warga: Warga[]) => void;
  onLoadState:      (s: LoadState) => void;
  onErrorMessage:   (m: string) => void;
  /** Terima mapping kecamatan→desa saat GeoJSON berhasil dimuat */
  onKecToDesaReady: (map: Record<string, string[]>) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Toggle pointer-events pada SVG path Leaflet.
 * Cara bersih untuk menonaktifkan SEMUA interaksi (tooltip, click, hover)
 * pada fitur yang tidak visible, tanpa menghapus layer dari DOM.
 *
 * Menggunakan internal `_path` — accepted practice untuk Leaflet SVG renderer.
 */
function setPathInteractive(layer: L.Layer, interactive: boolean): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = (layer as any)._path as SVGElement | undefined;
  if (el) el.style.pointerEvents = interactive ? "" : "none";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeoLayers({
  mapRef,
  metric,
  isDark,
  kecVisible,
  desaVisible,
  onSelectWilayah,
  onSelectWarga,
  onLoadState,
  onErrorMessage,
  onKecToDesaReady,
}: UseGeoLayersOptions) {
  // Stable refs — dipakai dalam Leaflet event callbacks agar tidak stale closure
  const isDarkRef      = useRef(isDark);
  const metricRef      = useRef(metric);
  const kecVisibleRef  = useRef(kecVisible);
  const desaVisibleRef = useRef(desaVisible);

  useEffect(() => { isDarkRef.current      = isDark;      }, [isDark]);
  useEffect(() => { metricRef.current      = metric;      }, [metric]);
  useEffect(() => { kecVisibleRef.current  = kecVisible;  }, [kecVisible]);
  useEffect(() => { desaVisibleRef.current = desaVisible; }, [desaVisible]);

  // Leaflet layer refs
  const kecLayerRef    = useRef<L.GeoJSON | null>(null);
  const desaLayerRef   = useRef<L.GeoJSON | null>(null);
  const legendRef      = useRef<L.Control | null>(null);
  const geoCacheRef    = useRef<GeoCache | null>(null);
  const breaksKecRef   = useRef<number[]>([]);
  const breaksDesaRef  = useRef<number[]>([]);

  // ── Legend ────────────────────────────────────────────────────────────────

  const rebuildLegend = useCallback((
    map: L.Map,
    breaks: number[],
    currentMetric: MetricType,
    dark: boolean,
  ) => {
    if (legendRef.current) map.removeControl(legendRef.current);
    const legend = new L.Control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.innerHTML = createLegendHTML(breaks, currentMetric, dark);
      return div;
    };
    legend.addTo(map);
    legendRef.current = legend;
  }, []);

  // ── Style functions ───────────────────────────────────────────────────────

  const styleKec = useCallback((
    f: GeoJSON.Feature | undefined,
    breaks: number[],
    currentMetric: MetricType,
  ): L.PathOptions => {
    const code    = (f?.properties as Record<string, string>)?.WADMKC;
    const visible = kecVisibleRef.current.has(code);
    if (!visible) return { opacity: 0, fillOpacity: 0, weight: 0 };
    const v = valueFor(dummyKecamatan[code], currentMetric);
    return { color: STROKE_KEC, weight: 2.5, fillColor: getColorFor(v, breaks), fillOpacity: 0.72, opacity: 1 };
  }, []);

  const styleDesa = useCallback((
    f: GeoJSON.Feature | undefined,
    breaks: number[],
    currentMetric: MetricType,
  ): L.PathOptions => {
    const props = f?.properties as Record<string, string>;
    const kec   = props?.WADMKC;
    const name  = props?.WADMKD;
    // Composite key: identik dengan yang disimpan di desaVisibleRef
    const compositeKey = `${kec}:${name}`;
    const visible = desaVisibleRef.current.has(compositeKey);
    if (!visible) return { opacity: 0, fillOpacity: 0, weight: 0 };
    const v = valueFor(dummyDesa[name], currentMetric);
    return { color: STROKE_DESA, weight: 1.5, fillColor: getColorFor(v, breaks), fillOpacity: 0.72, opacity: 1 };
  }, []);

  // ── Apply visibility to a single sub-layer (style + pointer-events) ───────

  const applyKecVisibility = useCallback((
    l: L.Layer,
    breaks: number[],
    currentMetric: MetricType,
  ) => {
    const f       = (l as L.GeoJSON).feature as GeoJSON.Feature | undefined;
    const code    = (f?.properties as Record<string, string>)?.WADMKC;
    const visible = kecVisibleRef.current.has(code);
    (l as L.Path).setStyle(styleKec(f, breaks, currentMetric));
    setPathInteractive(l, visible);
  }, [styleKec]);

  const applyDesaVisibility = useCallback((
    l: L.Layer,
    breaks: number[],
    currentMetric: MetricType,
  ) => {
    const f    = (l as L.GeoJSON).feature as GeoJSON.Feature | undefined;
    const props = f?.properties as Record<string, string>;
    const kec   = props?.WADMKC;
    const name  = props?.WADMKD;
    const compositeKey = `${kec}:${name}`;
    const visible = desaVisibleRef.current.has(compositeKey);
    (l as L.Path).setStyle(styleDesa(f, breaks, currentMetric));
    setPathInteractive(l, visible);
  }, [styleDesa]);

  // ── Render GeoJSON layers ─────────────────────────────────────────────────

  const renderLayers = useCallback((
    geoData: GeoCache,
    currentMetric: MetricType,
  ) => {
    const map = mapRef.current;
    if (!map) return;

    // Bersihkan layer lama
    if (kecLayerRef.current)  map.removeLayer(kecLayerRef.current);
    if (desaLayerRef.current) map.removeLayer(desaLayerRef.current);

    const { kecGeo, desaGeo } = geoData;

    // ── Kecamatan ──────────────────────────────────────────────────────────
    const valsKec  = (kecGeo.features || [])
      .map(f => valueFor(dummyKecamatan[(f.properties as Record<string, string>)?.WADMKC], currentMetric))
      .filter(v => v !== 0 && !isNaN(v));
    const breaksKec = quantileBreaks(valsKec, 5);
    breaksKecRef.current = breaksKec;

    const kecLayer = L.geoJSON(kecGeo, {
      style: f => styleKec(f, breaksKec, currentMetric),
      onEachFeature: (f, layer) => {
        const props  = f.properties as Record<string, string>;
        const code   = props?.WADMKC;
        const name   = code ?? "Unknown";
        const v      = valueFor(dummyKecamatan[code], currentMetric);
        const metLbl = currentMetric === "jumlah" ? "Jumlah PKH" : "PKH/1000";
        const vLbl   = currentMetric === "jumlah"
          ? `${dummyKecamatan[code]?.jumlah ?? 0}`
          : `${Math.round(v * 10) / 10}`;

        layer.bindTooltip(tooltipHtml([
          { bold:   `Kecamatan: ${name}` },
          { normal: `${metLbl}: ${vLbl}` },
        ]), { sticky: true, opacity: 1, className: "mw-tip" });

        layer.on("mouseover", () => {
          if (!kecVisibleRef.current.has(code)) return;
          (layer as L.Path).setStyle({
            weight: 3.5,
            color: isDarkRef.current ? "#fdfdfdff" : "#ffffffff",
            fillOpacity: 0.9,
          });
        });
        layer.on("mouseout", () => {
          if (!kecVisibleRef.current.has(code)) return;
          (layer as L.Path).setStyle(styleKec(f, breaksKec, metricRef.current));
        });
        layer.on("click", () => {
          if (!kecVisibleRef.current.has(code)) return;
          onSelectWarga([]);
          onSelectWilayah(`Kecamatan ${name}`);
        });

        // Set initial pointer-events (important: match initial visibility)
        // Dipanggil setelah layer ditambahkan ke map agar _path sudah ada
        layer.once("add", () => {
          setPathInteractive(layer, kecVisibleRef.current.has(code));
        });
      },
    });
    kecLayerRef.current = kecLayer;
    kecLayer.addTo(map);

    // ── Legend ─────────────────────────────────────────────────────────────
    rebuildLegend(map, breaksKec, currentMetric, isDarkRef.current);

    // ── Desa ───────────────────────────────────────────────────────────────
    const valsDesa  = (desaGeo.features || [])
      .map(f => valueFor(dummyDesa[(f.properties as Record<string, string>)?.WADMKD], currentMetric))
      .filter(v => v !== 0 && !isNaN(v));
    const breaksDesa = quantileBreaks(valsDesa, 5);
    breaksDesaRef.current = breaksDesa;

    const desaLayer = L.geoJSON(desaGeo, {
      style: f => styleDesa(f, breaksDesa, currentMetric),
      onEachFeature: (f, layer) => {
        const props   = f.properties as Record<string, string>;
        const name    = props?.WADMKD ?? "Unknown";
        const kecName = props?.WADMKC ?? "";
        // Composite key — HARUS sama persis dengan yang ada di desaVisibleRef
        const compositeKey = `${kecName}:${name}`;
        const v       = valueFor(dummyDesa[name], currentMetric);
        const metLbl  = currentMetric === "jumlah" ? "Jumlah PKH" : "PKH/1000";
        const vLbl    = currentMetric === "jumlah"
          ? `${dummyDesa[name]?.jumlah ?? 0}`
          : `${Math.round(v * 10) / 10}`;

        layer.bindTooltip(tooltipHtml([
          { bold:   `Desa: ${name}` },
          { normal: `Kec. ${kecName}` },
          { normal: `${metLbl}: ${vLbl}` },
        ]), { sticky: true, opacity: 1, className: "mw-tip" });

        layer.on("mouseover", () => {
          if (!desaVisibleRef.current.has(compositeKey)) return;
          (layer as L.Path).setStyle({
            weight: 2.5,
            color: isDarkRef.current ? "#62badf" : "#0369a1",
            fillOpacity: 0.92,
          });
        });
        layer.on("mouseout", () => {
          if (!desaVisibleRef.current.has(compositeKey)) return;
          (layer as L.Path).setStyle(styleDesa(f, breaksDesa, metricRef.current));
        });
        layer.on("click", () => {
          if (!desaVisibleRef.current.has(compositeKey)) return;
          onSelectWarga(dummyMasyarakat[name] ?? []);
          onSelectWilayah(`Desa/Kel. ${name}`);
        });

        layer.once("add", () => {
          setPathInteractive(layer, desaVisibleRef.current.has(compositeKey));
        });
      },
    });
    desaLayerRef.current = desaLayer;
    desaLayer.addTo(map);
  }, [mapRef, styleKec, styleDesa, rebuildLegend, onSelectWarga, onSelectWilayah]);

  // ── Re-style + fix pointer-events saat visibility berubah ────────────────

  useEffect(() => {
    const layer = kecLayerRef.current;
    if (!layer) return;
    layer.eachLayer(l => applyKecVisibility(l, breaksKecRef.current, metricRef.current));
  }, [kecVisible, applyKecVisibility]);

  useEffect(() => {
    const layer = desaLayerRef.current;
    if (!layer) return;
    layer.eachLayer(l => applyDesaVisibility(l, breaksDesaRef.current, metricRef.current));
  }, [desaVisible, applyDesaVisibility]);

  // ── Re-build legend saat isDark berubah ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || breaksKecRef.current.length === 0) return;
    rebuildLegend(map, breaksKecRef.current, metricRef.current, isDark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, rebuildLegend]);

  // ── Initial load (fetch + cache) ─────────────────────────────────────────
  useEffect(() => {
    if (geoCacheRef.current) {
      renderLayers(geoCacheRef.current, metric);
      return;
    }
    onLoadState("loading");
    Promise.all([
      fetch(GEOJSON_KEC).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — kecamatan.geojson`);
        return r.json() as Promise<GeoJSON.FeatureCollection>;
      }),
      fetch(GEOJSON_DESA).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — desa.geojson`);
        return r.json() as Promise<GeoJSON.FeatureCollection>;
      }),
    ])
      .then(([kecGeo, desaGeo]) => {
        geoCacheRef.current = { kecGeo, desaGeo };
        onLoadState("success");

        // Bangun mapping kecamatan → desa dari GeoJSON aktual
        const mapping: Record<string, string[]> = {};
        desaGeo.features.forEach(f => {
          const kec  = (f.properties as Record<string, string>)?.WADMKC;
          const desa = (f.properties as Record<string, string>)?.WADMKD;
          if (kec && desa) {
            if (!mapping[kec]) mapping[kec] = [];
            if (!mapping[kec].includes(desa)) mapping[kec].push(desa);
          }
        });
        onKecToDesaReady(mapping);
        renderLayers({ kecGeo, desaGeo }, metric);
      })
      .catch((err: Error) => {
        onLoadState("error");
        onErrorMessage(err.message || "GeoJSON tidak dapat dimuat.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-render saat metric berubah ────────────────────────────────────────
  useEffect(() => {
    if (geoCacheRef.current) renderLayers(geoCacheRef.current, metric);
  }, [metric, renderLayers]);
}
