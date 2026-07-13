import { describe, it, expect } from "vitest";
import { findSimilarHistory } from "@/lib/services/similarityService";

describe("similarityService", () => {
  it("mengabaikan histori dengan kemiripan di bawah 70%", () => {
    const result = findSimilarHistory("manajemen risiko audit teknologi informasi", [
      { id: "1", trainingName: "Basic Cooking", kkniLevel: 2, unitCompetency: "memasak nasi goreng dan mie ayam" },
    ]);
    expect(result.length).toBe(0);
  });

  it("menemukan histori dengan kemiripan tinggi", () => {
    const result = findSimilarHistory("audit teknologi informasi risiko sistem", [
      { id: "1", trainingName: "CISA Audit", kkniLevel: 6, unitCompetency: "audit teknologi informasi risiko sistem tata kelola" },
    ]);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].similarity).toBeGreaterThanOrEqual(70);
  });
});
