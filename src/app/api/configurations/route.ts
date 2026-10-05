import { isLocaleCode } from "@/src/lib/configuration-link";
import { saveConfiguration } from "@/src/lib/configurations";
import { isQuoteSelections, isStoredConfiguration, toStoredConfiguration } from "@/src/lib/selections";

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
  const lng =
    isStoredConfiguration(payload.selections)
      ? payload.selections.lng
      : typeof payload.lng === "string"
        ? payload.lng
        : "";
  if (!isQuoteSelections(payload.selections) || !payload.selections.zip.trim() || !isLocaleCode(lng.trim())) {
    return Response.json(
      { error: "A configuration and language are required" },
      { status: 400 },
    );
  }

  try {
    const id = await saveConfiguration(toStoredConfiguration(payload.selections, lng));
    return Response.json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save configuration";
    return Response.json({ error: message }, { status: 500 });
  }
}
