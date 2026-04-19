/**
 * app/api/auth/route.ts
 * API autentikasi dengan bcrypt password comparison dan JWT session.
 *
 * KEAMANAN:
 * - Password dibandingkan menggunakan bcrypt (tidak plaintext)
 * - Session token menggunakan JWT yang ditandatangani (bukan base64)
 * - Cookie httpOnly + secure (di production)
 * - Rate limiting sebaiknya ditambahkan via middleware/Vercel edge
 *
 * SETUP PRODUCTION:
 * 1. Set JWT_SECRET di .env (string acak panjang >= 32 karakter)
 * 2. Generate password hash: node scripts/hash-password.js <password>
 * 3. Set ADMIN_PASSWORD_HASH dan OPERATOR_PASSWORD_HASH di .env
 * 4. Pindah data user ke database (Prisma) untuk production
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

// ─── Definisi User ──────────────────────────────────────────────────────────
// Di production: ambil dari database menggunakan Prisma
// Di development: menggunakan env vars dengan fallback demo

interface UserDef {
  nip: string;
  nama: string;
  role: string;
  /**
   * Bcrypt hash dari password (diambil dari env).
   * Jika tidak ada (development only), gunakan DEV_PASSWORD sebagai fallback.
   */
  passwordHash?: string;
  /** Hanya untuk development fallback — TIDAK UNTUK PRODUCTION */
  devPassword?: string;
}

const VALID_USERS: UserDef[] = [
  {
    nip: process.env.ADMIN_NIP ?? "admin",
    nama: "Admin Dinas",
    role: "administrator",
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    // Dev fallback — hapus/override dengan hash di production
    devPassword: process.env.ADMIN_DEV_PASS ?? "admin123",
  },
  {
    nip: process.env.OPERATOR_NIP ?? "199001012020121001",
    nama: "Budi Santoso",
    role: "operator",
    passwordHash: process.env.OPERATOR_PASSWORD_HASH,
    devPassword: process.env.OPERATOR_DEV_PASS ?? "dinsos2024",
  },
];

// ─── Helper ─────────────────────────────────────────────────────────────────

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function verifyPassword(input: string, user: UserDef): Promise<boolean> {
  // Prioritas 1: bandingkan dengan bcrypt hash dari env
  if (user.passwordHash) {
    return bcrypt.compare(input, user.passwordHash);
  }

  // Prioritas 2: fallback development (plaintext comparison)
  if (process.env.NODE_ENV === "development" && user.devPassword) {
    console.warn(
      `[AUTH] ⚠️  User "${user.nip}" menggunakan plaintext dev password. ` +
        "Jalankan 'node scripts/hash-password.js <password>' dan set hash di .env untuk production."
    );
    return input === user.devPassword;
  }

  // Production tanpa hash → tolak login
  console.error(
    `[AUTH] ❌ User "${user.nip}" tidak memiliki password hash yang dikonfigurasi di environment.`
  );
  return false;
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

/** POST /api/auth — Login */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nip, password } = body as { nip: string; password: string };

    // Validasi input
    if (!nip?.trim() || !password) {
      return errorResponse("NIP dan password wajib diisi.", 400);
    }

    // Cari user berdasarkan NIP
    const user = VALID_USERS.find((u) => u.nip === nip.trim());

    if (!user) {
      // Jangan bocorkan user mana yang tidak ada (timing-safe response)
      await new Promise((r) => setTimeout(r, 300));
      return errorResponse("NIP atau password salah. Silakan coba lagi.", 401);
    }

    // Verifikasi password (bcrypt atau dev fallback)
    const isValid = await verifyPassword(password, user);

    if (!isValid) {
      return errorResponse("NIP atau password salah. Silakan coba lagi.", 401);
    }

    // Buat JWT session token
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

    // Set cookie httpOnly (aman, tidak dapat diakses JavaScript)
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
