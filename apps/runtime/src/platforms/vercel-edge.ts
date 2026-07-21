import { waitUntil as vercelWaitUntil } from "@vercel/functions";

import { handleRedirectRequest, type HandlerOptions } from "@/lib/handler";

declare const process: undefined | { env?: Record<string, string | undefined> };

function getSecretBindings(): Record<string, unknown> | undefined {
  const writeKey = typeof process !== "undefined"
    ? process?.env?.ANALYTICS_WRITE_KEY
    : undefined;
  if (writeKey) {
    return { ANALYTICS_WRITE_KEY: writeKey };
  }
  return undefined;
}

export const runtime = "edge";

export function createVercelRouteHandler(options?: HandlerOptions) {
  return async function vercelRoute(request: Request): Promise<Response> {
    const bindings = options?.envBindings ?? getSecretBindings();
    const base = options ?? {};
    const merged: HandlerOptions = {
      ...base,
      envBindings: base.envBindings ?? bindings,
      provider: base.provider ?? "vercel",
      country: base.country ?? request.headers.get("x-vercel-ip-country") ?? undefined,
      waitUntil: base.waitUntil ?? ((promise: Promise<unknown>) => vercelWaitUntil(promise))
    };
    return handleRedirectRequest(request, merged);
  };
}

const defaultHandler = createVercelRouteHandler();

export const config = { runtime };

export default defaultHandler;

export const GET = defaultHandler;
export const HEAD = defaultHandler;
export const OPTIONS = defaultHandler;
export const POST = defaultHandler;
export const PUT = defaultHandler;
export const PATCH = defaultHandler;
export const DELETE = defaultHandler;

export type { HandlerOptions };
