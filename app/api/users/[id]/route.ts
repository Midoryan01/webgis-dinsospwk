import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const updateUserSchema = z.object({
  nip: z.string().min(1, "NIP wajib diisi."),
  nama: z.string().min(1, "Nama wajib diisi."),
  role: z.enum(["administrator", "operator"]).default("operator"),
  password: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "administrator") {
      return NextResponse.json({ error: "Hanya Administrator yang dapat memperbarui pengguna." }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = Number(resolvedParams.id);
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: "ID Pengguna tidak valid." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const parseResult = updateUserSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Input tidak valid.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { nip, nama, role, password } = parseResult.data;
    const cleanNip = nip.trim();

    // Check NIP uniqueness if changed
    if (cleanNip !== existingUser.nip) {
      const nipCheck = await prisma.user.findUnique({
        where: { nip: cleanNip },
      });
      if (nipCheck) {
        return NextResponse.json({ error: `NIP ${cleanNip} sudah digunakan oleh pengguna lain.` }, { status: 409 });
      }
    }

    const updateData: any = {
      nip: cleanNip,
      nama: nama.trim(),
      role,
    };

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter." }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        nip: true,
        nama: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    console.error("[USERS_PUT] Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui pengguna." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || session.role !== "administrator") {
      return NextResponse.json({ error: "Hanya Administrator yang dapat menghapus pengguna." }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = Number(resolvedParams.id);
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: "ID Pengguna tidak valid." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Prevent self deletion
    if (session.nip === existingUser.nip) {
      return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif." }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ success: true, message: "Pengguna berhasil dihapus." });
  } catch (err: any) {
    console.error("[USERS_DELETE] Error:", err);
    return NextResponse.json({ error: "Gagal menghapus pengguna." }, { status: 500 });
  }
}
