import { assertInternal } from "@/src/common/utils/internal-call";
import { createContact } from "@/src/features/crm/db/contact";

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

export async function POST(request: Request) {
  const denied = assertInternal(request);
  if (denied) return denied;

  const payload = await payloadOf(request);
  const fullName = text(payload?.fullName);
  const phone = text(payload?.phone);
  const email = text(payload?.email);
  const optedOut = typeof payload?.optedOut === "boolean" ? payload.optedOut : undefined;
  if (!fullName || !phone || !email) {
    return Response.json({ error: "fullName, phone, and email are required" }, { status: 400 });
  }

  try {
    const contact = await createContact({ fullName, phone, email, optedOut });
    return Response.json(contact);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save contact";
    return Response.json({ error: message }, { status: 500 });
  }
}
