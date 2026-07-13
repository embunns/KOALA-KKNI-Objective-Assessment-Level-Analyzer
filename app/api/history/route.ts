import { NextRequest, NextResponse } from "next/server";
import { analysisRepository } from "@/lib/repositories/analysisRepository";

export async function GET(req: NextRequest) {
  const data = await analysisRepository.findAll();
  return NextResponse.json(data);
}
