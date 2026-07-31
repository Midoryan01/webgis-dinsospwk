"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import * as XLSX from "xlsx";
import { z } from "zod";
import Pagination from "@/app/components/Pagination";

// ─── 1. Skema Validasi Zod untuk Import Warga ───────────────────────────────
const wargaSchema = z.object({
  nama: z.string()
    .min(1, "Nama tidak boleh kosong.")
    .max(100, "Nama terlalu panjang.")
    .transform(val => val.trim().toUpperCase()),
  alamat: z.string()
    .min(1, "Alamat tidak boleh kosong.")
    .max(255, "Alamat terlalu panjang.")
    .transform(val => val.trim().toUpperCase()),
  kecamatan: z.string()
    .min(1, "Kecamatan tidak boleh kosong.")
    .transform(val => val.trim()),
  desa: z.string()
    .min(1, "Desa/Kelurahan tidak boleh kosong.")
    .transform(val => val.trim()),
  aud: z.coerce.number().int().nonnegative("AUD harus berupa angka >= 0."),
  sd: z.coerce.number().int().nonnegative("SD harus berupa angka >= 0."),
  smp: z.coerce.number().int().nonnegative("SMP harus berupa angka >= 0."),
  sma: z.coerce.number().int().nonnegative("SMA harus berupa angka >= 0."),
  disabilitas: z.coerce.number().int().nonnegative("Disabilitas harus berupa angka >= 0."),
  lansia: z.coerce.number().int().nonnegative("Lansia harus berupa angka >= 0."),
  kategoriGraduasi: z.enum(["Rendah", "Sedang", "Tinggi"], {
    message: "Graduasi harus Rendah, Sedang, atau Tinggi."
  }),
});

type WargaInput = z.infer<typeof wargaSchema>;

interface ParsedRow {
  index: number;
  data: WargaInput;
  status: "VALID" | "INVALID";
  errors: string[];
  acc: boolean;
}

// Interface untuk data Warga dari database
interface WargaDb {
  id: number;
  nama: string;
  alamat: string;
  aud: number;
  sd: number;
  smp: number;
  sma: number;
  disabilitas: number;
  lansia: number;
  kategoriGraduasi: string;
  desa: string;
  kecamatan: string;
}

type SortField = "id" | "nama" | "alamat" | "kecamatan" | "desa" | "aud" | "sd" | "smp" | "sma" | "disabilitas" | "lansia" | "kategoriGraduasi";

