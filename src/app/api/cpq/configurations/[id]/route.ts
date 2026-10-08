import { getConfiguration } from "@/src/features/cpq/server/queries";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const configuration = await getConfiguration(id);
    if (!configuration) {
      return Response.json({ error: "Configuration not found" }, { status: 404 });
    }
    return Response.json({ selections: configuration.selections });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load configuration";
    return Response.json({ error: message }, { status: 500 });
  }
}
