/**
 * analysisOrchestrator
 * ---------------------------------------------------------------------------
 * Menjalankan seluruh AI Workflow secara berurutan:
 * Extract -> Preprocess -> Section Detection -> KKO Detection ->
 * Bloom Classification -> Similarity (Histori) -> Deteksi Sumber Dokumen ->
 * KKNI Scoring (rule-based & AI) -> Pemilihan Hasil Final -> Justification -> Output.
 *
 * PENDEKATAN PENENTUAN LEVEL (PENTING):
 * Level KKNI akhir dipilih berdasarkan SUMBER dokumen, bukan dicampur:
 * - Dokumen dari BNSP/LSP -> pakai hasil rule-based (skema sertifikasi BNSP
 *   sudah terstandarisasi ketat, sehingga penilaian berbasis aturan yang
 *   konsisten dan bisa diaudit lebih sesuai).
 * - Dokumen selain BNSP -> pakai hasil AI (Gemini), karena dokumen pelatihan
 *   umum/lembaga swasta seringkali formatnya tidak baku.
 * Rule-based TETAP selalu dihitung apa pun sumber dokumennya, baik untuk
 * ditampilkan sebagai skor per aspek (explainability) maupun sebagai fallback
 * kalau panggilan AI gagal/tidak tersedia untuk dokumen non-BNSP.
 *
 * Judul training diekstrak terpisah oleh AI (kalau tersedia) untuk keperluan
 * TAMPILAN saja -- nilai ini TIDAK PERNAH dipakai sebagai input penentuan level,
 * baik untuk dokumen BNSP maupun non-BNSP.
 *
 * Ini adalah satu-satunya "pintu masuk" yang dipanggil oleh API route
 * /api/analyze, sehingga API route tetap tipis (thin controller).
 */

