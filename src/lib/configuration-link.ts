export const CONFIGURATION_ID = /^[a-f0-9]{32}$/;
export const LOCALE_CODE = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export function isConfigurationId(value: string): boolean {
  return CONFIGURATION_ID.test(value);
}

export function isLocaleCode(value: string): boolean {
  return LOCALE_CODE.test(value);
}

export function configurationShareUrl(href: string, id: string): string {
  const url = new URL(href);
  url.searchParams.delete("zip");
  url.searchParams.delete("lng");
  url.hash = id;
  return url.toString();
}
