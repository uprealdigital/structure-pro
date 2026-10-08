import { createQuoteAction } from "@/src/features/cpq/server/actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const result = await createQuoteAction({
    fullName: typeof payload.fullName === "string" ? payload.fullName : "",
    phone: typeof payload.phone === "string" ? payload.phone : "",
    email: typeof payload.email === "string" ? payload.email : "",
    selections: payload.selections,
  });
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ ok: true, ...result.data });
}
