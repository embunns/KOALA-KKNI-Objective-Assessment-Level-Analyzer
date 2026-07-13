/**
 * sectionDetectionService
 * ---------------------------------------------------------------------------
 * Mencoba menemukan bagian-bagian penting dari dokumen pelatihan berdasarkan
 * heading yang umum dipakai. Jika suatu bagian tidak ditemukan, hasilnya NULL
 * -- sesuai aturan bisnis: "jangan membuat informasi sendiri".
 */

export interface DocumentSections {
  title: string | null;
  objectives: string | null; // Tujuan Pelatihan
  learningOutcome: string | null;
  materials: string | null;
  competencies: string | null;
  method: string | null;
  assessment: string | null;
  duration: string | null;
}

// Heading yang dicari, beserta variasi penulisannya (case-insensitive).
const HEADING_PATTERNS: Record<keyof DocumentSections, RegExp> = {
  title: /^(judul( pelatihan)?|title)\s*[:\-]?\s*/i,
  objectives: /^(tujuan( pelatihan)?|objectives?)\s*[:\-]?\s*/i,
  learningOutcome: /^(learning outcome|capaian pembelajaran|hasil belajar)\s*[:\-]?\s*/i,
  materials: /^(materi|silabus|modul|materials?)\s*[:\-]?\s*/i,
  competencies: /^(kompetensi|competenc(y|ies))\s*[:\-]?\s*/i,
  method: /^(metode|method)\s*[:\-]?\s*/i,
  assessment: /^(assessment|evaluasi|penilaian)\s*[:\-]?\s*/i,
  duration: /^(durasi|duration)\s*[:\-]?\s*/i,
};

export function detectSections(cleanedText: string): DocumentSections {
  const lines = cleanedText.split("\n").map((l) => l.trim()).filter(Boolean);

  const result: DocumentSections = {
    title: null,
    objectives: null,
    learningOutcome: null,
    materials: null,
    competencies: null,
    method: null,
    assessment: null,
    duration: null,
  };

  const keys = Object.keys(HEADING_PATTERNS) as (keyof DocumentSections)[];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const key of keys) {
      if (HEADING_PATTERNS[key].test(line)) {
        const inlineContent = line.replace(HEADING_PATTERNS[key], "").trim();
        // Kumpulkan baris-baris berikutnya sampai heading lain ditemukan.
        const collected: string[] = inlineContent ? [inlineContent] : [];
        let j = i + 1;
        while (j < lines.length && !isAnyHeading(lines[j])) {
          collected.push(lines[j]);
          j++;
        }
        const content = collected.join(" ").trim();
        if (content.length > 0) {
          result[key] = result[key] ? `${result[key]} ${content}` : content;
        }
      }
    }
  }

  // Jika judul tidak ditemukan lewat heading, gunakan baris pertama dokumen sebagai fallback.
  if (!result.title && lines.length > 0 && lines[0].length < 120) {
    result.title = lines[0];
  }

  return result;
}

function isAnyHeading(line: string): boolean {
  return Object.values(HEADING_PATTERNS).some((re) => re.test(line));
}
