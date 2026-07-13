/**
 * kkoImportService
 * ---------------------------------------------------------------------------
 * Mem-parsing file Excel Database KKO. Kolom yang didukung (case-insensitive,
 * dengan sedikit toleransi variasi nama kolom):
 *   word / kata kerja
 *   bloomCode / kode bloom / ranah kode
 *   description / deskripsi / tahap (opsional)
 */

import * as XLSX from "xlsx";

export interface ParsedKko {
  word: string;
  bloomCode: string;
  description: string | null;
}

export function parseKkoExcel(source: Buffer | string): ParsedKko[] {
  const workbook = Buffer.isBuffer(source)
    ? XLSX.read(source, { type: "buffer" })
    : XLSX.readFile(source);
  const sheetName = workbook.SheetNames.find((n) => /import|kko/i.test(n)) || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const headerRowIndex = rows.findIndex((r) =>
    r.some((cell) => typeof cell === "string" && /word|kata\s*kerja/i.test(cell))
  );
  if (headerRowIndex === -1) return [];

  const headerRow = rows[headerRowIndex].map((c) => (typeof c === "string" ? c.trim() : c));
  const colIndex = {
    word: headerRow.findIndex((c) => typeof c === "string" && /^word$|kata\s*kerja/i.test(c)),
    bloomCode: headerRow.findIndex((c) => typeof c === "string" && /bloomcode|kode\s*bloom|ranah\s*kode/i.test(c)),
    description: headerRow.findIndex((c) => typeof c === "string" && /description|deskripsi|tahap/i.test(c)),
  };
  if (colIndex.word === -1 || colIndex.bloomCode === -1) return [];

  const results: ParsedKko[] = [];
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const word = row[colIndex.word];
    const bloomCode = row[colIndex.bloomCode];
    if (!word || !bloomCode) continue;

    results.push({
      word: String(word).trim().toLowerCase(),
      bloomCode: String(bloomCode).trim().toUpperCase(),
      description: colIndex.description !== -1 && row[colIndex.description] ? String(row[colIndex.description]).trim() : null,
    });
  }
  return results;
}