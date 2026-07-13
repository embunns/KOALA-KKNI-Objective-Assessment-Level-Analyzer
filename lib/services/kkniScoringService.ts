/**
 * kkniScoringService
 * ---------------------------------------------------------------------------
 * Inti dari mesin rekomendasi Level KKNI. Menghitung skor kecocokan dokumen
 * terhadap SETIAP level KKNI (1-9) berdasarkan 6 komponen berbobot, lalu
 * memilih 3 level kandidat dengan skor tertinggi.
 *
 * Bobot komponen (sesuai business rule):
 *   Deskripsi KKNI     35%
 *   Learning Outcome   25%
 *   Materi             15%
 *   Tujuan             10%
 *   KKO                10%
 *   Histori             5%
 *
 * PENTING: aturan bisnis mewajibkan AI TIDAK menentukan level hanya dari nama
 * training -- karena itu, "nama training" sengaja TIDAK menjadi salah satu
 * komponen skor.
 */

import { DocumentSections } from "./sectionDetectionService";
import { DetectedKko } from "./kkoDetectionService";
import { BLOOM_TO_KKNI_CANDIDATE } from "./bloomClassificationService";
import type { SimilarityMatch } from "./similarityService";

export interface KkniLevelRef {
  level: number;
  description: string;
  knowledge: string;
  skill: string;
  responsibility: string;
}

export const SCORING_WEIGHTS = {
  kkniDescription: 0.35,
  learningOutcome: 0.25,
  materials: 0.15,
  objectives: 0.1,
  kko: 0.1,
  history: 0.05,
};

// Kata kunci kompleksitas (SPECIAL RULE 3-5 pada business rule).
const KEYWORDS_LOW = ["operator", "pelaksanaan rutin", "sop dasar", "tugas rutin", "pengenalan"];
const KEYWORDS_MEDIUM = [
  "analisis", "analisa", "problem solving", "pemecahan masalah", "decision making",
  "pengambilan keputusan", "audit", "risk analysis", "manajemen risiko", "data analytics",
  "tingkat risiko", "tanggap darurat", "manajemen tanggap darurat",
];
// CATATAN: kata seperti "leadership"/"kepemimpinan" SENGAJA tidak dimasukkan di sini.
// Business rule secara eksplisit memperingatkan bahwa training "Basic Leadership" tidak
// boleh otomatis dinilai Level 6 hanya karena topiknya kepemimpinan -- kompleksitas
// harus tercermin dari kata kerja/aktivitas nyata (menyusun strategi, mengelola
// organisasi), bukan sekadar nama topik yang disebutkan.
const KEYWORDS_HIGH = [
  "strategic", "strategi organisasi", "menyusun strategi", "transformation", "transformasi",
  "policy", "enterprise architecture", "it governance", "digital governance", "roadmap",
  "memimpin organisasi", "mengelola organisasi", "mengelola sumber daya",
];
const KEYWORDS_RESEARCH = ["research", "riset", "innovation", "inovasi", "publication", "publikasi", "international", "internasional", "multidisciplinary", "multidisiplin"];

export interface AspectScores {
  kkniDescription: number;
  learningOutcome: number;
  materials: number;
  objectives: number;
  kko: number;
  history: number;
}

export interface LevelCandidate {
  level: number;
  score: number;
}

export interface ScoringResult {
  candidateLevels: LevelCandidate[]; // diurutkan menurun, ambil 3 teratas
  recommendedLevel: number;
  confidence: number;
  aspectScores: AspectScores; // skor aspek untuk level yang direkomendasikan (explainability)
}

