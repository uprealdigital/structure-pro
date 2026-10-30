import { openDealStream } from "@/src/features/crm/deals/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  const dealId = new URL(request.url).searchParams.get("dealId") ?? undefined;
  return new Response(openDealStream(dealId, request.signal), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
