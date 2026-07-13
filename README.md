# KKNI Competency Analyzer

Decision Support System (DSS) untuk membantu Admin menentukan Level KKNI (1-9) dari dokumen pelatihan (silabus, sertifikat, modul) berdasarkan **isi dokumen**, bukan nama training.

## Requirement

- Node.js 18+
- PostgreSQL 14+ (lokal, Docker, atau cloud seperti Neon/Supabase)

## 1. Instalasi

```bash
npm install
```

## 2. Environment

Salin `.env.example` menjadi `.env` lalu isi:

```
DATABASE_URL="postgresql://user:password@localhost:5432/kkni_analyzer?schema=public"
OPENAI_API_KEY=            # opsional
ANTHROPIC_API_KEY=         # opsional, untuk penyusunan justifikasi berbasis LLM
JWT_SECRET="ganti-dengan-secret-acak"
NEXTAUTH_SECRET="ganti-dengan-secret-acak"
```

Jika `ANTHROPIC_API_KEY` tidak diisi, sistem tetap berjalan normal — justifikasi akan dihasilkan dari template rule-based (lihat `lib/services/justificationService.ts`).

## 3. Migration Prisma

```bash
npx prisma migrate dev --name init
```

## 4. Seed Database

```bash
npm run seed
```

Seed ini akan mengisi:
- Akun Admin default: **admin@kkni.local / Admin123!**
- Deskripsi resmi Level KKNI 1–9
- Taksonomi Bloom (Cognitive/Affective/Psychomotor)
- Daftar KKO awal
- Setting website default
- Database Histori Training dari `data/Daftar_Unit_Kompetensi.xlsx`

## 5. Menjalankan Aplikasi

```bash
npm run dev
```

Buka `http://localhost:3000` → otomatis diarahkan ke halaman login.

## 6. Login Pertama Kali

- Email: `admin@kkni.local`
- Password: `Admin123!`

**Segera ganti password ini setelah login pertama** (fitur ubah password dapat ditambahkan di halaman Pengaturan pada iterasi berikutnya).

## 7. Upload PDF & Analisis Dokumen

1. Buka menu **Analisis Dokumen**.
2. Drag & drop atau pilih file PDF (maks 20MB).
3. Klik **Mulai Analisis** — sistem akan: extract teks → deteksi section → deteksi KKO → klasifikasi Bloom → bandingkan histori → hitung skor per Level KKNI → hasilkan justifikasi.
4. Hasil ditampilkan lengkap dengan **skor per aspek (explainability)**, Level KKNI rekomendasi, confidence, dan histori training yang mirip.

## 8. Import Excel (Database Histori / KKO)

Buka menu **Database Histori** → tombol **Import Excel**. Format kolom yang didukung: `PELATIHAN`, `KKNI`, `UNIT KOMPETENSI`, `REFERENCE` (satu training boleh memiliki banyak baris unit kompetensi). Lihat `lib/services/excelImportService.ts` untuk detail logika parsing (forward-fill per grup training).

## 9. Testing

```bash
npm run test
```

Mencakup: deteksi KKO, similarity histori, dan scoring KKNI.

## Struktur Folder

```
app/
  (app)/            -> halaman dengan sidebar: dashboard, analysis, history, kkni, kko, training-history, about-kkni, settings
  login/
  api/               -> Next.js Route Handlers (login, analyze, history, kkni, kko, training-history)
components/
  layout/            -> Sidebar, Topbar
  ui/                -> Card, Button, Badge, ProgressBar, Table
lib/
  services/          -> seluruh AI service (pdfExtractor, preprocessing, sectionDetection,
                         kkoDetection, bloomClassification, similarity, kkniScoring,
                         justification, excelImport) + analysisOrchestrator (menyatukan semua)
  repositories/       -> data access layer per entitas
  validations/         -> skema Zod
prisma/
  schema.prisma
  seed.ts
data/                -> data JSON seed (KKNI, Bloom, KKO) + file Excel histori
tests/               -> unit test (Vitest)
```

## Arsitektur AI (Penting)

Pendekatan **hybrid**, bukan end-to-end LLM:
- **Rule-based** (murah, konsisten, mudah diaudit): deteksi KKO, klasifikasi Bloom, scoring per level KKNI berbobot (Deskripsi KKNI 35%, Learning Outcome 25%, Materi 15%, Tujuan 10%, KKO 10%, Histori 5%).
- **LLM** (opsional, hanya jika `ANTHROPIC_API_KEY` diisi): menyusun kalimat justifikasi dari fakta yang sudah dihasilkan rule-based — tidak pernah diberi wewenang menentukan level.

Seluruh aturan (deskripsi KKNI, daftar KKO, mapping Bloom) disimpan di database, **bukan hardcode di prompt**, sehingga Admin dapat mengubahnya tanpa deploy ulang kode.

## Batasan yang Sengaja Diterapkan (Sesuai Business Rule)

- AI tidak pernah menentukan Level KKNI hanya dari nama training (nama training sengaja tidak menjadi komponen skor).
- Jika confidence < 70%, status berubah menjadi `Needs Manual Review` dan UI menampilkan banner peringatan.
- Field yang tidak ditemukan pada dokumen diisi `null` / "Tidak ditemukan", tidak pernah dikarang.
