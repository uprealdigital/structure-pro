"use server";

import { recordCrmLog } from "@/src/features/crm/common/db/log";

export async function reportCrmIssue(feature: string, message: string): Promise<void> {
  const name = feature.trim().slice(0, 80);
  const text = message.trim().slice(0, 500);
  if (!name || !text) return;
  await recordCrmLog({ feature: name, error: text });
}
