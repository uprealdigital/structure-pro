import { GoogleGenAI } from "@google/genai";
import { dealSummaryRequestSchema, type DealSummaryRequest } from "@/src/features/ai/types";

const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const ATTEMPT_MS = 20_000;
const BUDGET_MS = 18_000;

const instruction = `You write a deal summary for a building salesperson.
Use only the facts in the request. Do not invent prices, products, customers, or events.
Write two or three short sentences about where this deal stands right now: who it is with, what they want, the quote situation, and the latest meaningful thing that happened.
Plain sentences. No title, labels, or bullets.
Reply with JSON only:
{"summary":""}`;

function client(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Gemini request timed out")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function brief(input: DealSummaryRequest): string {
  const customers =
    input.customers.length > 0
      ? input.customers
          .map((customer) => {
            const role = customer.primary ? "primary" : "linked";
            return `${customer.name} (${role}) — ${customer.phone}, ${customer.email}`;
          })
          .join("\n")
      : "None";
  const quotes =
    input.quotes.length > 0
      ? input.quotes
          .map((quote) => {
            const revisions = quote.revisions
              .map((revision) => {
                const active = revision.active ? ", active" : "";
                return `${revision.name} (${revision.status}${active}, ${revision.total}): ${revision.summary}`;
              })
              .join("\n");
            return `${quote.name} — ${quote.status}\n${revisions}`;
          })
          .join("\n\n")
      : "None";
  const history =
    input.activities.length > 0
      ? input.activities
          .map((activity) => {
            const when = activity.at ? `${activity.at} ` : "";
            return `${when}${activity.channel} ${activity.speaker}: ${activity.text}`;
          })
          .join("\n")
      : "None";
  const omitted =
    input.earlierActivityCount > 0 ? `\n\nEarlier activities not shown: ${input.earlierActivityCount}` : "";
  return `Deal: ${input.dealName}
Status: ${input.status}
Source: ${input.source}

Customers:
${customers}

Quotes:
${quotes}

History:
${history}${omitted}`;
}

function summaryLines(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let summary = text;
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as { summary?: unknown };
      if (typeof parsed.summary === "string") summary = parsed.summary;
    } catch {
      summary = text;
    }
  }
  const sentences = summary
    .replace(/\s*\n+\s*/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  return sentences.slice(0, 3).join("\n");
}

async function ask(ai: GoogleGenAI, model: string, input: DealSummaryRequest, timeoutMs: number): Promise<string> {
  const response = await withTimeout(
    ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: brief(input) }] }],
      config: {
        systemInstruction: instruction,
        responseMimeType: "application/json",
      },
    }),
    timeoutMs,
  );
  return summaryLines(response.text?.trim() ?? "");
}

export async function summarizeDeal(input: DealSummaryRequest): Promise<string> {
  const parsed = dealSummaryRequestSchema.safeParse(input);
  if (!parsed.success) return "";
  const ai = client();
  if (!ai) return "";

  const preferred = process.env.GEMINI_MODEL?.trim() || PRIMARY_MODEL;
  const models = [...new Set([preferred, FALLBACK_MODEL])];
  const deadline = Date.now() + BUDGET_MS;
  let lastError: unknown;
  for (const model of models) {
    const remaining = Math.min(ATTEMPT_MS, deadline - Date.now());
    if (remaining < 1_000) break;
    try {
      return await ask(ai, model, parsed.data, remaining);
    } catch (error) {
      lastError = error;
      console.error(error);
    }
  }
  if (lastError) console.error(lastError);
  return "";
}
