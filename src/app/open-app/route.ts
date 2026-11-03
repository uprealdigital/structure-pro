import { NextResponse } from "next/server";
import { appOriginFrom } from "@/src/features/website/utils/hosts";

export function GET(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  return NextResponse.redirect(`${appOriginFrom(host)}/`);
}
