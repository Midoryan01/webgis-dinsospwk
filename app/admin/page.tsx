"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import "./dashboard.css";
import type { KecamatanRow, DashboardStats, RecentActivity, FormState, FormErrors, Toast } from "@/app/types";

// ─── Data dummy (typed) ───────────────────────────────────────────────────────
const DUMMY_STATS: DashboardStats = {
  totalPenerima:  24318,
  totalDesa:      183,
  totalKecamatan: 17,
  bulanIni:       312,
};

const DUMMY_KECAMATAN: KecamatanRow[] = [
  { nama: "Purwakarta",    jumlah: 8500, penduduk: 130000, persen: 78 },
  { nama: "Campaka",       jumlah: 4200, penduduk: 55000,  persen: 61 },
  { nama: "Bungursari",    jumlah: 3100, penduduk: 48000,  persen: 54 },
  { nama: "Babakancikao",  jumlah: 2800, penduduk: 42000,  persen: 48 },
  { nama: "Pasawahan",     jumlah: 2100, penduduk: 37000,  persen: 41 },
  { nama: "Plered",        jumlah: 1950, penduduk: 30000,  persen: 37 },
];

const DUMMY_RECENT: RecentActivity[] = [
  { nama: "Siti Aminah",    nik: "321401...002", desa: "Nagri Kidul",   tgl: "05 Apr 2026" },
  { nama: "Budi Santoso",   nik: "321401...001", desa: "Nagri Kidul",   tgl: "04 Apr 2026" },
  { nama: "Jajang Nurjaman",nik: "321402...001", desa: "Campaka",       tgl: "03 Apr 2026" },
  { nama: "Dewi Rahayu",    nik: "321403...009", desa: "Sindangkasih",  tgl: "02 Apr 2026" },
];

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode
}) {
  return (
    <div className="stat-card" style={{ "--accent": color } as React.CSSProperties}>
      <div className="stat-icon-wrap">{icon}</div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
      <div className="stat-bar" />
    </div>
  );
}

// ─── ToastContainer ───────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          {t.type === "success" && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          {t.type === "error"   && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          {t.type === "info"    && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "currentColor", opacity: 0.6, padding: "2px", display: "flex" }}
            aria-label="Tutup notifikasi"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Sort icons ───────────────────────────────────────────────────────────────
