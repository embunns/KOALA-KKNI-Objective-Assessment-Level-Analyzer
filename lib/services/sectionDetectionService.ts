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

// Heading yang dicari, beserta variasi penulisannya dalam Bahasa Indonesia maupun
// Bahasa Inggris (case-insensitive), supaya dokumen pelatihan berbahasa Inggris
// juga bisa dibaca sistem tanpa perlu konfigurasi tambahan.
const HEADING_PATTERNS: Record<keyof DocumentSections, RegExp> = {
  title: /^(judul( pelatihan)?|title|course title)\s*[:\-]?\s*/i,
  objectives: /^(tujuan( pelatihan)?|objectives?|goals?|purpose)\s*[:\-]?\s*/i,
  learningOutcome: /^(learning outcomes?|capaian pembelajaran|hasil belajar|learning objectives?)\s*[:\-]?\s*/i,
  materials: /^(materi|silabus|modul|materials?|syllabus|curriculum|content|topics?)\s*[:\-]?\s*/i,
  competencies: /^(kompetensi|competenc(y|ies)|skills?)\s*[:\-]?\s*/i,
  method: /^(metode|method(ology)?|training method)\s*[:\-]?\s*/i,
  assessment: /^(assessment|evaluasi|penilaian|evaluation)\s*[:\-]?\s*/i,
  duration: /^(durasi|duration|length|schedule)\s*[:\-]?\s*/i,
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