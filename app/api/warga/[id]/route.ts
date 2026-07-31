import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { hitungDanSimpanRekapDesa } from "@/lib/rekapGraduasi";

const updateWargaSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  alamat: z.string().min(1, "Alamat wajib diisi."),
  kecamatan: z.string().min(1, "Kecamatan wajib diisi."),
  desa: z.string().min(1, "Desa wajib diisi."),
  aud: z.coerce.number().default(0),
  sd: z.coerce.number().default(0),
  smp: z.coerce.number().default(0),
  sma: z.coerce.number().default(0),
  disabilitas: z.coerce.number().default(0),
  lansia: z.coerce.number().default(0),
  kategoriGraduasi: z.enum(["Rendah", "Sedang", "Tinggi"]).default("Sedang"),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || (session.role !== "operator" && session.role !== "administrator")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const resolvedParams = await params;
    const wargaId = Number(resolvedParams.id);
    if (!wargaId || isNaN(wargaId)) {
      return NextResponse.json({ error: "ID Warga tidak valid." }, { status: 400 });
    }

    const existingWarga = await prisma.warga.findUnique({
      where: { id: wargaId },
    });
    if (!existingWarga) {
      return NextResponse.json({ error: "Data warga tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const parseResult = updateWargaSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Input tidak valid.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const {
      nama,
      alamat,
      kecamatan,
      desa,
      aud,
      sd,
      smp,
      sma,
      disabilitas,
      lansia,
      kategoriGraduasi,
    } = parseResult.data;

    // Resolve Kecamatan
    let kecObj = await prisma.kecamatan.findUnique({
      where: { nama: kecamatan.trim() },
    });
    if (!kecObj) {
      kecObj = await prisma.kecamatan.create({
        data: { nama: kecamatan.trim() },
      });
    }

    // Resolve Desa
    let desaObj = await prisma.desa.findUnique({
      where: { nama: desa.trim() },
    });
    if (!desaObj) {
      desaObj = await prisma.desa.create({
        data: { nama: desa.trim(), kecamatanId: kecObj.id },
      });
    }

    const oldDesaId = existingWarga.desaId;
    const newDesaId = desaObj.id;

    const updatedWarga = await prisma.warga.update({
      where: { id: wargaId },
      data: {
        nama: nama.trim(),
        alamat: alamat.trim(),
        aud,
        sd,
        smp,
        sma,
        disabilitas,
        lansia,
        kategoriGraduasi,
        desaId: newDesaId,
      },
    });

    // Update rekap graduasi desa
    await hitungDanSimpanRekapDesa(newDesaId);
    if (oldDesaId !== newDesaId) {
      await hitungDanSimpanRekapDesa(oldDesaId);
    }

    return NextResponse.json(updatedWarga);
  } catch (err: any) {
    console.error("[WARGA_PUT] Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui data warga." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || (session.role !== "operator" && session.role !== "administrator")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const resolvedParams = await params;
    const wargaId = Number(resolvedParams.id);
    if (!wargaId || isNaN(wargaId)) {
      return NextResponse.json({ error: "ID Warga tidak valid." }, { status: 400 });
    }

    const existingWarga = await prisma.warga.findUnique({
      where: { id: wargaId },
    });
    if (!existingWarga) {
      return NextResponse.json({ error: "Data warga tidak ditemukan." }, { status: 404 });
    }

    const desaId = existingWarga.desaId;

    await prisma.warga.delete({
      where: { id: wargaId },
    });

    // Recalculate village rekap graduasi
    await hitungDanSimpanRekapDesa(desaId);

    return NextResponse.json({ success: true, message: "Data warga berhasil dihapus." });
  } catch (err: any) {
    console.error("[WARGA_DELETE] Error:", err);
    return NextResponse.json({ error: "Gagal menghapus data warga." }, { status: 500 });
  }
}
