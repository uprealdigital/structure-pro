import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  Type,
  type Content,
} from "@google/genai";
import { sendMail } from "@/src/common/utils/mail";
import { callRouter, readJson } from "@/src/common/utils/internal-call";
import type { AgentSession } from "@/src/features/ai/types";
import { configuratorAgentPrompt } from "@/src/features/ai/prompts/configurator-agent.prompt";

const SEND_CONTRACT = "send_contract";
const PRIMARY_MODEL = "gemini-3.1-flash-lite";
const FALLBACK_MODELS = ["gemini-3.5-flash-lite"];
const RETRY_BUDGET_MS = 90_000;
const ATTEMPT_MS = 45_000;

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

function systemInstruction(session: AgentSession): string {
  return configuratorAgentPrompt({
    channel: session.chatId ? "Telegram" : "SMS",
    fullName: session.fullName,
    email: session.email,
    phone: session.phone,
    brandName: session.brandName,
    specLines: session.specLines,
    total: session.total,
  });
}

function contentsForReply(session: AgentSession, incoming: string): Content[] {
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
        parameters: {
          type: Type;
          properties: Record<string, { type: Type; description: string }>;
          required: string[];
        };
      }[];
    }[];
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingConfigMode };
    };
  },
  deadline: number,
) {
  let lastError: unknown;
  let modelIndex = 0;
  const models = modelsToTry();

  while (Date.now() < deadline) {
    const model = models[modelIndex % models.length];
    const remaining = deadline - Date.now();
    if (remaining < 3_000) break;
    try {
      return await withTimeout(
        ai.models.generateContent({ model, contents, config }),
        Math.min(ATTEMPT_MS, remaining),
      );
    } catch (error) {
      lastError = error;
      if (!isCapacityError(error) && !isMissingModel(error)) throw error;
      console.error(error);
      modelIndex += 1;
      const finishedARound = modelIndex % models.length === 0;
      if (!finishedARound) continue;
      const pause = Math.min(5_000, deadline - Date.now());
      if (pause <= 0) break;
      await sleep(pause);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Gemini is unavailable");
}

function remember(session: AgentSession, incoming: string, reply: string): string {
  session.messages.push({ role: "user", text: incoming });
  session.messages.push({ role: "model", text: reply });
  return reply;
}

async function deliverInvoice(session: AgentSession): Promise<string> {
  try {
    const { POST: renderDocument } = await import("@/src/app/api/cpq/quotes/[id]/document/route");
    const response = await callRouter(
      renderDocument,
      `/api/cpq/quotes/${session.cpqQuoteId}/document`,
      {
        method: "POST",
        params: { id: session.cpqQuoteId },
        body: {
          kind: "invoice",
          contact: {
            fullName: session.fullName,
            phone: session.phone,
            email: session.email,
          },
        },
      },
    );
    const document = await readJson<{
      subject: string;
      text: string;
      html: string;
      attachment: { filename: string; content: string; contentType: string };
    }>(response);
    await sendMail({
      to: session.email,
      subject: document.subject,
      text: document.text,
      html: document.html,
      attachments: [
        {
          filename: document.attachment.filename,
          content: document.attachment.content,
          contentType: document.attachment.contentType,
        },
      ],
    });
    console.log(`Invoice ${session.invoiceId} accepted for ${session.email}`);
    session.contractSent = true;
    return `I emailed invoice ${session.invoiceId} to ${session.email}. Please check your inbox and spam folder, and tell me if it arrived.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email failed";
    return `I couldn't email the invoice to ${session.email}. ${message}`;
  }
}

function answerText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function missingTopic(args: Record<string, unknown> | undefined): string | undefined {
  if (!answerText(args?.timeline)) return "when they want the building";
  if (!answerText(args?.site)) return "whether the site is ready and if they have a foundation";
  if (!answerText(args?.purpose)) return "what they want the building for and what they will store";
  return undefined;
}

function claimsInvoiceSent(text: string): boolean {
  return /sent (the )?(invoice|contract)|check your inbox|emailed the invoice/i.test(text);
}

function wantsInvoiceAgain(text: string): boolean {
  return /didn.?t (get|receive)|never (got|received)|no email|not in my inbox|didn.?t arrive|resend/i.test(
    text,
  );
}

export async function replyToSms(session: AgentSession, incoming: string): Promise<string> {
  if (session.contractSent && wantsInvoiceAgain(incoming)) {
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
              "Email the invoice only after the customer has answered when they want it, whether the site is ready, and what the building is for.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                timeline: {
                  type: Type.STRING,
                  description: "The customer's own answer for when they want the building.",
                },
                site: {
                  type: Type.STRING,
                  description:
                    "The customer's own answer about site readiness and foundation.",
                },
                purpose: {
                  type: Type.STRING,
                  description:
                    "The customer's own answer for what they want the building for and what they will store.",
                },
              },
              required: ["timeline", "site", "purpose"],
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

        const topic = missingTopic(call.args as Record<string, unknown> | undefined);
        if (topic) {
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: SEND_CONTRACT,
              response: {
                error: `Do not email yet. Ask one question, in your own words, about ${topic}. Do not ask anything else.`,
              },
            },
          });
          continue;
        }

        return remember(session, incoming, await deliverInvoice(session));
      }

      contents.push({ role: "user", parts: functionResponseParts });
      continue;
    }

    const text =
      response.text?.trim() ||
      "Thanks — could you tell me a bit more about how you'll use the building?";
    if (!session.contractSent && claimsInvoiceSent(text) && !text.includes("?")) {
      return remember(
        session,
        incoming,
        "I still need a few details before I email the invoice. I'll ask one question at a time.",
      );
    }
    return remember(session, incoming, text);
  }

  return remember(
    session,
    incoming,
    "Thanks, I hit a snag sending that. Reply and I'll pick up where we left off.",
  );
}
