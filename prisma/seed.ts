import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import kkniLevels from "../data/kkni-levels.json";
import bloomData from "../data/bloom.json";
import kkoData from "../data/kko.json";
import { parseTrainingHistoryExcel } from "../lib/services/excelImportService";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Admin...");
  const hashedPassword = await bcrypt.hash("Admin123!", 10);
  await prisma.admin.upsert({
    where: { email: "admin@kkni.local" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@kkni.local",
      password: hashedPassword,
    },
  });

  console.log("Seeding Settings...");
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        websiteName: "KKNI Competency Analyzer",
        primaryColor: "#2563EB",
        analysisVersion: "1.0",
      },
    });
  }

  console.log("Seeding KKNI Levels...");
  for (const lvl of kkniLevels) {
    await prisma.kKNILevel.upsert({
      where: { level: lvl.level },
      update: lvl,
      create: lvl,
    });
  }

  console.log("Seeding Bloom Categories...");
  const bloomMap: Record<string, string> = {};
  for (const b of bloomData) {
    const created = await prisma.bloomCategory.upsert({
      where: { code: b.code },
      update: { category: b.category, name: b.name },
      create: { category: b.category, code: b.code, name: b.name },
    });
    bloomMap[b.code] = created.id;
  }

  console.log("Seeding KKO...");
  for (const k of kkoData) {
    const bloomId = bloomMap[k.bloomCode];
    if (!bloomId) continue;
    await prisma.kKO.upsert({
      where: { word: k.word },
      update: { bloomId, description: k.description },
      create: { word: k.word, bloomId, description: k.description },
    });
  }

  console.log("Seeding Training History dari Excel...");
  try {
    const excelPath = path.join(__dirname, "../data/Daftar_Unit_Kompetensi.xlsx");
    const rows = parseTrainingHistoryExcel(excelPath);
    for (const row of rows) {
      const exists = await prisma.trainingHistory.findFirst({
        where: { trainingName: row.trainingName },
      });
      if (exists) continue;
      await prisma.trainingHistory.create({ data: row });
    }
    console.log(`  -> ${rows.length} training history dimuat.`);
  } catch (e) {
    console.warn("  -> Lewati seeding training history (file tidak ditemukan atau gagal parse):", e);
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
