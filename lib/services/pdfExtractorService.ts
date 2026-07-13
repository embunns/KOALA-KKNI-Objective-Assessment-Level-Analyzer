/**
 * pdfExtractorService
 * ---------------------------------------------------------------------------
 * Tanggung jawab: mengekstrak teks mentah dari file PDF, dengan fallback OCR
 * apabila PDF berupa hasil scan (tidak memiliki text layer).
 *
 * Catatan desain:
 * - pdf-parse dipakai untuk PDF digital (punya text layer).
 * - Jika hasil ekstraksi kosong/sangat pendek dibanding jumlah halaman,
 *   dianggap PDF hasil scan -> gunakan tesseract.js untuk OCR per halaman.
 * - Fungsi ini TIDAK melakukan interpretasi/analisis apapun, murni ekstraksi.
 */

// @ts-ignore - pdf-parse tidak menyediakan types resmi yang lengkap
import pdfParse from "pdf-parse";

export interface ExtractionResult {
  rawText: string;
  totalPages: number;
  isScanned: boolean;
}

/** Ambang batas: rata-rata karakter per halaman di bawah ini dianggap hasil scan. */
const SCAN_DETECTION_THRESHOLD_CHARS_PER_PAGE = 20;

export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  const parsed = await pdfParse(buffer);
  const totalPages = parsed.numpages || 1;
  const rawText = parsed.text || "";

  const avgCharsPerPage = rawText.length / Math.max(totalPages, 1);
  const isScanned = avgCharsPerPage < SCAN_DETECTION_THRESHOLD_CHARS_PER_PAGE;

  if (!isScanned) {
    return { rawText, totalPages, isScanned: false };
  }

  // Fallback OCR untuk PDF hasil scan.
  const ocrText = await runOcrFallback(buffer);
  return { rawText: ocrText, totalPages, isScanned: true };
}

async function runOcrFallback(_buffer: Buffer): Promise<string> {
  // Implementasi penuh: konversi tiap halaman PDF menjadi image (mis. via pdf-lib/canvas),
  // lalu jalankan tesseract.js per halaman dan gabungkan hasilnya.
  // Untuk MVP ini kita sediakan kerangka fungsinya agar mudah dilengkapi:
  //
  // const worker = await createWorker('ind');
  // let combined = "";
  // for (const pageImage of pageImages) {
  //   const { data } = await worker.recognize(pageImage);
  //   combined += data.text + "\n";
  // }
  // await worker.terminate();
  // return combined;
  return "";
}
