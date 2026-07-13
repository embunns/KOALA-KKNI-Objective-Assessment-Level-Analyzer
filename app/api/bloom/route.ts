import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.bloomCategory.findMany({ orderBy: [{ category: "asc" }, { code: "asc" }] });
  return NextResponse.json(data);
}