import Anthropic from "@anthropic-ai/sdk";

/**
 * All AI in the app runs on Anthropic's Claude.
 *   ANTHROPIC_MODEL_FAST → the role-play customer's replies (quick, low cost)
 *   ANTHROPIC_MODEL      → call grading, quiz writing and the ABB Expert (more careful)
 */
let client: Anthropic | null = null;
const ai = () => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
const FAST = () => process.env.ANTHROPIC_MODEL_FAST || "claude-haiku-5-5";
const SMART = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

/**
 * Streams plain text from the fast model.
 * Thinking is turned off so the customer answers quickly and never spends the
 * whole reply budget reasoning (which used to come back as an empty answer).
 * If a stream still ends with no text, it retries once without streaming.
 */
export async function streamText(prompt: string, opts: { smart?: boolean; maxTokens?: number } = {}): Promise<ReadableStream<Uint8Array>> {
  const params = {
    model: opts.smart ? SMART() : FAST(),
    max_tokens: opts.maxTokens ?? 1024,
    thinking: { type: "disabled" as const },
    messages: [{ role: "user" as const, content: prompt }],
  };
  const stream = ai().messages.stream(params);
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      let sent = false;
      try {
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta" && ev.delta.text) {
            controller.enqueue(enc.encode(ev.delta.text));
            sent = true;
          }
        }
        if (!sent) {
          const final = await stream.finalMessage().catch(() => null);
          console.warn("Empty role-play reply", { stop_reason: final?.stop_reason, usage: final?.usage });
          const retry = await ai().messages.create(params);
          const text = retry.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
          if (text) controller.enqueue(enc.encode(text));
          else console.warn("Empty role-play reply after retry", { stop_reason: retry.stop_reason });
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() { stream.abort(); },
  });
}

/** Returns JSON that matches `schema`, using Claude's structured outputs. */
export async function generateJson<T>(prompt: string, schema: Record<string, unknown>): Promise<T> {
  const msg = await ai().messages.create({
    model: SMART(),
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: { type: "json_schema", schema } },
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return JSON.parse(text) as T;
}

/* JSON schemas for the two structured responses */
const strArr = { type: "array", items: { type: "string" } };
export const GRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["score", "uncovered", "missed", "recommendation", "tips"],
  properties: { score: { type: "integer" }, uncovered: strArr, missed: strArr, recommendation: { type: "string" }, tips: strArr },
};
export const QUIZ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["q", "options", "answer", "why"],
        properties: { q: { type: "string" }, options: strArr, answer: { type: "integer" }, why: { type: "string" } },
      },
    },
  },
};
