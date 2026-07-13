/**
 * kkoDetectionService
 * ---------------------------------------------------------------------------
 * Mendeteksi seluruh Kata Kerja Operasional (KKO) yang muncul di dalam teks
 * dokumen, beserta frekuensi kemunculannya. Daftar KKO diambil dari database
 * (bukan hardcode) agar Admin dapat menambah/mengubah KKO tanpa deploy ulang.
 */

export interface KkoWithBloom {
  word: string;
  bloomCode: string; // contoh: "C4"
}

export interface DetectedKko {
  word: string;
  bloomCode: string;
  frequency: number;
}

export function detectKko(text: string, kkoList: KkoWithBloom[]): DetectedKko[] {
  const lowerText = text.toLowerCase();
  const results: DetectedKko[] = [];

  for (const kko of kkoList) {
    const pattern = new RegExp(`\\b${escapeRegExp(kko.word.toLowerCase())}\\w*`, "g");
    const matches = lowerText.match(pattern);
    if (matches && matches.length > 0) {
      results.push({ word: kko.word, bloomCode: kko.bloomCode, frequency: matches.length });
    }
  }

  // Urutkan dari yang paling sering muncul.
  return results.sort((a, b) => b.frequency - a.frequency);
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
