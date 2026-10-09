import { assertInternal } from "@/src/common/utils/internal-call";
import { createConversation } from "@/src/features/crm/conversations/db/conversation";
import { activityInsertSchema, type ActivityInsert } from "@/src/features/crm/conversations/types";

export const runtime = "nodejs";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function payloadOf(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function activitiesOf(value: unknown): ActivityInsert[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const activities: ActivityInsert[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return undefined;
    const activity = activityInsertSchema.safeParse(item);
    if (!activity.success) return undefined;
    activities.push(activity.data);
  }
  return activities;
}

export async function POST(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;

  const payload = await payloadOf(request);
  const lookupKey = text(payload?.lookupKey);
  const chatId = text(payload?.chatId) || undefined;
  const customerId = text(payload?.customerId);
  const contractSent = payload?.contractSent === true;
  const activities = activitiesOf(payload?.activities);
  if (!lookupKey || !customerId || !activities) {
    return Response.json(
      { error: "lookupKey, customerId, and activities are required" },
      { status: 400 },
    );
  }

  try {
    const id = await createConversation({
      lookupKey,
      chatId,
      customerId,
      contractSent,
      activities,
    });
    return Response.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save conversation";
    return Response.json({ error: message }, { status: 500 });
  }
}
