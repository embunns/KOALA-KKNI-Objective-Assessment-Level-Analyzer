import { prisma } from "@/lib/prisma";

export const trainingHistoryRepository = {
  findAll: () => prisma.trainingHistory.findMany({ orderBy: { createdAt: "desc" } }),
  findByName: (trainingName: string) => prisma.trainingHistory.findFirst({ where: { trainingName } }),
  create: (data: { trainingName: string; provider?: string | null; kkniLevel: number; unitCompetency: string; reference?: string | null }) =>
    prisma.trainingHistory.create({ data }),
  update: (id: string, data: Partial<{ trainingName: string; provider: string | null; kkniLevel: number; unitCompetency: string; reference: string | null }>) =>
    prisma.trainingHistory.update({ where: { id }, data }),
  remove: (id: string) => prisma.trainingHistory.delete({ where: { id } }),
};
