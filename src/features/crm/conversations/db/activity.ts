import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { createCall, readCalls } from "@/src/features/crm/conversations/db/call";
import {
  activityInsertSchema,
  conversationReadUpdateSchema,
  type Activity,
  type ActivityEvent,
  type ActivityInsert,
  type ConversationReadUpdate,
} from "@/src/features/crm/conversations/types";
import { toActivity, toActivityEvent, type ActivityRow } from "@/src/features/crm/conversations/utils/mappers";

function crm() {
  return db("crm");
}

const activityColumns = "position, channel, role, body, generated_by, is_read, call_id, created_at";

export async function createActivities(
  conversationId: string,
  activities: ActivityInsert[],
): Promise<void> {
  const rows = activityInsertSchema.array().parse(activities);
  if (rows.length === 0) return;

  const existing = await crm()
    .from("activities")
    .select("position")
    .eq("conversation_id", conversationId)
    .order("position", { ascending: false })
    .limit(1);
  throwIfError(existing.error);
  const start = typeof existing.data?.[0]?.position === "number" ? existing.data[0].position + 1 : 0;

  const callIds: Array<string | null> = [];
  for (const activity of rows) {
    const direction = activity.channel === "call" ? activity.call?.direction : undefined;
    if (!direction) {
      callIds.push(null);
      continue;
    }
    const call = await createCall({ ...activity.call, direction });
    callIds.push(call.id);
  }

  const inserted = await crm().from("activities").insert(
    rows.map((activity, offset) => ({
      conversation_id: conversationId,
      position: start + offset,
      channel: activity.channel,
      role: activity.role,
      body: activity.text,
      generated_by: activity.generatedBy,
      is_read: activity.role !== "user",
      call_id: callIds[offset],
    })),
  );
  throwIfError(inserted.error);
  const touched = await crm()
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  throwIfError(touched.error);
}

export async function readActivities(conversationId: string): Promise<Activity[]> {
  const { data, error } = await crm()
    .from("activities")
    .select(activityColumns)
    .eq("conversation_id", conversationId)
    .order("position", { ascending: true });
  throwIfError(error);
  const rows = (data ?? []) as ActivityRow[];
  const callIds = rows.map((row) => row.call_id).filter((id): id is string => typeof id === "string");
  const calls = await readCalls(callIds);
  const callById = new Map(calls.map((call) => [call.id, call]));
  return rows
    .map((row) => toActivity(row, row.call_id ? callById.get(row.call_id) : undefined))
    .filter((activity): activity is Activity => activity != null);
}

export async function readActivitiesSince(since: string): Promise<ActivityEvent[]> {
  if (Number.isNaN(Date.parse(since))) return [];
  const { data, error } = await crm()
    .from("activities")
    .select(`conversation_id, ${activityColumns}`)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  throwIfError(error);
  const rows = (data ?? []) as Array<ActivityRow & { conversation_id: string }>;
  const callIds = rows.map((row) => row.call_id).filter((id): id is string => typeof id === "string");
  const calls = await readCalls(callIds);
  const callById = new Map(calls.map((call) => [call.id, call]));
  return rows.flatMap((row) => {
    const event = toActivityEvent(row, row.call_id ? callById.get(row.call_id) : undefined);
    return event ? [event] : [];
  });
}

export async function updateActivitiesRead(input: ConversationReadUpdate): Promise<string[]> {
  const parsed = conversationReadUpdateSchema.parse(input);
  const { data, error } = await crm()
    .from("activities")
    .update({ is_read: parsed.read })
    .in("conversation_id", parsed.conversationIds)
    .select("conversation_id");
  throwIfError(error);
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (typeof row.conversation_id === "string") ids.add(row.conversation_id);
  }
  return [...ids];
}

export async function deleteActivities(conversationId: string): Promise<void> {
  const { error } = await crm().from("activities").delete().eq("conversation_id", conversationId);
  throwIfError(error);
}

export async function deleteLatestActivity(conversationId: string): Promise<void> {
  const existing = await crm()
    .from("activities")
    .select("position")
    .eq("conversation_id", conversationId)
    .order("position", { ascending: false })
    .limit(1);
  throwIfError(existing.error);
  const position = existing.data?.[0]?.position;
  if (typeof position !== "number") return;

  const deleted = await crm()
    .from("activities")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("position", position);
  throwIfError(deleted.error);
}
