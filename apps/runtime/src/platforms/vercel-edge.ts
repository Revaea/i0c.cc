import { handleRedirectRequest, resolveConfigUrlFromBindings, type HandlerOptions } from "@/lib/handler";

declare const process: undefined | { env?: Record<string, string | undefined> };

interface VercelRequestContext {
  waitUntil?(promise: Promise<unknown>): void;
}

function getProcessEnv(): Record<string, unknown> | undefined {
  if (typeof process !== "undefined" && process?.env) {
    return process.env as Record<string, unknown>;
  }
  return undefined;
}

export const runtime = "edge";

export function createVercelRouteHandler(options?: HandlerOptions) {
  return async function vercelRoute(request: Request, context?: VercelRequestContext): Promise<Response> {
    const bindings = getProcessEnv();
    const resolvedUrl = options?.configUrl ?? resolveConfigUrlFromBindings(bindings);
    const finalOptions = resolvedUrl && resolvedUrl !== options?.configUrl ? { ...options, configUrl: resolvedUrl } : options;
    const base = finalOptions ?? {};
    const platformWaitUntil = context && typeof context.waitUntil === "function"
      ? (promise: Promise<unknown>) => context.waitUntil?.(promise)
      : undefined;
    const merged: HandlerOptions = {
      ...base,
      envBindings: base.envBindings ?? bindings,
      provider: base.provider ?? "vercel",
      country: base.country ?? request.headers.get("x-vercel-ip-country") ?? undefined,
      waitUntil: base.waitUntil ?? platformWaitUntil
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
