import { redirect } from "next/navigation";

function first(value: string | string[] | undefined): string | undefined {
  const item = Array.isArray(value) ? value[0] : value;
  const trimmed = item?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    zip?: string | string[];
    lng?: string | string[];
    conversation?: string | string[];
    deal?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const zip = first(params.zip);
  const lng = first(params.lng);
  if (zip || lng) {
    const search = new URLSearchParams();
    if (zip) search.set("zip", zip);
    if (lng) search.set("lng", lng);
    redirect(`/cpq?${search.toString()}`);
  }

  const search = new URLSearchParams();
  const conversation = first(params.conversation);
  const deal = first(params.deal);
  if (conversation) search.set("conversation", conversation);
  if (deal) search.set("deal", deal);
  const query = search.size > 0 ? `?${search.toString()}` : "";
  redirect(`/conversations${query}`);
}