export function scoreDocumentAgainstKkni(
  sections: DocumentSections,
  detectedKko: DetectedKko[],
  kkniLevels: KkniLevelRef[],
  historyMatches: SimilarityMatch[]
): ScoringResult {
  const combinedText = [
    sections.learningOutcome,
    sections.objectives,
    sections.materials,
    sections.competencies,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const complexityBias = computeComplexityBias(combinedText);

  const levelScores: LevelCandidate[] = kkniLevels.map((kkni) => {
    const aspects = scoreAspectsForLevel(kkni, sections, detectedKko, historyMatches, complexityBias);
    const total =
      aspects.kkniDescription * SCORING_WEIGHTS.kkniDescription +
      aspects.learningOutcome * SCORING_WEIGHTS.learningOutcome +
      aspects.materials * SCORING_WEIGHTS.materials +
      aspects.objectives * SCORING_WEIGHTS.objectives +
      aspects.kko * SCORING_WEIGHTS.kko +
      aspects.history * SCORING_WEIGHTS.history;
    return { level: kkni.level, score: Math.round(total * 100) / 100 };
  });

  levelScores.sort((a, b) => b.score - a.score);
  const top3 = levelScores.slice(0, 3);
  const recommendedLevel = top3[0].level;
  const confidence = top3[0].score;

  const winningKkni = kkniLevels.find((k) => k.level === recommendedLevel)!;
  const aspectScores = scoreAspectsForLevel(winningKkni, sections, detectedKko, historyMatches, complexityBias);

  return { candidateLevels: top3, recommendedLevel, confidence, aspectScores };
}

function scoreAspectsForLevel(
  kkni: KkniLevelRef,
  sections: DocumentSections,
  detectedKko: DetectedKko[],
  historyMatches: SimilarityMatch[],
  complexityBias: number
): AspectScores {
  return {
    kkniDescription: scoreTextSimilarityToLevel(sections.competencies, kkni, complexityBias),
    learningOutcome: scoreLearningOutcome(sections.learningOutcome, kkni.level),
    materials: scoreMaterials(sections.materials, kkni.level),
    objectives: scoreObjectives(sections.objectives, kkni.level),
    kko: scoreKko(detectedKko, kkni.level),
    history: scoreHistory(historyMatches, kkni.level),
  };
}

/** Skor kedekatan level dengan bias kompleksitas dari keseluruhan dokumen. */
function scoreTextSimilarityToLevel(_competencies: string | null, kkni: KkniLevelRef, complexityBias: number): number {
  const distanceFromBias = Math.abs(kkni.level - complexityBias);
  return Math.max(0, 100 - distanceFromBias * 14);
}

function scoreLearningOutcome(lo: string | null, level: number): number {
  if (!lo) return 40; // tidak ditemukan -> skor netral rendah, bukan 0 (hindari asumsi negatif ekstrem)
  const text = lo.toLowerCase();
  const impliedLevel = impliedLevelFromBloomVerbs(text);
  if (impliedLevel === null) return 50;
  return Math.max(0, 100 - Math.abs(level - impliedLevel) * 15);
}

function scoreObjectives(obj: string | null, level: number): number {
  if (!obj) return 40;
  const text = obj.toLowerCase();
  let implied = 3;
  if (/menyusun strategi|strategic|strategi organisasi/.test(text)) implied = 7;
  else if (/menerapkan|mengimplementasikan/.test(text)) implied = 4;
  else if (/pemahaman dasar|dasar-dasar|pengenalan/.test(text)) implied = 2;
  return Math.max(0, 100 - Math.abs(level - implied) * 15);
}

function scoreMaterials(materials: string | null, level: number): number {
  if (!materials) return 40;
  const text = materials.toLowerCase();
  const bias = complexityScoreFromKeywords(text);
  return Math.max(0, 100 - Math.abs(level - bias) * 14);
}

function scoreKko(detectedKko: DetectedKko[], level: number): number {
  if (detectedKko.length === 0) return 40;
  let weightedSum = 0;
  let totalFreq = 0;
  for (const kko of detectedKko) {
    const range = BLOOM_TO_KKNI_CANDIDATE[kko.bloomCode];
    if (!range) continue;
    const mid = (range[0] + range[1]) / 2;
    weightedSum += mid * kko.frequency;
    totalFreq += kko.frequency;
  }
  if (totalFreq === 0) return 40;
  const impliedLevel = weightedSum / totalFreq;
  return Math.max(0, 100 - Math.abs(level - impliedLevel) * 14);
}

function scoreHistory(historyMatches: SimilarityMatch[], level: number): number {
  if (historyMatches.length === 0) return 50; // histori hanya referensi tambahan, bukan penentu utama
  const relevant = historyMatches.filter((h) => h.similarity >= 70);
  if (relevant.length === 0) return 50;
  const best = relevant.sort((a, b) => b.similarity - a.similarity)[0];
  const matchesLevel = best.kkniLevel === level;
  return matchesLevel ? Math.min(100, 60 + best.similarity * 0.4) : 40;
}

function impliedLevelFromBloomVerbs(text: string): number | null {
  const checks: [RegExp, number][] = [
    [/merancang|menciptakan|mengembangkan strategi/, 6.5],
    [/mengevaluasi/, 5.5],
    [/menganalisis/, 4.5],
    [/mengimplementasikan|menerapkan/, 3.5],
    [/menjelaskan|memahami/, 2.5],
    [/mengingat|mengetahui/, 1.5],
  ];
  for (const [pattern, level] of checks) {
    if (pattern.test(text)) return level;
  }
  return null;
}

function complexityScoreFromKeywords(text: string): number {
  const countMatches = (keywords: string[]) => keywords.filter((k) => text.includes(k)).length;

  const tiers: [number, number][] = [
    [countMatches(KEYWORDS_RESEARCH), 8.5],
    [countMatches(KEYWORDS_HIGH), 7],
    [countMatches(KEYWORDS_MEDIUM), 5],
    [countMatches(KEYWORDS_LOW), 2],
  ];

  const totalHits = tiers.reduce((sum, [count]) => sum + count, 0);
  if (totalHits === 0) return 4; // default netral jika tidak ada kata kunci kuat

  // Weighted average: kata kunci kompleksitas tinggi diberi bobot lebih besar per kemunculan
  // dibanding kata kunci kompleksitas rendah, sehingga satu kata generik (mis. "operator")
  // tidak otomatis menenggelamkan sinyal kompleksitas lain yang lebih kuat di dokumen yang sama.
  const weightedSum = tiers.reduce((sum, [count, value]) => sum + count * value, 0);
  return weightedSum / totalHits;
}

function computeComplexityBias(combinedText: string): number {
  return complexityScoreFromKeywords(combinedText);
}