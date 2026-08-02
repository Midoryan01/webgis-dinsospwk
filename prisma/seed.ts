import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { dummyKecamatan, dummyDesa, dummyMasyarakat } from "../app/data/dummy";
import type { PKHRecord } from "../app/types";
import { hitungDanSimpanRekapDesa } from "../lib/rekapGraduasi";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Mulai seeding database WebGIS PKH...");

  // 1. Bersihkan tabel dengan urutan terbalik dari relasi foreign key
  console.log("🧹 Membersihkan data lama...");
  await prisma.rekapGraduasiDesa.deleteMany({});
  await prisma.warga.deleteMany({});
  await prisma.desa.deleteMany({});
  await prisma.kecamatan.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Insert Users (Admin & Operator)
  console.log("👤 Membuat data pengguna default...");
  const adminPassHash =
    process.env.ADMIN_PASSWORD_HASH && process.env.ADMIN_PASSWORD_HASH.startsWith("$2")
      ? process.env.ADMIN_PASSWORD_HASH
      : await bcrypt.hash(process.env.ADMIN_DEV_PASS || "admin123", 10);

  const operatorPassHash =
    process.env.OPERATOR_PASSWORD_HASH && process.env.OPERATOR_PASSWORD_HASH.startsWith("$2")
      ? process.env.OPERATOR_PASSWORD_HASH
      : await bcrypt.hash(process.env.OPERATOR_DEV_PASS || "dinsos2026", 10);

  await prisma.user.createMany({
    data: [
      {
        nip: process.env.ADMIN_NIP || "admin",
        nama: "Admin Dinas",
        password: adminPassHash,
        role: "administrator",
      },
      {
        nip: process.env.OPERATOR_NIP || "199001012020121001",
        nama: "Budi Santoso",
        password: operatorPassHash,
        role: "operator",
      },
    ],
  });
  console.log("✅ Berhasil membuat pengguna Administrator & Operator.");

  // 3. Insert Kecamatan
  console.log("🏛️  Membuat data Kecamatan...");
  const kecMap = new Map<string, number>();
  for (const [kecName] of Object.entries(dummyKecamatan)) {
    const kec = await prisma.kecamatan.create({
      data: {
        nama: kecName,
      },
    });
    kecMap.set(kecName, kec.id);
  }
  console.log(`✅ ${kecMap.size} Kecamatan dibuat.`);

  // 4. Insert Desa
  console.log("🏡 Membuat data Desa/Kelurahan...");
  const desaMapping = [
    { nama: "Munjuljaya", kecamatan: "Purwakarta" },
    { nama: "Nagri Kidul", kecamatan: "Purwakarta" },
  ];

  const desaMap = new Map<string, number>();
  for (const item of desaMapping) {
    const kecId = kecMap.get(item.kecamatan);
    if (!kecId) continue;
    const desaObj = await prisma.desa.create({
      data: {
        nama: item.nama,
        kecamatanId: kecId,
      },
    });
    desaMap.set(item.nama, desaObj.id);
  }
  console.log(`✅ ${desaMap.size} Desa dibuat.`);

  // 5. Insert Warga
  console.log("👨‍👩‍👧‍👦 Membuat data Penerima Warga...");
  let totalWarga = 0;
  for (const [desaName, wargaList] of Object.entries(dummyMasyarakat)) {
    const desaId = desaMap.get(desaName);
    if (!desaId) continue;

    for (const warga of wargaList) {
      await prisma.warga.create({
        data: {
          nama: warga.nama,
          alamat: warga.alamat,
          aud: warga.aud,
          sd: warga.sd,
          smp: warga.smp,
          sma: warga.sma,
          disabilitas: warga.disabilitas,
          lansia: warga.lansia,
          kategoriGraduasi: warga.kategoriGraduasi,
          desaId: desaId,
        },
      });
      totalWarga++;
    }
  }
  console.log(`✅ ${totalWarga} data Warga berhasil dimasukkan.`);

  // 6. Calculate & Save Rekap for all villages
  console.log("📊 Menghitung & menyimpan RekapGraduasiDesa...");
  for (const desaId of desaMap.values()) {
    await hitungDanSimpanRekapDesa(desaId);
  }

  console.log("🎉 Seeding database selesai secara sempurna!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal dengan error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

