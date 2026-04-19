import { PKHRecord, Warga } from "../types";

export const dummyKecamatan: Record<string, PKHRecord> = {
  "Purwakarta": { jumlah: 8500, penduduk: 130000 },
  "Campaka": { jumlah: 4200, penduduk: 55000 },
  // ... (masukkan sisa data dummyKecamatan di sini)
};

export const dummyDesa: Record<string, PKHRecord> = {
  "Nagri Kidul": { jumlah: 650, penduduk: 11500 },
  "Campaka": { jumlah: 350, penduduk: 4500 },
  // ... (masukkan sisa data dummyDesa di sini)
};

export const dummyMasyarakat: Record<string, Warga[]> = {
  "Nagri Kidul": [
    { nik: "321401001", nama: "Budi Santoso", alamat: "Jl. Mawar No. 10" },
  ],
  // ... (masukkan sisa data dummyMasyarakat di sini)
};