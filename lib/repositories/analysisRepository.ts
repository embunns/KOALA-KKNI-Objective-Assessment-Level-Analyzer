import { prisma } from "@/lib/prisma";

export const analysisRepository = {
  findAll: () =>
    prisma.analysisHistory.findMany({
      include: { document: true },
      orderBy: { createdAt: "desc" },
    }),
  findById: (id: string) =>
    prisma.analysisHistory.findUnique({ where: { id }, include: { document: true } }),
  create: (data: any) => prisma.analysisHistory.create({ data }),
  update: (id: string, data: any) => prisma.analysisHistory.update({ where: { id }, data }),
  remove: (id: string) => prisma.analysisHistory.delete({ where: { id } }),
};
