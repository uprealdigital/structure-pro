import { GoogleGenAI } from "@google/genai";
import { errorText, recordAiActivityLog } from "@/src/features/ai/services/activity-log.service";

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";
const REQUEST_MS = 45_000;

const instruction = [
  "Edit the attached 3D render into a photorealistic outdoor photograph.",
  "The building itself must stay identical to the render.",
  "Do not change its structure, shape, size, proportions, roofline, walls, doors, windows, vents, loft, trim, openings, or camera angle.",
  "Do not change the siding, roof, trim, shutter, or door colors.",
  "Do not add, remove, move, or redesign any part of the building.",
  "Replace only the plain background. Add natural daylight, soft realistic shadows, ground contact, and a simple yard with grass and sky.",
  "Keep the building centered and framed as it is in the render.",
].join(" ");

export type RenderImage = {
  bytes: Buffer;
  mimeType: string;
};

function imageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
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

export async function beautifyRender(input: { render: RenderImage; dealId?: string | null }): Promise<RenderImage> {
  const started = Date.now();
  const model = imageModel();
  let status: "detected" | "none" | "error" = "none";
  let errorMessage: string | null = null;
  let rawResponse: string | null = null;
  let parsedResponse: unknown = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: instruction },
              {
                inlineData: {
                  mimeType: input.render.mimeType,
                  data: input.render.bytes.toString("base64"),
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "4:3" },
        },
      }),
      REQUEST_MS,
    );

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const data = part.inlineData?.data;
      if (!data) continue;
      const image = {
        bytes: Buffer.from(data, "base64"),
        mimeType: part.inlineData?.mimeType || "image/png",
      };
      if (image.bytes.byteLength === 0) continue;
      status = "detected";
      rawResponse = "image";
      parsedResponse = { mimeType: image.mimeType, byteLength: image.bytes.byteLength };
      return image;
    }

    throw new Error("Gemini did not return a beautified render");
  } catch (error) {
    status = "error";
    errorMessage = errorText(error);
    throw error;
  } finally {
    await recordAiActivityLog({
      dealId: input.dealId,
      feature: "render",
      promptPayload: {
        request: instruction,
        render: { mimeType: input.render.mimeType, byteLength: input.render.bytes.byteLength },
      },
      model,
      rawResponse,
      parsedResponse,
      status,
      errorMessage,
      executionTimeMs: Date.now() - started,
    });
  }
}
