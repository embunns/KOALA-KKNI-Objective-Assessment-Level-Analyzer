/**
 * similarityService
 * ---------------------------------------------------------------------------
 * Membandingkan dokumen yang dianalisis dengan Database Histori Training
 * menggunakan pendekatan semantic similarity (disederhanakan menjadi weighted
 * token-overlap similarity untuk MVP; siap diganti dengan embedding vector +
 * cosine similarity di iterasi berikutnya tanpa mengubah kontrak fungsi ini).
 *
 * Threshold (sesuai business rule):
 *   >=95%      Sangat Mirip  -> referensi utama
 *   90-94%     Mirip         -> referensi utama
 *   70-89%     Cukup Mirip   -> referensi pendukung
 *   <70%       diabaikan
 */

export interface TrainingHistoryRecord {
  id: string;
  trainingName: string;
  kkniLevel: number;
  unitCompetency: string;
}

export interface SimilarityMatch {
  trainingId: string;
  trainingName: string;
  kkniLevel: number;
  similarity: number; // 0-100
}

export function findSimilarHistory(
  documentText: string,
  history: TrainingHistoryRecord[]
): SimilarityMatch[] {
  const docTokens = tokenize(documentText);

  const matches = history.map((h) => {
    const historyTokens = tokenize(h.unitCompetency);
    const similarity = cosineSimilarity(docTokens, historyTokens) * 100;
    return {
      trainingId: h.id,
      trainingName: h.trainingName,
      kkniLevel: h.kkniLevel,
      similarity: Math.round(similarity * 100) / 100,
    };
  });

  return matches.filter((m) => m.similarity >= 70).sort((a, b) => b.similarity - a.similarity);
}

function tokenize(text: string): Map<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return freq;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const key of allKeys) {
    const av = a.get(key) || 0;
    const bv = b.get(key) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
