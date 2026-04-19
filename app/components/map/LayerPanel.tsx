"use client";

/**
 * app/components/map/LayerPanel.tsx
 *
 * Panel Layer Peta dengan dua seksi independen:
 * 1. BATAS KECAMATAN — search + checkbox per kecamatan
 * 2. BATAS DESA      — search + checkbox per desa (sorted, with kec hint)
 *
 * Masing-masing seksi:
 * - Collapsible (expand/collapse)
 * - Search real-time
 * - Master "Semua" checkbox dengan indeterminate state
 * - Counter aktif/total
 */

import { useMemo, useRef, useEffect, useState } from "react";
import { P } from "@/app/components/IndicatorControl";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LayerPanelProps {
  isDark:          boolean;
  /** Mapping kecamatan → daftar nama desa (dari GeoJSON) */
  kecToDesa:       Record<string, string[]>;
  kecVisible:      Set<string>;
  desaVisible:     Set<string>;
  onChangeKec:     (name: string, checked: boolean) => void;
  onChangeDesa:    (name: string, checked: boolean) => void;
  onChangeAllKec:  (checked: boolean) => void;
  onChangeAllDesa: (checked: boolean) => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const LayerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);

const SearchIcon = ({ color }: { color: string }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const ChevronIcon = ({ open, color }: { open: boolean; color: string }) => (
  <svg
    width="11" height="11" viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.5"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ─── IndeterminateCheckbox ────────────────────────────────────────────────────

function IndeterminateCheckbox({
  checked, indeterminate, onChange, accentColor,
}: {
  checked: boolean; indeterminate: boolean;
  onChange: (v: boolean) => void; accentColor: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input ref={ref} type="checkbox" checked={checked}
      onChange={e => onChange(e.target.checked)}
      style={{ accentColor, width: 13, height: 13, cursor: "pointer", flexShrink: 0 }}
    />
  );
}

// ─── SearchBox ────────────────────────────────────────────────────────────────

function SearchBox({
  value, onChange, placeholder, isDark,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; isDark: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      background: P.btnBg(isDark), border: P.btnBorder(isDark),
      borderRadius: 7, padding: "5px 8px", margin: "6px 10px 0",
    }}>
      <SearchIcon color={P.textDim(isDark)} />
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, border: "none", background: "transparent", outline: "none",
          fontSize: 11.5, color: P.text(isDark),
          fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{
          border: "none", background: "none", cursor: "pointer",
          color: P.textDim(isDark), padding: 0, fontSize: 14, lineHeight: 1,
        }}>×</button>
      )}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({
  label, count, total, open, onToggle, isDark,
}: {
  label: string; count: number; total: number;
  open: boolean; onToggle: () => void; isDark: boolean;
}) {
  return (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", width: "100%",
      padding: "8px 12px", gap: 6,
      background: "none", border: "none", cursor: "pointer",
      borderTop: `1px solid ${P.divider(isDark)}`,
    }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: P.textDim(isDark), flex: 1, textAlign: "left" }}>
        {label}
      </span>
      <span style={{ fontSize: 10.5, color: P.textDim(isDark), fontWeight: 500 }}>
        {count}/{total}
      </span>
      <ChevronIcon open={open} color={P.textDim(isDark)} />
    </button>
  );
}

// ─── CheckList ────────────────────────────────────────────────────────────────

/**
 * Item list untuk CheckList.
 * - `id`   : key unik untuk React (bisa komposit "kec:desa" untuk desa duplikat)
 * - `name` : nilai yang dipakai untuk lookup di visibleSet & onToggle callback
 * - `hint` : label tambahan di kanan (misal nama kecamatan untuk desa)
 */
interface CheckItem {
  id:    string;
  name:  string;
  hint?: string;
}

