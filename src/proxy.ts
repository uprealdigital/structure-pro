import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAppHost } from "@/src/features/website/utils/hosts";

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  if (!isAppHost(host) || request.nextUrl.pathname !== "/") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/conversations";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/"],
};
