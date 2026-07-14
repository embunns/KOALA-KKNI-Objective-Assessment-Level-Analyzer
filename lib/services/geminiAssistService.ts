/**
 * geminiAssistService
 * ---------------------------------------------------------------------------
 * Menyediakan dua bantuan AI yang PERANNYA DIBATASI KETAT sesuai aturan bisnis:
 *
 * 1. extractTitleWithAi()
 *    Mengekstrak judul training dari isi dokumen menggunakan AI (lebih andal
 *    dibanding regex heading saja untuk dokumen yang formatnya tidak baku).
 *    Judul ini HANYA dipakai sebagai label tampilan -- TIDAK PERNAH dikirim
 *    balik ke proses penentuan level, sesuai aturan "AI tidak boleh
 *    menentukan level hanya dari nama training".
 *
 * 2. assessLevelWithAi()
 *    Meminta penilaian Level KKNI secara independen dari AI, berdasarkan isi
 *    dokumen (bukan nama training). Hasil ini TIDAK menggantikan hasil
 *    rule-based -- hanya dipakai sebagai pembanding untuk menyesuaikan
 *    confidence akhir (lihat analysisOrchestrator.ts, pola "AI sebagai
 *    validator", bukan "AI sebagai penentu").
 *
 * Kedua fungsi memanggil Gemini API dalam SATU request saja per dokumen untuk
 * menghemat kuota free-tier. Jika GEMINI_API_KEY tidak diisi atau panggilan
 * gagal, keduanya mengembalikan null -- sistem tetap berjalan normal dengan
 * rule-based saja (tidak ada dependency wajib ke AI).
 */

import { DocumentSections } from "./sectionDetectionService";
import { DetectedKko } from "./kkoDetectionService";
import { KkniLevelRef } from "./kkniScoringService";

export interface GeminiAssistResult {
  title: string | null;
  assessedLevel: number | null;
  assessedConfidence: number;
  reasoning: string;
}

const GEMINI_MODEL = "gemini-flash-latest";

export async function assistWithGemini(
  cleanedText: string,
  sections: DocumentSections,
  detectedKko: DetectedKko[],
  kkniLevels: KkniLevelRef[]
): Promise<GeminiAssistResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const kkniReference = kkniLevels
    .map((k) => `Level ${k.level}: ${k.description}`)
    .join("\n");

  const prompt = `Anda membantu sistem KKNI Competency Analyzer dengan DUA tugas terpisah. Jawab HANYA dalam format JSON, tanpa markdown code fence, tanpa teks lain.

TUGAS 1 -- Ekstrak judul training dari isi dokumen (bukan menebak, ambil dari teks yang benar-benar ada).

TUGAS 2 -- Berikan penilaian independen Level KKNI (1-9) berdasarkan ISI dokumen (tujuan, learning outcome, materi, kata kerja operasional). JANGAN gunakan judul/nama training sebagai dasar penilaian level. Bandingkan dengan deskripsi resmi berikut:
${kkniReference}

ISI DOKUMEN:
Judul (jika ada heading eksplisit): ${sections.title || "tidak ditemukan"}
Tujuan: ${sections.objectives || "tidak ditemukan"}
Learning Outcome: ${sections.learningOutcome || "tidak ditemukan"}
Materi: ${sections.materials || "tidak ditemukan"}
Kata kerja operasional terdeteksi: ${detectedKko.map((k) => k.word).join(", ") || "tidak ada"}

Cuplikan teks dokumen:
${cleanedText.slice(0, 5000)}

Format jawaban JSON:
{
  "title": "<judul training, atau null jika benar-benar tidak ditemukan>",
  "assessedLevel": <angka 1-9>,
  "assessedConfidence": <angka 0-100, seberapa yakin Anda dengan penilaian level ini>,
  "reasoning": "<1-2 kalimat alasan singkat>"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING", nullable: true },
                assessedLevel: { type: "INTEGER" },
                assessedConfidence: { type: "NUMBER" },
                reasoning: { type: "STRING" },
              },
              required: ["assessedLevel", "assessedConfidence", "reasoning"],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[geminiAssistService] Gemini API error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[geminiAssistService] Respons Gemini tidak ada teksnya:", JSON.stringify(data));
      return null;
    }

    const cleaned = text.replace(/```json|```/g, "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[geminiAssistService] Respons Gemini bukan JSON valid:", cleaned);
      return null;
    }

    const level = Number(parsed.assessedLevel);
    return {
      title: parsed.title && parsed.title !== "null" ? String(parsed.title) : null,
      assessedLevel: Number.isInteger(level) && level >= 1 && level <= 9 ? level : null,
      assessedConfidence: Math.max(0, Math.min(100, Number(parsed.assessedConfidence) || 0)),
      reasoning: String(parsed.reasoning || ""),
    };
  } catch (err) {
    console.error("[geminiAssistService] Gagal memanggil Gemini API:", err);
    return null;
  }
}