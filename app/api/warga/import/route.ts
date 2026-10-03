// ⚠️ FILE DEBUG SEMENTARA — JANGAN DIPAKAI DI PRODUCTION ⚠️
// Tujuan: isolasi apakah hang terjadi di verifyToken() atau di bagian Prisma.
// Setelah selesai debugging, HAPUS file ini (jangan cuma dikomentari,
// karena kalau folder ini ke-deploy, siapapun bisa import data tanpa login).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { hitungDanSimpanRekapDesa } from "@/lib/rekapGraduasi";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("sig_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Sesi tidak valid. Silakan login terlebih dahulu." }, { status: 401 });
    }
    const session = await verifyToken(token);
    if (!session || (session.role !== "operator" && session.role !== "administrator")) {
      return NextResponse.json({ error: "Akses ditolak. Perlu peran operator atau administrator." }, { status: 403 });
    }

    const body = await req.json();
    const { wargaList } = body as { wargaList: any[] };
    console.log(`[IMPORT_DEBUG] Body berhasil di-parse, ${wargaList?.length} baris.`);

    if (!Array.isArray(wargaList) || wargaList.length === 0) {
      return NextResponse.json({ error: "Data yang dikirimkan tidak valid atau kosong." }, { status: 400 });
    }

    const rows = wargaList.map((row) => ({
      kecamatan: String(row.kecamatan ?? "").trim(),
      desa: String(row.desa ?? "").trim(),
      nama: String(row.nama ?? "").trim(),
      alamat: String(row.alamat ?? "").trim(),
      aud: Number(row.aud) || 0,
      sd: Number(row.sd) || 0,
      smp: Number(row.smp) || 0,
      sma: Number(row.sma) || 0,
      disabilitas: Number(row.disabilitas) || 0,
      lansia: Number(row.lansia) || 0,
      kategoriGraduasi: row.kategoriGraduasi || "Sedang",
    }));

    console.log("[IMPORT_DEBUG] Mulai query Kecamatan/Desa...");
    const namaKecamatanUnik = [...new Set(rows.map((r) => r.kecamatan).filter(Boolean))];
    const namaDesaUnik = [...new Set(rows.map((r) => r.desa).filter(Boolean))];

    const [kecamatanAda, desaAda] = await Promise.all([
      prisma.kecamatan.findMany({ where: { nama: { in: namaKecamatanUnik } } }),
      prisma.desa.findMany({ where: { nama: { in: namaDesaUnik } } }),
    ]);
    console.log(`[IMPORT_DEBUG] Ditemukan ${kecamatanAda.length} kecamatan, ${desaAda.length} desa existing.`);

    // Map berbasis lower-case key untuk pencocokan case-insensitive dengan DB
    const kecamatanMap = new Map<string, number>(
      kecamatanAda.map((k: { id: number; nama: string }) => [k.nama.toLowerCase().trim(), k.id])
    );
    const desaMap = new Map<string, typeof desaAda[number]>(
      desaAda.map((d: typeof desaAda[number]) => [d.nama.toLowerCase().trim(), d])
    );

    console.log("[IMPORT_DEBUG] Membuat kecamatan baru (jika ada)...");
    const kecamatanBaruMap = new Map<string, string>(); // lowerKey -> originalName
    for (const r of rows) {
      if (r.kecamatan) {
        const lower = r.kecamatan.toLowerCase();
        if (!kecamatanMap.has(lower) && !kecamatanBaruMap.has(lower)) {
          kecamatanBaruMap.set(lower, r.kecamatan);
        }
      }
    }

    if (kecamatanBaruMap.size > 0) {
      for (const [lowerKey, originalName] of kecamatanBaruMap.entries()) {
        const created = await prisma.kecamatan.create({ data: { nama: originalName } });
        kecamatanMap.set(lowerKey, created.id);
      }
      console.log(`[IMPORT_DEBUG] ${kecamatanBaruMap.size} kecamatan baru dibuat.`);
    }

    console.log("[IMPORT_DEBUG] Membuat desa baru (jika ada)...");
    const desaBaruMap = new Map<string, { originalName: string; kecamatanName: string }>(); // lowerKey -> info
    for (const r of rows) {
      if (r.desa) {
        const lower = r.desa.toLowerCase();
        if (!desaMap.has(lower) && !desaBaruMap.has(lower)) {
          desaBaruMap.set(lower, { originalName: r.desa, kecamatanName: r.kecamatan });
        }
      }
    }

    if (desaBaruMap.size > 0) {
      for (const [lowerKey, { originalName, kecamatanName }] of desaBaruMap.entries()) {
        const kecId = kecamatanMap.get(kecamatanName.toLowerCase());
        if (kecId) {
          const created = await prisma.desa.create({
            data: { nama: originalName, kecamatanId: kecId },
          });
          desaMap.set(lowerKey, created);
        }
      }
      console.log(`[IMPORT_DEBUG] ${desaBaruMap.size} desa baru dibuat.`);
    }

    console.log("[IMPORT_DEBUG] Query warga existing...");
    const desaIdTerlibat = [
      ...new Set(
        rows
          .map((r) => desaMap.get(r.desa.toLowerCase())?.id)
          .filter((id): id is number => id !== undefined)
      ),
    ];
    const wargaAda = await prisma.warga.findMany({
      where: { desaId: { in: desaIdTerlibat } },
      select: { id: true, nama: true, alamat: true, desaId: true },
    });
    console.log(`[IMPORT_DEBUG] Ditemukan ${wargaAda.length} warga existing di desa terkait.`);

    const cleanStr = (s: string) =>
      (s || "")
        .toLowerCase()
        .replace(/[\.\,\-\/\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Map berbasis desaId + nama + alamat (mencegah tabrakan nama sama di desa yang sama)
    const exactWargaMap = new Map<string, number>();
    // Tracking frekuensi nama per desa
    const nameCountPerDesa = new Map<string, number>();
    const singleNameMap = new Map<string, number>();

    for (const w of wargaAda) {
      const exactKey = `${w.desaId}::${cleanStr(w.nama)}::${cleanStr(w.alamat)}`;
      exactWargaMap.set(exactKey, w.id);

      const nameKey = `${w.desaId}::${cleanStr(w.nama)}`;
      nameCountPerDesa.set(nameKey, (nameCountPerDesa.get(nameKey) || 0) + 1);
      singleNameMap.set(nameKey, w.id);
    }

    const toCreate: Prisma.WargaCreateManyInput[] = [];
    const toUpdate: { id: number; data: any }[] = [];
    const affectedDesaIds = new Set<number>();
    const usedExistingIds = new Set<number>();

    for (const row of rows) {
      const desa = desaMap.get(row.desa.toLowerCase());
      if (!desa) continue;
      const desaId = desa.id;
      affectedDesaIds.add(desaId);

      const exactKey = `${desaId}::${cleanStr(row.nama)}::${cleanStr(row.alamat)}`;
      const nameKey = `${desaId}::${cleanStr(row.nama)}`;

      let existingId: number | undefined = undefined;

      // 1. Cek kecocokan persis: desaId + nama + alamat
      if (exactWargaMap.has(exactKey)) {
        const candidateId = exactWargaMap.get(exactKey)!;
        if (!usedExistingIds.has(candidateId)) {
          existingId = candidateId;
        }
      }

      // 2. Fallback: hanya jika nama tersebut BENAR-BENAR UNIK (hanya ada 1 orang dengan nama itu di desa tersebut)
      //    Jika ada lebih dari 1 orang dengan nama itu (misal ada dua "NENI"), JANGAN fallback ke nama saja agar tidak tertukar!
      if (!existingId && (nameCountPerDesa.get(nameKey) === 1)) {
        const candidateId = singleNameMap.get(nameKey)!;
        if (!usedExistingIds.has(candidateId)) {
          existingId = candidateId;
        }
      }

      const data = {
        alamat: row.alamat,
        aud: row.aud,
        sd: row.sd,
        smp: row.smp,
        sma: row.sma,
        disabilitas: row.disabilitas,
        lansia: row.lansia,
        kategoriGraduasi: row.kategoriGraduasi,
      };

      if (existingId) {
        usedExistingIds.add(existingId);
        toUpdate.push({ id: existingId, data });
      } else {
        toCreate.push({ nama: row.nama, desaId, ...data });
      }
    }
    console.log(`[IMPORT_DEBUG] ${toCreate.length} baru, ${toUpdate.length} update. Mulai write...`);

    if (toCreate.length > 0) {
      await prisma.warga.createMany({ data: toCreate });
      console.log("[IMPORT_DEBUG] createMany selesai.");
    }

    if (toUpdate.length > 0) {
      await prisma.$transaction(
        toUpdate.map((u) => prisma.warga.update({ where: { id: u.id }, data: u.data })),
        { timeout: 30_000 }
      );
      console.log("[IMPORT_DEBUG] Batch update selesai.");
    }

    console.log("[IMPORT_DEBUG] Mulai hitung rekap...");
    await Promise.all([...affectedDesaIds].map((id) => hitungDanSimpanRekapDesa(id)));
    console.log("[IMPORT_DEBUG] Rekap selesai. DONE.");

    return NextResponse.json({
      success: true,
      count: rows.length,
      created: toCreate.length,
      updated: toUpdate.length,
    });
  } catch (err: any) {
    console.error("[IMPORT_DEBUG] ERROR:", err);
    return NextResponse.json({ error: `${err.message || err}` }, { status: 500 });
  }
}