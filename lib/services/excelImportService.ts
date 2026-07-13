/**
 * excelImportService
 * ---------------------------------------------------------------------------
 * Mem-parsing file Excel Database Histori Training.
 *
 * CATATAN PENTING mengenai format file sumber (Daftar_Unit_Kompetensi.xlsx):
 * Setiap sheet (selain sheet referensi mapping) memiliki kolom
 * PELATIHAN | KKNI | UNIT KOMPETENSI | REFERENCE, di mana satu training bisa
 * memiliki BANYAK baris "Unit Kompetensi" -- kolom PELATIHAN, KKNI, dan
 * REFERENCE hanya terisi pada baris pertama tiap grup (baris berikutnya NaN).
 * Karena itu wajib dilakukan forward-fill sebelum group-by nama training.
 */

import * as XLSX from "xlsx";

export interface ParsedTrainingHistory {
  trainingName: string;
  provider: string | null;
  kkniLevel: number;
  unitCompetency: string;
  reference: string | null;
}

const IGNORED_SHEETS = ["sheet1"]; // sheet referensi mapping KKO->Level, bukan data histori

export function parseTrainingHistoryExcel(source: Buffer | string): ParsedTrainingHistory[] {
  const workbook = Buffer.isBuffer(source) ? XLSX.read(source, { type: "buffer" }) : XLSX.readFile(source);
  const results: ParsedTrainingHistory[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (IGNORED_SHEETS.includes(sheetName.toLowerCase())) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    // Cari baris header (yang mengandung "PELATIHAN").
    const headerRowIndex = rows.findIndex((r) =>
      r.some((cell) => typeof cell === "string" && cell.toUpperCase().includes("PELATIHAN"))
    );
    if (headerRowIndex === -1) continue;

    const headerRow = rows[headerRowIndex].map((c) => (typeof c === "string" ? c.toUpperCase().trim() : c));
    const colIndex = {
      training: headerRow.findIndex((c) => c === "PELATIHAN"),
      kkni: headerRow.findIndex((c) => c === "KKNI"),
      unit: headerRow.findIndex((c) => typeof c === "string" && c.includes("UNIT KOMPETENSI")),
      reference: headerRow.findIndex((c) => typeof c === "string" && c.includes("REFERENCE")),
    };
    if (colIndex.training === -1 || colIndex.unit === -1) continue;

    // Forward-fill training/kkni/reference, lalu group-by training.
    const grouped: Record<string, ParsedTrainingHistory> = {};
    let lastTraining: string | null = null;
    let lastKkni: number | null = null;
    let lastReference: string | null = null;

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => c === null || c === undefined || c === "")) continue;

      const trainingCell = row[colIndex.training];
      const kkniCell = row[colIndex.kkni];
      const unitCell = row[colIndex.unit];
      const refCell = colIndex.reference !== -1 ? row[colIndex.reference] : null;

      if (trainingCell && typeof trainingCell === "string") {
        lastTraining = trainingCell.trim();
        lastKkni = parseKkniLevel(kkniCell);
        lastReference = refCell ? String(refCell).trim() : null;
      }

      if (!lastTraining || lastKkni === null) continue; // level tidak valid -> skip (tandai error di layer UI/API)
      if (!unitCell) continue;

      const key = lastTraining;
      if (!grouped[key]) {
        grouped[key] = {
          trainingName: lastTraining,
          provider: null, // kolom Provider tidak ada eksplisit di file sumber -> NULL, sesuai aturan
          kkniLevel: lastKkni,
          unitCompetency: "",
          reference: lastReference,
        };
      }
      const unitText = String(unitCell).trim();
      grouped[key].unitCompetency = grouped[key].unitCompetency
        ? `${grouped[key].unitCompetency}; ${unitText}`
        : unitText;
    }

    results.push(...Object.values(grouped));
  }

  return results;
}

function parseKkniLevel(cell: any): number | null {
  if (cell === null || cell === undefined) return null;
  const match = String(cell).match(/(\d+)/);
  if (!match) return null;
  const level = parseInt(match[1], 10);
  return level >= 1 && level <= 9 ? level : null;
}
