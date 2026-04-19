/**
 * lib/auth.ts
 * JWT utilities menggunakan `jose` (Edge Runtime compatible).
 * Digunakan oleh API routes dan middleware.
 */

import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  nip: string;
  nama: string;
  role: string;
  loginAt: number;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[AUTH] JWT_SECRET tidak dikonfigurasi! Set variabel lingkungan JWT_SECRET.");
    }
    // Development fallback — tampilkan peringatan
    console.warn(
      "[AUTH] Peringatan: JWT_SECRET tidak diset. Menggunakan secret default untuk development. JANGAN gunakan di production!"
    );
    return new TextEncoder().encode("dev-secret-ganti-ini-di-production-dengan-string-panjang");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Buat JWT token dengan payload sesi user.
 * Token berlaku 8 jam.
 */
export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

/**
 * Verifikasi dan decode JWT token.
 * Mengembalikan payload jika valid, atau null jika invalid/expired.
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