const AscIcon  = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const DescIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<KecamatanRow | null>(null);
  const [search,          setSearch]          = useState("");
  const [toasts,          setToasts]          = useState<Toast[]>([]);
  const [toastCounter,    setToastCounter]    = useState(0);

  // ── Sort state ──────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<keyof KecamatanRow | null>(null);
  const [sortAsc,   setSortAsc]   = useState(true);

  const handleSortBy = (field: keyof KecamatanRow) => {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(true); }
  };

  // ── Form state ──────────────────────────────────────────────────────────
  const [form,           setForm]           = useState<FormState>({ nik: "", nama: "", kecamatan: "", desa: "", alamat: "" });
  const [formErrors,     setFormErrors]     = useState<FormErrors>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // ── Import state ────────────────────────────────────────────────────────
  const [importFile,       setImportFile]       = useState<File | null>(null);
  const [importDragging,   setImportDragging]   = useState(false);
  const [importProcessing, setImportProcessing] = useState(false);

  // ── Filtered + sorted data ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = DUMMY_KECAMATAN.filter(k =>
      k.nama.toLowerCase().includes(search.toLowerCase())
    );
    if (sortField) {
      const dir = sortAsc ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const va = a[sortField]; const vb = b[sortField];
        if (typeof va === "string" && typeof vb === "string")
          return va.localeCompare(vb, "id") * dir;
        return ((va as number) - (vb as number)) * dir;
      });
    }
    return rows;
  }, [search, sortField, sortAsc]);

  // ── Toast helpers ────────────────────────────────────────────────────────
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = toastCounter + 1;
    setToastCounter(id);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, [toastCounter]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── Escape key handler ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDetailModal) { setShowDetailModal(null); return; }
        if (showAddModal)    { setShowAddModal(false); resetForm(); return; }
        if (showImportModal) { setShowImportModal(false); setImportFile(null); }
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [showImportModal, showAddModal, showDetailModal]);

  // ── Form helpers ─────────────────────────────────────────────────────────
  function validateForm(): FormErrors {
    const errors: FormErrors = {};
    const trimmed = form.nik.trim();
    if (!trimmed) errors.nik = "NIK wajib diisi.";
    else if (!/^\d{16}$/.test(trimmed)) errors.nik = "NIK harus 16 digit angka.";
    if (!form.nama.trim())      errors.nama      = "Nama lengkap wajib diisi.";
    if (!form.kecamatan)        errors.kecamatan = "Kecamatan wajib dipilih.";
    if (!form.desa.trim())      errors.desa      = "Desa/kelurahan wajib diisi.";
    if (!form.alamat.trim())    errors.alamat    = "Alamat lengkap wajib diisi.";
    return errors;
  }

  function resetForm() {
    setForm({ nik: "", nama: "", kecamatan: "", desa: "", alamat: "" });
    setFormErrors({});
    setFormSubmitting(false);
  }

  const updateForm = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setFormSubmitting(false);
    setShowAddModal(false);
    resetForm();
    addToast("success", `Data "${form.nama}" berhasil ditambahkan.`);
  };

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const header = "No,Kecamatan,Jumlah Penerima,Total Penduduk,Cakupan (%)";
    const rows   = DUMMY_KECAMATAN.map((r, i) => `${i+1},"${r.nama}",${r.jumlah},${r.penduduk},${r.persen}`);
    const csv    = [header, ...rows].join("\n");
    const blob   = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href = url; a.download = `pkh-kecamatan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    addToast("success", "File CSV berhasil diunduh.");
  };

  // ── File import handlers ─────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) { addToast("error", "Ukuran file melebihi 10MB."); return; }
    setImportFile(file);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setImportDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) { addToast("error", "Format tidak didukung. Gunakan .xlsx atau .xls"); return; }
    if (file.size > 10 * 1024 * 1024) { addToast("error", "Ukuran file melebihi 10MB."); return; }
    setImportFile(file);
  };
  const handleProcessImport = async () => {
    if (!importFile) return;
    setImportProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    setImportProcessing(false);
    setShowImportModal(false);
    setImportFile(null);
    addToast("success", `File "${importFile.name}" berhasil diproses.`);
  };

  // ── Sort indicator ───────────────────────────────────────────────────────
  const SortBtn = ({ field }: { field: keyof KecamatanRow }) => (
    <span style={{ marginLeft: 4, opacity: sortField === field ? 0.9 : 0.2, color: sortField === field ? "var(--primary)" : "inherit" }}>
      {sortField === field && !sortAsc ? <DescIcon /> : <AscIcon />}
    </span>
  );

  const ThSort = ({ field, label, className }: { field: keyof KecamatanRow; label: string; className?: string }) => (
    <th
      className={className}
      onClick={() => handleSortBy(field)}
      style={{ cursor: "pointer", userSelect: "none" }}
      title={`Urutkan berdasarkan ${label}`}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {label}<SortBtn field={field} />
      </span>
    </th>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="dash-root">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Penerima PKH" value={DUMMY_STATS.totalPenerima.toLocaleString("id-ID")} sub="Aktif terdaftar" color="#1A6EA8"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard label="Desa/Kelurahan" value={DUMMY_STATS.totalDesa.toString()} sub="Wilayah terjangkau" color="#15803d"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        />
        <StatCard label="Kecamatan" value={DUMMY_STATS.totalKecamatan.toString()} sub="Seluruh kecamatan" color="#7c3aed"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>}
        />
        <StatCard label="Tambah Bulan Ini" value={`+${DUMMY_STATS.bulanIni}`} sub="April 2026" color="#d97706"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
        />
      </div>

      {/* Main grid */}
      <div className="main-grid">
        {/* Table card */}
        <div className="card table-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Data Penerima Per Kecamatan</h2>
              <p className="card-desc">Rekap PKH berdasarkan wilayah kecamatan</p>
            </div>
            <div className="card-actions">
              <div className="search-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  className="search-input" type="text" placeholder="Cari kecamatan…"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} aria-label="Hapus pencarian"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--text-faint)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
              <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import
              </button>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Tambah
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <ThSort field="nama"     label="Kecamatan"       className="td-nama" />
                  <ThSort field="jumlah"   label="Jml Penerima"    className="td-jumlah" />
                  <ThSort field="penduduk" label="Total Penduduk"   className="td-penduduk" />
                  <ThSort field="persen"   label="Cakupan" />
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-faint)" }}>
                      Tidak ada data yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => (
                    <tr key={row.nama}>
                      <td className="td-no">{i + 1}</td>
                      <td className="td-nama">{row.nama}</td>
                      <td className="td-jumlah">{row.jumlah.toLocaleString("id-ID")}</td>
                      <td className="td-penduduk">{row.penduduk.toLocaleString("id-ID")}</td>
                      <td>
                        <div className="progress-wrap">
                          <div className="progress-bar"><div className="progress-fill" style={{ width: `${row.persen}%` }} /></div>
                          <span className="progress-pct">{row.persen}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="act-btn act-view" title={`Detail ${row.nama}`} aria-label={`Detail ${row.nama}`} onClick={() => setShowDetailModal(row)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          </button>
                          <button className="act-btn act-edit" title={`Edit ${row.nama}`} aria-label={`Edit ${row.nama}`} onClick={() => addToast("info", "Fitur edit akan tersedia setelah database dikonfigurasi.")}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="table-foot">
            <span className="foot-info">Menampilkan {filtered.length} dari {DUMMY_KECAMATAN.length} kecamatan</span>
            <div className="foot-actions">
              <button className="btn-export" onClick={handleExportCsv}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export .csv
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="side-col">
          {/* Recent */}
          <div className="card activity-card">
            <div className="card-head-simple">
              <h2 className="card-title">Data Baru Ditambahkan</h2>
              <span className="badge-new">Terbaru</span>
            </div>
            <ul className="activity-list">
              {DUMMY_RECENT.map((r, i) => (
                <li key={i} className="activity-item">
                  <div className="act-avatar">{r.nama.charAt(0)}</div>
                  <div className="act-info">
                    <span className="act-name">{r.nama}</span>
                    <span className="act-meta">{r.desa} · {r.tgl}</span>
                  </div>
                  <span className="act-nik">{r.nik}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div className="card quick-card">
            <h2 className="card-title" style={{ marginBottom: 14 }}>Aksi Cepat</h2>
            <div className="quick-grid">
              <button className="quick-btn" onClick={() => setShowImportModal(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Import Excel
              </button>
              <button className="quick-btn" onClick={() => setShowAddModal(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Tambah Manual
              </button>
              <button className="quick-btn" onClick={handleExportCsv}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export Laporan
              </button>
              <Link href="/map" className="quick-btn" style={{ textDecoration: "none" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                Buka Peta
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Import Modal ──────────────────────────────────────────────────── */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => { setShowImportModal(false); setImportFile(null); }} role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 id="import-modal-title">Import Data Excel</h3>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setImportFile(null); }} aria-label="Tutup modal import">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <label
                className={`drop-zone ${importDragging ? "dragging" : ""} ${importFile ? "has-file" : ""}`}
                onDragOver={e => { e.preventDefault(); setImportDragging(true); }}
                onDragLeave={() => setImportDragging(false)}
                onDrop={handleDrop}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={importFile ? "var(--success,#15803d)" : "var(--text-faint,#95aabf)"} strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                {importFile ? (
                  <>
                    <p className="drop-file-name">{importFile.name}</p>
                    <p className="drop-sub">{(importFile.size / 1024).toFixed(1)} KB · Siap diproses</p>
                  </>
                ) : (
                  <>
                    <p className="drop-title">Tarik &amp; lepas file di sini</p>
                    <p className="drop-sub">atau klik untuk memilih file</p>
                    <span className="drop-label">Pilih File</span>
                    <p className="drop-hint">Format: XLSX, XLS — Maks. 10MB</p>
                  </>
                )}
                <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileChange} />
              </label>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => { setShowImportModal(false); setImportFile(null); }}>Batal</button>
              <button className="btn-process" disabled={!importFile || importProcessing} onClick={handleProcessImport}>
                {importProcessing && <span className="btn-spinner-dark" />}
                {importProcessing ? "Memproses…" : "Proses File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Penerima Modal ────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetForm(); }} role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 id="add-modal-title">Tambah Penerima PKH</h3>
              <button className="modal-close" onClick={() => { setShowAddModal(false); resetForm(); }} aria-label="Tutup modal tambah">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmitAdd} noValidate>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label" htmlFor="f-nik">NIK</label>
                    <input id="f-nik" className={`form-input ${formErrors.nik ? "input-error" : ""}`}
                      type="text" placeholder="16 digit NIK" maxLength={16}
                      value={form.nik} onChange={e => updateForm("nik", e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric" aria-describedby={formErrors.nik ? "nik-error" : undefined} aria-invalid={!!formErrors.nik}
                    />
                    {formErrors.nik && <span id="nik-error" className="form-error-text" role="alert">{formErrors.nik}</span>}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="f-nama">Nama Lengkap</label>
                    <input id="f-nama" className={`form-input ${formErrors.nama ? "input-error" : ""}`}
                      type="text" placeholder="Nama sesuai KTP"
                      value={form.nama} onChange={e => updateForm("nama", e.target.value)} aria-invalid={!!formErrors.nama}
                    />
                    {formErrors.nama && <span className="form-error-text" role="alert">{formErrors.nama}</span>}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="f-kecamatan">Kecamatan</label>
                    <select id="f-kecamatan" className={`form-input ${formErrors.kecamatan ? "input-error" : ""}`}
                      value={form.kecamatan} onChange={e => updateForm("kecamatan", e.target.value)} aria-invalid={!!formErrors.kecamatan}
                    >
                      <option value="">-- Pilih Kecamatan --</option>
                      {DUMMY_KECAMATAN.map(k => <option key={k.nama} value={k.nama}>{k.nama}</option>)}
                    </select>
                    {formErrors.kecamatan && <span className="form-error-text" role="alert">{formErrors.kecamatan}</span>}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="f-desa">Desa / Kelurahan</label>
                    <input id="f-desa" className={`form-input ${formErrors.desa ? "input-error" : ""}`}
                      type="text" placeholder="Nama desa/kelurahan"
                      value={form.desa} onChange={e => updateForm("desa", e.target.value)} aria-invalid={!!formErrors.desa}
                    />
                    {formErrors.desa && <span className="form-error-text" role="alert">{formErrors.desa}</span>}
                  </div>
                  <div className="form-field form-field-full">
                    <label className="form-label" htmlFor="f-alamat">Alamat Lengkap</label>
                    <textarea id="f-alamat" className={`form-input form-textarea ${formErrors.alamat ? "input-error" : ""}`}
                      placeholder="RT/RW, nama jalan, nomor rumah…"
                      value={form.alamat} onChange={e => updateForm("alamat", e.target.value)} aria-invalid={!!formErrors.alamat}
                    />
                    {formErrors.alamat && <span className="form-error-text" role="alert">{formErrors.alamat}</span>}
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="btn-ghost" onClick={() => { setShowAddModal(false); resetForm(); }}>Batal</button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}>
                  {formSubmitting && <span className="btn-spinner-dark" />}
                  {formSubmitting ? "Menyimpan…" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail Kecamatan Modal ─────────────────────────────────────────── */}
      {showDetailModal && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(null)} role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3 id="detail-modal-title">Detail: Kec. {showDetailModal.nama}</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(null)} aria-label="Tutup modal detail">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row"><span className="detail-label">Kecamatan</span><span className="detail-value">{showDetailModal.nama}</span></div>
              <div className="detail-row"><span className="detail-label">Jumlah Penerima PKH</span><span className="detail-value" style={{ color: "var(--primary-text)" }}>{showDetailModal.jumlah.toLocaleString("id-ID")} jiwa</span></div>
              <div className="detail-row"><span className="detail-label">Total Penduduk</span><span className="detail-value">{showDetailModal.penduduk.toLocaleString("id-ID")} jiwa</span></div>
              <div className="detail-row"><span className="detail-label">Cakupan PKH</span><span className="detail-value">{showDetailModal.persen}%</span></div>
              <div className="detail-row"><span className="detail-label">Non-Penerima</span><span className="detail-value">{(showDetailModal.penduduk - showDetailModal.jumlah).toLocaleString("id-ID")} jiwa</span></div>
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={() => setShowDetailModal(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
