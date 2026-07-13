import { describe, it, expect } from "vitest";
import { detectKko } from "@/lib/services/kkoDetectionService";

describe("kkoDetectionService", () => {
  it("mendeteksi KKO dan menghitung frekuensinya", () => {
    const text = "Peserta mampu menganalisis data dan menganalisis risiko serta mengidentifikasi masalah.";
    const kkoList = [
      { word: "menganalisis", bloomCode: "C4" },
      { word: "mengidentifikasi", bloomCode: "C4" },
      { word: "merancang", bloomCode: "C6" },
    ];
    const result = detectKko(text, kkoList);
    expect(result.find((r) => r.word === "menganalisis")?.frequency).toBe(2);
    expect(result.find((r) => r.word === "mengidentifikasi")?.frequency).toBe(1);
    expect(result.find((r) => r.word === "merancang")).toBeUndefined();
  });
});
