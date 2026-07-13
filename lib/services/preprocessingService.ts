/**
 * preprocessingService
 * ---------------------------------------------------------------------------
 * Membersihkan teks hasil ekstraksi PDF sebelum dianalisis lebih lanjut:
 * - Membersihkan karakter aneh/non-printable.
 * - Menghapus spasi ganda.
 * - Menghapus header/footer yang berulang di setiap halaman.
 * - Menggabungkan kalimat yang terpotong oleh page break.
 * - Mempertahankan struktur heading (baris pendek berhuruf kapital/berpola judul).
 */

export function preprocessText(rawText: string): string {
  let text = rawText;

  // 1. Bersihkan karakter kontrol/aneh, pertahankan newline.
  text = text.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, "");

  // 2. Gabungkan kalimat yang terpotong (baris berakhir tanpa tanda baca, disambung baris berikutnya).
  text = text.replace(/([a-z,])\n(?=[a-z])/g, "$1 ");

  // 3. Hapus baris yang berulang identik lebih dari 3 kali (indikasi header/footer).
  const lines = text.split("\n");
  const freq: Record<string, number> = {};
  for (const l of lines) {
    const key = l.trim();
    if (key.length > 0 && key.length < 80) freq[key] = (freq[key] || 0) + 1;
  }
  const repeatedLines = new Set(
    Object.entries(freq)
      .filter(([, count]) => count >= 3)
      .map(([line]) => line)
  );
  const cleanedLines = lines.filter((l) => !repeatedLines.has(l.trim()));

  // 4. Hapus spasi ganda / trim.
  text = cleanedLines
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");

  return text;
}
