import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const desas = await prisma.desa.findMany({
      include: {
        kecamatan: true,
      },
    });
    const formatted = desas.map((d: any) => ({
      desa: d.nama,
      kecamatan: d.kecamatan.nama,
    }));
    return NextResponse.json(formatted);
  } catch (err: any) {
    console.error("[DESA_API] Error:", err);
    return NextResponse.json({ error: "Gagal memuat data desa." }, { status: 500 });
  }
}
