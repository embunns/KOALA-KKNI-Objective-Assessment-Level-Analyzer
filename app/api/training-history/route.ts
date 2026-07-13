import { NextRequest, NextResponse } from "next/server";
import { trainingHistoryRepository } from "@/lib/repositories/trainingHistoryRepository";
import { trainingHistorySchema } from "@/lib/validations/schemas";

export async function GET() {
  const data = await trainingHistoryRepository.findAll();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = trainingHistorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await trainingHistoryRepository.create(parsed.data);
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  const updated = await trainingHistoryRepository.update(body.id, body);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
  await trainingHistoryRepository.remove(id);
  return NextResponse.json({ success: true });
}
