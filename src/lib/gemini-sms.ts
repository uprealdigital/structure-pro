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
  const detail = error instanceof Error ? error.message : "Unknown error";
  const brief = detail.replace(/\s+/g, " ").trim().slice(0, 300);
  return `Sorry, I had trouble with that message. ${brief}`;
}

export async function replyToSms(session: QuoteSession, incoming: string): Promise<string> {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const contents = contentsForReply(session, incoming);

  for (let i = 0; i < 3; i += 1) {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
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
      },
    });

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
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: SEND_CONTRACT,
              response: { output: "Invoice already sent. Do not send again." },
            },
          });
          continue;
        }

        try {
          await sendInvoiceEmail(session);
          session.contractSent = true;
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: SEND_CONTRACT,
              response: {
                output: `Invoice ${session.invoiceId} emailed to ${session.email}.`,
              },
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Email failed";
          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: SEND_CONTRACT,
              response: { error: message },
            },
          });
        }
      }

      contents.push({ role: "user", parts: functionResponseParts });
      continue;
    }

    const text = response.text?.trim();
    const reply =
      text ||
      "Thanks — could you tell me a bit more about how you'll use the shed?";
    session.messages.push({ role: "user", text: incoming });
    session.messages.push({ role: "model", text: reply });
    return reply;
  }

  const fallback =
    "Thanks, I hit a snag sending that. Reply and I'll pick up where we left off.";
  session.messages.push({ role: "user", text: incoming });
  session.messages.push({ role: "model", text: fallback });
  return fallback;
}
