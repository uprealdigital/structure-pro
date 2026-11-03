import { productionAppOrigin } from "@/src/features/website/config/site";

const appHostNames = new Set(["shedgrowth.app", "www.shedgrowth.app", "app.shedgrowth.co"]);

export function requestHostname(hostHeader: string): string {
  const host = hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
  return host.replace(/:\d+$/, "");
}

/** CRM and CPQ. The marketing site is every other host, including shedgrowth.co and localhost. */
export function isAppHost(hostHeader: string): boolean {
  const hostname = requestHostname(hostHeader);
  if (appHostNames.has(hostname)) return true;
  return hostname.startsWith("app.");
}

/** Origin of the CRM. Local marketing hosts point at app.localhost on the same port. */
export function appOriginFrom(hostHeader: string): string {
  const host = hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = requestHostname(host);
  const port = host.match(/:(\d+)$/)?.[1];
  const portSuffix = port ? `:${port}` : "";

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `http://app.localhost${portSuffix}`;
  }

  if (hostname === "shedgrowth.app" || hostname === "www.shedgrowth.app") {
    return "https://shedgrowth.app";
  }

  if (hostname.startsWith("app.")) {
    const proto = hostname.endsWith(".localhost") ? "http" : "https";
    return `${proto}://${hostname}${portSuffix}`;
  }

  return productionAppOrigin;
}
