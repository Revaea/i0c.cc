import type { ExecutionContext } from "@cloudflare/workers-types";
import type { RuntimePlatformAdapter } from "@i0c/plugin-contracts";

import { handleRedirectRequest, type HandlerOptions } from "@/lib/handler";

declare const caches: CacheStorage & { default: Cache };

const baseOptions: HandlerOptions = {
  cache: caches.default
};

const cloudflareAdapter = {
  id: "cloudflare",
  async handle(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const waitUntil = ctx && typeof ctx.waitUntil === "function" ? (promise: Promise<unknown>) => ctx.waitUntil(promise) : undefined;
    const country = (request as Request & { cf?: { country?: string } }).cf?.country;
    const options: HandlerOptions = {
      ...baseOptions,
      provider: "cloudflare",
      country,
      waitUntil
    };
    if (env && typeof env === "object") {
      options.envBindings = env as Record<string, unknown>;
    }
    return handleRedirectRequest(request, options);
  }
} satisfies RuntimePlatformAdapter<[Request, unknown, ExecutionContext]>;

const worker = {
  fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    return cloudflareAdapter.handle(request, env, ctx);
  }
};

export default worker;
