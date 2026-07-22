import {
  createNetlifyEdgeHandler as createNetlifyPluginHandler,
  type NetlifyHandler
} from "@i0c/plugin-runtime-netlify/runtime";

import { handleRedirectRequest, type HandlerOptions } from "@/lib/handler";

export function createNetlifyRouteHandler(options?: HandlerOptions): NetlifyHandler {
  return createNetlifyPluginHandler(
    (request, context) => {
      const base = options ?? {};
      return handleRedirectRequest(request, {
        ...context,
        ...base,
        envBindings: base.envBindings ?? context.envBindings,
        provider: base.provider ?? "netlify",
        country: base.country ?? context.country,
        waitUntil: base.waitUntil ?? context.waitUntil
      });
    },
    {
      secretBindings: ["ANALYTICS_WRITE_KEY"]
    }
  );
}

export const createNetlifyEdgeHandler = createNetlifyRouteHandler;

const defaultHandler = createNetlifyRouteHandler();

export const config = { path: "/*" };

export default defaultHandler;

export type { HandlerOptions };
