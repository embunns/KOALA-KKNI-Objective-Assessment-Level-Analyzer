import { extractTextFromPdf, extractTextFromImage } from "./pdfExtractorService";
import { preprocessText } from "./preprocessingService";
import { detectSections } from "./sectionDetectionService";
import { detectKko, KkoWithBloom } from "./kkoDetectionService";
import { classifyDominantBloom } from "./bloomClassificationService";
import { findSimilarHistory, TrainingHistoryRecord } from "./similarityService";
import { scoreDocumentAgainstKkni, KkniLevelRef, AspectScores } from "./kkniScoringService";
import { generateJustification } from "./justificationService";
import { determineLevelWithAi } from "./aiLevelDeterminationService";

export interface AnalysisDependencies {
  kkoList: KkoWithBloom[];
  kkniLevels: KkniLevelRef[];
  trainingHistory: TrainingHistoryRecord[];
}

export interface AnalysisOutput {
  trainingTitle: string | null;
  summary: string;
  learningOutcomes: string[];
  materials: string[];
  detectedKKO: { word: string; bloomCode: string; frequency: number }[];
  dominantBloom: string | null;
  candidateLevels: { level: number; score: number }[];
  recommendedLevel: number;
  confidence: number;
  aspectScores: AspectScores;
  matchedHistory: { trainingId: string; trainingName: string; similarity: number; kkniLevel: number }[];
  reasoning: string;
  justification: string;
  status: "Completed" | "Needs Manual Review";
  aiUsed: boolean;
}

const MIN_TEXT_LENGTH_FOR_FULL_CONFIDENCE = 400;

export async function runAnalysis(
  fileBuffer: Buffer,
  deps: AnalysisDependencies,
  fileType: "pdf" | "image" = "pdf"
): Promise<AnalysisOutput> {
  // 1. Extract
  const extraction = fileType === "image" ? await extractTextFromImage(fileBuffer) : await extractTextFromPdf(fileBuffer);

  if (!extraction.rawText || extraction.rawText.trim().length === 0) {
    throw new Error("Dokumen tidak memiliki teks yang dapat dianalisis.");
  }

  // 2. Preprocess
  const cleanedText = preprocessText(extraction.rawText);

  // 3. Section Detection
  const sections = detectSections(cleanedText);

  // 4. KKO Detection
  const detectedKko = detectKko(cleanedText, deps.kkoList);

  // 5. Bloom Classification
  const { dominantBloom } = classifyDominantBloom(detectedKko);

  // 6. Similarity vs Histori
  const historyMatches = findSimilarHistory(
    [sections.objectives, sections.learningOutcome, sections.materials, sections.competencies]
      .filter(Boolean)
      .join(" "),
    deps.trainingHistory
  );

  // 7. Penentuan Level KKNI
  // Coba dulu pakai AI (OpenAI) yang membaca keseluruhan konteks dokumen -- lebih toleran
  // terhadap dokumen yang tidak terstruktur rapi. Jika API key tidak ada atau AI gagal
  // merespons dengan valid, fallback ke rule-based scoring (selalu konsisten & bisa diaudit).
  const aiResult = await determineLevelWithAi(cleanedText, sections, detectedKko, deps.kkniLevels);

  const scoring = scoreDocumentAgainstKkni(sections, detectedKko, deps.kkniLevels, historyMatches);

  const recommendedLevel = aiResult?.recommendedLevel ?? scoring.recommendedLevel;
  const candidateLevels = aiResult?.candidateLevels ?? scoring.candidateLevels;
  const aiUsed = aiResult !== null;

  // aspectScores tetap dihitung dari rule-based (untuk level yang benar-benar direkomendasikan)
  // agar Admin selalu punya breakdown skor per aspek untuk transparansi/explainability,
  // baik ketika levelnya berasal dari AI maupun rule-based.
  const winningKkniForAspects = deps.kkniLevels.find((k) => k.level === recommendedLevel) || deps.kkniLevels[0];
  const aspectScores = scoreDocumentAgainstKkni(sections, detectedKko, [winningKkniForAspects], historyMatches).aspectScores;

  // 8. Fallback rule: jika dokumen hanya berisi judul + deskripsi singkat -> confidence maks 60%.
  let finalConfidence = aiResult?.confidence ?? scoring.confidence;
  const isSparseDocument = cleanedText.length < MIN_TEXT_LENGTH_FOR_FULL_CONFIDENCE;
  if (isSparseDocument) {
    finalConfidence = Math.min(finalConfidence, 60);
  }

  const status: AnalysisOutput["status"] = finalConfidence < 70 ? "Needs Manual Review" : "Completed";

  // 9. Justification: pakai hasil dari AI langsung jika tersedia (sudah termasuk reasoning),
  // kalau tidak, susun dari template rule-based seperti sebelumnya.
  let justification: string;
  let reasoning: string;

  if (aiResult) {
    justification = aiResult.justification || "";
    reasoning = aiResult.reasoning || "";
  } else {
    const winningLevel = deps.kkniLevels.find((k) => k.level === recommendedLevel);
    justification = await generateJustification({
      recommendedLevel,
      confidence: finalConfidence,
      candidateLevels,
      dominantBloom,
      detectedKko,
      historyMatches,
      levelDescription: winningLevel?.description || "Tidak ditemukan",
    });
    reasoning = buildReasoningTrace(sections, dominantBloom, recommendedLevel, historyMatches);
  }

  return {
    trainingTitle: sections.title,
    summary: sections.objectives || sections.title || "Tidak ditemukan",
    learningOutcomes: sections.learningOutcome ? [sections.learningOutcome] : [],
    materials: sections.materials ? [sections.materials] : [],
    detectedKKO: detectedKko,
    dominantBloom,
    candidateLevels,
    recommendedLevel,
    confidence: finalConfidence,
    aspectScores,
    matchedHistory: historyMatches.map((h) => ({
      trainingId: h.trainingId,
      trainingName: h.trainingName,
      similarity: h.similarity,
      kkniLevel: h.kkniLevel,
    })),
    reasoning,
    justification,
    status,
    aiUsed,
  };
}

function buildReasoningTrace(
  sections: ReturnType<typeof detectSections>,
  dominantBloom: string | null,
  recommendedLevel: number,
  historyMatches: ReturnType<typeof findSimilarHistory>
): string {
  const steps: string[] = [];
  if (sections.learningOutcome) {
    steps.push(`Learning Outcome menunjukkan kemampuan pada tingkat kognitif ${dominantBloom || "yang tidak teridentifikasi jelas"}.`);
  } else {
    steps.push("Learning Outcome tidak ditemukan secara eksplisit pada dokumen.");
  }
  if (sections.materials) {
    steps.push("Materi pelatihan telah dinilai kompleksitasnya berdasarkan kata kunci yang terkandung.");
  }
  if (historyMatches.length > 0) {
    steps.push(`Ditemukan histori dengan kemiripan tertinggi ${historyMatches[0].similarity}% pada Level ${historyMatches[0].kkniLevel}.`);
  } else {
    steps.push("Tidak ditemukan histori yang cukup mirip untuk dijadikan referensi tambahan.");
  }
  steps.push(`Berdasarkan kombinasi faktor di atas, Level ${recommendedLevel} dipilih sebagai rekomendasi akhir.`);
  return steps.join(" ");
}