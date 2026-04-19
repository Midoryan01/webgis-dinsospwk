import { redirect } from "next/navigation";

/**
 * app/page.tsx — Root Route (/)
 * Redirect otomatis ke halaman login.
 *
 * Route map:
 *   /          → redirect ke /login (ini)
 *   /login     → Halaman login
 *   /map       → Peta publik GIS
 *   /admin     → Panel admin (protected, butuh login)
 */
export default function Page() {
  redirect("/login");
}
