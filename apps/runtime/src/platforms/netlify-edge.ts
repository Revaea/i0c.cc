import type { RuntimePlatformAdapter } from "@i0c/plugin-contracts";

import { handleRedirectRequest, type HandlerOptions } from "@/lib/handler";

declare const Netlify: undefined | {
  env?: {
    get(key: string): string | undefined;
  };
};

type NetlifyContext = {
  geo?: {
    country?: {
      code?: string;
    };
  };
  waitUntil?(promise: Promise<unknown>): void;
};

type NetlifyHandler = (request: Request, context: NetlifyContext) => Promise<Response> | Response;

const NETLIFY_BINDING_KEYS = [
  "ANALYTICS_WRITE_KEY"
] as const;

function getNetlifyBindings(): Record<string, unknown> | undefined {
  if (typeof Netlify === "undefined" || !Netlify.env) {
    return undefined;
  }

  const bindings: Record<string, unknown> = {};
  for (const key of NETLIFY_BINDING_KEYS) {
    const value = Netlify.env.get(key);
    if (value !== undefined) {
      bindings[key] = value;
    }
  }
  return bindings;
}

export function createNetlifyEdgeHandler(options?: HandlerOptions): NetlifyHandler {
  const adapter = {
    id: "netlify",
    async handle(request: Request, context: NetlifyContext): Promise<Response> {
      const bindings = options?.envBindings ?? getNetlifyBindings();
      const base = options ?? {};
      const platformWaitUntil = context && typeof context.waitUntil === "function"
        ? (promise: Promise<unknown>) => context.waitUntil?.(promise)
        : undefined;
      const merged: HandlerOptions = {
        ...base,
        envBindings: base.envBindings ?? bindings,
        provider: base.provider ?? "netlify",
        country: base.country ?? context?.geo?.country?.code,
        waitUntil: base.waitUntil ?? platformWaitUntil
      };
      return handleRedirectRequest(request, merged);
    }
  } satisfies RuntimePlatformAdapter<[Request, NetlifyContext]>;

  return function netlifyEdgeHandler(request: Request, context: NetlifyContext): Promise<Response> {
    return adapter.handle(request, context);
  };
}

const defaultHandler = createNetlifyEdgeHandler();

export const config = { path: "/*" };

export default defaultHandler;

export type { HandlerOptions };
