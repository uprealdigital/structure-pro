import { redirect } from "next/navigation";

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string | string[]; deal?: string | string[] }>;
}) {
  const params = await searchParams;
  const id = Array.isArray(params.conversation) ? params.conversation[0] : params.conversation;
  const deal = Array.isArray(params.deal) ? params.deal[0] : params.deal;
  const selected = id?.trim();
  const selectedDeal = deal?.trim();
  const search = new URLSearchParams();
  if (selected) search.set("conversation", selected);
  if (selectedDeal) search.set("deal", selectedDeal);
  const query = search.size > 0 ? `?${search.toString()}` : "";
  redirect(`/crm/conversations${query}`);
}
