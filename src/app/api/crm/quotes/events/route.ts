import { openQuoteStream } from "@/src/features/crm/quotes/server/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET(request: Request) {
  const quoteId = new URL(request.url).searchParams.get("quoteId") ?? undefined;
  return new Response(openQuoteStream(quoteId, request.signal), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
