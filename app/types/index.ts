/**
 * app/types/index.ts
 *
 * SINGLE SOURCE OF TRUTH untuk semua domain types.
 * Tambah/ubah tipe di sini — semua file lain cukup import dari sini.
 *
 * Sections:
 *  1. GIS / Map types
 *  2. Data domain (Warga, PKH)
 *  3. Dashboard / Admin UI
 *  4. Form
 *  5. Auth / User
 *  6. Theme / UI helpers
 */

// ─── 1. GIS / Map ─────────────────────────────────────────────────────────────

/** Record statistik PKH per wilayah */
export type PKHRecord = {
  jumlah:   number; // total penerima PKH
  penduduk: number; // total penduduk wilayah
};

/** Metrik yang ditampilkan di peta choropleth */
export type MetricType = "jumlah" | "per1000";

/** State loading data GeoJSON */
export type LoadState = "idle" | "loading" | "success" | "error";

/** Cache GeoJSON kecamatan + desa (agar tidak re-fetch) */
export type GeoCache = {
  kecGeo:  GeoJSON.FeatureCollection;
  desaGeo: GeoJSON.FeatureCollection;
};

// ─── 2. Data Domain ───────────────────────────────────────────────────────────

/**
 * Data warga penerima PKH.
 * NIK disimpan sebagai string (bukan number) karena:
 * - NIK 16 digit melebihi batas Number.MAX_SAFE_INTEGER
 * - Ada leading zero yang harus tetap terjaga
 * - Perlu operasi string (validasi regex, display)
 */
export interface Warga {
  /** NIK 16 digit — selalu string, jangan dikonversi ke number */
  nik:    string;
  nama:   string;
  alamat: string;
}

// ─── 3. Dashboard / Admin UI ──────────────────────────────────────────────────

/** Data statistik ringkasan dashboard */
export interface DashboardStats {
  totalPenerima:  number;
  totalDesa:      number;
  totalKecamatan: number;
  bulanIni:       number;
}

/** Satu baris data kecamatan di tabel dashboard */
export interface KecamatanRow {
  nama:     string;
  jumlah:   number; // jumlah penerima PKH
  penduduk: number; // total penduduk
  persen:   number; // cakupan dalam persen (0-100)
}

/**
 * Entry aktivitas terbaru (penambahan penerima).
 * Field `nik` di sini adalah format tampilan (bisa disingkat/masked),
 * bukan NIK lengkap 16 digit.
 */
export interface RecentActivity {
  nama: string;
  /** NIK ditampilkan — boleh format "32140x...xxx" untuk privasi */
  nik:  string;
  desa: string;
  tgl:  string; // format tampilan bebas, misal "05 Apr 2026"
}

/** Notifikasi toast */
export interface Toast {
  id:      number;
  type:    "success" | "error" | "info";
  message: string;
}

// ─── 4. Form ──────────────────────────────────────────────────────────────────

/** State form tambah penerima PKH */
export interface FormState {
  /** NIK 16 digit — disimpan sebagai string */
  nik:       string;
  nama:      string;
  kecamatan: string;
  desa:      string;
  alamat:    string;
}

/**
 * Error per-field form.
 * Menggunakan Partial<Record<keyof FormState, string>> agar type-safe
 * dan otomatis mengikuti perubahan FormState.
 */
export type FormErrors = Partial<Record<keyof FormState, string>>;

// ─── 5. Auth / User ───────────────────────────────────────────────────────────

/** Role pengguna sistem */
export type UserRole = "administrator" | "operator" | "viewer";

/** Informasi pengguna yang sedang login */
export interface UserInfo {
  nip:  string;
  nama: string;
  role: UserRole;
}

// ─── 6. Theme / UI Helpers ────────────────────────────────────────────────────

/** Mode tampilan */
export type ThemeMode = "light" | "dark";

/** Key localStorage untuk menyimpan preferensi tema */
export const THEME_STORAGE_KEY = "sig-theme" as const;
