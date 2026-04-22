<div align="center">
  <h1 align="center">🌍 WebGIS Dinas Sosial Purwakarta</h1>
  <p align="center">
    <strong>Sistem Informasi Geografis Program Keluarga Harapan (PKH)</strong>
  </p>

  <p align="center">
    <!-- Badges -->
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" /></a>
    <a href="https://leafletjs.com/"><img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet" alt="Leaflet" /></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-6.0-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" /></a>
  </p>
</div>

---

## 📖 Tentang Aplikasi

WebGIS PKH adalah platform pemetaan digital interaktif yang dirancang khusus untuk memetakan, memvisualisasikan, dan mengelola sebaran data penerima **Program Keluarga Harapan (PKH)** di wilayah Kabupaten Purwakarta.

Aplikasi ini menggunakan perpaduan teknologi web modern (Next.js 15) dengan arsitektur peta dinamis (Leaflet) untuk menyajikan pengalaman pengguna (UI/UX) yang profesional, cepat, dan responsif.

---

## ✨ Fitur Utama

- 🗺️ **Peta Interaktif (Choropleth)** — Visualisasi data sebaran PKH wilayah operasional (Kecamatan & Desa) terpadu dengan Leaflet.
- 📊 **Dynamic Indicators** — Dua mode analisis vizualisasi: Indikator Jumlah Penerima (Absolute) atau Rasio Kepadatan per 1.000 jiwa.
- 🔐 **Secure Admin Portal** — Autentikasi berbasis cookie `httpOnly` dengan proteksi Next.js Middleware dan enkripsi JWT/Bcrypt.
- 📈 **Dashboard Executive** — Panel statistik ringkasan dan manajemen data tabular dengan fungsionalitas Import/Export Excel.
- 📍 **Smart Tooltip & FlyTo** — Interaksi UX interaktif, hover tooltip canggih, dan zoom otomatis saat observasi wilayah spesifik.
- 🌙 **Dark/Light Mode** — Tampilan antarmuka yang menyesuaikan preferensi mata pengguna (Sinkron antara UI Dashboard & Tile Peta).

---

## 🛠️ Tech Stack & Arsitektur

Platform ini dibangun menggunakan arsitektur modern berbasis **React Server Components** (App Router):

| Layer | Teknologi yang Digunakan |
| :--- | :--- |
| **Framework Layer** | Next.js 15.5 (App Router), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS v3, CSS Modules |
| **Map Engine** | Leaflet 1.9, React-Leaflet 5.0 |
| **Database & ORM** | MySQL, Prisma ORM 6.0 |
| **Security & Auth** | Jose (Decryption/Encryption), Bcrypt.js, Edge Middleware |

---

## 🚀 Panduan Eksekusi Lokal

Berikut langkah-langkah untuk menjalankan aplikasi WebGIS ini pada mesin lokal Anda.

### 1. Prasyarat
Pastikan environment mesin Anda telah terinstall:
- **Node.js**: `v18.17.0` atau yang lebih baru.
- **NPM** atau **Yarn**.
- **MySQL Server** (jika ingin mencoba koneksi database langsung).

### 2. Instalasi & Setup

```bash
# Clone repositori
git clone <url-repo-anda>
cd webgis-dinsospwk

# Install semua dependencies
npm install
```

### 3. Konfigurasi Environment

Duplikat template environment yang telah disediakan menjadi variabel lokal:
```bash
cp .env.example .env.local
```
Sesuaikan _connection string_ database Anda pada `DATABASE_URL` di dalam file `.env.local`:
```env
DATABASE_URL="mysql://root:password@localhost:3306/webgis_pkh"
```
> **💡 Catatan Developer:** 
> Jika Anda belum memiliki database lokal, aplikasi masih dapat berjalan normal untuk tampilan peta publik karena aplikasi dikonfigurasi memberikan default _fallback_ pada data dummy statis (`app/data/dummy.ts`).

### 4. Setup Database Schema (Opsional)

Jika koneksi `.env` telah diset:
```bash
# Migrasi skema dari Prisma ke MySQL lokal
npx prisma migrate dev --name init

# Generate Prisma Client Typings
npx prisma generate
```

### 5. Jalankan Web Server

```bash
npm run dev
```
Buka browser dan navigasi ke [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Akses Administrator

Aplikasi menyediakan dua jenis akses kredensial yang dapat dicoba secara lokal:

| Role | Username / NIP | Password | Keterangan Akses |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Akses penuh, manajemen pengguna, pengelolaan wilayah, dan dasbor. |
| **Operator** | `199001012020121001` | `dinsos2024` | Hak akses terbatas (fokus mengelola data warga). |

> Konfigurasi API mock kredensial ini terletak di `app/api/auth/route.ts`. Sangat disarankan untuk segera menghubungkannya secara penuh pada tabel relasi DB (`User` Model) ketika menuju tahapan _Production_.

---

## 📁 Hierarki Direktori

```text
webgis-dinsospwk/
├── app/                      # Next.js App Router
│   ├── admin/                # Proteksi Modul Administrator & CMS
│   │   ├── ...               # Subsistem: Dashboard, Data Penerima, Pengguna
│   ├── api/                  # Edge/Node API Routes (Backend Endpoints)
│   ├── components/           # Reusable UI Components
│   ├── data/                 # Data Statis & Tipe Dummy
│   ├── types/                # Typescript Global Types Definition
│   ├── utils/                # Helper dan Utility Logic (Geospatial & Formatters)
│   ├── globals.css           # Variabel Tema Base & Tailwind Inject
│   ├── layout.tsx            # Komponen Root Header/Footer
│   └── page.tsx              # Public Homepage (Landing Peta WebGIS)
├── prisma/
│   └── schema.prisma         # Definisi Prisma Schema Entity & Models
├── public/                 
│   ├── desa.geojson          # GeoJSON Shapefile Batas Desa
│   └── kecamatan.geojson     # GeoJSON Shapefile Batas Kecamatan
├── middleware.ts             # Gateway Authentication Next.js (Edge JWT Auth)
├── tailwind.config.ts        # Konfigurasi Styling Custom & Theme
└── ...
```

---

## 🚢 Panduan Deployment

### Build Server Produksi
```bash
npm run build
npm run start
```

### Deploy Otomatis (Vercel)
Aplikasi WebGIS ini dioptimasi penuh pada arsitektur platform Next.js.
1. Hubungkan repository instalasi GitHub ini dengan [dashboard Vercel](https://vercel.com).
2. Tambahkan `DATABASE_URL` dan variabel env yang relevan pada **Environment Variables** di _Project Settings_ Vercel.
3. Proses _Deployment Node_ akan tereskalasi otomatis oleh infrastruktur platform.

### Deploy Server Tradisional (Linux VPS)
Gunakan *Process Manager* tangguh (misalnya PM2) agar runtime instance terjaga prima di *background*:
```bash
npm run build
npm install -g pm2
pm2 start npm --name "webgis-dinsospwk" -- run start
pm2 save
pm2 startup
```

---

<div align="center">
<p>
  <i>Dikembangkan untuk modernisasi ekosistem tata kelola data kesejahteraan sosial.</i><br>
  <b>✨ Sistem Informasi Geografis — Dinas Sosial.</b>
</p>
</div>
