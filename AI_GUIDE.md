# 📘 AI_GUIDE.md: System Architecture, Auth Implementation & API Audit Guide

## 1. 🏗️ System Overview
**WebGIS Dinsos PKH Purwakarta** adalah aplikasi berbasis Next.js App Router yang dirancang untuk Pemetaan Geografis (GIS) dan Pengelolaan Data Penerima Bantuan Sosial Program Keluarga Harapan (PKH) serta Graduasi Kesejahteraan Masyarakat di Kabupaten Purwakarta.

- **Framework**: Next.js `16.2.4` (App Router) & React `19.2.5`
- **ORM & Database**: Prisma ORM `6.2.1` dengan database MySQL
- **Peta GIS**: Leaflet `1.9.4` & React Leaflet `5.0.0`
- **Keamanan Auth**: `jose` (Edge-compatible JWT) + `bcryptjs` (Password Hashing) + `zod` (Input Validation)
- **Styling**: Vanilla CSS & Tailwind CSS

---

## 2. 🔑 Environment Setup
Variabel lingkungan yang dibutuhkan tersimpan pada file `.env`:

| Variabel | Deskripsi | Default / Contoh |
| :--- | :--- | :--- |
| `DATABASE_URL` | String koneksi MySQL | `mysql://root:@localhost:3306/webgis_pkh` |
| `JWT_SECRET` | Secret key untuk penandatanganan JWT Token | String acak panjang 64+ karakter |
| `ADMIN_NIP` | NIP / Username default Admin | `admin` |
| `OPERATOR_NIP` | NIP / Username default Operator | `199001012020121001` |
| `ADMIN_DEV_PASS` | Password dev Admin (untuk Seeding) | `admin123` |
| `OPERATOR_DEV_PASS` | Password dev Operator (untuk Seeding) | `dinsos2024` |
| `NEXT_PUBLIC_SHOW_DEMO_INFO` | Tampilkan info akun demo di halaman login | `true` |

---

## 3. 🗄️ Database Structure (`prisma/schema.prisma`)

```
User (id, nip [unique], nama, password [bcrypt], role, createdAt, updatedAt)
Kecamatan (id, nama [unique])
Desa (id, nama [unique], kecamatanId -> Kecamatan.id)
Warga (id, nama, alamat, aud, sd, smp, sma, disabilitas, lansia, kategoriGraduasi, desaId -> Desa.id)
RekapGraduasiDesa (id, desaId [unique] -> Desa.id, totalRendah, totalSedang, totalTinggi, kategoriDominan, skorDominan, updatedAt)
```

---

## 4. 🔒 Authentication & Authorization Flow

```
[ Form Login /login ] 
         │ (NIP, Password)
         ▼
[ POST /api/auth ] ➔ Validasi Zod ➔ Cari User di Prisma (MySQL) ➔ Bcrypt Compare
         │ (Berhasil)
         ▼
[ Terbitkan Cookie httpOnly: sig_session ] ➔ (Valid 8 Jam, SameSite: Lax)
         │
         ▼
[ middleware.ts ] ➔ Lindungi Rute /admin/* & Auto Redirect /login jika sudah login
         │
         ▼
[ API Routes ] ➔ Verifikasi Sesi & Peran Server-Side (RBAC: administrator / operator)
```

---

## 5. 📊 Feature & API Audit Table

| Feature / Route | Status | Associated API / Action | Security & Implementation Notes |
| :--- | :--- | :--- | :--- |
| `/login` | Fixed | `POST /api/auth` | Zod validation, bcrypt verify, timing-safe error delay, httpOnly JWT cookie, auto-redirect jika sudah login |
| `/admin` | OK | `GET /api/stats` | Protected middleware, rekap statistik & grafik dashboard |
| `/admin/penerima` | Fixed | `GET, POST /api/warga` | CRUD lengkap, Zod input validation, pagination support, auto rekap graduasi |
| `/admin/pengguna` | Implemented | `GET, POST /api/users` | Mengambil & menambah daftar user dari DB Prisma dengan RBAC check (hanya administrator) |
| `/admin/laporan` | Implemented | `GET /api/stats` | Ringkasan laporan agregasi graduasi PKH & tombol Cetak Laporan |
| `/map` | Optimized | `GET /api/map-data` | Query Prisma digabung (menghilangkan duplikasi `findMany`), GIS Leaflet map publik |
| `/api/warga/import` | Fixed | `POST /api/warga/import` | Ditambahkan proteksi JWT session & RBAC check (`operator`/`admin`) |

---

## 6. ⚡ Performance & Security Improvements Summary

1. **Optimasi Performa Query Peta (`/api/map-data`)**:
   - Menggabungkan query terpisah `Kecamatan` dan `Desa` menjadi 1 single nested query.
   - Menghilangkan redundansi fetch `Warga` berulang sehingga menghemat memori dan mempercepat respon data peta GIS.

2. **Validasi Input Ketat (Zod)**:
   - Seluruh endpoint penerima data (`POST /api/auth`, `POST /api/warga`, `POST /api/users`) memvalidasi struktur & tipe data secara runtime menggunakan Zod.

3. **Keamanan Sesi & RBAC**:
   - Proteksi middleware dua arah (melindungi rute `/admin/*` dan me-redirect pengguna ber-sesi dari `/login`).
   - Verifikasi peran server-side (RBAC) pada setiap API mutasi data.

---

## 7. 🚀 How to Run & Test

1. **Install Dependensi**:
   ```bash
   npm install
   ```

2. **Koneksi Database & Sync Schema**:
   ```bash
   npx prisma db push
   ```

3. **Jalankan Database Seeding**:
   ```bash
   npx prisma db seed
   ```
   *Membuat data awal Kecamatan, Desa, Warga, dan Akun Default (`admin` / `admin123` & `199001012020121001` / `dinsos2024`).*

4. **Menjalankan Dev Server**:
   ```bash
   npm run dev
   ```

5. **Uji Coba Sistem**:
   - Buka `http://localhost:3000/login`
   - Masukkan NIP `admin` dan Password `admin123`
   - Buka `http://localhost:3000/admin/pengguna` untuk melihat daftar pengguna terdaftar dari Prisma DB.
   - Buka `http://localhost:3000/admin/laporan` untuk melihat ringkasan cetak laporan.

---

## 8. 🛡️ Security Notes
- **Password Hashing**: Bcrypt dengan cost factor 10.
- **Session Hygiene**: Cookie HttpOnly, SameSite=lax, Secure di Production, Max-Age 8 jam.
- **API Guarding**: Setiap mutasi sensitif di API memeriksa kembali token JWT & role `session.role` di sisi server.
