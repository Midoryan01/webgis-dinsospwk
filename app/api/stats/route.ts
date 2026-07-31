import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalPenerima = await prisma.warga.count();
    const totalDesa = await prisma.desa.count();
    const totalKecamatan = await prisma.kecamatan.count();

    return NextResponse.json({
      totalPenerima,
      totalDesa,
      totalKecamatan,
      lastUpdated: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    });
  } catch (err: any) {
    console.error("[STATS_API] Error:", err);
    // Fallback if database is not fully set up or empty
    return NextResponse.json({
      totalPenerima: 0,
      totalDesa: 0,
      totalKecamatan: 0,
      lastUpdated: "Belum ada data",
    });
  }
}
