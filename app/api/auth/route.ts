import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const loginSchema = z.object({
  nip: z.string().min(1, "NIP / Username wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** POST /api/auth — Login */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Input tidak valid.";
      return errorResponse(firstError, 400);
    }

    const { nip, password } = parseResult.data;
    const cleanNip = nip.trim();

    // 1. Cari user di database Prisma berdasarkan NIP
    const user = await prisma.user.findUnique({
      where: { nip: cleanNip },
    });

    if (!user) {
      // Timing-safe delay untuk mencegah user enumeration
      await new Promise((r) => setTimeout(r, 300));
      return errorResponse("NIP atau password salah. Silakan coba lagi.", 401);
    }

    // 2. Verifikasi password dengan bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return errorResponse("NIP atau password salah. Silakan coba lagi.", 401);
    }

    // 3. Buat JWT session token
    const token = await signToken({
      nip: user.nip,
      nama: user.nama,
      role: user.role,
      loginAt: Date.now(),
    });

    const response = NextResponse.json({
      success: true,
      user: { nama: user.nama, role: user.role },
    });

    // 4. Set cookie httpOnly (aman, tidak dapat diakses JavaScript)
    response.cookies.set("sig_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 jam
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[AUTH] POST error:", err);
    return errorResponse("Terjadi kesalahan server.", 500);
  }
}

/** DELETE /api/auth — Logout */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("sig_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
