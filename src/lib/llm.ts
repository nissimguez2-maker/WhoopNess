/**
 * LLM provider: OpenRouter (OpenAI-compatible). Dependency-free fetch client.
 * Server-only. Returns null when no key is configured so callers can degrade gracefully.
 */

export type LlmRole = "system" | "user" | "assistant";
export interface LlmMessage {
  role: LlmRole;
  content: string;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export function llmConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export interface LlmOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function llmComplete(messages: LlmMessage[], opts: LlmOptions = {}): Promise<string | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const model = opts.model ?? process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // OpenRouter attribution headers (optional but recommended).
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "WhoopNess",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.4,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}
