"use client";

import { useEffect, useState } from "react";

interface UserItem {
  id: number;
  nip: string;
  nama: string;
  role: string;
  createdAt: string;
}

export default function PenggunaPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal mengambil data pengguna.");
      } else {
        setUsers(data);
      }
    } catch {
      setError("Terjadi kesalahan koneksi saat memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8eef4", padding: "24px", color: "#334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Manajemen Pengguna</h2>
            <p style={{ fontSize: 13, color: "#64748b" }}>Daftar pengguna terdaftar di sistem WebGIS PKH Dinas Sosial Purwakarta</p>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Memuat daftar pengguna...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9", color: "#475569", fontWeight: 600 }}>
                  <th style={{ padding: "12px 16px" }}>No</th>
                  <th style={{ padding: "12px 16px" }}>NIP / Username</th>
                  <th style={{ padding: "12px 16px" }}>Nama Lengkap</th>
                  <th style={{ padding: "12px 16px" }}>Peran (Role)</th>
                  <th style={{ padding: "12px 16px" }}>Tanggal Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                      Tidak ada data pengguna.
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "12px 16px" }}>{idx + 1}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b" }}>{u.nip}</td>
                      <td style={{ padding: "12px 16px" }}>{u.nama}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            background: u.role === "administrator" ? "#e0f2fe" : "#f1f5f9",
                            color: u.role === "administrator" ? "#0369a1" : "#475569",
                            textTransform: "capitalize",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {new Date(u.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
