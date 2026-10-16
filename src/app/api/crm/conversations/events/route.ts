import { openActivityStream } from "@/src/features/crm/conversations/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  const since = new URL(request.url).searchParams.get("since") ?? undefined;
  return new Response(openActivityStream(since, request.signal), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