export default function PenerimaPage() {
  const [activeTab, setActiveTab] = useState<"daftar" | "import">("daftar");
  const [wargaList, setWargaList] = useState<WargaDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filter & Search states (Daftar)
  const [searchNama, setSearchNama] = useState("");
  const [searchAlamat, setSearchAlamat] = useState("");
  const [filterKec, setFilterKec] = useState("");
  const [filterDesa, setFilterDesa] = useState("");
  const [filterGraduasi, setFilterGraduasi] = useState("");
  const [filterKomponen, setFilterKomponen] = useState(""); // "" | "aud" | "sd" | "smp" | "sma" | "disabilitas" | "lansia" | "ada"

  // Sorting states
  const [sortField, setSortField] = useState<SortField | null>("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination states (Tab 1: Daftar)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Pagination states (Tab 2: Import Preview)
  const [importPage, setImportPage] = useState(1);
  const [importPageSize, setImportPageSize] = useState(10);

  // Import states
  const [importRows, setImportRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<WargaInput | null>(null);
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [desaToKecMap, setDesaToKecMap] = useState<Record<string, string>>({});

  // Toast / Notifikasi
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Manual Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    nama: "", alamat: "", kecamatan: "", desa: "",
    aud: 0, sd: 0, smp: 0, sma: 0, disabilitas: 0, lansia: 0,
    kategoriGraduasi: "Sedang"
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Fetch data warga dari database
  const loadWarga = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warga");
      if (res.ok) {
        const data = await res.json();
        setWargaList(data);
      } else {
        showToast("error", "Gagal memuat data warga dari server.");
      }
    } catch (err) {
      showToast("error", "Koneksi ke server terputus.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarga();
    fetch("/api/desa")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapping: Record<string, string> = {};
          data.forEach((item: any) => {
            mapping[item.desa.toLowerCase().trim()] = item.kecamatan;
          });
          setDesaToKecMap(mapping);
        }
      })
      .catch(err => console.error("Gagal memuat mapping desa-kecamatan:", err));
  }, []);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Sorting Toggle Helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // ── Reset Filters Helper
  const resetFilters = () => {
    setSearchNama("");
    setSearchAlamat("");
    setFilterKec("");
    setFilterDesa("");
    setFilterGraduasi("");
    setFilterKomponen("");
    setSortField("nama");
    setSortDirection("asc");
    setCurrentPage(1);
  };

  const isAnyFilterActive = !!(
    searchNama ||
    searchAlamat ||
    filterKec ||
    filterDesa ||
    filterGraduasi ||
    filterKomponen ||
    (sortField && sortField !== "nama") ||
    sortDirection !== "asc"
  );

  // ── Helper List filter
  const uniqueKecamatans = useMemo(() => {
    return Array.from(new Set(wargaList.map(w => w.kecamatan))).sort();
  }, [wargaList]);

  const uniqueDesas = useMemo(() => {
    let filtered = wargaList;
    if (filterKec) {
      filtered = filtered.filter(w => w.kecamatan === filterKec);
    }
    return Array.from(new Set(filtered.map(w => w.desa))).sort();
  }, [wargaList, filterKec]);

  // ── Filter & Sorting Calculation
  const filteredAndSortedWarga = useMemo(() => {
    let result = wargaList.filter(w => {
      const matchNama = !searchNama || w.nama.toLowerCase().includes(searchNama.toLowerCase().trim());
      const matchAlamat = !searchAlamat || w.alamat.toLowerCase().includes(searchAlamat.toLowerCase().trim());
      const matchKec = !filterKec || w.kecamatan === filterKec;
      const matchDesa = !filterDesa || w.desa === filterDesa;
      const matchGraduasi = !filterGraduasi || w.kategoriGraduasi === filterGraduasi;

      let matchKomponen = true;
      if (filterKomponen === "aud") matchKomponen = w.aud > 0;
      else if (filterKomponen === "sd") matchKomponen = w.sd > 0;
      else if (filterKomponen === "smp") matchKomponen = w.smp > 0;
      else if (filterKomponen === "sma") matchKomponen = w.sma > 0;
      else if (filterKomponen === "disabilitas") matchKomponen = w.disabilitas > 0;
      else if (filterKomponen === "lansia") matchKomponen = w.lansia > 0;
      else if (filterKomponen === "ada") matchKomponen = (w.aud + w.sd + w.smp + w.sma + w.disabilitas + w.lansia) > 0;

      return matchNama && matchAlamat && matchKec && matchDesa && matchGraduasi && matchKomponen;
    });

    if (sortField) {
      result.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [wargaList, searchNama, searchAlamat, filterKec, filterDesa, filterGraduasi, filterKomponen, sortField, sortDirection]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchNama, searchAlamat, filterKec, filterDesa, filterGraduasi, filterKomponen, sortField, sortDirection]);

  // ── Paginated Warga Slicing
  const paginatedWarga = useMemo(() => {
    if (pageSize === -1) return filteredAndSortedWarga;
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedWarga.slice(start, start + pageSize);
  }, [filteredAndSortedWarga, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(filteredAndSortedWarga.length / pageSize);

  // ── Paginated Import Rows
  const paginatedImportRows = useMemo(() => {
    if (importPageSize === -1) return importRows;
    const start = (importPage - 1) * importPageSize;
    return importRows.slice(start, start + importPageSize);
  }, [importRows, importPage, importPageSize]);

  const totalImportPages = importPageSize === -1 ? 1 : Math.ceil(importRows.length / importPageSize);

  useEffect(() => {
    setImportPage(1);
  }, [importRows.length]);

  // ── Parse Excel ke JSON
  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          showToast("error", "File excel kosong.");
          return;
        }

        // Map dan Validasi tiap baris
        const parsed: ParsedRow[] = rawJson.map((row: any, idx) => {
          const mapped = mapExcelRowToWarga(row);
          const result = wargaSchema.safeParse(mapped);

          let status: "VALID" | "INVALID" = "VALID";
          let errors: string[] = [];

          if (!result.success) {
            status = "INVALID";
            errors = result.error.issues.map(err => `${err.path.join(".")}: ${err.message}`);
          }

          return {
            index: idx,
            data: result.success ? result.data : (mapped as WargaInput),
            status,
            errors,
            acc: result.success, // Auto ACC jika data valid
          };
        });

        setImportRows(parsed);
        showToast("info", `Berhasil memuat ${parsed.length} baris dari Excel.`);
      } catch (err) {
        showToast("error", "Gagal memproses file excel. Pastikan format benar.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Mapper kolom Excel case-insensitive & space-insensitive
  const mapExcelRowToWarga = (row: any) => {
    const getVal = (keys: string[], fallback: any = "") => {
      for (const k of Object.keys(row)) {
        const normKey = k.toLowerCase().replace(/[\s_\-\.]/g, "");
        if (keys.some(key => key.toLowerCase().replace(/[\s_\-\.]/g, "") === normKey)) {
          return row[k];
        }
      }
      return fallback;
    };

    const desaVal = String(getVal(["desa", "kelurahan", "village"])).trim();
    let kecVal = String(getVal(["kecamatan", "subdistrict"])).trim();
    if (!kecVal && desaVal) {
      // Auto-resolve based on desaToKecMap (case-insensitive)
      kecVal = desaToKecMap[desaVal.toLowerCase()] || "";
    }

    let katGrad = String(getVal(["kategorigraduasi", "graduasi", "statusgraduasi"], "Sedang")).trim();
    // Normalize casing to match Zod Enum: "Rendah", "Sedang", "Tinggi"
    const lowerKat = katGrad.toLowerCase();
    if (lowerKat === "rendah") katGrad = "Rendah";
    else if (lowerKat === "tinggi") katGrad = "Tinggi";
    else katGrad = "Sedang"; // Default to Sedang for others

    return {
      nama: String(getVal(["nama", "namalengkap", "pengurus", "warga"])).trim(),
      alamat: String(getVal(["alamat", "alamatlengkap", "jalan"])).trim(),
      kecamatan: kecVal,
      desa: desaVal,
      aud: Number(getVal(["aud", "anakusiadini"], 0)) || 0,
      sd: Number(getVal(["sd", "sekolahdasar"], 0)) || 0,
      smp: Number(getVal(["smp", "sekolahmenengahpertama"], 0)) || 0,
      sma: Number(getVal(["sma", "sekolahmenengahatas"], 0)) || 0,
      disabilitas: Number(getVal(["disabilitas", "cacat"], 0)) || 0,
      lansia: Number(getVal(["lansia", "tua"], 0)) || 0,
      kategoriGraduasi: katGrad,
    };
  };

  // ── Download Template Excel
  const downloadTemplate = () => {
    const wsData = [
      [ "NO", "PENGURUS", "ALAMAT", "AUD", "SD", "SMP", "SMA", "DISABILITAS", "LANSIA", "KELURAHAN", "Kategori GRADUASI"],
      [ 1, "ACEM", "KP PANGUPUKAN RT 001 RW 001", 0, 0, 0, 0, 0, 1, "MUNJULJAYA", "Sedang"]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "template_import_pkh.xlsx");
  };

  // ── Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") setDragging(true);
    else if (e.type === "dragleave") setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.match(/\.(xlsx|xls)$/i)) {
      handleFileUpload(file);
    } else {
      showToast("error", "Format file harus .xlsx atau .xls");
    }
  };

  // ── Edit Row Inline
  const startEditRow = (row: ParsedRow) => {
    setEditingRowIndex(row.index);
    setEditingData({ ...row.data });
  };

  const saveEditRow = (idx: number) => {
    if (!editingData) return;

    const result = wargaSchema.safeParse(editingData);
    const updated = [...importRows];
    
    let status: "VALID" | "INVALID" = "VALID";
    let errors: string[] = [];

    if (!result.success) {
      status = "INVALID";
      errors = result.error.issues.map(err => `${err.path.join(".")}: ${err.message}`);
    }

    updated[idx] = {
      ...updated[idx],
      data: result.success ? result.data : editingData,
      status,
      errors,
      acc: result.success ? updated[idx].acc : false, // Reset ACC jika menjadi invalid
    };

    setImportRows(updated);
    setEditingRowIndex(null);
    setEditingData(null);
    showToast("success", "Baris berhasil diperbarui.");
  };

  const handleEditFieldChange = (field: keyof WargaInput, value: any) => {
    if (!editingData) return;
    setEditingData({
      ...editingData,
      [field]: value
    });
  };

  const deleteRow = (idx: number) => {
    setImportRows(importRows.filter(r => r.index !== idx).map((r, i) => ({ ...r, index: i })));
    showToast("info", "Baris dihapus dari daftar import.");
  };

  const toggleAcc = (idx: number) => {
    const updated = [...importRows];
    if (updated[idx].status === "INVALID") {
      showToast("error", "Data tidak valid tidak dapat dicentang ACC.");
      return;
    }
    updated[idx].acc = !updated[idx].acc;
    setImportRows(updated);
  };

  const toggleSelectAllValid = (checked: boolean) => {
    const updated = importRows.map(row => {
      if (row.status === "VALID") {
        return { ...row, acc: checked };
      }
      return row;
    });
    setImportRows(updated);
  };

  // ── Push data valid ke Database via API
  const pushToDatabase = async () => {
    const approvedRows = importRows.filter(r => r.acc && r.status === "VALID").map(r => r.data);
    if (approvedRows.length === 0) {
      showToast("error", "Tidak ada baris data VALID yang dicentang ACC.");
      return;
    }

    setPushStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/warga/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wargaList: approvedRows })
      });

      const result = await res.json();
      if (res.ok) {
        setPushStatus("success");
        const detail = result.created !== undefined
          ? ` (${result.created} baru, ${result.updated} diperbarui)`
          : "";
        showToast("success", `${result.count} data berhasil disimpan ke Database.${detail}`);
        setImportRows([]);
        loadWarga();
        setActiveTab("daftar");
      } else {
        setPushStatus("error");
        const msg = result.error || "Gagal memasukkan data ke database.";
        setErrorMessage(msg);
        showToast("error", msg);
      }
    } catch (err) {
      setPushStatus("error");
      const msg = "Koneksi gagal. Pastikan server berjalan dan coba lagi.";
      setErrorMessage(msg);
      showToast("error", msg);
    }
  };

  // ── Manual Add Handlers
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.nama.trim()) errs.nama = "Nama lengkap wajib diisi.";
    if (!form.alamat.trim()) errs.alamat = "Alamat lengkap wajib diisi.";
    if (!form.kecamatan) errs.kecamatan = "Kecamatan wajib diisi.";
    if (!form.desa.trim()) errs.desa = "Desa/Kelurahan wajib diisi.";
    return errs;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/warga", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await res.json();
      if (res.ok) {
        showToast("success", `Data warga ${form.nama} berhasil disimpan.`);
        setShowAddModal(false);
        setForm({
           nama: "", alamat: "", kecamatan: "", desa: "",
          aud: 0, sd: 0, smp: 0, sma: 0, disabilitas: 0, lansia: 0,
          kategoriGraduasi: "Sedang"
        });
        setFormErrors({});
        loadWarga();
      } else {
        showToast("error", result.error || "Gagal menyimpan data.");
      }
    } catch (err) {
      showToast("error", "Gagal menghubungi database.");
    } finally {
      setLoading(false);
    }
  };

  const allValidAccSelected = importRows.length > 0 && importRows.filter(r => r.status === "VALID").every(r => r.acc);

  return (
    <div style={{ padding: "0 8px", fontFamily: "'Inter', sans-serif" }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "var(--success, #15803d)" : toast.type === "error" ? "var(--error, #b91c1c)" : "var(--primary, #1d4ed8)",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 10,
          fontSize: 14, fontWeight: 500, animation: "slideUp 0.3s ease-out"
        }}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Tabs Menu */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("daftar")}
          style={{
            background: activeTab === "daftar" ? "var(--primary, #1A6EA8)" : "transparent",
            color: activeTab === "daftar" ? "#fff" : "var(--text-muted)",
            border: activeTab === "daftar" ? "1px solid var(--primary)" : "1px solid var(--border)",
            borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13,
            transition: "all 0.2s"
          }}
        >
          Daftar Penerima PKH
        </button>
        <button
          onClick={() => setActiveTab("import")}
          style={{
            background: activeTab === "import" ? "var(--primary, #1A6EA8)" : "transparent",
            color: activeTab === "import" ? "#fff" : "var(--text-muted)",
            border: activeTab === "import" ? "1px solid var(--primary)" : "1px solid var(--border)",
            borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13,
            transition: "all 0.2s"
          }}
        >
          Import File Excel
        </button>
      </div>

      {/* ────────────────── TAB 1: DAFTAR PENERIMA ────────────────── */}
      {activeTab === "daftar" && (
        <div className="card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
          {/* Card Head & Actions */}
          <div className="card-head" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
            <div>
              <h2 className="card-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Data Penerima PKH</h2>
              <p className="card-desc" style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
                Total terdaftar: <strong style={{ color: "var(--text)" }}>{wargaList.length}</strong> data warga di database
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--primary, #1A6EA8)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                + Tambah Manual
              </button>
            </div>
          </div>

          {/* ── Comprehensive Filter Toolbar ── */}
          <div style={{
            background: "var(--surface-2, #f8fafc)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 10,
            padding: 16,
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>🔍 Filter & Pencarian Data</span>
              {isAnyFilterActive && (
                <button
                  onClick={resetFilters}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <span>✕ Reset Semua Filter</span>
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {/* Filter Nama */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Pencarian Nama</label>
                <input
                  type="text"
                  placeholder="Cari nama warga..."
                  value={searchNama}
                  onChange={e => setSearchNama(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", background: "var(--surface)", fontSize: 12.5, color: "var(--text)", outline: "none" }}
                />
              </div>

              {/* Filter Alamat */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Pencarian Alamat</label>
                <input
                  type="text"
                  placeholder="Cari jalan / Kp..."
                  value={searchAlamat}
                  onChange={e => setSearchAlamat(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", background: "var(--surface)", fontSize: 12.5, color: "var(--text)", outline: "none" }}
                />
              </div>

              {/* Filter Kecamatan */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Kecamatan</label>
                <select
                  value={filterKec}
                  onChange={e => { setFilterKec(e.target.value); setFilterDesa(""); }}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", background: "var(--surface)", fontSize: 12.5, color: "var(--text)", outline: "none" }}
                >
                  <option value="">Semua Kecamatan</option>
                  {uniqueKecamatans.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              {/* Filter Desa */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Desa / Kelurahan</label>
                <select
                  value={filterDesa}
                  onChange={e => setFilterDesa(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", background: "var(--surface)", fontSize: 12.5, color: "var(--text)", outline: "none" }}
                >
                  <option value="">Semua Desa/Kel.</option>
                  {uniqueDesas.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Filter Graduasi */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Kategori Graduasi</label>
                <select
                  value={filterGraduasi}
                  onChange={e => setFilterGraduasi(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", background: "var(--surface)", fontSize: 12.5, color: "var(--text)", outline: "none" }}
                >
                  <option value="">Semua Graduasi</option>
                  <option value="Rendah">Rendah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Tinggi">Tinggi</option>
                </select>
              </div>

              {/* Filter Komponen PKH */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Komponen PKH</label>
                <select
                  value={filterKomponen}
                  onChange={e => setFilterKomponen(e.target.value)}
                  style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", background: "var(--surface)", fontSize: 12.5, color: "var(--text)", outline: "none" }}
                >
                  <option value="">Semua Komponen</option>
                  <option value="aud">Memiliki AUD</option>
                  <option value="sd">Memiliki SD</option>
                  <option value="smp">Memiliki SMP</option>
                  <option value="sma">Memiliki SMA</option>
                  <option value="disabilitas">Memiliki Disabilitas</option>
                  <option value="lansia">Memiliki Lansia</option>
                  <option value="ada">Memiliki Beban (Ada)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "8px 8px 0 0" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)", userSelect: "none" }}>
                  <th onClick={() => handleSort("id")} style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer" }} title="Klik untuk mengurutkan">
                    No {sortField === "id" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("nama")} style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer" }} title="Klik untuk mengurutkan Nama">
                    Nama {sortField === "nama" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("alamat")} style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer" }} title="Klik untuk mengurutkan Alamat">
                    Alamat {sortField === "alamat" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("desa")} style={{ padding: "12px 16px", textAlign: "left", cursor: "pointer" }} title="Klik untuk mengurutkan Wilayah">
                    Wilayah {sortField === "desa" || sortField === "kecamatan" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("aud")} style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }} title="Klik untuk mengurutkan AUD">
                    AUD {sortField === "aud" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("sd")} style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }} title="Klik untuk mengurutkan SD">
                    SD {sortField === "sd" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("smp")} style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }} title="Klik untuk mengurutkan SMP">
                    SMP {sortField === "smp" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("sma")} style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }} title="Klik untuk mengurutkan SMA">
                    SMA {sortField === "sma" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("disabilitas")} style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }} title="Klik untuk mengurutkan Disabilitas">
                    Disabilitas {sortField === "disabilitas" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("lansia")} style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }} title="Klik untuk mengurutkan Lansia">
                    Lansia {sortField === "lansia" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                  <th onClick={() => handleSort("kategoriGraduasi")} style={{ padding: "12px 16px", textAlign: "center", cursor: "pointer" }} title="Klik untuk mengurutkan Graduasi">
                    Graduasi {sortField === "kategoriGraduasi" ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
                      <span className="spinner" style={{ display: "inline-block", width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: 8, verticalAlign: "middle" }} />
                      Sedang memuat data warga dari MySQL...
                    </td>
                  </tr>
                ) : paginatedWarga.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                      Tidak ada data warga yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedWarga.map((w, i) => {
                    const globalIdx = pageSize === -1 ? i + 1 : (currentPage - 1) * pageSize + i + 1;
                    return (
                      <tr key={w.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface-2)" }}>
                        <td style={{ padding: "12px 16px" }}>{globalIdx}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>{w.nama}</td>
                        <td style={{ padding: "12px 16px" }}>{w.alamat}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600 }}>Desa {w.desa}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Kec. {w.kecamatan}</div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>{w.aud}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>{w.sd}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>{w.smp}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>{w.sma}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>{w.disabilitas}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>{w.lansia}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{
                            padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: w.kategoriGraduasi === "Tinggi" ? "rgba(34, 197, 94, 0.15)" : w.kategoriGraduasi === "Sedang" ? "rgba(234, 179, 8, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: w.kategoriGraduasi === "Tinggi" ? "#16a34a" : w.kategoriGraduasi === "Sedang" ? "#d97706" : "#ef4444"
                          }}>
                            {w.kategoriGraduasi}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Reusable Pagination Component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredAndSortedWarga.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemLabel="warga"
          />
        </div>
      )}

      {/* ────────────────── TAB 2: IMPORT EXCEL PIPELINE ────────────────── */}
      {activeTab === "import" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Uploader Card */}
          <div className="card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Upload File Penerima (Excel)</h3>
                <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Unggah file berformat .xlsx atau .xls sesuai template untuk divalidasi
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                style={{
                  display: "flex", alignItems: "center", gap: 6, background: "transparent",
                  border: "1px solid var(--primary, #1A6EA8)", color: "var(--primary, #1A6EA8)",
                  borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer"
                }}
              >
                Unduh Template Excel
              </button>
            </div>

            <label
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                border: dragging ? "2px dashed var(--primary)" : "2px dashed var(--border)",
                background: dragging ? "var(--surface-2)" : "transparent",
                borderRadius: 10, padding: "40px 20px", cursor: "pointer", transition: "all 0.2s"
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Tarik & lepas file Excel di sini</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>atau klik untuk menelusuri file (xlsx, xls)</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Preview Table */}
          {importRows.length > 0 && (
            <div className="card" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Preview & Validasi Data</h3>
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: "4px 0 0" }}>
                    Total data: <strong style={{color:"var(--text)"}}>{importRows.length}</strong> | Valid: <strong style={{color:"var(--success, #15803d)"}}>{importRows.filter(r => r.status === "VALID").length}</strong> | Invalid: <strong style={{color:"var(--error, #b91c1c)"}}>{importRows.filter(r => r.status === "INVALID").length}</strong>
                  </p>
                </div>
                <div>
                  <button
                    onClick={pushToDatabase}
                    disabled={pushStatus === "loading" || importRows.filter(r => r.acc && r.status === "VALID").length === 0}
                    style={{
                      background: "var(--success, #15803d)", color: "#fff", border: "none", borderRadius: 8,
                      padding: "10px 20px", fontWeight: 700, fontSize: 13.5, cursor: pushStatus === "loading" ? "not-allowed" : "pointer",
                      opacity: (pushStatus === "loading" || importRows.filter(r => r.acc && r.status === "VALID").length === 0) ? 0.65 : 1,
                      display: "flex", alignItems: "center", gap: 8, transition: "opacity 0.2s"
                    }}
                  >
                    {pushStatus === "loading" && (
                      <span style={{
                        display: "inline-block", width: 14, height: 14,
                        border: "2px solid rgba(255,255,255,0.35)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                        flexShrink: 0
                      }} />
                    )}
                    {pushStatus === "loading"
                      ? `Menyimpan ${importRows.filter(r => r.acc && r.status === "VALID").length} data...`
                      : `Push ke Database (${importRows.filter(r => r.acc && r.status === "VALID").length} Baris)`}
                  </button>
                </div>
              </div>

              {/* Error banner — tampil saat import gagal */}
              {pushStatus === "error" && errorMessage && (
                <div style={{
                  background: "rgba(185, 28, 28, 0.08)", border: "1px solid rgba(185,28,28,0.3)",
                  borderRadius: 8, padding: "10px 16px", marginBottom: 16,
                  display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <strong style={{ color: "#b91c1c", display: "block", marginBottom: 2 }}>Import Gagal</strong>
                    <span style={{ color: "var(--text-muted)" }}>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => { setPushStatus("idle"); setErrorMessage(""); }}
                    style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#b91c1c", padding: 0, flexShrink: 0 }}
                    aria-label="Tutup pesan error"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}

              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "10px 14px", width: 40, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={allValidAccSelected}
                          onChange={e => toggleSelectAllValid(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      <th style={{ padding: "10px 14px", textAlign: "left", width: 110 }}>Status</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", width: 150 }}>Nama</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", width: 140 }}>Kecamatan</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", width: 140 }}>Desa</th>
                      <th style={{ padding: "10px 14px", textAlign: "left", width: 160 }}>Alamat</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 50 }}>AUD</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 50 }}>SD</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 50 }}>SMP</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 50 }}>SMA</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 75 }}>Disabilitas</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 60 }}>Lansia</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 90 }}>Graduasi</th>
                      <th style={{ padding: "10px 14px", textAlign: "center", width: 100 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedImportRows.map((row) => {
                      const isEditing = editingRowIndex === row.index;
                      let statusText: string = row.status;
                      let statusColor = "var(--error, #ef4444)";
                      let statusBg = "rgba(239, 68, 68, 0.12)";

                      if (row.status === "VALID") {
                        if (row.acc) {
                          statusText = "APPROVED";
                          statusColor = "var(--success, #22c55e)";
                          statusBg = "rgba(34, 197, 94, 0.15)";
                        } else {
                          statusColor = "#3b82f6";
                          statusBg = "rgba(59, 130, 246, 0.12)";
                        }
                      }

                      return (
                        <tr key={row.index} style={{ borderBottom: "1px solid var(--border)", background: row.status === "INVALID" ? "rgba(239, 68, 68, 0.03)" : "transparent" }}>
                          {/* ACC Checkbox */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              disabled={row.status === "INVALID"}
                              checked={row.acc}
                              onChange={() => toggleAcc(row.index)}
                              style={{ cursor: row.status === "INVALID" ? "not-allowed" : "pointer" }}
                            />
                          </td>

                          {/* Status Badge */}
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "inline-block", position: "relative" }}>
                              <span style={{
                                display: "inline-block", padding: "4px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                                background: statusBg, color: statusColor
                              }}>
                                {statusText}
                              </span>
                              {row.status === "INVALID" && row.errors.length > 0 && (
                                <div style={{
                                  fontSize: 10.5, color: "var(--error, #ef4444)", marginTop: 4, maxWidth: 160,
                                  lineHeight: 1.3, wordBreak: "break-word"
                                }}>
                                  {row.errors.map((e, idx) => <div key={idx}>• {e}</div>)}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Nama */}
                          <td style={{ padding: "10px 14px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData?.nama || ""}
                                onChange={e => handleEditFieldChange("nama", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 12.5 }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600 }}>{row.data.nama}</span>
                            )}
                          </td>

                          {/* Kecamatan */}
                          <td style={{ padding: "10px 14px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData?.kecamatan || ""}
                                onChange={e => handleEditFieldChange("kecamatan", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.kecamatan
                            )}
                          </td>

                          {/* Desa */}
                          <td style={{ padding: "10px 14px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData?.desa || ""}
                                onChange={e => handleEditFieldChange("desa", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.desa
                            )}
                          </td>

                          {/* Alamat */}
                          <td style={{ padding: "10px 14px" }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingData?.alamat || ""}
                                onChange={e => handleEditFieldChange("alamat", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 12.5 }}
                              />
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{row.data.alamat}</span>
                            )}
                          </td>

                          {/* AUD */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {isEditing ? (
                              <input
                                type="number" min={0}
                                value={editingData?.aud ?? 0}
                                onChange={e => handleEditFieldChange("aud", parseInt(e.target.value) || 0)}
                                style={{ width: 45, padding: "4px 4px", borderRadius: 4, border: "1px solid var(--border)", textAlign: "center", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.aud
                            )}
                          </td>

                          {/* SD */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {isEditing ? (
                              <input
                                type="number" min={0}
                                value={editingData?.sd ?? 0}
                                onChange={e => handleEditFieldChange("sd", parseInt(e.target.value) || 0)}
                                style={{ width: 45, padding: "4px 4px", borderRadius: 4, border: "1px solid var(--border)", textAlign: "center", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.sd
                            )}
                          </td>

                          {/* SMP */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {isEditing ? (
                              <input
                                type="number" min={0}
                                value={editingData?.smp ?? 0}
                                onChange={e => handleEditFieldChange("smp", parseInt(e.target.value) || 0)}
                                style={{ width: 45, padding: "4px 4px", borderRadius: 4, border: "1px solid var(--border)", textAlign: "center", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.smp
                            )}
                          </td>

                          {/* SMA */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {isEditing ? (
                              <input
                                type="number" min={0}
                                value={editingData?.sma ?? 0}
                                onChange={e => handleEditFieldChange("sma", parseInt(e.target.value) || 0)}
                                style={{ width: 45, padding: "4px 4px", borderRadius: 4, border: "1px solid var(--border)", textAlign: "center", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.sma
                            )}
                          </td>

                          {/* Disabilitas */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {isEditing ? (
                              <input
                                type="number" min={0}
                                value={editingData?.disabilitas ?? 0}
                                onChange={e => handleEditFieldChange("disabilitas", parseInt(e.target.value) || 0)}
                                style={{ width: 45, padding: "4px 4px", borderRadius: 4, border: "1px solid var(--border)", textAlign: "center", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.disabilitas
                            )}
                          </td>

                          {/* Lansia */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {isEditing ? (
                              <input
                                type="number" min={0}
                                value={editingData?.lansia ?? 0}
                                onChange={e => handleEditFieldChange("lansia", parseInt(e.target.value) || 0)}
                                style={{ width: 45, padding: "4px 4px", borderRadius: 4, border: "1px solid var(--border)", textAlign: "center", fontSize: 12.5 }}
                              />
                            ) : (
                              row.data.lansia
                            )}
                          </td>

                          {/* Graduasi */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            {isEditing ? (
                              <select
                                value={editingData?.kategoriGraduasi || "Sedang"}
                                onChange={e => handleEditFieldChange("kategoriGraduasi", e.target.value)}
                                style={{ padding: "4px 4px", borderRadius: 4, border: "1px solid var(--border)", fontSize: 12 }}
                              >
                                <option value="Rendah">Rendah</option>
                                <option value="Sedang">Sedang</option>
                                <option value="Tinggi">Tinggi</option>
                              </select>
                            ) : (
                              <span style={{
                                padding: "3px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                                background: row.data.kategoriGraduasi === "Tinggi" ? "rgba(34, 197, 94, 0.12)" : row.data.kategoriGraduasi === "Sedang" ? "rgba(234, 179, 8, 0.12)" : "rgba(239, 68, 68, 0.12)",
                                color: row.data.kategoriGraduasi === "Tinggi" ? "#16a34a" : row.data.kategoriGraduasi === "Sedang" ? "#d97706" : "#ef4444"
                              }}>
                                {row.data.kategoriGraduasi}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "10px 14px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                              {isEditing ? (
                                <button
                                  onClick={() => saveEditRow(row.index)}
                                  style={{ border: "none", background: "var(--success, #15803d)", color: "#fff", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}
                                >
                                  Simpan
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditRow(row)}
                                  style={{ border: "none", background: "var(--primary, #1A6EA8)", color: "#fff", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => deleteRow(row.index)}
                                style={{ border: "none", background: "var(--error, #b91c1c)", color: "#fff", padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11.5, fontWeight: 600 }}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Reusable Pagination for Import Preview */}
              <Pagination
                currentPage={importPage}
                totalPages={totalImportPages}
                totalItems={importRows.length}
                pageSize={importPageSize}
                onPageChange={setImportPage}
                onPageSizeChange={setImportPageSize}
                itemLabel="baris"
              />
            </div>
          )}
        </div>
      )}

      {/* ────────────────── MANUAL ADD MODAL ────────────────── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)} role="dialog" aria-modal="true" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, width: "90%", maxWidth: 640, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="modal-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border)" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Tambah Penerima PKH</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Nama Lengkap</label>
                    <input
                      type="text"
                      value={form.nama}
                      onChange={e => setForm({ ...form, nama: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", fontSize: 13 }}
                    />
                    {formErrors.nama && <span style={{ color: "var(--error)", fontSize: 11, marginTop: 4, display: "block" }}>{formErrors.nama}</span>}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Kecamatan</label>
                    <input
                      type="text"
                      value={form.kecamatan}
                      onChange={e => setForm({ ...form, kecamatan: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", fontSize: 13 }}
                    />
                    {formErrors.kecamatan && <span style={{ color: "var(--error)", fontSize: 11, marginTop: 4, display: "block" }}>{formErrors.kecamatan}</span>}
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Desa / Kelurahan</label>
                    <input
                      type="text"
                      value={form.desa}
                      onChange={e => setForm({ ...form, desa: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", fontSize: 13 }}
                    />
                    {formErrors.desa && <span style={{ color: "var(--error)", fontSize: 11, marginTop: 4, display: "block" }}>{formErrors.desa}</span>}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Alamat Lengkap</label>
                  <textarea
                    value={form.alamat}
                    onChange={e => setForm({ ...form, alamat: e.target.value })}
                    style={{ width: "100%", height: 60, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}
                  />
                  {formErrors.alamat && <span style={{ color: "var(--error)", fontSize: 11, marginTop: 4, display: "block" }}>{formErrors.alamat}</span>}
                </div>

                {/* Demografi */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Jumlah AUD</label>
                    <input
                      type="number" min={0}
                      value={form.aud}
                      onChange={e => setForm({ ...form, aud: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text)", fontSize: 13, textAlign: "center" }}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Jumlah SD</label>
                    <input
                      type="number" min={0}
                      value={form.sd}
                      onChange={e => setForm({ ...form, sd: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text)", fontSize: 13, textAlign: "center" }}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Jumlah SMP</label>
                    <input
                      type="number" min={0}
                      value={form.smp}
                      onChange={e => setForm({ ...form, smp: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text)", fontSize: 13, textAlign: "center" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Jumlah SMA</label>
                    <input
                      type="number" min={0}
                      value={form.sma}
                      onChange={e => setForm({ ...form, sma: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text)", fontSize: 13, textAlign: "center" }}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Disabilitas</label>
                    <input
                      type="number" min={0}
                      value={form.disabilitas}
                      onChange={e => setForm({ ...form, disabilitas: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text)", fontSize: 13, textAlign: "center" }}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label" style={{ fontSize: 11.5, fontWeight: 600, display: "block", marginBottom: 4 }}>Lansia</label>
                    <input
                      type="number" min={0}
                      value={form.lansia}
                      onChange={e => setForm({ ...form, lansia: parseInt(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--surface-2)", color: "var(--text)", fontSize: 13, textAlign: "center" }}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Kategori Graduasi</label>
                  <select
                    value={form.kategoriGraduasi}
                    onChange={e => setForm({ ...form, kategoriGraduasi: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--text)", fontSize: 13 }}
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                  </select>
                </div>
              </div>
              <div className="modal-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn-ghost" onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Batal</button>
                <button type="submit" className="btn-primary" style={{ background: "var(--primary, #1A6EA8)", border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-screen loading overlay \u2014 muncul saat import sedang diproses */}
      {pushStatus === "loading" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9990,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(3px)",
        }}>
          <div style={{
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 16, padding: "36px 48px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            minWidth: 300,
          }}>
            {/* Animated ring */}
            <div style={{
              width: 52, height: 52,
              border: "4px solid var(--border, #e2e8f0)",
              borderTopColor: "var(--success, #15803d)",
              borderRadius: "50%",
              animation: "spin 0.75s linear infinite",
            }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 6px", color: "var(--text, #0f172a)" }}>
                Sedang Menyimpan Data...
              </p>
              <p style={{ fontSize: 12.5, color: "var(--text-muted, #64748b)", margin: 0 }}>
                Memproses {importRows.filter(r => r.acc && r.status === "VALID").length} baris data ke MySQL.
                <br />Mohon jangan tutup halaman ini.
              </p>
            </div>
            <div style={{
              width: "100%", height: 4, background: "var(--border, #e2e8f0)",
              borderRadius: 4, overflow: "hidden"
            }}>
              <div style={{
                height: "100%", width: "100%",
                background: "var(--success, #15803d)",
                animation: "progressIndeterminate 1.4s ease-in-out infinite",
                transformOrigin: "left",
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Spinner animation keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressIndeterminate {
          0%   { transform: translateX(-100%) scaleX(0.5); }
          50%  { transform: translateX(0%) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(0.5); }
        }
      `}</style>
    </div>
  );
}
