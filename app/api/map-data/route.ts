import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper function to calculate the dominant graduation category with tie-breaker: Tinggi > Sedang > Rendah
function getDominantCategory(rendah: number, sedang: number, tinggi: number) {
  const categories = [
    { nama: "Rendah", jumlah: rendah, skor: 0 },
    { nama: "Sedang", jumlah: sedang, skor: 50 },
    { nama: "Tinggi", jumlah: tinggi, skor: 100 },
  ];
  categories.sort((a, b) => {
    if (b.jumlah !== a.jumlah) {
      return b.jumlah - a.jumlah;
    }
    return b.skor - a.skor;
  });
  return categories[0];
}

export async function GET() {
  try {
    // 1. Fetch kecamatan along with their villages, rekap graduasi, and warga details in a single query
    const kecamatans = await prisma.kecamatan.findMany({
      include: {
        desa: {
          include: {
            rekapGraduasi: true,
            warga: {
              select: {
                id: true,
                nama: true,
                alamat: true,
                aud: true,
                sd: true,
                smp: true,
                sma: true,
                disabilitas: true,
                lansia: true,
                kategoriGraduasi: true,
              },
            },
          },
        },
      },
    });

    const kecamatanStats: Record<string, any> = {};
    const desaStats: Record<string, any> = {};
    const masyarakat: Record<string, any[]> = {};

    for (const kec of kecamatans) {
      let kecJumlah = 0;
      let kecTotalRendah = 0;
      let kecTotalSedang = 0;
      let kecTotalTinggi = 0;

      for (const d of kec.desa) {
        let desaTotalRendah = 0;
        let desaTotalSedang = 0;
        let desaTotalTinggi = 0;

        if (d.rekapGraduasi) {
          desaTotalRendah = d.rekapGraduasi.totalRendah;
          desaTotalSedang = d.rekapGraduasi.totalSedang;
          desaTotalTinggi = d.rekapGraduasi.totalTinggi;
        } else {
          // Fallback if rekap is missing
          for (const w of d.warga) {
            if (w.kategoriGraduasi === "Rendah") desaTotalRendah++;
            else if (w.kategoriGraduasi === "Sedang") desaTotalSedang++;
            else if (w.kategoriGraduasi === "Tinggi") desaTotalTinggi++;
          }
        }

        kecJumlah += d.warga.length;
        kecTotalRendah += desaTotalRendah;
        kecTotalSedang += desaTotalSedang;
        kecTotalTinggi += desaTotalTinggi;

        const desaDominant = getDominantCategory(desaTotalRendah, desaTotalSedang, desaTotalTinggi);

        desaStats[d.nama] = {
          jumlah: d.warga.length,
          penduduk: d.penduduk,
          kategoriDominan: desaDominant.nama,
          skorDominan: desaDominant.skor,
        };

        masyarakat[d.nama] = d.warga;
      }

      const kecDominant = getDominantCategory(kecTotalRendah, kecTotalSedang, kecTotalTinggi);

      kecamatanStats[kec.nama] = {
        jumlah: kecJumlah,
        penduduk: kec.penduduk,
        kategoriDominan: kecDominant.nama,
        skorDominan: kecDominant.skor,
      };
    }

    return NextResponse.json({
      kecamatanStats,
      desaStats,
      masyarakat,
    });
  } catch (err: any) {
    console.error("[MAP_DATA_API] Error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server saat memuat data peta." }, { status: 500 });
  }
}
