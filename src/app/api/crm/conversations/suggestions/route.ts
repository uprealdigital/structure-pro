import { openConversationSuggestionStream } from "@/src/features/crm/conversations/server/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  return new Response(await openConversationSuggestionStream(input, request.signal), {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
