import { NextRequest, NextResponse } from "next/server";
import { analyzePrompt } from "@/lib/promptIntelligence";

interface AnalyzeRequest {
  prompt: string;
}

const MAX_PROMPT_LENGTH = 2000;

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const prompt = body.prompt?.trim() ?? "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt gereklidir" }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt en fazla ${MAX_PROMPT_LENGTH} karakter olmalı` },
        { status: 400 },
      );
    }
    const analysis = await analyzePrompt(prompt);
    if (!analysis) {
      return NextResponse.json({ error: "Analiz yapılamadı" }, { status: 500 });
    }
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error("[analyze-prompt] error:", e);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
