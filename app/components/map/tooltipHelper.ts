/**
 * app/components/map/tooltipHelper.ts
 *
 * Helper untuk membuat HTML tooltip Leaflet yang aware CSS custom properties
 * (dark/light mode mengikuti otomatis via CSS vars).
 */

export interface TooltipLine {
  bold?:   string;
  normal?: string;
}

/**
 * Buat HTML string untuk tooltip Leaflet.
 * Menggunakan CSS custom properties (`var(--map-panel-*)`) sehingga tooltip
 * otomatis mengikuti theme dark/light tanpa perlu re-bind tooltip.
 */
export function tooltipHtml(lines: TooltipLine[]): string {
  const rows = lines
    .map(l => {
      if (l.bold)   return `<b style="display:block;margin-bottom:2px;color:var(--map-panel-text,#0d1f33)">${l.bold}</b>`;
      if (l.normal) return `<span style="color:var(--map-panel-text-muted,#5e7289);font-size:11.5px">${l.normal}</span>`;
      return "";
    })
    .join("");

  return `<div style="
    background:var(--map-panel-bg,#fff);
    border:1px solid var(--map-panel-border,#e2e9f0);
    border-radius:9px; padding:9px 13px;
    font-family:'Inter','Segoe UI',sans-serif; font-size:12px;
    box-shadow:0 4px 20px rgba(0,0,0,0.14); min-width:160px;
  ">${rows}</div>`;
}
