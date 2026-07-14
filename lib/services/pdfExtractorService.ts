import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";

export interface ExtractionResult {
  rawText: string;
  totalPages: number;
  isScanned: boolean;
}

/** Ambang batas: rata-rata karakter per halaman di bawah ini dianggap hasil scan. */
const SCAN_DETECTION_THRESHOLD_CHARS_PER_PAGE = 20;

/** Bahasa yang didukung OCR sekaligus: Indonesia + Inggris. */
const OCR_LANGUAGES = "ind+eng";

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  const parsed = await pdfParse(buffer);
  const totalPages = parsed.numpages || 1;
  const rawText = parsed.text || "";

  const avgCharsPerPage = rawText.length / Math.max(totalPages, 1);
  const isScanned = avgCharsPerPage < SCAN_DETECTION_THRESHOLD_CHARS_PER_PAGE;

  if (!isScanned) {
    return { rawText, totalPages, isScanned: false };
  }

  // Fallback OCR untuk PDF hasil scan. Catatan: OCR di sini dijalankan langsung pada
  // buffer PDF; untuk dokumen multi-halaman hasil scan, kualitas ekstraksi terbaik
  // dicapai bila tiap halaman dikonversi ke gambar terlebih dahulu -- perbaikan ini
  // bisa ditambahkan belakangan tanpa mengubah kontrak fungsi ini.
  const ocrText = await runOcr(buffer);
  return { rawText: ocrText, totalPages, isScanned: true };
}

/**
 * Ekstraksi teks dari file gambar (PNG/JPG) menggunakan OCR.
 * Dipakai saat Admin mengupload foto/scan dokumen pelatihan secara langsung,
 * bukan dalam bentuk PDF.
 */
export async function extractTextFromImage(buffer: Buffer): Promise<ExtractionResult> {
  const rawText = await runOcr(buffer);
  return { rawText, totalPages: 1, isScanned: true };
}

async function runOcr(buffer: Buffer): Promise<string> {
  const worker = await createWorker(OCR_LANGUAGES);
  try {
    const { data } = await worker.recognize(buffer);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}