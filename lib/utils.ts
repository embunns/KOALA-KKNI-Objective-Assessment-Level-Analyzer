import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function confidenceLabel(score: number): string {
  if (score >= 90) return "Sangat Tinggi";
  if (score >= 80) return "Tinggi";
  if (score >= 70) return "Sedang";
  if (score >= 60) return "Rendah";
  return "Sangat Rendah";
}
