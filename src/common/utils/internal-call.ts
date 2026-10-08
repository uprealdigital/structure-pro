import type { RouteContext } from "@/src/common/types";

type Router = (request: Request, context: RouteContext) => Promise<Response> | Response;

function internalKey(): string {
  const key = process.env.INTERNAL_API_KEY?.trim();
  if (!key) {
    throw new Error("Set INTERNAL_API_KEY.");
  }
  return key;
}

export function assertInternal(request: Request): Response | null {
  const expected = process.env.INTERNAL_API_KEY?.trim();
  const provided = request.headers.get("x-internal-key");
  if (!expected || provided !== expected) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function callRouter(
  handler: Router,
  path: string,
  init?: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
  },
): Promise<Response> {
  const headers = new Headers();
  headers.set("x-internal-key", internalKey());
  let body: string | undefined;
  if (init?.body !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.body);
  }
  const request = new Request(`http://internal${path}`, {
    method: init?.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });
  return handler(request, { params: Promise.resolve(init?.params ?? {}) });
}

export async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: unknown }
    | T
    | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}
