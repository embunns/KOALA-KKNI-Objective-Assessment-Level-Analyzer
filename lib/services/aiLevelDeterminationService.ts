/**
 * aiLevelDeterminationService
 * ---------------------------------------------------------------------------
 * Alternatif penentuan Level KKNI menggunakan LLM (OpenAI) secara langsung,
 * berdasarkan keseluruhan isi dokumen + deskripsi resmi KKNI + KKO yang
 * terdeteksi. Dipakai sebagai pengganti kkniScoringService ketika
 * OPENAI_API_KEY tersedia, agar sistem bisa menangkap konteks dokumen yang
 * tidak terstruktur rapi (heading tidak baku, dsb) yang seringkali terlewat
 * oleh pendekatan rule-based murni.
 *
 * PENTING: prompt tetap menegaskan aturan bisnis inti -- level TIDAK BOLEH
 * ditentukan dari nama training, dan tidak boleh mengarang informasi yang
 * tidak ada di dokumen.
 */

import { DocumentSections } from "./sectionDetectionService";
import { DetectedKko } from "./kkoDetectionService";
import { KkniLevelRef } from "./kkniScoringService";

export interface AiLevelResult {
  recommendedLevel: number;
  candidateLevels: { level: number; score: number }[];
  confidence: number;
  reasoning: string;
  justification: string;
}

export async function determineLevelWithAi(
  cleanedText: string,
  sections: DocumentSections,
  detectedKko: DetectedKko[],
  kkniLevels: KkniLevelRef[]
): Promise<AiLevelResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const kkniReference = kkniLevels
    .map((k) => `Level ${k.level}: ${k.description} (Pengetahuan: ${k.knowledge}; Keterampilan: ${k.skill}; Tanggung Jawab: ${k.responsibility})`)
    .join("\n");

  const prompt = `Anda adalah AI Competency Analyzer untuk sistem KKNI Competency Analyzer.

ATURAN WAJIB:
1. JANGAN tentukan level hanya berdasarkan nama/judul training. Nilai HANYA dari isi dokumen (tujuan, learning outcome, materi, kompetensi, kata kerja operasional).
2. JANGAN mengarang informasi yang tidak ada di dokumen.
3. Jika informasi tidak cukup, beri confidence rendah (di bawah 70) dan sertakan alasan di reasoning.
4. Bandingkan isi dokumen dengan deskripsi resmi KKNI berikut:

${kkniReference}

JUDUL DOKUMEN (jangan jadikan dasar utama): ${sections.title || "Tidak ditemukan"}
TUJUAN: ${sections.objectives || "Tidak ditemukan"}
LEARNING OUTCOME: ${sections.learningOutcome || "Tidak ditemukan"}
MATERI: ${sections.materials || "Tidak ditemukan"}
KOMPETENSI: ${sections.competencies || "Tidak ditemukan"}
KATA KERJA OPERASIONAL TERDETEKSI: ${detectedKko.map((k) => `${k.word} (${k.bloomCode}, ${k.frequency}x)`).join(", ") || "Tidak ada"}

ISI DOKUMEN LENGKAP (potongan, untuk konteks tambahan):
${cleanedText.slice(0, 6000)}

Kembalikan HANYA JSON valid (tanpa markdown code fence, tanpa teks lain) dengan format persis:
{
  "recommendedLevel": <angka 1-9>,
  "candidateLevels": [{"level": <angka>, "score": <angka 0-100>}, {"level": <angka>, "score": <angka 0-100>}, {"level": <angka>, "score": <angka 0-100>}],
  "confidence": <angka 0-100>,
  "reasoning": "<jejak penalaran singkat>",
  "justification": "<justifikasi formal minimal 5 kalimat, bahasa Indonesia>"
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1200,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const level = Number(parsed.recommendedLevel);
    if (!Number.isInteger(level) || level < 1 || level > 9) return null;

    return {
      recommendedLevel: level,
      candidateLevels: Array.isArray(parsed.candidateLevels) ? parsed.candidateLevels.slice(0, 3) : [{ level, score: parsed.confidence ?? 0 }],
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
      reasoning: String(parsed.reasoning || ""),
      justification: String(parsed.justification || ""),
    };
  } catch {
    return null;
  }
}
