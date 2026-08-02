"use client";

import { useEffect, useState, useMemo } from "react";
import Pagination from "@/app/components/Pagination";

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

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ nip: "", nama: "", password: "", role: "operator" });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addLoading, setAddLoading] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({ nip: "", nama: "", password: "", role: "operator" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!addForm.nip.trim()) errs.nip = "NIP / Username wajib diisi.";
    if (!addForm.nama.trim()) errs.nama = "Nama lengkap wajib diisi.";
    if (!addForm.password || addForm.password.length < 6) errs.password = "Password minimal 6 karakter.";
    if (Object.keys(errs).length > 0) {
      setAddErrors(errs);
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Pengguna ${addForm.nama} berhasil ditambahkan.`);
        setShowAddModal(false);
        setAddForm({ nip: "", nama: "", password: "", role: "operator" });
        setAddErrors({});
        fetchUsers();
      } else {
        showToast("error", data.error || "Gagal menambahkan pengguna.");
      }
    } catch {
      showToast("error", "Gagal menghubungi server.");
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setEditForm({
      nip: u.nip,
      nama: u.nama,
      password: "",
      role: u.role,
    });
    setEditErrors({});
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const errs: Record<string, string> = {};
    if (!editForm.nip.trim()) errs.nip = "NIP / Username wajib diisi.";
    if (!editForm.nama.trim()) errs.nama = "Nama lengkap wajib diisi.";
    if (editForm.password && editForm.password.length < 6) errs.password = "Password minimal 6 karakter jika diisi.";
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Pengguna ${editForm.nama} berhasil diperbarui.`);
        setEditingUser(null);
        fetchUsers();
      } else {
        showToast("error", data.error || "Gagal memperbarui pengguna.");
      }
    } catch {
      showToast("error", "Gagal menghubungi server.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `Pengguna ${deletingUser.nama} berhasil dihapus.`);
        setDeletingUser(null);
        fetchUsers();
      } else {
        showToast("error", data.error || "Gagal menghapus pengguna.");
      }
    } catch {
      showToast("error", "Gagal menghubungi server.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const paginatedUsers = useMemo(() => {
    if (pageSize === -1) return users;
    const start = (currentPage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(users.length / pageSize);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "var(--success, #15803d)" : toast.type === "error" ? "var(--error, #b91c1c)" : "var(--primary, #1d4ed8)",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 10,
          fontSize: 14, fontWeight: 500
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      <div style={{ background: "var(--surface, #ffffff)", borderRadius: 14, border: "1px solid var(--border, #e8eef4)", padding: "24px", color: "var(--text, #334155)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text, #0f172a)", marginBottom: 4 }}>Manajemen Pengguna</h2>
            <p style={{ fontSize: 13, color: "var(--text-muted, #64748b)" }}>Daftar pengguna terdaftar di sistem WebGIS PKH Dinas Sosial Purwakarta</p>
          </div>
          <button
            onClick={() => { setAddForm({ nip: "", nama: "", password: "", role: "operator" }); setAddErrors({}); setShowAddModal(true); }}
            style={{
              background: "var(--primary, #1A6EA8)", border: "none", color: "#fff",
              borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13
            }}
          >
            + Tambah Pengguna
          </button>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", color: "#991b1b", padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted, #94a3b8)" }}>Memuat daftar pengguna...</div>
        ) : (
          <div>
            <div style={{ overflowX: "auto", border: "1px solid var(--border, #e2e8f0)", borderRadius: "8px 8px 0 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border, #f1f5f9)", background: "var(--surface-2, #f8fafc)", color: "var(--text, #475569)", fontWeight: 600 }}>
                    <th style={{ padding: "12px 16px" }}>No</th>
                    <th style={{ padding: "12px 16px" }}>NIP / Username</th>
                    <th style={{ padding: "12px 16px" }}>Nama Lengkap</th>
                    <th style={{ padding: "12px 16px" }}>Peran (Role)</th>
                    <th style={{ padding: "12px 16px" }}>Tanggal Dibuat</th>
                    <th style={{ padding: "12px 16px", textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted, #94a3b8)" }}>
                        Tidak ada data pengguna.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, idx) => {
                      const globalIdx = pageSize === -1 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;
                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border, #f8fafc)" }}>
                          <td style={{ padding: "12px 16px" }}>{globalIdx}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text, #1e293b)" }}>{u.nip}</td>
                          <td style={{ padding: "12px 16px" }}>{u.nama}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                background: u.role === "administrator" ? "rgba(3, 105, 161, 0.12)" : "var(--surface-2, #f1f5f9)",
                                color: u.role === "administrator" ? "#0369a1" : "var(--text-muted, #475569)",
                                textTransform: "capitalize",
                              }}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted, #64748b)" }}>
                            {new Date(u.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                              <button
                                onClick={() => openEditModal(u)}
                                style={{
                                  background: "rgba(59, 130, 246, 0.12)", color: "#2563eb", border: "none",
                                  borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeletingUser(u)}
                                style={{
                                  background: "rgba(239, 68, 68, 0.12)", color: "#dc2626", border: "none",
                                  borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600
                                }}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={users.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="pengguna"
            />
          </div>
        )}
      </div>

      {/* ── Modal Tambah Pengguna ───────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, width: "100%", maxWidth: 460, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text, #0f172a)" }}>Tambah Pengguna Baru</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>NIP / Username *</label>
                <input
                  type="text"
                  value={addForm.nip}
                  onChange={e => setAddForm({ ...addForm, nip: e.target.value })}
                  placeholder="Contoh: 199001012020121001"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                />
                {addErrors.nip && <span style={{ color: "var(--error, #ef4444)", fontSize: 11, marginTop: 4, display: "block" }}>{addErrors.nip}</span>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Nama Lengkap *</label>
                <input
                  type="text"
                  value={addForm.nama}
                  onChange={e => setAddForm({ ...addForm, nama: e.target.value })}
                  placeholder="Nama petugas / operator"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                />
                {addErrors.nama && <span style={{ color: "var(--error, #ef4444)", fontSize: 11, marginTop: 4, display: "block" }}>{addErrors.nama}</span>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Peran (Role) *</label>
                <select
                  value={addForm.role}
                  onChange={e => setAddForm({ ...addForm, role: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                >
                  <option value="operator">Operator</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Password *</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                />
                {addErrors.password && <span style={{ color: "var(--error, #ef4444)", fontSize: 11, marginTop: 4, display: "block" }}>{addErrors.password}</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Batal</button>
                <button type="submit" disabled={addLoading} style={{ background: "var(--primary, #1A6EA8)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{addLoading ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Edit Pengguna ───────────────────────────────────────── */}
      {editingUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, width: "100%", maxWidth: 460, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text, #0f172a)" }}>Edit Pengguna</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>NIP / Username *</label>
                <input
                  type="text"
                  value={editForm.nip}
                  onChange={e => setEditForm({ ...editForm, nip: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                />
                {editErrors.nip && <span style={{ color: "var(--error, #ef4444)", fontSize: 11, marginTop: 4, display: "block" }}>{editErrors.nip}</span>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Nama Lengkap *</label>
                <input
                  type="text"
                  value={editForm.nama}
                  onChange={e => setEditForm({ ...editForm, nama: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                />
                {editErrors.nama && <span style={{ color: "var(--error, #ef4444)", fontSize: 11, marginTop: 4, display: "block" }}>{editErrors.nama}</span>}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Peran (Role) *</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                >
                  <option value="operator">Operator</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>Password Baru (Opsional)</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #cbd5e1)", fontSize: 13 }}
                />
                {editErrors.password && <span style={{ color: "var(--error, #ef4444)", fontSize: 11, marginTop: 4, display: "block" }}>{editErrors.password}</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ background: "transparent", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Batal</button>
                <button type="submit" disabled={editLoading} style={{ background: "var(--primary, #1A6EA8)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>{editLoading ? "Menyimpan..." : "Simpan Perubahan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Hapus Pengguna ───────────────────────────────────────── */}
      {deletingUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
          <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, width: "100%", maxWidth: 440, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--error, #ef4444)" }}>Konfirmasi Hapus Pengguna</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus pengguna <strong>{deletingUser.nama}</strong> (NIP: {deletingUser.nip})?
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={deleteLoading}
                style={{ background: "transparent", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{ background: "var(--error, #ef4444)", border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
              >
                {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
