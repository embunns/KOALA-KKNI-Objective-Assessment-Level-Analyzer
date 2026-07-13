import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const kkniLevelSchema = z.object({
  level: z.number().int().min(1).max(9),
  description: z.string().min(1),
  knowledge: z.string().min(1),
  skill: z.string().min(1),
  responsibility: z.string().min(1),
});

export const kkoSchema = z.object({
  word: z.string().min(1),
  bloomId: z.string().uuid(),
  description: z.string().optional(),
});

export const trainingHistorySchema = z.object({
  trainingName: z.string().min(1),
  provider: z.string().nullable().optional(),
  kkniLevel: z.number().int().min(1).max(9),
  unitCompetency: z.string().min(1),
  reference: z.string().nullable().optional(),
});

export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_EXCEL_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
