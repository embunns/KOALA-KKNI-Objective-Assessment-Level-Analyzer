import { prisma } from "@/lib/prisma";

export const kkoRepository = {
  findAll: () => prisma.kKO.findMany({ include: { bloom: true }, orderBy: { word: "asc" } }),
  create: (data: { word: string; bloomId: string; description?: string }) => prisma.kKO.create({ data }),
  update: (id: string, data: Partial<{ word: string; bloomId: string; description: string }>) =>
    prisma.kKO.update({ where: { id }, data }),
  remove: (id: string) => prisma.kKO.delete({ where: { id } }),
};
