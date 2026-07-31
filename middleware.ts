import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("sig_session")?.value;

  // Jika sudah terautentikasi dan mencoba mengakses /login -> redirect ke /admin
  if (pathname === "/login") {
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }
    }
    return NextResponse.next();
  }

  // Lindungi semua route /admin
  if (pathname.startsWith("/admin")) {
    // Tidak ada cookie → redirect ke login
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verifikasi JWT signature + expiry
    const payload = await verifyToken(token);

    if (!payload) {
      // Token tidak valid atau sudah expired → hapus cookie dan redirect
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      loginUrl.searchParams.set("reason", "session_expired");
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Hapus cookie yang tidak valid
      redirectResponse.cookies.set("sig_session", "", { maxAge: 0, path: "/" });
      return redirectResponse;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