import { extractTextFromPdf, extractTextFromImage } from "./pdfExtractorService";
import { preprocessText } from "./preprocessingService";
import { detectSections } from "./sectionDetectionService";
import { detectKko, KkoWithBloom } from "./kkoDetectionService";
import { classifyDominantBloom } from "./bloomClassificationService";
import { findSimilarHistory, TrainingHistoryRecord } from "./similarityService";
import { scoreDocumentAgainstKkni, KkniLevelRef, AspectScores } from "./kkniScoringService";
import { generateJustification } from "./justificationService";
import { assistWithGemini } from "./geminiAssistService";
import { isBnspDocument } from "./documentSourceService";

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
  documentSource: "BNSP" | "Non-BNSP";
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

  // 7. Deteksi sumber dokumen -- menentukan strategi penentuan level di langkah berikutnya.
  const documentSource: AnalysisOutput["documentSource"] = isBnspDocument(cleanedText) ? "BNSP" : "Non-BNSP";

  // 8. KKNI Scoring rule-based -- SELALU dihitung, dipakai untuk dokumen BNSP,
  // untuk skor per aspek (explainability), dan sebagai fallback bila AI gagal.
  const scoring = scoreDocumentAgainstKkni(sections, detectedKko, deps.kkniLevels, historyMatches);

  const winningKkniForAspects = deps.kkniLevels.find((k) => k.level === scoring.recommendedLevel) || deps.kkniLevels[0];
  const aspectScores = scoreDocumentAgainstKkni(sections, detectedKko, [winningKkniForAspects], historyMatches).aspectScores;

  // 9. Bantuan AI (ekstraksi judul + penilaian level). Dipanggil untuk semua
  // dokumen karena ekstraksi judulnya tetap berguna untuk dokumen BNSP juga,
  // tapi hasil LEVEL-nya hanya dipakai kalau dokumennya bukan dari BNSP.
  const geminiResult = await assistWithGemini(cleanedText, sections, detectedKko, deps.kkniLevels);

  let recommendedLevel = scoring.recommendedLevel;
  let candidateLevels = scoring.candidateLevels;
  let finalConfidence = scoring.confidence;
  let aiUsed = false;

  if (documentSource === "Non-BNSP" && geminiResult && geminiResult.assessedLevel !== null) {
    aiUsed = true;
    recommendedLevel = geminiResult.assessedLevel;
    finalConfidence = geminiResult.assessedConfidence;
    // candidateLevels tetap dari rule-based sebagai referensi pembanding di UI,
    // meski level akhir yang dipakai adalah hasil AI.
  }
  // Untuk dokumen BNSP, atau ketika AI gagal/tidak tersedia untuk dokumen non-BNSP,
  // recommendedLevel/finalConfidence tetap nilai rule-based yang sudah di-set di atas.

  // 10. Fallback rule: jika dokumen hanya berisi judul + deskripsi singkat -> confidence maks 60%.
  const isSparseDocument = cleanedText.length < MIN_TEXT_LENGTH_FOR_FULL_CONFIDENCE;
  if (isSparseDocument) {
    finalConfidence = Math.min(finalConfidence, 60);
  }

  const status: AnalysisOutput["status"] = finalConfidence < 70 ? "Needs Manual Review" : "Completed";

  // 11. Justification: selalu disusun dari fakta yang relevan dengan sumber hasil
  // yang benar-benar dipakai (rule-based atau AI), supaya alasannya konsisten
  // dengan angka level yang ditampilkan.
  let justification: string;
  if (aiUsed && geminiResult) {
    justification =
      `Dokumen ini terdeteksi bukan berasal dari BNSP/LSP, sehingga penentuan level mengacu pada penilaian AI. ` +
      `${geminiResult.reasoning} Sebagai pembanding, hasil rule-based murni menghasilkan Level ${scoring.recommendedLevel} ` +
      `dengan skor ${scoring.confidence}.`;
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
    if (documentSource === "BNSP") {
      justification = `Dokumen ini terdeteksi berasal dari BNSP/LSP, sehingga penentuan level mengacu pada skema rule-based. ${justification}`;
    }
  }

  const reasoning = buildReasoningTrace(sections, dominantBloom, recommendedLevel, historyMatches, documentSource, aiUsed);

  // Judul training: utamakan hasil ekstraksi AI (lebih toleran terhadap format
  // dokumen yang tidak baku), fallback ke hasil regex rule-based jika AI tidak
  // tersedia. Judul ini TIDAK pernah dipakai sebagai input pada scoring di atas.
  const trainingTitle = geminiResult?.title || sections.title;

  return {
    trainingTitle,
    summary: sections.objectives || trainingTitle || "Tidak ditemukan",
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
    documentSource,
    aiUsed,
  };
}

function buildReasoningTrace(
  sections: ReturnType<typeof detectSections>,
  dominantBloom: string | null,
  recommendedLevel: number,
  historyMatches: ReturnType<typeof findSimilarHistory>,
  documentSource: AnalysisOutput["documentSource"],
  aiUsed: boolean
): string {
  const steps: string[] = [];
  steps.push(
    documentSource === "BNSP"
      ? "Dokumen terdeteksi sebagai dokumen BNSP/LSP, sehingga level ditentukan lewat skema rule-based."
      : aiUsed
      ? "Dokumen terdeteksi bukan dari BNSP/LSP, sehingga level ditentukan lewat penilaian AI."
      : "Dokumen terdeteksi bukan dari BNSP/LSP, namun AI tidak tersedia sehingga tetap memakai skema rule-based."
  );
  if (sections.learningOutcome) {
    steps.push(`Learning Outcome menunjukkan kemampuan pada tingkat kognitif ${dominantBloom || "yang tidak teridentifikasi jelas"}.`);
  } else {
    steps.push("Learning Outcome tidak ditemukan secara eksplisit pada dokumen.");
  }
  if (historyMatches.length > 0) {
    steps.push(`Ditemukan histori dengan kemiripan tertinggi ${historyMatches[0].similarity}% pada Level ${historyMatches[0].kkniLevel}.`);
  }
  steps.push(`Berdasarkan kombinasi faktor di atas, Level ${recommendedLevel} dipilih sebagai rekomendasi akhir.`);
  return steps.join(" ");
}