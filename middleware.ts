import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Middleware terpusat: melindungi semua halaman & API kecuali /login dan /api/login.
// Sebelumnya proteksi hanya manual per-route (lihat catatan Bagian 8 dokumentasi),
// sekarang berlaku otomatis untuk seluruh app/(app)/* dan app/api/* (kecuali auth publik).
//
// CATATAN TEKNIS: middleware Next.js berjalan di Edge Runtime, yang TIDAK mendukung
// library "jsonwebtoken" (butuh Node.js API). Karena itu verifikasi token di sini
// pakai "jose" yang edge-compatible, walau signing token tetap pakai jsonwebtoken
// di lib/auth.ts (dipakai di API routes yang berjalan di Node.js runtime).
const PUBLIC_PATHS = ["/login", "/api/login"];
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret");

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("kkni_token")?.value;
  let isValid = false;

  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isValid = true;
    } catch {
      isValid = false;
    }
  }

  if (!isValid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|branding|uploads).*)"],
};