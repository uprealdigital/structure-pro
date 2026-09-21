import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  Type,
  type Content,
} from "@google/genai";
import { sendInvoiceEmail } from "@/src/lib/mail";
import { describeSelections } from "@/src/lib/selections";
import type { QuoteSession } from "@/src/lib/quote-types";

const SEND_CONTRACT = "send_contract";
const PRIMARY_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash"];
const RETRY_BUDGET_MS = 110_000;
const ATTEMPT_MS = 20_000;
const RETRY_WAITS_MS = [3_000, 8_000, 15_000, 20_000];

function modelsToTry(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim() || PRIMARY_MODEL;
  return [...new Set([preferred, ...FALLBACK_MODELS])];
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isCapacityError(error: unknown): boolean {
  return /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|timed out/i.test(errorText(error));
}

function isMissingModel(error: unknown): boolean {
  const message = errorText(error);
  return /NOT_FOUND|no longer available/i.test(message) && /model/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
}

function systemInstruction(session: QuoteSession): string {
  const described = describeSelections(session.selections);
  const specLines = described.specs
    .map((spec) => `- ${spec.label}: ${spec.value}`)
    .join("\n");

  const channel = session.chatId ? "Telegram" : "SMS";
  return `You are a friendly shed sales assistant chatting with a customer on ${channel} for ${described.brand.name}.
Keep every reply under 320 characters. Ask one question at a time.
Customer: ${session.fullName} (${session.email}, ${session.phone}).
Configured shed:
${specLines}
Estimated total: ${described.estimate.total} USD.

Qualify them on: intended use, site/delivery readiness, timeline, and that they want to proceed.
When you have enough to send an invoice (they confirmed they want to proceed, plus use or site/timeline), call ${SEND_CONTRACT} exactly once.
Never invent prices. Do not email more than once. After the invoice is sent, confirm it is in their inbox and stop asking the same questions.
If they say they are not ready, stay helpful and do not call ${SEND_CONTRACT}.`;
}

function contentsForReply(session: QuoteSession, incoming: string): Content[] {
  const contents: Content[] = session.messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));
  contents.push({ role: "user", parts: [{ text: incoming }] });

  // The opening text is stored as the assistant's first turn. Gemini rejects
  // a transcript that does not start with the customer.
  if (contents[0]?.role === "model") {
    contents.unshift({
      role: "user",
      parts: [{ text: "I submitted a quote on the website." }],
    });
  }

  return contents;
}

export function replyFailureMessage(error: unknown): string {
  if (isCapacityError(error)) {
    return "Sorry, I had trouble with that message. Reply again in a moment.";
  }
  const brief = errorText(error).replace(/\s+/g, " ").trim().slice(0, 300);
  return `Sorry, I had trouble with that message. ${brief}`;
}

async function generateReply(
  ai: GoogleGenAI,
  contents: Content[],
  config: {
    systemInstruction: string;
    tools: {
      functionDeclarations: {
        name: string;
        description: string;
        parameters: { type: Type; properties: Record<string, never> };
      }[];
    }[];
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingConfigMode };
    };
  },
  deadline: number,
) {
  let lastError: unknown;
  let waitIndex = 0;
  let modelIndex = 0;
  const models = modelsToTry();

  while (Date.now() < deadline) {
    const model = models[Math.min(modelIndex, models.length - 1)];
    const remaining = deadline - Date.now();
    try {
      return await withTimeout(
        ai.models.generateContent({ model, contents, config }),
        Math.min(ATTEMPT_MS, remaining),
      );
    } catch (error) {
      lastError = error;
      if (!isCapacityError(error) && !isMissingModel(error)) throw error;
      if (isMissingModel(error) && modelIndex < models.length - 1) {
        modelIndex += 1;
        continue;
      }
      console.error(error);
      const pause = Math.min(
        RETRY_WAITS_MS[Math.min(waitIndex, RETRY_WAITS_MS.length - 1)],
        deadline - Date.now(),
      );
      waitIndex += 1;
      if (pause <= 0) break;
      await sleep(pause);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini is unavailable");
}

function remember(session: QuoteSession, incoming: string, reply: string): string {
  session.messages.push({ role: "user", text: incoming });
  session.messages.push({ role: "model", text: reply });
  return reply;
}

async function deliverInvoice(session: QuoteSession): Promise<string> {
  try {
    await sendInvoiceEmail(session);
    session.contractSent = true;
    return `I emailed invoice ${session.invoiceId} to ${session.email}. Please check your inbox and spam folder, and tell me if it arrived.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email failed";
    return `I couldn't email the invoice to ${session.email}. ${message}`;
  }
}

function claimsInvoiceSent(text: string): boolean {
  return /sent (the )?(invoice|contract)|check your inbox|emailed the invoice/i.test(text);
}

function wantsInvoiceAgain(text: string): boolean {
  return /didn.?t (get|receive)|never (got|received)|no email|not in my inbox|didn.?t arrive|resend/i.test(
    text,
  );
}

export async function replyToSms(session: QuoteSession, incoming: string): Promise<string> {
  if (wantsInvoiceAgain(incoming)) {
    return remember(session, incoming, await deliverInvoice(session));
  }

  const ai = getClient();
  const deadline = Date.now() + RETRY_BUDGET_MS;
  const contents = contentsForReply(session, incoming);
  const config = {
    systemInstruction: systemInstruction(session),
    tools: [
      {
        functionDeclarations: [
          {
            name: SEND_CONTRACT,
            description:
              "Email the HTML invoice and quote.json to the customer's quote email.",
            parameters: {
              type: Type.OBJECT,
              properties: {},
            },
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.AUTO,
      },
    },
  };

  for (let i = 0; i < 3; i += 1) {
    const response = await generateReply(ai, contents, config, deadline);

    const functionCalls = response.functionCalls ?? [];
    if (functionCalls.length > 0) {
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      }

      const functionResponseParts = [];
      for (const call of functionCalls) {
        if (call.name !== SEND_CONTRACT) {
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name ?? SEND_CONTRACT,
              response: { error: "Unknown tool" },
            },
          });
          continue;
        }

        if (session.contractSent) {
          return remember(
            session,
            incoming,
            `The invoice was already emailed to ${session.email}. If it is not in your inbox or spam, reply that you didn't get it and I will send it again.`,
          );
        }

        return remember(session, incoming, await deliverInvoice(session));
      }

      contents.push({ role: "user", parts: functionResponseParts });
      continue;
    }

    const text =
      response.text?.trim() ||
      "Thanks — could you tell me a bit more about how you'll use the shed?";
    if (!session.contractSent && claimsInvoiceSent(text)) {
      return remember(session, incoming, await deliverInvoice(session));
    }
    return remember(session, incoming, text);
  }

  return remember(
    session,
    incoming,
    "Thanks, I hit a snag sending that. Reply and I'll pick up where we left off.",
  );
}
