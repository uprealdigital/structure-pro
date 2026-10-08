import {
  createYardPreview,
  deleteYardPreview,
  readYardPreview,
  storeYardPreviewImage,
  updateYardPreview,
} from "@/src/features/ai/data/yard-preview.db";
import type { YardPreviewEvent } from "@/src/features/ai/types";

export type { YardPreviewEvent, YardPreviewStatus } from "@/src/features/ai/types";
export {
  createYardPreview,
  deleteYardPreview,
  readYardPreview,
  storeYardPreviewImage,
  updateYardPreview,
};

export function previewEvent(step: string, detail?: string): YardPreviewEvent {
  return {
    at: new Date().toISOString(),
    step,
    ...(detail ? { detail } : {}),
  };
}

export function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
