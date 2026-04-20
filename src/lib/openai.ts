/**
 * LLM API yardımcı fonksiyonu.
 * Tüm LLM çağrıları (lyrics, scoring, enrichment) buradan geçer.
 * Claude API (ANTHROPIC_API_KEY) kullanır. Whisper hariç — o hâlâ OpenAI.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Claude Chat API çağrısı.
 * OpenAI interface'i korundu — tüm caller'lar aynı şekilde çağırır.
 * Default model: claude-haiku-4-5-20251001
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const {
    model = "claude-haiku-4-5-20251001",
    maxTokens = 2048,
    temperature = 0.8,
  } = options;

  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY tanımlı değil");
  }

  // System mesajını ayır (Claude API ayrı system field kullanır)
  const systemMsg = messages.find((m) => m.role === "system");
  const userMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: userMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API hatası (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content?.[0]?.type === "text" ? data.content[0].text : "";
}

/**
 * Kısa yanıt için — başlık üretme, tek satır cevap vb.
 */
export async function quickCompletion(
  system: string,
  user: string,
  maxTokens = 64,
): Promise<string> {
  return chatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: "claude-haiku-4-5-20251001", maxTokens, temperature: 0.7 },
  );
}
