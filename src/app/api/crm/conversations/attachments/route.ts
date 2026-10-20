import { storeManualAttachment } from "@/src/features/crm/conversations/server/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const id = form.get("id");
  const result = await storeManualAttachment({
    id: typeof id === "string" ? id : "",
    file: file instanceof File ? file : new File([], ""),
  });
  return Response.json(result, { status: "error" in result ? 400 : 200 });
}
