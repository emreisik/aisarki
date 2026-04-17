/**
 * OpenAI API yardımcı fonksiyonu.
 * Tüm LLM çağrıları (lyrics, scoring, enrichment) buradan geçer.
 * Tek API key: OPENAI_API_KEY
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

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
 * OpenAI Chat Completions API çağrısı.
 * Default model: gpt-4o
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const { model = "gpt-4o", maxTokens = 2048, temperature = 0.8 } = options;

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY tanımlı değil");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API hatası (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
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
    { model: "gpt-4o-mini", maxTokens, temperature: 0.7 },
  );
}
