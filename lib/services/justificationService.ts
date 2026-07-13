/**
 * justificationService
 * ---------------------------------------------------------------------------
 * Menghasilkan paragraf justifikasi & reasoning dalam Bahasa Indonesia formal.
 *
 * Pendekatan hybrid: seluruh FAKTA (level, skor, KKO dominan, bloom, histori)
 * berasal dari hasil rule-based di service lain -- LLM (jika ANTHROPIC_API_KEY
 * tersedia) hanya dipakai untuk merangkainya menjadi kalimat yang baik.
 * Jika API key tidak tersedia, fallback ke template rule-based di bawah ini
 * (tetap valid dan sesuai format minimal 5 kalimat, tanpa mengarang fakta).
 */

import { DetectedKko } from "./kkoDetectionService";
import { LevelCandidate } from "./kkniScoringService";
import { SimilarityMatch } from "./similarityService";

export interface JustificationInput {
  recommendedLevel: number;
  confidence: number;
  candidateLevels: LevelCandidate[];
  dominantBloom: string | null;
  detectedKko: DetectedKko[];
  historyMatches: SimilarityMatch[];
  levelDescription: string;
}

export function buildJustificationTemplate(input: JustificationInput): string {
  const topKko = input.detectedKko.slice(0, 3).map((k) => `"${k.word}"`).join(" dan ");
  const otherCandidates = input.candidateLevels.filter((c) => c.level !== input.recommendedLevel);

  const sentences: string[] = [];

  sentences.push(
    "Dokumen dianalisis berdasarkan tujuan pelatihan, learning outcome, materi, kata kerja operasional, dan deskripsi resmi KKNI."
  );

  if (topKko) {
    sentences.push(
      `Kata kerja operasional yang dominan ditemukan adalah ${topKko}${
        input.dominantBloom ? `, yang termasuk dalam Taksonomi Bloom ${input.dominantBloom}` : ""
      }.`
    );
  } else {
    sentences.push("Tidak ditemukan kata kerja operasional yang dominan secara eksplisit pada dokumen.");
  }

  sentences.push(
    `Berdasarkan kesesuaian dengan karakteristik KKNI Level ${input.recommendedLevel}, yaitu: ${input.levelDescription}`
  );

  if (otherCandidates.length > 0) {
    const otherText = otherCandidates
      .map((c) => `Level ${c.level} (skor ${c.score})`)
      .join(" dan ");
    sentences.push(
      `Level lain yang sempat menjadi kandidat, yaitu ${otherText}, tidak dipilih karena skor kecocokannya lebih rendah dibandingkan Level ${input.recommendedLevel}.`
    );
  }

  if (input.historyMatches.length > 0) {
    const best = input.historyMatches[0];
    sentences.push(
      `Dokumen memiliki kemiripan sebesar ${best.similarity}% dengan pelatihan histori "${best.trainingName}" yang berada pada Level KKNI ${best.kkniLevel}, dan digunakan sebagai referensi ${best.similarity >= 90 ? "utama" : "pendukung"}.`
    );
  } else {
    sentences.push("Tidak ditemukan histori pelatihan dengan kemiripan yang cukup signifikan untuk dijadikan referensi.");
  }

  sentences.push(
    `Berdasarkan keseluruhan analisis tersebut, sistem merekomendasikan KKNI Level ${input.recommendedLevel} dengan confidence sebesar ${input.confidence}%.`
  );

  return sentences.join(" ");
}

/**
 * Placeholder integrasi LLM. Jika ANTHROPIC_API_KEY tersedia, panggil API
 * /v1/messages dengan prompt yang HANYA berisi fakta dari hasil rule-based
 * (lihat JustificationInput) agar LLM tidak mengarang informasi baru.
 * Untuk MVP, fungsi ini mengembalikan template rule-based di atas.
 */
export async function generateJustification(input: JustificationInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildJustificationTemplate(input);
  }

  try {
    const prompt = `Anda adalah AI Competency Analyzer. Susun justifikasi dalam Bahasa Indonesia formal (minimal 5 kalimat, maksimal 300 kata) HANYA berdasarkan fakta berikut, jangan menambah informasi baru:\n${JSON.stringify(
      input,
      null,
      2
    )}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    return text || buildJustificationTemplate(input);
  } catch {
    return buildJustificationTemplate(input);
  }
}