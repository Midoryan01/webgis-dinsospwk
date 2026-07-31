"use client";

import { useEffect, useState } from "react";

interface ReportStats {
  totalPenerima: number;
  totalDesa: number;
  totalKecamatan: number;
  lastUpdated: string;
}

export default function LaporanPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8eef4", padding: "24px", color: "#334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Laporan Agregasi PKH</h2>
            <p style={{ fontSize: 13, color: "#64748b" }}>Ringkasan laporan graduasi dan jumlah penerima bantuan sosial PKH Kabupaten Purwakarta</p>
          </div>
          <button
            onClick={() => window.print()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "#0284c7",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Cetak Laporan
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Memuat data laporan...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: 12, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Total Penerima PKH</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#0284c7" }}>{stats?.totalPenerima ?? 0} Orang</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: 12, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Jumlah Desa/Kelurahan</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#16a34a" }}>{stats?.totalDesa ?? 0} Desa</div>
            </div>
            <div style={{ background: "#f8fafc", padding: "20px", borderRadius: 12, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>Jumlah Kecamatan</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#9333ea" }}>{stats?.totalKecamatan ?? 0} Kecamatan</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
