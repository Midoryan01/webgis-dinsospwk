"use client";

/**
 * app/components/WargaTable.tsx
 * Panel tabel penerima PKH di bawah peta.
 *
 * Features:
 * - Collapsible via `isCollapsed` + `onToggle` props
 * - Internal search (nama, NIK, alamat)
 * - Column sort (klik header → asc/desc)
 * - Dark-mode via CSS vars
 */

import { useState, useMemo } from "react";
import type { Warga } from "@/app/types";

type SortField = keyof Pick<Warga, "nama" | "nik" | "alamat">;
type SortDir   = "asc" | "desc";

interface Props {
  selectedWilayah: string | null;
  selectedWarga:   Warga[];
  isCollapsed:     boolean;
  onToggle:        () => void;
}

// ─── Icons ─────────────────────────────────────────────────────────────────
const ChevUpIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>;
const ChevDownIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>;
const SearchIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const XIcon        = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const AscIcon      = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const DescIcon     = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const MapPinIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;

export default function WargaTable({ selectedWilayah, selectedWarga, isCollapsed, onToggle }: Props) {
  const [search,  setSearch]  = useState("");
  const [sortBy,  setSortBy]  = useState<SortField>("nama");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  };

  const displayRows = useMemo(() => {
    const q   = search.toLowerCase().trim();
    let rows  = selectedWarga;
    if (q) rows = rows.filter(w =>
      w.nama.toLowerCase().includes(q) ||
      w.nik.includes(q) ||
      w.alamat.toLowerCase().includes(q)
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => a[sortBy].localeCompare(b[sortBy], "id") * dir);
  }, [selectedWarga, search, sortBy, sortDir]);

  const hasData = selectedWarga.length > 0;

  // ── Sort header cell ────────────────────────────────────────────────────
  const ThSort = ({ field, label, style }: { field: SortField; label: string; style?: React.CSSProperties }) => (
    <th
      onClick={() => handleSort(field)}
      style={{ ...thS, cursor: "pointer", userSelect: "none", ...style }}
      title={`Urutkan berdasarkan ${label}`}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        {label}
        <span style={{
          opacity: sortBy === field ? 0.85 : 0.2,
          color: sortBy === field ? "var(--primary, #1A6EA8)" : "inherit",
        }}>
          {sortBy === field && sortDir === "desc" ? <DescIcon /> : <AscIcon />}
        </span>
      </span>
    </th>
  );

  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: "flex", flexDirection: "column",
      background: "var(--map-panel-bg, #fff)",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      transition: "background 0.25s ease",
      overflow: "hidden",
    }}>
      {/* ── Header bar (always visible, height = 44px) ─────────────────── */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 10,
        padding: "0 14px", height: 44,
        borderTop: "1px solid var(--map-panel-border, #e2e9f0)",
        background: "var(--map-panel-bg, #fff)",
        transition: "background 0.25s, border-color 0.25s",
      }}>
        {/* Title */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
          <span style={{ color: "var(--map-panel-text-muted, #95aabf)" }}>
            <MapPinIcon />
          </span>
          <span style={{
            fontSize: 12.5, fontWeight: 700,
            color: "var(--map-panel-text, #0d1f33)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            Data Penerima PKH
            {selectedWilayah && (
              <span style={{ fontWeight: 400, color: "var(--map-panel-text-muted, #000000ff)", marginLeft: 5, fontSize: 12 }}>
                — {selectedWilayah}
              </span>
            )}
          </span>
          {/* Count badge — only when expanded and has data */}
          {!isCollapsed && hasData && (
            <span style={{
              flexShrink: 0,
              fontSize: 10, fontWeight: 700,
              padding: "2px 7px",
              background: "var(--primary-light, #e8f3fb)",
              color: "var(--primary-text, #1A6EA8)",
              borderRadius: 999,
              border: "1px solid var(--primary-border, #aed6ef)",
            }}>
              {displayRows.length}
              {displayRows.length !== selectedWarga.length && `/${selectedWarga.length}`}
            </span>
          )}
        </div>

        {/* Search bar — only when expanded + has data */}
        {!isCollapsed && hasData && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 10px",
            background: "var(--map-panel-row-odd, #f7f9fc)",
            border: "1px solid var(--map-panel-border, #e2e9f0)",
            borderRadius: 999,
            flexShrink: 0,
          }}>
            <span style={{ color: "var(--map-panel-text-muted, #95aabf)" }}><SearchIcon /></span>
            <input
              type="search"
              placeholder="Cari nama, NIK, alamat…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: "none", background: "none", outline: "none",
                fontSize: 12, color: "var(--map-panel-text, #0d1f33)",
                width: 170, fontFamily: "inherit",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--map-panel-text-muted, #95aabf)" }}
                title="Hapus pencarian"
              >
                <XIcon />
              </button>
            )}
          </div>
        )}

        {/* Collapse / Expand toggle */}
        <button
          onClick={onToggle}
          title={isCollapsed ? "Buka panel data" : "Ciutkan panel data"}
          style={{
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 28, height: 28, borderRadius: 7,
            background: "var(--map-panel-row-odd, #f7f9fc)",
            border: "1px solid var(--map-panel-border, #e2e9f0)",
            cursor: "pointer",
            color: "var(--map-panel-text-muted, #95aabf)",
            transition: "background 0.15s",
          }}
        >
          {isCollapsed ? <ChevUpIcon /> : <ChevDownIcon />}
        </button>
      </div>

      {/* ── Content (hidden when collapsed) ────────────────────────────── */}
      {!isCollapsed && (
        !selectedWilayah ? (
          /* No region selected */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ textAlign: "center" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--map-panel-text-muted,#95aabf)" strokeWidth="1.5" style={{ marginBottom: 10 }}>
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
              </svg>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--map-panel-text-muted,#95aabf)", margin: 0 }}>
                Klik wilayah pada peta untuk melihat data penerima
              </p>
            </div>
          </div>
        ) : !hasData ? (
          /* Kecamatan clicked but no per-person data */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <p style={{ fontSize: 12.5, color: "var(--map-panel-text-muted,#95aabf)", textAlign: "center", maxWidth: 300, lineHeight: 1.6, margin: 0 }}>
              Data per-orang hanya tersedia di level desa.<br/>
              Klik batas desa pada peta untuk melihat detail penerima.
            </p>
          </div>
        ) : displayRows.length === 0 ? (
          /* Search no results */
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <p style={{ fontSize: 12.5, color: "var(--map-panel-text-muted,#95aabf)", textAlign: "center", margin: 0 }}>
              Tidak ada hasil untuk&nbsp;<strong>&ldquo;{search}&rdquo;</strong>
            </p>
          </div>
        ) : (
          /* Data table */
          <div style={{ flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5,color:"var(--map-panel-text,#0d1f33)" }}>
              <thead>
                <tr style={{ background: "var(--map-panel-row-odd,#f7f9fc)", position: "sticky", top: 0, zIndex: 1 }}>
                  <th style={{ ...thS, cursor: "default", width: 38, color:"var(--map-panel-text,#0d1f33)" }}>No</th>
                  <ThSort field="nik"    label="NIK" style={{ color: "var(--map-panel-text,#0d1f33)" }} />
                  <ThSort field="nama"   label="Nama Lengkap" style={{ color: "var(--map-panel-text,#0d1f33)" }} />
                  <ThSort field="alamat" label="Alamat" style={{ color: "var(--map-panel-text,#0d1f33)" }} />
                </tr>
              </thead>
              <tbody>
                {displayRows.map((w, i) => (
                  <tr key={w.nik} style={{
                    background: i % 2 === 0
                      ? "var(--map-panel-row-even,#fff)"
                      : "var(--map-panel-row-odd,#f7f9fc)",
                  }}>
                    <td style={{ ...tdS, color: "var(--map-panel-text,#0d1f33)", width: 38, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                    <td style={{ ...tdS, fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11.5, color: "var(--map-panel-text,#0d1f33)" }}>{w.nik}</td>
                    <td style={{ ...tdS, fontWeight: 600, color: "var(--map-panel-text,#0d1f33)" }}>{w.nama}</td>
                    <td style={{ ...tdS, color: "var(--map-panel-text,#0d1f33)" }}>{w.alamat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─── Style constants ──────────────────────────────────────────────────────────
const thS: React.CSSProperties = {
  padding: "9px 14px",
  textAlign: "left",
  fontSize: 10.5, fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--map-panel-text-muted,#7090aa)",
  borderBottom: "1px solid var(--map-panel-border,#e2e9f0)",
  whiteSpace: "nowrap",
};

const tdS: React.CSSProperties = {
  padding: "10px 14px",
  borderBottom: "1px solid var(--map-panel-border,#e2e9f0)",
  verticalAlign: "middle",
};
