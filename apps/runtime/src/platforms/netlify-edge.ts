import { handleRedirectRequest, resolveConfigUrlFromBindings, type HandlerOptions } from "@/lib/handler";

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
  "REDIRECTS_CONFIG_URL",
  "REDIRECTS_CONFIG_REPO",
  "REDIRECTS_CONFIG_BRANCH",
  "REDIRECTS_CONFIG_PATH",
  "CONFIG_URL",
  "CONFIG_REPO",
  "CONFIG_BRANCH",
  "CONFIG_PATH",
  "ROBOTS_POLICY",
  "ANALYTICS_ENDPOINT",
  "ANALYTICS_WRITE_KEY",
  "ANALYTICS_SOURCE_ID"
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
  return async function netlifyEdgeHandler(request: Request, context: NetlifyContext): Promise<Response> {
    const bindings = options?.envBindings ?? getNetlifyBindings();
    const resolvedUrl = options?.configUrl ?? resolveConfigUrlFromBindings(bindings);
    const finalOptions = resolvedUrl && resolvedUrl !== options?.configUrl ? { ...options, configUrl: resolvedUrl } : options;
    const base = finalOptions ?? {};
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
  };
}

const defaultHandler = createNetlifyEdgeHandler();

export const config = { path: "/*" };

export default defaultHandler;

export type { HandlerOptions };
