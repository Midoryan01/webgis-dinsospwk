export default function PenerimaPage() {
  return (
    <div style={{ padding: 0, fontFamily: "'Inter','Segoe UI', system-ui, sans-serif" }}>
      <div style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-lg, 14px)",
        border: "1px solid var(--border)",
        padding: "48px",
        textAlign: "center",
        color: "var(--text-faint)",
        transition: "background 0.25s, border-color 0.25s",
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8, letterSpacing: "-0.01em" }}>
          Data Penerima PKH
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
          Halaman ini akan terhubung ke database Prisma. Sambungkan <code style={{ fontFamily: "monospace", background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4 }}>DATABASE_URL</code> di file .env untuk mengaktifkan fitur ini.
        </p>
      </div>
    </div>
  );
}
