import { GoogleGenAI } from "@google/genai";
import type { QuoteSelections } from "@/src/lib/quote-types";
import { describeSelections } from "@/src/lib/selections";

const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

const ASPECT_RATIOS: { id: string; ratio: number }[] = [
  { id: "1:1", ratio: 1 },
  { id: "2:3", ratio: 2 / 3 },
  { id: "3:2", ratio: 3 / 2 },
  { id: "3:4", ratio: 3 / 4 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "4:5", ratio: 4 / 5 },
  { id: "5:4", ratio: 5 / 4 },
  { id: "9:16", ratio: 9 / 16 },
  { id: "16:9", ratio: 16 / 9 },
  { id: "21:9", ratio: 21 / 9 },
];

const PROMPT_SPEC_LABELS = new Set([
  "Style",
  "Size",
  "Height",
  "Siding",
  "Roof",
  "Siding color",
  "Trim color",
  "Roof color",
  "Shutter color",
  "Door",
  "Window",
  "Loft",
  "Vent",
]);

export type YardImage = {
  bytes: Buffer;
  mimeType: string;
};

function imageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
}

function closestAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return "4:3";
  const ratio = width / height;
  let best = ASPECT_RATIOS[0];
  let bestDiff = Infinity;
  for (const item of ASPECT_RATIOS) {
    const diff = Math.abs(Math.log(ratio) - Math.log(item.ratio));
    if (diff < bestDiff) {
      best = item;
      bestDiff = diff;
    }
  }
  return best.id;
}

function readJpegSize(bytes: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

function readWebpSize(bytes: Buffer): { width: number; height: number } | null {
  const format = bytes.toString("ascii", 12, 16);
  if (format === "VP8X" && bytes.length >= 30) {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (format === "VP8 " && bytes.length >= 30) {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === "VP8L" && bytes.length >= 25) {
    const b0 = bytes[21];
    const b1 = bytes[22];
    const b2 = bytes[23];
    const b3 = bytes[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  return null;
}

function readHeifSize(bytes: Buffer): { width: number; height: number } | null {
  const index = bytes.indexOf("ispe");
  if (index < 0 || index + 16 > bytes.length) return null;
  const width = bytes.readUInt32BE(index + 8);
  const height = bytes.readUInt32BE(index + 12);
  if (width === 0 || height === 0 || width > 20000 || height > 20000) return null;
  return { width, height };
}

function readImageSize(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return readJpegSize(bytes);
  }
  if (
    bytes.length >= 16 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return readWebpSize(bytes);
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") {
    return readHeifSize(bytes);
  }
  return null;
}

function previewPrompt(selections: QuoteSelections): string {
  const described = describeSelections(selections);
  const specLines = described.specs
    .filter((spec) => PROMPT_SPEC_LABELS.has(spec.label))
    .map((spec) => `- ${spec.label}: ${spec.value}`)
    .join("\n");

  return [
    "The first image is a photo of the customer's yard. The second image is a 3D render of the exact shed they configured.",
    "Place this exact shed in the yard photo. Match perspective, scale, lighting, and ground contact. Keep the yard's buildings and landscaping.",
    "Shed specifications:",
    specLines,
  ].join("\n\n");
}

export async function compositeYardPreview(input: {
  yardPhoto: YardImage;
  shedRender: YardImage;
  selections: QuoteSelections;
}): Promise<YardImage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const size = readImageSize(input.yardPhoto.bytes);
  const aspectRatio = size
    ? closestAspectRatio(size.width, size.height)
    : "4:3";
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: imageModel(),
    contents: [
      {
        role: "user",
        parts: [
          { text: previewPrompt(input.selections) },
          {
            inlineData: {
              mimeType: input.yardPhoto.mimeType,
              data: input.yardPhoto.bytes.toString("base64"),
            },
          },
          {
            inlineData: {
              mimeType: input.shedRender.mimeType,
              data: input.shedRender.bytes.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (!data) continue;
    return {
      bytes: Buffer.from(data, "base64"),
      mimeType: part.inlineData?.mimeType || "image/png",
    };
  }

  throw new Error("Gemini did not return a backyard preview image");
}
