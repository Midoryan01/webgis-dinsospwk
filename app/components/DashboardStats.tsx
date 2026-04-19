"use client";

import { useEffect, useState } from "react";

type Stats = {
  totalPenerima: number; // FIX: was totalWarga, tidak cocok dengan API response
  totalDesa: number;
  totalKecamatan: number;
};

export default function DashboardStats() {
  const [stats, setStats] = useState<Stats>({ totalPenerima: 0, totalDesa: 0, totalKecamatan: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats({
          totalPenerima: data.totalPenerima || 0, // FIX: totalWarga → totalPenerima
          totalDesa: data.totalDesa || 0,
          totalKecamatan: data.totalKecamatan || 0,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="stats-skeleton">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-card" />
        ))}
        <style>{`
          .stats-skeleton { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 24px; }
          .skeleton-card { height: 90px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 12px; }
          @keyframes shimmer { to { background-position: -200% 0; } }
        `}</style>
      </div>
    );
  }

  const cards = [
    { label: "Total Penerima PKH", value: stats.totalPenerima.toLocaleString("id-ID"), color: "#1D6FA4" },
    { label: "Desa Terjangkau", value: stats.totalDesa.toString(), color: "#16a34a" },
    { label: "Kecamatan Terjangkau", value: stats.totalKecamatan.toString(), color: "#7c3aed" },
  ];

  return (
    <div className="stats-row">
      {cards.map((c) => (
        <div key={c.label} className="stat-item" style={{ "--c": c.color } as React.CSSProperties}>
          <div className="stat-bar" />
          <p className="stat-lbl">{c.label}</p>
          <p className="stat-val">{c.value}</p>
        </div>
      ))}
      <style>{`
        .stats-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 24px; }
        .stat-item { background: #fff; border: 1px solid #e8eef4; border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; }
        .stat-bar { position: absolute; top:0; left:0; right:0; height:3px; background: var(--c); }
        .stat-lbl { font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 6px; }
        .stat-val { font-size: 28px; font-weight: 800; color: #0f2137; }
      `}</style>
    </div>
  );
}
