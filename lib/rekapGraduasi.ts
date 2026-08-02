// lib/rekapGraduasi.ts
// Service untuk menghitung & menyimpan Rekap Graduasi per Desa/Kelurahan.
//
// PENTING: field di sini disesuaikan dengan schema.prisma AKTUAL kamu saat ini
// (model RekapGraduasiDesa: totalRendah, totalSedang, totalTinggi,
// kategoriDominan, skorDominan) — BUKAN nama field versi sebelumnya.

import { prisma } from "./prisma";

export type KategoriGraduasi = "Rendah" | "Sedang" | "Tinggi";

// Mapping skor tetap — tidak disimpan sebagai field di tabel Warga.
const SKOR_KATEGORI: Record<KategoriGraduasi, number> = {
  Rendah: 0,
  Sedang: 50,
  Tinggi: 100,
};

// Urutan prioritas tie-break (index lebih besar = prioritas lebih tinggi)
const PRIORITAS_TIE_BREAK: KategoriGraduasi[] = ["Rendah", "Sedang", "Tinggi"];

interface HasilRekap {
  desaId: number;
  kategoriDominan: KategoriGraduasi | "Tidak Ada Data";
  skorDominan: number;
  totalRendah: number;
  totalSedang: number;
  totalTinggi: number;
}

/**
 * Menghitung rekap graduasi untuk satu Desa (tanpa menyimpan ke DB).
 */
export async function hitungRekapDesa(desaId: number): Promise<HasilRekap> {
  const grouped = await prisma.warga.groupBy({
    by: ["kategoriGraduasi"],
    where: { desaId },
    _count: { kategoriGraduasi: true },
  });

  const jumlah: Record<KategoriGraduasi, number> = { Rendah: 0, Sedang: 0, Tinggi: 0 };

  for (const row of grouped) {
    const kategori = row.kategoriGraduasi as KategoriGraduasi;
    if (kategori in jumlah) {
      jumlah[kategori] = row._count.kategoriGraduasi;
    }
  }

  const kategoriDominan = tentukanKategoriDominan(jumlah);
  const skorDominan = kategoriDominan === "Tidak Ada Data" ? -1 : SKOR_KATEGORI[kategoriDominan];

  return {
    desaId,
    kategoriDominan,
    skorDominan,
    totalRendah: jumlah.Rendah,
    totalSedang: jumlah.Sedang,
    totalTinggi: jumlah.Tinggi,
  };
}

function tentukanKategoriDominan(
  jumlah: Record<KategoriGraduasi, number>
): KategoriGraduasi | "Tidak Ada Data" {
  if (jumlah.Rendah === 0 && jumlah.Sedang === 0 && jumlah.Tinggi === 0) {
    return "Tidak Ada Data";
  }

  let terpilih: KategoriGraduasi = "Rendah";

  for (const kategori of PRIORITAS_TIE_BREAK) {
    if (jumlah[kategori] > jumlah[terpilih]) {
      terpilih = kategori;
    } else if (
      jumlah[kategori] === jumlah[terpilih] &&
      SKOR_KATEGORI[kategori] > SKOR_KATEGORI[terpilih]
    ) {
      terpilih = kategori;
    }
  }

  return terpilih;
}

/**
 * Menghitung rekap satu Desa lalu langsung upsert ke tabel RekapGraduasiDesa.
 * INI yang harus dipanggil di API import, bukan `hitungRekapDesa` saja.
 */
export async function hitungDanSimpanRekapDesa(desaId: number) {
  const hasil = await hitungRekapDesa(desaId);

  return prisma.rekapGraduasiDesa.upsert({
    where: { desaId },
    create: {
      desaId: hasil.desaId,
      kategoriDominan: hasil.kategoriDominan,
      skorDominan: hasil.skorDominan,
      totalRendah: hasil.totalRendah,
      totalSedang: hasil.totalSedang,
      totalTinggi: hasil.totalTinggi,
    },
    update: {
      kategoriDominan: hasil.kategoriDominan,
      skorDominan: hasil.skorDominan,
      totalRendah: hasil.totalRendah,
      totalSedang: hasil.totalSedang,
      totalTinggi: hasil.totalTinggi,
    },
  });
}

/**
 * Menghitung ulang rekap untuk SEMUA Desa. Cocok untuk cron job atau
 * tombol "Hitung Ulang Semua" di admin panel.
 */
export async function hitungUlangSemuaDesa() {
  const semuaDesa = await prisma.desa.findMany({ select: { id: true } });
  const hasil = [];
  for (const desa of semuaDesa) {
    hasil.push(await hitungDanSimpanRekapDesa(desa.id));
  }
  return hasil;
}