import { NextRequest, NextResponse } from "next/server";
import { parseKkoExcel } from "@/lib/services/kkoImportService";
import { prisma } from "@/lib/prisma";
import { MAX_EXCEL_SIZE_BYTES } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mode = (formData.get("mode") as string) || "skip"; // "skip" | "update"

  if (!file) return NextResponse.json({ error: "File Excel wajib diupload." }, { status: 400 });
  if (file.size > MAX_EXCEL_SIZE_BYTES) {
    return NextResponse.json({ error: "Excel maksimal 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseKkoExcel(buffer);
  const bloomCategories = await prisma.bloomCategory.findMany();
  const bloomMap = new Map(bloomCategories.map((b: any) => [b.code.toUpperCase(), b.id]));

  const result = { created: 0, updated: 0, skipped: 0, invalidBloom: 0 };

  for (const row of rows) {
    const bloomId = bloomMap.get(row.bloomCode);
    if (!bloomId) {
      result.invalidBloom++;
      continue;
    }

    const existing = await prisma.kKO.findUnique({ where: { word: row.word } });
    if (existing) {
      if (mode === "update") {
        await prisma.kKO.update({
          where: { id: existing.id },
          data: { bloomId, description: row.description ?? existing.description },
        });
        result.updated++;
      } else {
        result.skipped++;
      }
    } else {
      await prisma.kKO.create({ data: { word: row.word, bloomId, description: row.description } });
      result.created++;
    }
  }

  return NextResponse.json(result);
}