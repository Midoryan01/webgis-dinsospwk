import { NextResponse } from "next/server";

export async function GET() {
  // Data statis untuk demo — di production ambil dari Prisma
  return NextResponse.json({
    totalPenerima: 24318,
    totalDesa: 183,
    totalKecamatan: 17,
    lastUpdated: new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  });
}
