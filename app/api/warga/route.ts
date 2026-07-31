import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { hitungDanSimpanRekapDesa } from "@/lib/rekapGraduasi";

const createWargaSchema = z.object({
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const usePagination = pageParam !== null || limitParam !== null;

    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(200, Math.max(1, Number(limitParam) || 50));

    const [warga, total] = await Promise.all([
      prisma.warga.findMany({
        include: {
          desa: {
            include: {
              kecamatan: true,
            },
          },
        },
        orderBy: { id: "desc" },
        ...(usePagination
          ? { skip: (page - 1) * limit, take: limit }
          : {}),
      }),
      usePagination ? prisma.warga.count() : Promise.resolve(null),
    ]);

    const formatted = warga.map((w: any) => ({
      id: w.id,
      nama: w.nama,
      alamat: w.alamat,
      aud: w.aud,
      sd: w.sd,
      smp: w.smp,
      sma: w.sma,
      disabilitas: w.disabilitas,
      lansia: w.lansia,
      kategoriGraduasi: w.kategoriGraduasi,
      desa: w.desa.nama,
      kecamatan: w.desa.kecamatan.nama,
    }));

    if (!usePagination) {
      return NextResponse.json(formatted);
    }

    return NextResponse.json({
      data: formatted,
      page,
      limit,
      total,
      totalPages: Math.ceil((total ?? 0) / limit),
    });
  } catch (err: any) {
    console.error("[WARGA_GET] Error:", err);
    return NextResponse.json({ error: "Gagal memuat data warga." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || (session.role !== "operator" && session.role !== "administrator")) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = createWargaSchema.safeParse(body);

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
        data: { nama: kecamatan.trim(), penduduk: 0 },
      });
    }

    // Resolve Desa
    let desaObj = await prisma.desa.findUnique({
      where: { nama: desa.trim() },
    });
    if (!desaObj) {
      desaObj = await prisma.desa.create({
        data: { nama: desa.trim(), penduduk: 0, kecamatanId: kecObj.id },
      });
    }

    const warga = await prisma.warga.create({
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
        desaId: desaObj.id,
      },
    });

    await hitungDanSimpanRekapDesa(desaObj.id);

    return NextResponse.json({ success: true, warga });
  } catch (err: any) {
    console.error("[WARGA_POST] Error:", err);
    return NextResponse.json({ error: `Gagal menambahkan data warga: ${err.message || err}` }, { status: 500 });
  }
}