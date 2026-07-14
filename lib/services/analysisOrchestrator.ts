import { extractTextFromPdf, extractTextFromImage } from "./pdfExtractorService";
import { preprocessText } from "./preprocessingService";
import { detectSections } from "./sectionDetectionService";
import { detectKko, KkoWithBloom } from "./kkoDetectionService";
import { classifyDominantBloom } from "./bloomClassificationService";
import { findSimilarHistory, TrainingHistoryRecord } from "./similarityService";
import { scoreDocumentAgainstKkni, KkniLevelRef, AspectScores } from "./kkniScoringService";
import { generateJustification } from "./justificationService";
import { assistWithGemini } from "./geminiAssistService";

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
  aiAgreement: "agree" | "close" | "disagree" | null;
}

const MIN_TEXT_LENGTH_FOR_FULL_CONFIDENCE = 400;
const AGREE_CONFIDENCE_BOOST = 8;
const DISAGREE_CONFIDENCE_CAP = 55;

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

  // 7. KKNI Scoring -- SELALU rule-based, ini yang menentukan level akhir.
  const scoring = scoreDocumentAgainstKkni(sections, detectedKko, deps.kkniLevels, historyMatches);
  const recommendedLevel = scoring.recommendedLevel;
  const candidateLevels = scoring.candidateLevels;

  const winningKkniForAspects = deps.kkniLevels.find((k) => k.level === recommendedLevel) || deps.kkniLevels[0];
  const aspectScores = scoreDocumentAgainstKkni(sections, detectedKko, [winningKkniForAspects], historyMatches).aspectScores;

  // 8. Bantuan AI (opsional): ekstraksi judul + penilaian pembanding independen.
  // Kalau GEMINI_API_KEY tidak diisi atau panggilan gagal, geminiResult bernilai
  // null dan seluruh proses lanjut normal memakai rule-based saja.
  const geminiResult = await assistWithGemini(cleanedText, sections, detectedKko, deps.kkniLevels);

  let finalConfidence = scoring.confidence;
  let aiUsed = false;
  let aiAgreement: AnalysisOutput["aiAgreement"] = null;

  if (geminiResult && geminiResult.assessedLevel !== null) {
    aiUsed = true;
    const diff = Math.abs(geminiResult.assessedLevel - recommendedLevel);
    if (diff === 0) {
      aiAgreement = "agree";
      finalConfidence = Math.min(100, finalConfidence + AGREE_CONFIDENCE_BOOST);
    } else if (diff === 1) {
      aiAgreement = "close";
      // Selisih satu level dianggap masih wajar -- confidence tidak diubah signifikan.
    } else {
      aiAgreement = "disagree";
      finalConfidence = Math.min(finalConfidence, DISAGREE_CONFIDENCE_CAP);
    }
  }

  // 9. Fallback rule: jika dokumen hanya berisi judul + deskripsi singkat -> confidence maks 60%.
  const isSparseDocument = cleanedText.length < MIN_TEXT_LENGTH_FOR_FULL_CONFIDENCE;
  if (isSparseDocument) {
    finalConfidence = Math.min(finalConfidence, 60);
  }

  const status: AnalysisOutput["status"] = finalConfidence < 70 ? "Needs Manual Review" : "Completed";

  // 10. Justification: selalu disusun dari fakta rule-based (template atau LLM
  // penyusun kalimat di justificationService.ts), lalu ditambah catatan hasil
  // pembanding AI apabila tersedia, supaya Admin tahu ada/tidaknya "second opinion".
  const winningLevel = deps.kkniLevels.find((k) => k.level === recommendedLevel);
  let justification = await generateJustification({
    recommendedLevel,
    confidence: finalConfidence,
    candidateLevels,
    dominantBloom,
    detectedKko,
    historyMatches,
    levelDescription: winningLevel?.description || "Tidak ditemukan",
  });

  if (geminiResult && geminiResult.assessedLevel !== null) {
    const agreementText =
      aiAgreement === "agree"
        ? "sejalan dengan"
        : aiAgreement === "close"
        ? "mendekati (selisih satu level dari)"
        : "berbeda cukup jauh dari";
    justification += ` Sebagai pembanding, penilaian independen oleh AI menghasilkan Level ${geminiResult.assessedLevel}, yang ${agreementText} hasil rule-based. Catatan AI: ${geminiResult.reasoning}`;
  }

  const reasoning = buildReasoningTrace(sections, dominantBloom, recommendedLevel, historyMatches, aiAgreement);

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
    aiUsed,
    aiAgreement,
  };
}

function buildReasoningTrace(
  sections: ReturnType<typeof detectSections>,
  dominantBloom: string | null,
  recommendedLevel: number,
  historyMatches: ReturnType<typeof findSimilarHistory>,
  aiAgreement: AnalysisOutput["aiAgreement"]
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
  if (aiAgreement) {
    const label = aiAgreement === "agree" ? "sepakat dengan" : aiAgreement === "close" ? "mendekati" : "berbeda dari";
    steps.push(`Penilaian pembanding oleh AI ${label} hasil rule-based.`);
  }
  steps.push(`Berdasarkan kombinasi faktor di atas, Level ${recommendedLevel} dipilih sebagai rekomendasi akhir.`);
  return steps.join(" ");
}