import { NextRequest, NextResponse } from "next/server";
import { parseTrainingHistoryExcel } from "@/lib/services/excelImportService";
import { trainingHistoryRepository } from "@/lib/repositories/trainingHistoryRepository";
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
  const rows = parseTrainingHistoryExcel(buffer);

  const result = { created: 0, updated: 0, skipped: 0 };
  for (const row of rows) {
    const existing = await trainingHistoryRepository.findByName(row.trainingName);
    if (existing) {
      if (mode === "update") {
        await trainingHistoryRepository.update(existing.id, row);
        result.updated++;
      } else {
        result.skipped++;
      }
    } else {
      await trainingHistoryRepository.create(row);
      result.created++;
    }
  }

  return NextResponse.json(result);
}