function CheckList({
  items, visibleSet, onToggle, onToggleAll,
  filterText, isDark, emptyLabel,
}: {
  items:       CheckItem[];
  visibleSet:  Set<string>;
  onToggle:    (name: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  filterText:  string;
  isDark:      boolean;
  emptyLabel:  string;
}) {
  const accent = P.accent(isDark);
  const q      = filterText.trim().toLowerCase();

  const filtered = useMemo(() =>
    q
      ? items.filter(i =>
          i.name.toLowerCase().includes(q) ||
          (i.hint ?? "").toLowerCase().includes(q),
        )
      : items,
    [items, q],
  );

  // Hitung berdasarkan composite id agar akurat (bukan name yang bisa duplikat)
  const checkedCount = items.filter(i => visibleSet.has(i.id)).length;
  const total        = items.length;
  const allChecked   = total > 0 && checkedCount === total;
  const someChecked  = checkedCount > 0 && checkedCount < total;

  return (
    <div style={{ padding: "4px 10px 10px" }}>
      {/* Master toggle */}
      <label style={{
        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
        padding: "5px 8px", borderRadius: 7,
        borderBottom: `1px solid ${P.divider(isDark)}`,
        marginBottom: 4,
      }}>
        <IndeterminateCheckbox
          checked={allChecked} indeterminate={someChecked}
          onChange={onToggleAll} accentColor={accent}
        />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: P.text(isDark) }}>
          Semua
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: P.textDim(isDark) }}>
          {checkedCount}/{total}
        </span>
      </label>

      {/* Scrollable list */}
      <div style={{ maxHeight: 210, overflowY: "auto", paddingRight: 2 }}>
        {filtered.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 11, color: P.textDim(isDark), margin: "12px 0" }}>
            {emptyLabel}
          </p>
        )}
        {filtered.map(({ id, name, hint }) => {
          // Lookup pakai id (composite "kec:desa") — bukan name, agar desa
          // dengan nama sama di kecamatan berbeda tidak saling overwrite.
          const checked = visibleSet.has(id);
          return (
            <label key={id} style={{
              display: "flex", alignItems: "center", gap: 8,
              cursor: "pointer", padding: "5px 8px", borderRadius: 6,
              background: checked ? P.activeRow(isDark) : "transparent",
              border: `1px solid ${checked ? P.activeBrd(isDark) : "transparent"}`,
              marginBottom: 2, transition: "background 0.1s",
            }}>
              <input
                type="checkbox" checked={checked}
                onChange={e => onToggle(id, e.target.checked)}
                style={{ accentColor: accent, width: 12, height: 12, cursor: "pointer", flexShrink: 0 }}
              />
              <span style={{
                flex: 1, fontSize: 12,
                color: checked ? P.activeText(isDark) : P.textDim(isDark),
                fontWeight: checked ? 500 : 400,
              }}>
                {highlightMatch(name, q, checked ? P.activeText(isDark) : P.textDim(isDark))}
              </span>
              {hint && (
                <span style={{ fontSize: 10, color: P.textDim(isDark), opacity: 0.75, whiteSpace: "nowrap" }}>
                  {hint}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Highlight query dalam teks tanpa JSX agar bisa dipakai di span */
function highlightMatch(text: string, q: string, color: string): React.ReactNode {
  if (!q) return <span style={{ color }}>{text}</span>;
  const idx = text.toLowerCase().indexOf(q);
  if (idx < 0) return <span style={{ color }}>{text}</span>;
  return (
    <span style={{ color }}>
      {text.slice(0, idx)}
      <mark style={{ background: "#facc15", color: "#1e1e1e", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

// ─── Main LayerPanel ──────────────────────────────────────────────────────────

export default function LayerPanel({
  isDark, kecToDesa, kecVisible, desaVisible,
  onChangeKec, onChangeDesa, onChangeAllKec, onChangeAllDesa,
}: LayerPanelProps) {
  const [panelOpen,  setPanelOpen]  = useState(true);
  const [kecOpen,    setKecOpen]    = useState(true);
  const [desaOpen,   setDesaOpen]   = useState(true);
  const [kecSearch,  setKecSearch]  = useState("");
  const [desaSearch, setDesaSearch] = useState("");

  // Derive sorted lists — id harus unik (gunakan komposit untuk desa)
  const kecItems = useMemo(
    () => Object.keys(kecToDesa).sort().map(name => ({ id: name, name })),
    [kecToDesa],
  );

  const desaItems = useMemo(() => {
    const items: { id: string; name: string; hint: string }[] = [];
    Object.entries(kecToDesa).forEach(([kec, desas]) => {
      // id = "kec:desa" — dijamin unik meski nama desa sama di kecamatan berbeda
      desas.forEach(d => items.push({ id: `${kec}:${d}`, name: d, hint: kec }));
    });
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [kecToDesa]);

  // Pill (collapsed state) ──────────────────────────────────────────────────
  if (!panelOpen) {
    return (
      <button onClick={() => setPanelOpen(true)} title="Buka panel layer" style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
        background: P.bg(isDark), border: P.border(isDark),
        borderRadius: 999, boxShadow: P.shadow(isDark), backdropFilter: "blur(12px)",
        cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: P.text(isDark),
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", whiteSpace: "nowrap",
      }}>
        <LayerIcon />
        Layer Peta
      </button>
    );
  }

  // Full panel ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: P.bg(isDark), border: P.border(isDark),
      borderRadius: 12, boxShadow: P.shadow(isDark), backdropFilter: "blur(12px)",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      minWidth: 230, maxWidth: 260,
      maxHeight: "calc(100vh - 110px)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>

      {/* ── Top header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "9px 12px 8px", flexShrink: 0,
      }}>
        <LayerIcon />
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: P.textDim(isDark) }}>
          Layer Peta
        </span>
        <button onClick={() => setPanelOpen(false)} title="Ciutkan" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 24, height: 24, borderRadius: 6,
          background: P.btnBg(isDark), border: P.btnBorder(isDark),
          cursor: "pointer", color: P.textDim(isDark),
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ overflowY: "auto", flex: 1 }}>

        {/* ═══ SEKSI KECAMATAN ═══ */}
        <SectionHeader
          label="Batas Kecamatan"
          count={kecItems.filter(i => kecVisible.has(i.name)).length}
          total={kecItems.length}
          open={kecOpen}
          onToggle={() => setKecOpen(v => !v)}
          isDark={isDark}
        />
        {kecOpen && (
          <>
            <SearchBox
              value={kecSearch} onChange={setKecSearch}
              placeholder="Cari kecamatan…" isDark={isDark}
            />
            <CheckList
              items={kecItems} visibleSet={kecVisible}
              onToggle={onChangeKec} onToggleAll={onChangeAllKec}
              filterText={kecSearch} isDark={isDark}
              emptyLabel="Kecamatan tidak ditemukan"
            />
          </>
        )}

        {/* ═══ SEKSI DESA ═══ */}
        <SectionHeader
          label="Batas Desa / Kelurahan"
          count={desaItems.filter(i => desaVisible.has(i.id)).length}
          total={desaItems.length}
          open={desaOpen}
          onToggle={() => setDesaOpen(v => !v)}
          isDark={isDark}
        />
        {desaOpen && (
          <>
            <SearchBox
              value={desaSearch} onChange={setDesaSearch}
              placeholder="Cari desa / kelurahan…" isDark={isDark}
            />
            <CheckList
              items={desaItems} visibleSet={desaVisible}
              onToggle={onChangeDesa} onToggleAll={onChangeAllDesa}
              filterText={desaSearch} isDark={isDark}
              emptyLabel="Desa tidak ditemukan"
            />
          </>
        )}
      </div>
    </div>
  );
}
