import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const data = await prisma.analysisHistory.findUnique({
    where: { id },
    include: { document: true },
  });
  if (!data) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  return NextResponse.json(data);
}

// Admin dapat mengoreksi hasil rekomendasi AI (keputusan akhir tetap di tangan Admin).
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["recommendedLevel", "status", "justification", "confidence", "manuallyEdited"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }
  const updated = await prisma.analysisHistory.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.analysisHistory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });
  await prisma.analysisHistory.delete({ where: { id } });
  await prisma.uploadedDocument.delete({ where: { id: existing.documentId } }).catch(() => {});
  return NextResponse.json({ success: true });
}