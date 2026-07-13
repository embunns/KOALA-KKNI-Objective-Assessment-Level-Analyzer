import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Hapus cookie token dengan set maxAge 0
  response.cookies.set("kkni_token", "", { httpOnly: true, maxAge: 0, path: "/" });
  return response;
}