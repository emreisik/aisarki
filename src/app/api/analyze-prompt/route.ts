import { NextRequest, NextResponse } from "next/server";
import { analyzePrompt } from "@/lib/promptIntelligence";

interface AnalyzeRequest {
  prompt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt gereklidir" }, { status: 400 });
    }
    const analysis = await analyzePrompt(body.prompt);
    if (!analysis) {
      return NextResponse.json({ error: "Analiz yapılamadı" }, { status: 500 });
    }
    return NextResponse.json({ analysis });
  } catch (e) {
    console.error("[analyze-prompt] error:", e);
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
