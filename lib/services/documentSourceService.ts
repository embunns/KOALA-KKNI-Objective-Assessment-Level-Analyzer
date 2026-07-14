/**
 * documentSourceService
 * ---------------------------------------------------------------------------
 * Mendeteksi apakah dokumen pelatihan berasal dari BNSP (Badan Nasional
 * Sertifikasi Profesi) / LSP (Lembaga Sertifikasi Profesi resmi di bawah
 * BNSP), berdasarkan kata kunci yang muncul di teks dokumen.
 *
 * Hasil deteksi ini menentukan strategi penentuan Level KKNI di
 * analysisOrchestrator.ts:
 * - Dokumen BNSP/LSP -> pakai hasil rule-based (skema sertifikasi BNSP sudah
 *   terstandarisasi ketat, sehingga penilaian berbasis aturan lebih pas dan
 *   bisa diaudit langsung terhadap skema resminya).
 * - Dokumen selain BNSP -> pakai hasil AI (dokumen pelatihan umum/lembaga
 *   swasta seringkali formatnya tidak baku, AI lebih toleran menangkap
 *   konteksnya).
 */

const BNSP_KEYWORDS = [
  /\bBNSP\b/i,
  /badan\s+nasional\s+sertifikasi\s+profesi/i,
  /\bLSP\b/i,
  /lembaga\s+sertifikasi\s+profesi/i,
  /skema\s+sertifikasi/i,
];

export function isBnspDocument(text: string): boolean {
  return BNSP_KEYWORDS.some((pattern) => pattern.test(text));
}