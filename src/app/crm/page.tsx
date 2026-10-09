import { redirect } from "next/navigation";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string | string[] }>;
}) {
  const params = await searchParams;
  const id = Array.isArray(params.conversation) ? params.conversation[0] : params.conversation;
  const selected = id?.trim();
  const query = selected ? `?conversation=${encodeURIComponent(selected)}` : "";
  redirect(`/crm/conversations${query}`);
}
