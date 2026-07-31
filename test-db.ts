// test-db.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Koneksi Database Berhasil!');
  } catch (error) {
    console.error('❌ Koneksi Database Gagal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();