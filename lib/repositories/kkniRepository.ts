import { prisma } from "@/lib/prisma";

export const kkniRepository = {
  findAll: () => prisma.kKNILevel.findMany({ orderBy: { level: "asc" } }),
  findByLevel: (level: number) => prisma.kKNILevel.findUnique({ where: { level } }),
  create: (data: { level: number; description: string; knowledge: string; skill: string; responsibility: string }) =>
    prisma.kKNILevel.create({ data }),
  update: (id: string, data: Partial<{ description: string; knowledge: string; skill: string; responsibility: string }>) =>
    prisma.kKNILevel.update({ where: { id }, data }),
  remove: (id: string) => prisma.kKNILevel.delete({ where: { id } }),
};
