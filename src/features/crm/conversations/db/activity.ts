import { db } from "@/src/common/lib/supabase/supabase.service";
import { throwIfError } from "@/src/common/utils/error-handling";
import { createCall, readCalls } from "@/src/features/crm/conversations/db/call";
import {
  activityInsertSchema,
  conversationReadUpdateSchema,
  visibleActivityReadSchema,
  type Activity,
  type ActivityEvent,
  type ActivityInsert,
  type ConversationReadUpdate,
} from "@/src/features/crm/conversations/types";
import { toActivity, toActivityEvent, type ActivityRow } from "@/src/features/crm/conversations/utils/mappers";

function crm() {
  return db("crm");
}

const activityColumns = "position, channel, role, body, generated_by, read_at, call_id, created_at";

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
    rows.map((activity, offset) => {
      const readAt = activity.readAt ?? null;
      return {
        conversation_id: conversationId,
        position: start + offset,
        channel: activity.channel,
        role: activity.role,
        body: activity.text,
        generated_by: activity.generatedBy,
        ...(activity.createdAt ? { created_at: activity.createdAt } : {}),
        read_at: readAt,
        is_read: readAt != null,
        call_id: callIds[offset],
      };
    }),
  );
  throwIfError(inserted.error);
  const touched = await crm()
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  throwIfError(touched.error);
}

export async function readLatestConversationIdForChannel(
  channel: "sms" | "telegram",
): Promise<string | undefined> {
  const { data, error } = await crm()
    .from("activities")
    .select("conversation_id")
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(1);
  throwIfError(error);
  const id = data?.[0]?.conversation_id;
  return typeof id === "string" ? id : undefined;
}

export async function readLatestActivity(conversationId: string): Promise<Activity | undefined> {
  const { data, error } = await crm()
    .from("activities")
    .select(activityColumns)
    .eq("conversation_id", conversationId)
    .order("position", { ascending: false })
    .limit(1);
  throwIfError(error);
  const row = data?.[0] as ActivityRow | undefined;
  if (!row) return undefined;
  const calls = typeof row.call_id === "string" ? await readCalls([row.call_id]) : [];
  return toActivity(row, calls[0]) ?? undefined;
}

export async function readLatestMessageAt(conversationId: string): Promise<string> {
  const { data, error } = await crm()
    .from("activities")
    .select("created_at")
    .eq("conversation_id", conversationId)
    .in("channel", ["sms", "facebook", "email", "telegram"])
    .order("created_at", { ascending: false })
    .limit(1);
  throwIfError(error);
  const stamp = data?.[0]?.created_at;
  return typeof stamp === "string" ? stamp : "";
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

export async function countUnreadActivities(): Promise<number> {
  const { count, error } = await crm()
    .from("activities")
    .select("position", { count: "exact", head: true })
    .is("read_at", null);
  throwIfError(error);
  return count ?? 0;
}

export async function conversationUnreadCount(conversationId: string): Promise<number> {
  const { count, error } = await crm()
    .from("activities")
    .select("position", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .is("read_at", null);
  throwIfError(error);
  return count ?? 0;
}

export async function markActivitiesReadAt(
  conversationId: string,
  positions: number[],
): Promise<{ readAt: string; positions: number[] }> {
  const parsed = visibleActivityReadSchema.parse({ conversationId, positions });
  const readAt = new Date().toISOString();
  const { data, error } = await crm()
    .from("activities")
    .update({ read_at: readAt, is_read: true })
    .eq("conversation_id", parsed.conversationId)
    .in("position", parsed.positions)
    .is("read_at", null)
    .select("position");
  throwIfError(error);
  const updated = (data ?? [])
    .map((row) => row.position)
    .filter((position): position is number => typeof position === "number");
  return { readAt, positions: updated };
}

export async function updateActivitiesRead(
  input: ConversationReadUpdate,
): Promise<Array<{ conversationId: string; unreadCount: number }>> {
  const parsed = conversationReadUpdateSchema.parse(input);
  if (parsed.read) {
    const { error } = await crm()
      .from("activities")
      .update({ read_at: new Date().toISOString(), is_read: true })
      .in("conversation_id", parsed.conversationIds)
      .is("read_at", null);
    throwIfError(error);
    return parsed.conversationIds.map((conversationId) => ({ conversationId, unreadCount: 0 }));
  }

  const counts: Array<{ conversationId: string; unreadCount: number }> = [];
  for (const conversationId of parsed.conversationIds) {
    const existing = await crm()
      .from("activities")
      .select("position")
      .eq("conversation_id", conversationId)
      .order("position", { ascending: false })
      .limit(1);
    throwIfError(existing.error);
    const position = existing.data?.[0]?.position;
    if (typeof position !== "number") continue;
    const updated = await crm()
      .from("activities")
      .update({ read_at: null, is_read: false })
      .eq("conversation_id", conversationId)
      .eq("position", position)
      .select("conversation_id");
    throwIfError(updated.error);
    if ((updated.data ?? []).length > 0) {
      counts.push({ conversationId, unreadCount: await conversationUnreadCount(conversationId) });
    }
  }
  return counts;
}

export async function deleteActivities(conversationId: string): Promise<void> {
  const { error } = await crm().from("activities").delete().eq("conversation_id", conversationId);
  throwIfError(error);
}

export async function deleteActivityAt(conversationId: string, position: number): Promise<void> {
  const { error } = await crm()
    .from("activities")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("position", position);
  throwIfError(error);
}

export type ActivityRef = {
  id: number;
  position: number;
  role: string;
  channel: string;
  body: string;
};

function activityRef(row: {
  id?: unknown;
  position?: unknown;
  role?: unknown;
  channel?: unknown;
  body?: unknown;
}): ActivityRef | undefined {
  const id = typeof row.id === "number" ? row.id : typeof row.id === "string" ? Number(row.id) : Number.NaN;
  const position = typeof row.position === "number" ? row.position : Number(row.position);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(position)) return undefined;
  if (typeof row.role !== "string" || typeof row.channel !== "string" || typeof row.body !== "string") return undefined;
  return { id, position, role: row.role, channel: row.channel, body: row.body };
}

export async function readActivityRefs(conversationId: string, positions: number[]): Promise<ActivityRef[]> {
  if (positions.length === 0) return [];
  const { data, error } = await crm()
    .from("activities")
    .select("id, position, role, channel, body")
    .eq("conversation_id", conversationId)
    .in("position", positions);
  throwIfError(error);
  return (data ?? []).flatMap((row) => {
    const activity = activityRef(row);
    return activity ? [activity] : [];
  });
}

export async function readActivityRefsByIds(ids: number[]): Promise<ActivityRef[]> {
  if (ids.length === 0) return [];
  const { data, error } = await crm()
    .from("activities")
    .select("id, position, role, channel, body")
    .in("id", ids);
  throwIfError(error);
  return (data ?? []).flatMap((row) => {
    const activity = activityRef(row);
    return activity ? [activity] : [];
  });
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
