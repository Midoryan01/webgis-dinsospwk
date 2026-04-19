/**
 * app/utils/mapUtils.ts
 * Utility functions untuk visualisasi peta choropleth.
 */

import type { PKHRecord, MetricType } from "@/app/types";

/**
 * Hitung nilai metrik untuk sebuah record PKH.
 * - "jumlah": mengembalikan jumlah penerima absolut
 * - "per1000": mengembalikan rasio penerima per 1000 penduduk
 */
export function valueFor(record: PKHRecord | undefined, metric: MetricType): number {
  if (!record) return 0;
  if (metric === "jumlah") return record.jumlah;
  if (record.penduduk === 0) return 0;
  return (record.jumlah / record.penduduk) * 1000;
}

/**
 * Hitung quantile breaks untuk klasifikasi choropleth.
 * @param values Array nilai numerik (sudah difilter NaN)
 * @param n Jumlah kelas
 * @returns Array breaks sebanyak n+1 elemen [min, ..., max]
 */
export function quantileBreaks(values: number[], n: number): number[] {
  if (values.length === 0) return Array(n + 1).fill(0);
  const sorted = [...values].sort((a, b) => a - b);
  const breaks: number[] = [sorted[0]];
  for (let i = 1; i <= n; i++) {
    const idx = Math.floor((i / n) * (sorted.length - 1));
    breaks.push(sorted[idx]);
  }
  return breaks;
}

/**
 * Palet warna choropleth — YlOrRd (asli, 5 kelas)
 * Kuning muda (rendah) → merah tua (tinggi) — familiar & intuitif
 */
export const CHOROPLETH_COLORS = [
  "#ffffb2", // kelas 1 — sangat rendah
  "#fecc5c", // kelas 2 — rendah
  "#fd8d3c", // kelas 3 — menengah
  "#f03b20", // kelas 4 — tinggi
  "#bd0026", // kelas 5 — sangat tinggi
] as const;

/** Warna stroke layer GeoJSON — solid dan tegas */
export const STROKE_KEC  = "#1e293b" as const; // slate-900 — kecamatan, tebal & gelap
export const STROKE_DESA = "#334155" as const; // slate-700 — desa, lebih tipis

/**
 * Dapatkan warna choropleth untuk nilai tertentu berdasarkan breaks.
 * Mengembalikan abu-abu neutral jika value = 0 (tidak ada data).
 */
export function getColorFor(value: number, breaks: number[]): string {
  if (value === 0 || breaks.length < 2) return "#d4dde8"; // no-data color
  for (let i = 0; i < CHOROPLETH_COLORS.length; i++) {
    if (value <= breaks[i + 1]) return CHOROPLETH_COLORS[i];
  }
  return CHOROPLETH_COLORS[CHOROPLETH_COLORS.length - 1];
}

/**
 * Generate HTML untuk legenda peta.
 *
 * PENTING: Div legenda ini di-inject ke dalam DOM Leaflet yang merupakan
 * bagian dari document yang sama, sehingga CSS custom properties (var())
 * BERFUNGSI dengan benar — legend mengikuti dark/light mode otomatis.
 *
 * @param breaks  Array quantile breaks
 * @param metric  Metrik yang ditampilkan
 * @param isDark  Mode gelap (digunakan sebagai eksplisit fallback)
 */
export function createLegendHTML(
  breaks:  number[],
  metric:  MetricType,
  isDark = false,
): string {
  const unit = metric === "jumlah" ? " jiwa" : "/1k jiwa";

  const labels = CHOROPLETH_COLORS.map((color, i) => {
    const from = Math.round((breaks[i]     ?? 0) * 10) / 10;
    const to   = Math.round((breaks[i + 1] ?? 0) * 10) / 10;
    return `
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
        <span style="
          width:14px;height:14px;
          background:${color};
          border:1px solid rgba(0,0,0,0.18);
          border-radius:3px;
          flex-shrink:0;
          display:inline-block;
        "></span>
        <span style="font-size:11px;color:${isDark ? "rgba(220,232,240,0.85)" : "#2c3e52"}">
          ${from}  ${to}${unit}
        </span>
      </div>`;
  }).join("");

  return `
    <div style="
      background:${isDark ? "rgba(15,30,47,0.97)" : "rgba(255,255,255,0.97)"};
      border:1px solid ${isDark ? "rgba(30,51,73,1)" : "#d4dde8"};
      border-radius:10px;
      padding:12px 14px;
      box-shadow:${isDark ? "0 4px 20px rgba(0,0,0,0.55)" : "0 2px 12px rgba(0,0,0,0.10)"};
      font-family:'Inter','Segoe UI',system-ui,sans-serif;
      min-width:170px;
    ">
      <p style="
        font-size:10px;font-weight:700;
        color:${isDark ? "rgba(140,175,200,0.9)" : "#5e7289"};
        margin:0 0 9px;
        text-transform:uppercase;
        letter-spacing:0.08em;
      ">
        ${metric === "jumlah" ? "Jumlah PKH" : "Rasio PKH/1000"}
      </p>
      ${labels}
      <div style="
        margin-top:8px;
        padding-top:7px;
        border-top:1px solid ${isDark ? "rgba(30,51,73,0.8)" : "#e2e9f0"};
        display:flex;
        align-items:center;
        gap:5px;
      ">
        <span style="font-size:10px;color:${isDark ? "rgba(112,144,170,0.8)" : "#95aabf"}">
          Metode Kuantil · 5 kelas
        </span>
      </div>
    </div>`;
}
