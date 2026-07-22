import { createVercelEdgeHandler } from "@i0c/plugin-runtime-vercel/runtime";

import { handleRedirectRequest, type HandlerOptions } from "@/lib/handler";

export const runtime = "edge";

export function createVercelRouteHandler(options?: HandlerOptions) {
  return createVercelEdgeHandler(
    (request, context) => {
      const base = options ?? {};
      return handleRedirectRequest(request, {
        ...context,
        ...base,
        envBindings: base.envBindings ?? context.envBindings,
        provider: base.provider ?? "vercel",
        country: base.country ?? context.country,
        waitUntil: base.waitUntil ?? context.waitUntil
      });
    },
    {
      secretBindings: ["ANALYTICS_WRITE_KEY"]
    }
  );
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
