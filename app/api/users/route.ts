import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const createUserSchema = z.object({
  nip: z.string().min(1, "NIP wajib diisi."),
  nama: z.string().min(1, "Nama wajib diisi."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  role: z.enum(["administrator", "operator"]).default("operator"),
});

/** GET /api/users — Ambil daftar pengguna */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        nip: true,
        nama: true,
        role: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json(users);
  } catch (err: any) {
    console.error("[USERS_GET] Error:", err);
    return NextResponse.json({ error: "Gagal memuat data pengguna." }, { status: 500 });
  }
}

/** POST /api/users — Tambah pengguna baru (Khusus Administrator) */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "administrator") {
      return NextResponse.json({ error: "Hanya Administrator yang dapat menambah pengguna." }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = createUserSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Input tidak valid.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { nip, nama, password, role } = parseResult.data;
    const cleanNip = nip.trim();

    // Cek apakah NIP sudah terdaftar
    const existing = await prisma.user.findUnique({
      where: { nip: cleanNip },
    });

    if (existing) {
      return NextResponse.json({ error: `Pengguna dengan NIP ${cleanNip} sudah ada.` }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        nip: cleanNip,
        nama: nama.trim(),
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        nip: true,
        nama: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (err: any) {
    console.error("[USERS_POST] Error:", err);
    return NextResponse.json({ error: "Gagal menambahkan pengguna." }, { status: 500 });
  }
}
