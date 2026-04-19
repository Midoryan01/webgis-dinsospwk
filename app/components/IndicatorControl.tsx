"use client";

/**
 * IndicatorControl — Panel kontrol indikator di pojok kiri atas.
 * - Pilihan indikator + tombol dark/light mode
 * - Collapsible: klik minimize → tampil sebagai pill button
 */

import { useState } from "react";
import type { MetricType } from "@/app/types";

interface Props {
  metric:         MetricType;
  setMetric:      (m: MetricType) => void;
  isDark:         boolean;
  onToggleTheme:  () => void;
}

// ─── Shared panel style helpers (dipakai juga di LayerPanel di MapWrapper) ──
export const P = {
  bg:      (d: boolean) => d ? "rgba(10,21,32,0.97)"        : "rgba(255,255,255,0.97)",
  border:  (d: boolean) => d ? "1px solid rgba(30,51,73,1)" : "1px solid rgba(210,221,232,1)",
  shadow:  (d: boolean) => d ? "0 8px 32px rgba(0,0,0,0.55)" : "0 4px 20px rgba(0,0,0,0.12)",
  textDim: (d: boolean) => d ? "rgba(112,144,170,1)" : "rgba(82,82,91,1)",
  text:    (d: boolean) => d ? "rgba(221,232,240,1)" : "rgba(18,35,52,1)",
  btnBg:   (d: boolean) => d ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)",
  btnBorder:(d: boolean)=> d ? "1px solid rgba(63,63,70,1)" : "1px solid rgba(210,221,232,1)",
  divider: (d: boolean) => d ? "rgba(30,51,73,0.8)" : "rgba(210,221,232,0.8)",
  activeRow:(d: boolean)=> d ? "rgba(63,168,216,0.10)" : "rgba(26,110,168,0.06)",
  activeBrd:(d: boolean)=> d ? "rgba(63,168,216,0.22)" : "rgba(26,110,168,0.15)",
  accent:  (d: boolean) => d ? "#62badf" : "#1A6EA8",
  activeText:(d:boolean)=> d ? "#dde8f0" : "#0d1f33",
};

// ─── Icons ─────────────────────────────────────────────────────────────────
const SunIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const MinusIcon= () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const LayerIcon= () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;

// ─── ControlBtn — reusable ─────────────────────────────────────────────────
function ControlBtn({ isDark, onClick, title, children }: { isDark: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 26, height: 26, borderRadius: 6,
      background: P.btnBg(isDark), border: P.btnBorder(isDark),
      cursor: "pointer", color: P.textDim(isDark), transition: "background 0.15s",
    }}>
      {children}
    </button>
  );
}

export default function IndicatorControl({ metric, setMetric, isDark, onToggleTheme }: Props) {
  const [isOpen, setIsOpen] = useState(true);

  // ── Pill (closed state) ──────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} title="Buka panel indikator" style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "7px 12px",
        background: P.bg(isDark), border: P.border(isDark),
        borderRadius: 999, boxShadow: P.shadow(isDark), backdropFilter: "blur(12px)",
        cursor: "pointer",
        fontSize: 11.5, fontWeight: 600, color: P.text(isDark),
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
        whiteSpace: "nowrap",
      }}>
        <LayerIcon />
        Indikator
      </button>
    );
  }

  // ── Full panel ────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: P.bg(isDark), border: P.border(isDark),
      borderRadius: 12, boxShadow: P.shadow(isDark), backdropFilter: "blur(12px)",
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      
    }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${P.divider(isDark)}`,
      }}>
        <ControlBtn isDark={isDark} onClick={onToggleTheme} title={isDark ? "Mode Terang" : "Mode Gelap"}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </ControlBtn>
      </div>
    </div>
  );
}
