/**
 * scripts/hash-password.js
 * Utility untuk generate bcrypt hash password.
 *
 * Usage:
 *   node scripts/hash-password.js <password>
 *
 * Contoh:
 *   node scripts/hash-password.js admin123
 *   node scripts/hash-password.js dinsos2024
 *
 * Salin output hash ke .env:
 *   ADMIN_PASSWORD_HASH=$2a$10$...
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("❌ Error: Password wajib diisi.");
  console.error("   Usage: node scripts/hash-password.js <password>");
  process.exit(1);
}

console.log(`⏳ Generating bcrypt hash untuk: "${password}" (10 rounds)...\n`);

bcrypt.hash(password, 10).then((hash) => {
  console.log("✅ Hash berhasil digenerate:");
  console.log("");
  console.log(`   Hash: ${hash}`);
  console.log("");
  console.log("📋 Salin ke file .env:");
  console.log(`   ADMIN_PASSWORD_HASH=${hash}`);
  console.log("   atau");
  console.log(`   OPERATOR_PASSWORD_HASH=${hash}`);
});
