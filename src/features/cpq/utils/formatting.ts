export function configurationShareUrl(href: string, id: string): string {
  const url = new URL(href);
  url.searchParams.delete("zip");
  url.searchParams.delete("lng");
  url.hash = id;
  return url.toString();
}
