import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signAdminToken } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  const token = signAdminToken({ id: admin.id, email: admin.email, name: admin.name });
  const response = NextResponse.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
  response.cookies.set("kkni_token", token, { httpOnly: true, maxAge: 60 * 60 * 8, path: "/" });
  return response;
}
