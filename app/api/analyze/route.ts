import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { runAnalysis } from "@/lib/services/analysisOrchestrator";
import { MAX_PDF_SIZE_BYTES } from "@/lib/validations/schemas";
import { verifyAdminToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("kkni_token")?.value;
  const admin = token ? verifyAdminToken(token) : null;
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Dokumen wajib diupload." }, { status: 400 });

  const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Hanya file PDF, PNG, atau JPG yang diperbolehkan." }, { status: 400 });
  }
  const fileType: "pdf" | "image" = file.type === "application/pdf" ? "pdf" : "image";
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: "Upload gagal. Ukuran file maksimal 20 MB." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const document = await prisma.uploadedDocument.create({
    data: {
      fileName,
      originalName: file.name,
      fileSize: file.size,
      filePath: `/uploads/${fileName}`,
      uploadedBy: admin.id,
    },
  });

  const analysisPlaceholder = await prisma.analysisHistory.create({
    data: { documentId: document.id, status: "Processing" },
  });

  try {
    const [kkniLevels, kkoEntries, trainingHistory] = await Promise.all([
      prisma.kKNILevel.findMany(),
      prisma.kKO.findMany({ include: { bloom: true } }),
      prisma.trainingHistory.findMany(),
    ]);

    const kkoList = kkoEntries.map((k: any) => ({ word: k.word, bloomCode: k.bloom.code }));

    const result = await runAnalysis(buffer, {
      kkoList,
      kkniLevels: kkniLevels.map((k: any) => ({
        level: k.level,
        description: k.description,
        knowledge: k.knowledge,
        skill: k.skill,
        responsibility: k.responsibility,
      })),
      trainingHistory: trainingHistory.map((t: any) => ({
        id: t.id,
        trainingName: t.trainingName,
        kkniLevel: t.kkniLevel,
        unitCompetency: t.unitCompetency,
      })),
    }, fileType);

    const updated = await prisma.analysisHistory.update({
      where: { id: analysisPlaceholder.id },
      data: {
        trainingTitle: result.trainingTitle,
        recommendedLevel: result.recommendedLevel,
        confidence: result.confidence,
        dominantBloom: result.dominantBloom,
        candidateLevels: result.candidateLevels,
        detectedKKO: result.detectedKKO,
        learningOutcomes: result.learningOutcomes,
        materials: result.materials,
        matchedHistory: result.matchedHistory,
        aspectScores: result.aspectScores as any,
        aiAgreement: result.aiAgreement,
        reasoning: result.reasoning,
        justification: result.justification,
        status: result.status,
        aiUsed: result.aiUsed,
      },
    });

    return NextResponse.json({ document, analysis: updated });
  } catch (err: any) {
    await prisma.analysisHistory.update({
      where: { id: analysisPlaceholder.id },
      data: { status: "Failed" },
    });
    return NextResponse.json(
      { error: err?.message || "Analisis gagal. Silakan lakukan analisis ulang." },
      { status: 500 }
    );
  }
}