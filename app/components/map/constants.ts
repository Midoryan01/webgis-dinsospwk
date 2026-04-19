/**
 * app/components/map/constants.ts
 *
 * Semua konstanta statis untuk MapWrapper:
 * - Tile URL & atribusi
 * - CSS global (spinner, drag handle, tooltip)
 * - Stroke warna GeoJSON
 */

// ─── Tile sources ──────────────────────────────────────────────────────────────
export const TILE_LIGHT = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const ATTR_OSM   = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors";
export const ATTR_CARTO = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/\">CARTO</a>";

// ─── Default map center & zoom ─────────────────────────────────────────────────
export const MAP_CENTER: [number, number] = [-6.54, 107.45];
export const MAP_ZOOM = 11;

// ─── GeoJSON endpoints ─────────────────────────────────────────────────────────
export const GEOJSON_KEC  = "/kecamatan.geojson";
export const GEOJSON_DESA = "/desa.geojson";

// ─── Global CSS injected once into <style> ────────────────────────────────────
export const GLOBAL_CSS = `
  @keyframes mwSpin { to { transform: rotate(360deg); } }
  .mw-spinner {
    width: 34px; height: 34px;
    border: 3px solid rgba(255,255,255,0.15);
    border-top-color: rgba(255,255,255,0.8);
    border-radius: 50%; animation: mwSpin 0.8s linear infinite;
  }
  .mw-drag-handle {
    flex-shrink: 0; height: 12px; cursor: row-resize;
    display: flex; align-items: center; justify-content: center; gap: 3px;
    user-select: none; touch-action: none; transition: background 0.15s;
  }
  .mw-drag-handle:hover { background: rgba(0,0,0,0.04); }
  html[data-theme="dark"] .mw-drag-handle:hover { background: rgba(255,255,255,0.04); }
  .mw-drag-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--map-panel-text-muted,#a1a1aa); }
  /* Override Leaflet tooltip shell so our custom HTML shows correctly */
  .leaflet-tooltip.mw-tip {
    background: none !important; border: none !important;
    box-shadow: none !important; padding: 0 !important;
  }
`;
