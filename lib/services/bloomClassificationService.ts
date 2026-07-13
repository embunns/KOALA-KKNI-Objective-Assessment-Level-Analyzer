/**
 * bloomClassificationService
 * ---------------------------------------------------------------------------
 * Menentukan kategori Bloom yang dominan berdasarkan hasil deteksi KKO.
 * "Dominan" ditentukan oleh total frekuensi kemunculan KKO per kode Bloom,
 * bukan sekadar KKO tunggal dengan frekuensi tertinggi -- sehingga hasil lebih
 * representatif terhadap keseluruhan dokumen.
 */

import { DetectedKko } from "./kkoDetectionService";

export interface BloomDistribution {
  bloomCode: string;
  totalFrequency: number;
}

export function classifyDominantBloom(detectedKko: DetectedKko[]): {
  dominantBloom: string | null;
  distribution: BloomDistribution[];
} {
  if (detectedKko.length === 0) {
    return { dominantBloom: null, distribution: [] };
  }

  const totals: Record<string, number> = {};
  for (const kko of detectedKko) {
    totals[kko.bloomCode] = (totals[kko.bloomCode] || 0) + kko.frequency;
  }

  const distribution = Object.entries(totals)
    .map(([bloomCode, totalFrequency]) => ({ bloomCode, totalFrequency }))
    .sort((a, b) => b.totalFrequency - a.totalFrequency);

  return { dominantBloom: distribution[0].bloomCode, distribution };
}

/** Mapping awal Bloom -> kandidat rentang level KKNI. Referensi awal, bukan aturan mutlak. */
export const BLOOM_TO_KKNI_CANDIDATE: Record<string, [number, number]> = {
  C1: [1, 2],
  C2: [2, 3],
  C3: [3, 4],
  C4: [4, 5],
  C5: [5, 6],
  C6: [6, 9],
};
