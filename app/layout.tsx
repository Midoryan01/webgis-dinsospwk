import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "SIG Dinas Sosial — Kab. Purwakarta",
  description:
    "Sistem Informasi Geografis Program Keluarga Harapan (PKH) Dinas Sosial Kabupaten Purwakarta",
};

/**
 * Script yang di-inject sebelum render untuk menghindari flash saat load tema.
 * Membaca dari localStorage dan langsung set data-theme pada <html>.
 */
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('sig-theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Jalankan sebelum paint untuk cegah FOUC (Flash of Unstyled Content) */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
