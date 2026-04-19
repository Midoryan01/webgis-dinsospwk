/**
 * app/api/auth/me/route.ts
 * Endpoint untuk mendapatkan informasi user yang sedang login.
 * Membaca JWT dari httpOnly cookie dan mengembalikan data display user.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("sig_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Tidak ada sesi aktif." }, { status: 401 });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Sesi tidak valid atau sudah kedaluwarsa." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    nip: payload.nip,
    nama: payload.nama,
    role: payload.role,
  });
}
