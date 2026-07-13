import { describe, it, expect } from "vitest";
import { scoreDocumentAgainstKkni, KkniLevelRef } from "@/lib/services/kkniScoringService";
import { DocumentSections } from "@/lib/services/sectionDetectionService";

const kkniLevels: KkniLevelRef[] = Array.from({ length: 9 }, (_, i) => ({
  level: i + 1,
  description: `Level ${i + 1}`,
  knowledge: "-",
  skill: "-",
  responsibility: "-",
}));

describe("kkniScoringService", () => {
  it("menghasilkan 3 kandidat level terurut menurun skornya", () => {
    const sections: DocumentSections = {
      title: "Basic Leadership",
      objectives: "Memberikan pemahaman dasar kepemimpinan",
      learningOutcome: "Peserta mampu menjelaskan konsep kepemimpinan",
      materials: "Pengenalan kepemimpinan dasar",
      competencies: "Memahami teori kepemimpinan",
      method: null,
      assessment: null,
      duration: null,
    };
    const result = scoreDocumentAgainstKkni(sections, [], kkniLevels, []);
    expect(result.candidateLevels.length).toBe(3);
    expect(result.candidateLevels[0].score).toBeGreaterThanOrEqual(result.candidateLevels[1].score);
    // Training "Basic Leadership" hanya berisi C2 (memahami/menjelaskan) -> harus level rendah, BUKAN level tinggi hanya karena nama training.
    expect(result.recommendedLevel).toBeLessThanOrEqual(4);
  });
});
