# SIG PKH — Sistem Informasi Geografis Dinas Sosial Kabupaten Purwakarta

WebGIS untuk memetakan dan mengelola data penerima Program Keluarga Harapan (PKH) Dinas Sosial Kabupaten Purwakarta.

---

## Fitur Utama

- **Peta Interaktif** — Visualisasi sebaran PKH per kecamatan dan per desa menggunakan Leaflet
- **Dua Mode Indikator** — Jumlah penerima (mentah) atau rasio per 1.000 jiwa
- **Login Admin** — Autentikasi berbasis cookie, dilindungi middleware Next.js
- **Dashboard Admin** — Statistik ringkasan, tabel data per kecamatan, import/export Excel
- **Tooltip & FlyTo** — Hover tooltip dan zoom otomatis saat klik wilayah

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS v3 |
| Peta | Leaflet 1.9 (vanilla, dynamic import) |
| Database ORM | Prisma + MySQL |
| Auth | Cookie session (httpOnly) + Middleware |

---

## Cara Menjalankan Lokal

### 1. Clone & install dependensi

```bash
git clone <repo-url>
cd webgis
npm install
```

### 2. Konfigurasi environment

```bash
cp .env.example .env.local
```

Isi file `.env.local`:

```env
DATABASE_URL="mysql://root:password@localhost:3306/webgis_pkh"
```

> **Catatan:** Untuk menjalankan tanpa database, aplikasi tetap berjalan menggunakan data dummy yang sudah tersedia di `app/data/dummy.ts`. Login tetap berfungsi tanpa database.

### 3. Setup database (opsional)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Akun Demo

| NIP / Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Administrator |
| `199001012020121001` | `dinsos2024` | Operator |

> Kredensial ini ada di `app/api/auth/route.ts`. Untuk production, sambungkan ke tabel `User` di database.

---

## Struktur Folder

```
webgis/
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # Layout sidebar + topbar admin
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── penerima/page.tsx   # Manajemen data penerima
│   │   ├── laporan/page.tsx    # Laporan
│   │   └── pengguna/page.tsx   # Manajemen pengguna
│   ├── api/
│   │   ├── auth/route.ts       # POST login, DELETE logout
│   │   └── stats/route.ts      # GET statistik ringkasan
│   ├── components/
│   │   ├── MapWrapper.tsx      # Komponen peta utama (Leaflet)
│   │   ├── IndicatorControl.tsx # Panel pilihan indikator
│   │   └── WargaTable.tsx      # Tabel data penerima per wilayah
│   ├── data/
│   │   └── dummy.ts            # Data dummy kecamatan, desa, warga
│   ├── login/page.tsx          # Halaman login
│   ├── types/index.ts          # TypeScript type definitions
│   ├── utils/mapUtils.ts       # Helper fungsi peta (quantile, warna)
│   ├── globals.css             # Global styles + Tailwind
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Halaman utama (peta publik)
├── components/
│   └── FormLaporan.tsx         # Komponen form laporan
├── prisma/
│   └── schema.prisma           # Schema database
├── public/
│   ├── desa.geojson            # Data GeoJSON batas desa
│   └── kecamatan.geojson       # Data GeoJSON batas kecamatan
├── middleware.ts               # Proteksi route /admin
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## Alur Autentikasi

```
User → POST /api/auth { nip, password }
     → Server validasi kredensial
     → Set cookie httpOnly "sig_session" (8 jam)
     → Redirect ke /admin

Akses /admin/* → middleware.ts cek cookie
              → Jika tidak ada → redirect ke /login
              → Jika ada → lanjut

Logout → DELETE /api/auth → hapus cookie → redirect /login
```

---

## Build untuk Production

```bash
npm run build
npm run start
```

### Deploy ke Vercel

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Tambahkan environment variable `DATABASE_URL` di Vercel dashboard
4. Deploy otomatis

### Deploy ke VPS / Server sendiri

```bash
npm run build
npm run start  # atau gunakan PM2

# Dengan PM2:
npm install -g pm2
pm2 start npm --name "webgis-pkh" -- start
pm2 save
pm2 startup
```

---

## Mengganti Data Dummy ke Database

1. Uncomment dan lengkapi `prisma/schema.prisma`
2. Jalankan `npx prisma migrate dev`
3. Di `app/api/auth/route.ts`, ganti array `VALID_USERS` dengan query Prisma ke tabel `Admin`/`User`
4. Di `app/components/MapWrapper.tsx`, ganti import `dummyKecamatan` dengan `fetch('/api/data/kecamatan')`

---

## Konfigurasi Basemap

Basemap default menggunakan OpenStreetMap. Untuk mengganti ke CartoDB atau Mapbox, edit baris `L.tileLayer(...)` di `app/components/MapWrapper.tsx`:

```typescript
// CartoDB Positron (terang, bersih)
"https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

// CartoDB Dark Matter (gelap)
"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
```

---

## Troubleshooting

**Peta tidak muncul / `map-container` already initialized**
— Pastikan `MapWrapper` hanya dirender sekali. Sudah ditangani dengan pengecekan `if (mapRef.current) return` di `useEffect`.

**Error `Cannot find module 'leaflet'`**
— Jalankan `npm install`. Pastikan `react-leaflet` versi `^4.2.1` (bukan v5) untuk kompatibilitas dengan React 19.

**Login selalu gagal**
— Cek console browser. Pastikan API `/api/auth` merespons. Kredensial default: `admin` / `admin123`.

**GeoJSON tidak termuat**
— Pastikan file `public/desa.geojson` dan `public/kecamatan.geojson` ada. Properti kunci yang digunakan: `WADMKC` (kecamatan) dan `WADMKD` (desa).
